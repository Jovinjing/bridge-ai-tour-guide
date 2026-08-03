/**
 * POST SSE 客户端 — 使用 fetch ReadableStream 替代 EventSource
 *
 * 因为后端 SSE 端点是 POST 方法（需要传 sessionId + message），
 * 浏览器原生 EventSource 不支持 POST，故使用 fetch + ReadableStream。
 */
import { getToken } from './client';
import type { SseStatusData, SseDoneData, SseErrorData } from '../types';

const SSE_URL = '/agent/chat';

export interface SseCallbacks {
  /** 收到 status 事件（thinking / tool_call / tool_result） */
  onStatus?: (data: SseStatusData) => void;
  /** 收到 token 事件（文本片段） */
  onToken?: (content: string) => void;
  /** 收到 done 事件（流结束） */
  onDone?: (data: SseDoneData) => void;
  /** 收到 error 事件 */
  onError?: (data: SseErrorData) => void;
  /** 捕获异常（网络错误、解析失败等） */
  onException?: (error: Error) => void;
}

/**
 * 发起 POST SSE 对话
 *
 * @param message 用户消息
 * @param sessionId 会话 ID
 * @param callbacks 回调
 * @returns AbortController（可中断）
 */
export function sendChatMessage(
  message: string,
  sessionId: string,
  callbacks: SseCallbacks,
): AbortController {
  const controller = new AbortController();
  const token = getToken();

  void (async () => {
    try {
      const resp = await fetch(SSE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ sessionId, message }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        callbacks.onException?.(new Error(`SSE HTTP ${resp.status}`));
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) {
        callbacks.onException?.(new Error('Response body is null'));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 按双换行分割事件块
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          if (!block.trim()) continue;
          parseSseBlock(block, callbacks);
        }
      }

      // 处理剩余 buffer
      if (buffer.trim()) {
        parseSseBlock(buffer, callbacks);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // 用户中断，非错误
      }
      callbacks.onException?.(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return controller;
}

/**
 * 解析单个 SSE 事件块
 */
function parseSseBlock(block: string, callbacks: SseCallbacks): void {
  const lines = block.split('\n');
  let eventType = '';
  let dataStr = '';

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      eventType = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      dataStr = line.slice(6).trim();
    }
  }

  if (!dataStr) return;

  switch (eventType) {
    case 'status':
      try {
        const data = JSON.parse(dataStr) as SseStatusData;
        callbacks.onStatus?.(data);
      } catch { /* ignore malformed JSON */ }
      break;

    case 'token':
      callbacks.onToken?.(dataStr);
      break;

    case 'done':
      try {
        const data = JSON.parse(dataStr) as SseDoneData;
        callbacks.onDone?.(data);
      } catch { /* ignore */ }
      break;

    case 'error':
      try {
        const data = JSON.parse(dataStr) as SseErrorData;
        callbacks.onError?.(data);
      } catch { /* ignore */ }
      break;
  }
}

/** 简化接口：传入消息和 sessionId，直接返回 abort 函数（旧项目兼容） */
export function createSseConnection(
  question: string,
  _componentName: string | undefined,
  sessionId: string,
  callbacks: {
    onToken?: (data: string) => void;
    onDone?: () => void;
    onError?: (e: unknown) => void;
  },
): () => void {
  const controller = sendChatMessage(question, sessionId, {
    onToken: callbacks.onToken,
    onDone: (_data) => {
      callbacks.onDone?.();
    },
    onError: (data) => {
      callbacks.onError?.(data);
    },
    onException: (err) => {
      callbacks.onError?.(err);
    },
  });

  return () => controller.abort();
}
