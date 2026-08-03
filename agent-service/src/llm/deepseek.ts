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

// 主模型：智谱 GLM（免费 glm-4-flash）
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'glm-4-flash';

// 备用模型：DeepSeek 官方（主模型不稳定时自动切换）
const FALLBACK_API_KEY = process.env.DEEPSEEK_FALLBACK_API_KEY;
const FALLBACK_BASE_URL = process.env.DEEPSEEK_FALLBACK_BASE_URL || 'https://api.deepseek.com';
const FALLBACK_MODEL = process.env.DEEPSEEK_FALLBACK_MODEL || 'deepseek-chat';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
// 注意：不传 dimensions 参数——硅基流动 bge-m3 拒绝该字段（固定 1024 维）。
// 如需指定维度（如智谱 embedding-3 的 2048），请用支持该参数的供应商。

// ======== Chat 模型（主 + 备用自动切换） ========

/**
 * 创建 Chat 模型实例（带 fallback）
 *
 * 主模型：智谱 glm-4-flash（免费）
 * 备用模型：DeepSeek deepseek-chat——主模型抛错（429/超时/5xx）时
 * LangChain withFallbacks 自动重试备用模型，流式场景同样生效。
 *
 * 注意：DeepSeek 不支持 logprobs、response_format (JSON mode) 等参数，
 * 调用时需通过 withConfig({ modelKwargs: {...} }) 或 bind 方法传入。
 */
export function createDeepSeekChatModel(): ChatOpenAI | null {
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'your-deepseek-api-key-here') {
    console.warn('⚠️  DEEPSEEK_API_KEY 未配置，Chat 模型不可用。请在 .env 中设置。');
    return null;
  }

  const primary = new ChatOpenAI({
    model: DEEPSEEK_MODEL,
    temperature: 0.7,
    maxTokens: 4096,
    apiKey: DEEPSEEK_API_KEY,
    configuration: {
      baseURL: DEEPSEEK_BASE_URL,
    },
  });

  // 备用模型未配置 → 仅使用主模型
  if (!FALLBACK_API_KEY || FALLBACK_API_KEY === 'your-deepseek-api-key-here') {
    console.log(`🤖 Chat 已配置（无备用）: ${DEEPSEEK_MODEL} @ ${DEEPSEEK_BASE_URL}`);
    return primary;
  }

  const fallback = new ChatOpenAI({
    model: FALLBACK_MODEL,
    temperature: 0.7,
    maxTokens: 4096,
    apiKey: FALLBACK_API_KEY,
    configuration: {
      baseURL: FALLBACK_BASE_URL,
    },
  });

  console.log(`🤖 Chat 已配置（主备自动切换）: ${DEEPSEEK_MODEL} → ${FALLBACK_MODEL}`);
  console.log(`   主: ${DEEPSEEK_BASE_URL} / 备: ${FALLBACK_BASE_URL}`);

  return buildFallbackChain(primary, fallback);
}

/**
 * 构建"主备自动切换"的模型链
 *
 * RunnableWithFallbacks 缺少 LangChain Agent 要求的两个能力，需要补齐：
 * 1. `_streamResponseChunks` — Agent 用 isBaseChatModel() 判断模型类型
 * 2. `bindTools` — Agent 绑定工具时调用；返回"两模型都绑定同一批工具"的新链
 *
 * 调用异常时 withFallbacks 自动切换到备用模型重试（invoke/stream 均生效）。
 */
function buildFallbackChain(primary: ChatOpenAI, fallback: ChatOpenAI): ChatOpenAI {
  const chain = primary.withFallbacks([fallback]) as unknown as ChatOpenAI & {
    bindTools: (tools: any, kwargs?: any) => ChatOpenAI;
    _streamResponseChunks: (messages: any, options: any, runManager?: any) => any;
  };

  chain._streamResponseChunks = (messages: any, options: any, runManager?: any) =>
    (primary as any)._streamResponseChunks(messages, options, runManager);

  chain.bindTools = (tools: any, kwargs?: any) =>
    buildFallbackChain(
      primary.bindTools(tools, kwargs) as unknown as ChatOpenAI,
      fallback.bindTools(tools, kwargs) as unknown as ChatOpenAI,
    );

  return chain;
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
  const hasFallback = !!(FALLBACK_API_KEY && FALLBACK_API_KEY !== 'your-deepseek-api-key-here');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧠 LLM 配置摘要');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Chat:     ${deepseekChatModel ? '✅ ' + DEEPSEEK_MODEL + (hasFallback ? ` → 备用 ${FALLBACK_MODEL}` : '（无备用）') : '❌ 未配置'}`);
  console.log(`  Embed:    ${embeddingModel ? '✅ ' + EMBEDDING_MODEL : '❌ 未配置'}`);
  console.log(`  Chat URL: ${DEEPSEEK_BASE_URL}`);
  console.log(`  Embed URL:${OPENAI_BASE_URL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}
