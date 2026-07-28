/**
 * DeepSeek Chat + OpenAI Embedding 配置
 *
 * DeepSeek 使用 OpenAI 兼容接口，通过 @langchain/openai 的 ChatOpenAI 接入。
 * Embedding 使用 OpenAI text-embedding-3-small（1536 维），
 * 可通过 OPENAI_BASE_URL 指向代理以降低成本。
 */
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';

// ======== 环境变量校验 ========

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

// ======== DeepSeek Chat 模型 ========

/**
 * 创建 DeepSeek Chat 模型实例
 *
 * 使用 OpenAI 兼容接口，baseURL 指向 DeepSeek API。
 * DeepSeek 推荐参数：
 * - temperature: 0.7（创意与准确兼顾）
 * - maxTokens: 4096（单次生成上限）
 *
 * 注意：DeepSeek 不支持 logprobs、response_format (JSON mode) 等参数，
 * 调用时需通过 withConfig({ modelKwargs: {...} }) 或 bind 方法传入。
 */
export function createDeepSeekChatModel(): ChatOpenAI | null {
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'your-deepseek-api-key-here') {
    console.warn('⚠️  DEEPSEEK_API_KEY 未配置，Chat 模型不可用。请在 .env 中设置。');
    return null;
  }

  console.log(`🤖 DeepSeek Chat 已配置: ${DEEPSEEK_MODEL} @ ${DEEPSEEK_BASE_URL}`);

  return new ChatOpenAI({
    model: DEEPSEEK_MODEL,
    temperature: 0.7,
    maxTokens: 4096,
    apiKey: DEEPSEEK_API_KEY,
    configuration: {
      baseURL: DEEPSEEK_BASE_URL,
    },
  });
}

/**
 * 单例 Chat 模型实例（模块加载时创建）
 */
export const deepseekChatModel = createDeepSeekChatModel();

// ======== OpenAI Embedding 模型 ========

/**
 * 创建 OpenAI Embedding 模型实例
 *
 * 使用 text-embedding-3-small（1536 维），性价比最优。
 * 可通过 OPENAI_BASE_URL 指向第三方代理（如阿里云百炼、智谱等）。
 *
 * 10 篇赵州桥知识文档的 embedding 成本几乎为零（~5000 tokens，<$0.0001）。
 */
export function createEmbeddingModel(): OpenAIEmbeddings | null {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here') {
    console.warn('⚠️  OPENAI_API_KEY 未配置，Embedding 模型不可用。请在 .env 中设置。');
    return null;
  }

  console.log(`📊 Embedding 已配置: ${EMBEDDING_MODEL} @ ${OPENAI_BASE_URL}`);

  return new OpenAIEmbeddings({
    model: EMBEDDING_MODEL,
    apiKey: OPENAI_API_KEY,
    configuration: {
      baseURL: OPENAI_BASE_URL,
    },
    // text-embedding-3-small 维度为 1536
    dimensions: 1536,
  });
}

/**
 * 单例 Embedding 模型实例（模块加载时创建）
 */
export const embeddingModel = createEmbeddingModel();

// ======== 配置摘要 ========

/**
 * 打印 LLM 配置摘要（服务启动时调用）
 */
export function printLLMConfig(): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧠 LLM 配置摘要');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Chat:     ${deepseekChatModel ? '✅ DeepSeek (' + DEEPSEEK_MODEL + ')' : '❌ 未配置'}`);
  console.log(`  Embed:    ${embeddingModel ? '✅ OpenAI (' + EMBEDDING_MODEL + ')' : '❌ 未配置'}`);
  console.log(`  Chat URL: ${DEEPSEEK_BASE_URL}`);
  console.log(`  Embed URL:${OPENAI_BASE_URL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}
