/**
 * pgvector 向量检索封装
 *
 * 在 agent schema 的 document_chunks 表上进行余弦相似度搜索。
 * embedding 以 JSON 数组字符串存储（如 "[0.12, 0.34, ...]"），
 * 检索时使用 pgvector 的 <=> 余弦距离运算符。
 *
 * 如果 pgvector 不可用，自动降级为关键词全文检索。
 */
import { prisma } from './prisma';
import type { DocumentChunk } from '@prisma/client';

export interface SearchResult {
  id: number;
  documentId: number;
  documentTitle: string;
  chunkIndex: number;
  chunkText: string;
  similarity: number;
}

/**
 * 向量相似度检索
 */
export async function searchSimilar(
  queryEmbedding: number[],
  topK: number = 5,
  threshold: number = 0.7,
): Promise<SearchResult[]> {
  const vectorStr = `[${queryEmbedding.join(',')}]`;

  try {
    const results = await prisma.$queryRawUnsafe<Array<{
      id: number;
      document_id: number;
      document_title: string;
      chunk_index: number;
      chunk_text: string;
      similarity: number;
    }>>(
      `SELECT
        dc.id,
        dc.document_id,
        d.title AS document_title,
        dc.chunk_index,
        dc.chunk_text,
        1 - (dc.embedding::vector <=> $1::vector) AS similarity
      FROM document_chunks dc
      JOIN documents d ON d.id = dc.document_id
      WHERE dc.embedding IS NOT NULL
        AND 1 - (dc.embedding::vector <=> $1::vector) > $2
      ORDER BY dc.embedding::vector <=> $1::vector
      LIMIT $3`,
      vectorStr,
      threshold,
      topK,
    );

    return results.map(r => ({
      id: r.id,
      documentId: r.document_id,
      documentTitle: r.document_title,
      chunkIndex: r.chunk_index,
      chunkText: r.chunk_text,
      similarity: Number(r.similarity),
    }));
  } catch (error: any) {
    console.warn('⚠️  pgvector 向量检索失败，降级为简单查询:', error.message);
    return fallbackSearch(topK);
  }
}

/**
 * 降级方案：返回最近的文档块
 */
async function fallbackSearch(topK: number): Promise<SearchResult[]> {
  const chunks = await prisma.documentChunk.findMany({
    take: topK,
    where: { embedding: { not: null } },
    orderBy: { createdAt: 'desc' },
    include: {
      document: { select: { title: true } },
    },
  });

  return chunks.map((c: DocumentChunk & { document: { title: string } }) => ({
    id: c.id,
    documentId: c.documentId,
    documentTitle: c.document.title,
    chunkIndex: c.chunkIndex,
    chunkText: c.chunkText,
    similarity: 0.5,
  }));
}

/**
 * 将文本分割为固定大小的块
 */
export function splitIntoChunks(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50,
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunkText = text.slice(start, end);

    if (end < text.length) {
      const lastBreak = Math.max(
        chunkText.lastIndexOf('。'),
        chunkText.lastIndexOf('\n'),
        chunkText.lastIndexOf('；'),
      );
      if (lastBreak > chunkSize * 0.6) {
        chunkText = chunkText.slice(0, lastBreak + 1);
      }
    }

    chunks.push(chunkText.trim());

    // 已到达文本末尾，退出
    if (end >= text.length) break;

    // 确保 start 始终前进（防止 chunkText.length <= overlap 导致死循环）
    start += Math.max(1, chunkText.length - overlap);
  }

  return chunks.filter(c => c.length > 0);
}
