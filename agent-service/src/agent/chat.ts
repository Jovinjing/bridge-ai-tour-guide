/**
 * POST /agent/chat — SSE 真流式对话端点
 *
 * 使用 LangChain.js v1 streamEvents({ version: "v3" }) 实现：
 * - token 级别文本流式
 * - tool_call 中间态事件（thinking / tool_call / tool_result）
 * - 富媒体 content_blocks 随 done 事件返回
 *
 * SSE 事件协议（参考 DESIGN.md §3.5）：
 *   event: status     → 思考状态 / 工具调用进度
 *   event: token      → LLM 生成文本片段
 *   event: done       → 对话结束，携带 sessionId 和 token 用量
 *   event: error      → 异常终止
 */
import { Request, Response } from 'express';
import { HumanMessage } from '@langchain/core/messages';
import { defaultAgent } from './agent';
import {
  findSession,
  createSession,
  touchSession,
  checkGuestRoundLimit,
  saveMessage,
} from '../memory/sessionStore';

export async function chatController(req: Request, res: Response): Promise<void> {
  // SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲

  const { message, sessionId, guestId } = req.body as {
    message: string;
    sessionId?: string;
    guestId?: string;
  };

  if (!message) {
    sendSSE(res, 'error', { code: 'INVALID_INPUT', message: 'message 字段必填' });
    res.end();
    return;
  }

  // 检查 Agent 是否可用
  if (!defaultAgent) {
    sendSSE(res, 'error', { code: 'AGENT_UNAVAILABLE', message: 'AI 服务未就绪，请检查 DEEPSEEK_API_KEY 配置' });
    res.end();
    return;
  }

  // 会话管理：查找已有会话或创建新会话
  let session = sessionId ? await findSession(sessionId) : null;
  const userId = req.user?.id ? String(req.user.id) : undefined;

  if (!session) {
    // 新建会话
    session = await createSession({
      userId,
      guestId: guestId || undefined,
      sessionType: userId ? 'registered' : 'guest',
    });
  }

  // 游客模式：检查轮次限制
  if (session.sessionType === 'guest') {
    const limit = checkGuestRoundLimit(session.messageCount);
    if (!limit.allowed) {
      sendSSE(res, 'error', {
        code: 'GUEST_LIMIT_REACHED',
        message: limit.reason,
        sessionId: session.sessionId,
      });
      res.end();
      return;
    }

    // 提前提示快达到限制
    if (limit.remaining <= 3) {
      sendSSE(res, 'status', {
        type: 'warning',
        message: `游客模式还剩 ${limit.remaining} 轮对话。登录后可畅享无限制对话！`,
      });
    }
  }

  const threadId = session.sessionId;

  try {
    // 发送初始状态
    sendSSE(res, 'status', { type: 'thinking', message: '正在思考中...' });

    // 使用 v3 streamEvents 获取带类型的流式事件
    const run = await defaultAgent.streamEvents(
      {
        messages: [new HumanMessage(message)],
      },
      {
        version: 'v3',
        configurable: {
          thread_id: threadId,
        },
      },
    );

    let hasToolCalls = false;
    let totalTokens = 0;

    // ---- 处理消息流 ----
    const messageStream = run.messages;
    if (messageStream) {
      for await (const msg of messageStream) {
        // 处理文本 token
        if (msg.text) {
          for await (const token of msg.text) {
            sendSSE(res, 'token', { content: token });
          }
        }

        // 处理 reasoning（如果模型支持）
        if (msg.reasoning) {
          for await (const r of msg.reasoning) {
            sendSSE(res, 'token', { content: r, reasoning: true });
          }
        }
      }
    }

    // ---- 处理工具调用流 ----
    const toolCallStream = run.toolCalls;
    if (toolCallStream) {
      for await (const toolCall of toolCallStream) {
        hasToolCalls = true;

        // 工具调用开始
        sendSSE(res, 'status', {
          type: 'tool_call',
          tool: toolCall.name,
          args: toolCall.input,
        });

        // 等待工具结果
        try {
          const output = await toolCall.output;
          sendSSE(res, 'status', {
            type: 'tool_result',
            tool: toolCall.name,
            result: truncateResult(output),
          });
        } catch (err: any) {
          sendSSE(res, 'status', {
            type: 'tool_error',
            tool: toolCall.name,
            error: err.message,
          });
        }
      }
    }

    // ---- 获取最终状态 ----
    const finalState = await run.output;
    const lastMessage = finalState?.messages?.[finalState.messages.length - 1];

    // 提取 content_blocks（如果 AI 回复包含结构化内容）
    const contentBlocks = extractContentBlocks(lastMessage);

    // 计算 token 用量
    const meta = lastMessage as any;
    if (meta?.response_metadata?.tokenUsage) {
      totalTokens = meta.response_metadata.tokenUsage.totalTokens || 0;
    }

    // 持久化消息 + 更新会话
    const assistantContent = typeof lastMessage?.content === 'string'
      ? lastMessage.content
      : JSON.stringify(lastMessage?.content || '');

    await Promise.all([
      saveMessage(threadId, 'user', message),
      saveMessage(threadId, 'assistant', assistantContent, contentBlocks),
      touchSession(threadId),
    ]);

    // 发送完成事件
    sendSSE(res, 'done', {
      sessionId: threadId,
      totalTokens,
      contentBlocks: contentBlocks.length > 0 ? contentBlocks : undefined,
      hasToolCalls,
    });

  } catch (err: any) {
    console.error('Agent 对话异常:', err);
    sendSSE(res, 'error', {
      code: 'AGENT_ERROR',
      message: err.message || 'AI 服务异常，请稍后再试',
      sessionId: threadId,
    });
  } finally {
    res.end();
  }
}

// ======== 辅助函数 ========

/** 发送 SSE 事件 */
function sendSSE(res: Response, event: string, data: Record<string, unknown>): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** 截断过长的工具结果 */
function truncateResult(result: unknown, maxLen: number = 500): unknown {
  if (typeof result === 'string' && result.length > maxLen) {
    return result.slice(0, maxLen) + '...';
  }
  if (typeof result === 'object' && result !== null) {
    const str = JSON.stringify(result);
    if (str.length > maxLen) {
      return JSON.parse(str.slice(0, maxLen) + '..."}]}');
    }
  }
  return result;
}

/** 从消息中提取 content_blocks（富媒体块） */
function extractContentBlocks(message: any): Array<Record<string, unknown>> {
  if (!message) return [];

  // 如果消息本身携带 content_blocks（由 tool 返回的结构化数据）
  if (Array.isArray(message.content_blocks)) {
    return message.content_blocks;
  }

  // 从消息内容中解析 Markdown 图片语法
  const blocks: Array<Record<string, unknown>> = [];
  const content = typeof message.content === 'string'
    ? message.content
    : Array.isArray(message.content)
      ? message.content.map((c: any) => c.text || '').join('')
      : '';

  // 提取 Markdown 图片: ![alt](url)
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    blocks.push({
      type: 'image',
      alt: match[1],
      url: match[2],
    });
  }

  return blocks;
}
