/**
 * 向量知识库检索工具
 *
 * 使用 pgvector 对赵州桥 10 篇知识文档进行语义检索。
 * 依赖 Phase 2.2 导入的 document_chunks 表。
 */
import { ToolAdapter } from './adapter';
import { searchSimilar } from '../../db/vector';
import { embeddingModel } from '../../llm/deepseek';

interface SearchKnowledgeParams {
  query: string;
}

interface SearchKnowledgeResult {
  query: string;
  results: Array<{
    title: string;
    chunkText: string;
    similarity: number;
  }>;
  totalFound: number;
}

export class SearchKnowledgeAdapter implements ToolAdapter<SearchKnowledgeParams, SearchKnowledgeResult> {
  name = 'searchKnowledge';

  async execute(params: SearchKnowledgeParams): Promise<SearchKnowledgeResult> {
    const { query } = params;

    if (!embeddingModel) {
      return {
        query,
        results: [],
        totalFound: 0,
      };
    }

    // 1. 向量化查询文本
    const queryEmbedding = await embeddingModel.embedQuery(query);

    // 2. pgvector 相似度检索（阈值由 vector.ts 默认值控制，适配 bge-m3）
    const searchResults = await searchSimilar(queryEmbedding, 5);

    // 3. 格式化返回
    return {
      query,
      results: searchResults.map(r => ({
        title: r.documentTitle,
        chunkText: r.chunkText,
        similarity: Math.round(r.similarity * 100) / 100,
      })),
      totalFound: searchResults.length,
    };
  }
}
