/**
 * deepseek.ts LLM 配置单元测试
 *
 * 降级测试: API Key 未配置 / 为占位符时的 graceful degradation。
 *
 * 重点测试工厂函数的降级逻辑，mock @langchain/openai 避免加载重型依赖。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock @langchain/openai BEFORE any imports that use it
vi.mock('@langchain/openai', () => {
  const mockInvoke = vi.fn().mockResolvedValue('mock response');
  const mockEmbedQuery = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);

  class MockChatOpenAI {
    model: string;
    temperature?: number;
    maxTokens?: number;
    apiKey?: string;
    invoke = mockInvoke;

    constructor(config: any) {
      this.model = config.model || 'unknown';
      this.temperature = config.temperature;
      this.maxTokens = config.maxTokens;
      this.apiKey = config.apiKey;
    }
  }

  class MockOpenAIEmbeddings {
    model: string;
    apiKey?: string;
    dimensions?: number;
    embedQuery = mockEmbedQuery;

    constructor(config: any) {
      this.model = config.model || 'unknown';
      this.apiKey = config.apiKey;
      this.dimensions = config.dimensions;
    }
  }

  return {
    ChatOpenAI: MockChatOpenAI,
    OpenAIEmbeddings: MockOpenAIEmbeddings,
  };
});

// 保存原始环境变量
const originalEnv = { ...process.env };

describe('createDeepSeekChatModel — 降级行为', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
    process.env.DEEPSEEK_MODEL = 'deepseek-chat';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('DEEPSEEK_API_KEY 未设置 → 返回 null', async () => {
    const { createDeepSeekChatModel } = await import('../../llm/deepseek');
    const model = createDeepSeekChatModel();
    expect(model).toBeNull();
  });

  it('DEEPSEEK_API_KEY 为占位符 → 返回 null', async () => {
    process.env.DEEPSEEK_API_KEY = 'your-deepseek-api-key-here';
    const { createDeepSeekChatModel } = await import('../../llm/deepseek');
    const model = createDeepSeekChatModel();
    expect(model).toBeNull();
  });

  it('DEEPSEEK_API_KEY 为有效值 → 返回 ChatOpenAI 实例', async () => {
    process.env.DEEPSEEK_API_KEY = 'sk-test-valid-key-12345';
    const { createDeepSeekChatModel } = await import('../../llm/deepseek');
    const model = createDeepSeekChatModel();
    expect(model).not.toBeNull();
    expect(model!.model).toBe('deepseek-chat');
    expect(typeof model!.invoke).toBe('function');
  });

  it('model 名称来自环境变量 DEEPSEEK_MODEL', async () => {
    process.env.DEEPSEEK_API_KEY = 'sk-test';
    process.env.DEEPSEEK_MODEL = 'deepseek-chat-custom';
    const { createDeepSeekChatModel } = await import('../../llm/deepseek');
    const model = createDeepSeekChatModel();
    expect(model!.model).toBe('deepseek-chat-custom');
  });
});

describe('createEmbeddingModel — 降级行为', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.OPENAI_API_KEY;
    process.env.OPENAI_BASE_URL = 'https://api.openai.com';
    process.env.EMBEDDING_MODEL = 'text-embedding-3-small';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('OPENAI_API_KEY 未设置 → 返回 null', async () => {
    const { createEmbeddingModel } = await import('../../llm/deepseek');
    const model = createEmbeddingModel();
    expect(model).toBeNull();
  });

  it('OPENAI_API_KEY 为占位符 → 返回 null', async () => {
    process.env.OPENAI_API_KEY = 'your-openai-api-key-here';
    const { createEmbeddingModel } = await import('../../llm/deepseek');
    const model = createEmbeddingModel();
    expect(model).toBeNull();
  });

  it('OPENAI_API_KEY 为有效值 → 返回 OpenAIEmbeddings 实例', async () => {
    process.env.OPENAI_API_KEY = 'sk-test-valid-key-67890';
    const { createEmbeddingModel } = await import('../../llm/deepseek');
    const model = createEmbeddingModel();
    expect(model).not.toBeNull();
    expect(model!.model).toBe('text-embedding-3-small');
    expect(typeof model!.embedQuery).toBe('function');
  });

  it('model 和 dimensions 来自环境变量', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.EMBEDDING_MODEL = 'text-embedding-3-large';
    const { createEmbeddingModel } = await import('../../llm/deepseek');
    const model = createEmbeddingModel();
    expect(model!.model).toBe('text-embedding-3-large');
    expect(model!.dimensions).toBe(1536);
  });
});

describe('printLLMConfig — 不抛异常', () => {
  it('即使 API KEY 未配置, printLLMConfig 也不会抛异常', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();
    const { printLLMConfig } = await import('../../llm/deepseek');
    expect(() => printLLMConfig()).not.toThrow();
  });

  it('API KEY 配置后 printLLMConfig 正常执行', async () => {
    process.env.DEEPSEEK_API_KEY = 'sk-test';
    process.env.OPENAI_API_KEY = 'sk-test';
    vi.resetModules();
    const { printLLMConfig } = await import('../../llm/deepseek');
    expect(() => printLLMConfig()).not.toThrow();
  });
});

describe('deepseekChatModel + embeddingModel 单例', () => {
  it('deepseekChatModel 单例: KEY 未设置时为 null', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    vi.resetModules();
    const { deepseekChatModel } = await import('../../llm/deepseek');
    expect(deepseekChatModel).toBeNull();
  });

  it('deepseekChatModel 单例: KEY 有效时为非 null', async () => {
    process.env.DEEPSEEK_API_KEY = 'sk-test-singleton';
    vi.resetModules();
    const { deepseekChatModel } = await import('../../llm/deepseek');
    expect(deepseekChatModel).not.toBeNull();
  });

  it('embeddingModel 单例: KEY 未设置时为 null', async () => {
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();
    const { embeddingModel } = await import('../../llm/deepseek');
    expect(embeddingModel).toBeNull();
  });
});
