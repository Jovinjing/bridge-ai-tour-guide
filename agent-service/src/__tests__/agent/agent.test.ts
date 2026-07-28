/**
 * Agent 工厂单元测试
 *
 * 降级测试:
 * - LLM 未配置 → null
 * - 无工具 → null
 * - 有效参数 → 返回 ReactAgent
 */
import { describe, it, expect } from 'vitest';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';

// 直接导入工厂函数（不依赖模块单例）
import { createBridgeAgent } from '../../agent/agent';
import { SYSTEM_PROMPT } from '../../agent/prompt';

// 构造一个最小化的模拟工具
const mockTool = new DynamicStructuredTool({
  name: 'mockEcho',
  description: '测试用工具',
  schema: z.object({ input: z.string() }),
  func: async (params) => JSON.stringify(params),
});

describe('createBridgeAgent — 降级行为', () => {
  it('model 为 null → 返回 null', () => {
    const agent = createBridgeAgent([mockTool], null, SYSTEM_PROMPT);
    expect(agent).toBeNull();
  });

  it('model 为 null + tools=[] → 返回 null', () => {
    const agent = createBridgeAgent([], null, SYSTEM_PROMPT);
    expect(agent).toBeNull();
  });

  it('tools 为空数组 (但 model 有效) → 返回 null', () => {
    // 构造一个 mock ChatOpenAI (不需要真实 API key)
    const mockModel = new ChatOpenAI({
      model: 'test-model',
      apiKey: 'sk-fake',
    });
    const agent = createBridgeAgent([], mockModel, SYSTEM_PROMPT);
    expect(agent).toBeNull();
  });

  it('model 有效 + tools 非空 → 返回 ReactAgent', () => {
    const mockModel = new ChatOpenAI({
      model: 'test-model',
      apiKey: 'sk-fake',
    });
    const agent = createBridgeAgent([mockTool], mockModel, SYSTEM_PROMPT);
    expect(agent).not.toBeNull();
    // ReactAgent 有 streamEvents 方法
    expect(typeof agent!.streamEvents).toBe('function');
  });

  it('传入自定义 systemPrompt → 正常创建', () => {
    const customPrompt = '你是一个数学老师。';
    const mockModel = new ChatOpenAI({
      model: 'test-model',
      apiKey: 'sk-fake',
    });
    const agent = createBridgeAgent([mockTool], mockModel, customPrompt);
    expect(agent).not.toBeNull();
  });

  it('多工具 → 正常创建', () => {
    const mockModel = new ChatOpenAI({
      model: 'test-model',
      apiKey: 'sk-fake',
    });
    const tool2 = new DynamicStructuredTool({
      name: 'mockTool2',
      description: '第二个测试工具',
      schema: z.object({ value: z.number() }),
      func: async (params) => String(params.value * 2),
    });
    const agent = createBridgeAgent([mockTool, tool2], mockModel, SYSTEM_PROMPT);
    expect(agent).not.toBeNull();
  });
});
