/**
 * Agent 组装
 *
 * 使用 LangChain.js v1 createAgent API 创建 ReAct Agent。
 * DeepSeek Chat 原生支持 tool calling（OpenAI 兼容）。
 *
 * v1 API 变更：
 * - 使用 createAgent({ model, tools, systemPrompt }) 替代旧的 AgentExecutor
 * - 使用 streamEvents({ version: "v3" }) 实现 token 级别流式输出
 * - 记忆通过 stateSchema + checkpointer 实现
 */
import { ChatOpenAI } from '@langchain/openai';
import { createAgent, DynamicStructuredTool } from 'langchain';
import type { ReactAgent } from 'langchain';
import { allTools } from './tools';
import { SYSTEM_PROMPT } from './prompt';
import { deepseekChatModel } from '../llm/deepseek';

// ======== Agent 工厂 ========

/**
 * 创建 Agent 实例
 *
 * @param tools - 工具数组（默认全部 5 个工具）
 * @param model - Chat 模型（默认 deepseekChatModel）
 * @param systemPrompt - 系统提示词
 * @returns ReactAgent 实例或 null
 */
export function createBridgeAgent(
  tools: DynamicStructuredTool[] = allTools,
  model?: ChatOpenAI | null,
  systemPrompt: string = SYSTEM_PROMPT,
): ReactAgent | null {
  const chatModel = model || deepseekChatModel;

  if (!chatModel) {
    console.warn('⚠️  Agent 创建失败: LLM 未配置。请设置 DEEPSEEK_API_KEY');
    return null;
  }

  if (tools.length === 0) {
    console.warn('⚠️  Agent 创建失败: 没有可用的工具');
    return null;
  }

  const agent = createAgent({
    model: chatModel,
    tools,
    systemPrompt,
    // 最大迭代次数由 Agent 内部管理，通过 middleware 控制
    // DeepSeek 不需要特殊的缓存配置
  });

  console.log(`🤖 Agent 已创建: ${tools.length} 个工具, model=${chatModel.model}`);
  return agent;
}

/**
 * 单例 Agent 实例
 * 所有会话共享同一个 Agent，通过 thread_id 区分对话历史
 */
export const defaultAgent = createBridgeAgent();

/**
 * 创建带自定义 system prompt 的 Agent
 */
export function createAgentWithPrompt(systemPrompt: string): ReactAgent | null {
  return createBridgeAgent(allTools, deepseekChatModel, systemPrompt);
}
