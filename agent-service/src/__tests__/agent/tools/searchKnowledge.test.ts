/**
 * searchKnowledge 单元测试
 *
 * 降级测试: embeddingModel 为 null 时的 graceful degradation。
 *
 * 直接 mock 下游依赖（embeddingModel + vector），不加载真实 Prisma/OpenAI。
 */
import { describe, it, expect, vi } from 'vitest';

// Mock 路径相对于本测试文件位置 (src/__tests__/agent/tools/)
vi.mock('../../../llm/deepseek', () => ({
  embeddingModel: null,
  createEmbeddingModel: () => null,
  printLLMConfig: () => {},
}));

vi.mock('../../../db/vector', () => ({
  searchSimilar: vi.fn().mockResolvedValue([]),
  splitIntoChunks: vi.fn().mockReturnValue([]),
}));

vi.mock('../../../db/prisma', () => ({
  prisma: {},
}));

describe('SearchKnowledgeAdapter — 降级行为', () => {
  it('embeddingModel 为 null → 返回空结果 (不抛异常)', async () => {
    const { SearchKnowledgeAdapter } = await import('../../../agent/tools/searchKnowledge');
    const adapter = new SearchKnowledgeAdapter();
    const result = await adapter.execute({ query: '赵州桥的历史' });

    expect(result.query).toBe('赵州桥的历史');
    expect(result.results).toHaveLength(0);
    expect(result.totalFound).toBe(0);
  });

  it('降级返回包含 query 字段', async () => {
    const { SearchKnowledgeAdapter } = await import('../../../agent/tools/searchKnowledge');
    const adapter = new SearchKnowledgeAdapter();
    const result = await adapter.execute({ query: '主拱跨度' });

    expect(result.query).toBe('主拱跨度');
  });

  it('name 为 "searchKnowledge"', async () => {
    const { SearchKnowledgeAdapter } = await import('../../../agent/tools/searchKnowledge');
    const adapter = new SearchKnowledgeAdapter();
    expect(adapter.name).toBe('searchKnowledge');
  });
});
