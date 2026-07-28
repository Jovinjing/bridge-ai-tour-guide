/**
 * 工具适配层接口
 *
 * 为每个外部依赖（REST API、数据库）提供统一接口，
 * 一期以 LangChain DynamicStructuredTool 方式注册到 Agent，
 * 二期底层可切换为 MCP 协议而不影响 Agent 代码。
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

// ======== 适配器接口 ========

export interface ToolAdapter<TParams, TResult> {
  /** 工具名称（与 Agent prompt 中的描述对应） */
  name: string;
  /** 执行工具逻辑 */
  execute(params: TParams): Promise<TResult>;
}

// ======== Zod Schema → DynamicStructuredTool 工厂 ========

/**
 * 将 ToolAdapter + Zod Schema 组装成 LangChain DynamicStructuredTool
 */
export function createLangChainTool<TParams extends Record<string, any>, TResult>(
  adapter: ToolAdapter<TParams, TResult>,
  schema: z.ZodSchema<TParams>,
  description: string,
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: adapter.name,
    description,
    schema,
    func: async (params: TParams) => {
      const result = await adapter.execute(params);
      // LangChain 要求返回 string
      return typeof result === 'string' ? result : JSON.stringify(result);
    },
  });
}

// ======== 工具描述常量 ========
// 这些描述直接告诉 LLM 什么场景下调用哪个工具

export const TOOL_DESCRIPTIONS: Record<string, string> = {
  searchKnowledge:
    '在赵州桥知识库中进行语义检索。当用户询问关于赵州桥的历史、建筑结构、' +
    '文化背景、艺术特色、工程工艺等问题时使用。query 参数应为自然语言问句。' +
    '返回最相关的文档片段及相似度分数。',

  queryProducts:
    '查询赵州桥文创商品信息。当用户想购买纪念品、询问商品价格、' +
    '了解商品详情时使用。支持按关键词搜索和分类筛选。' +
    'category 可选值: 文具, 摆件, 服饰, 食品, 其他。',

  planRoute:
    '使用高德地图规划从出发地到赵州桥（河北省石家庄市赵县）的交通路线。' +
    '当用户询问"怎么去""路线规划""交通方式"时使用。' +
    'origin 为出发地地址，transportMode 可选: driving, transit, walking。',

  queryWeather:
    '查询赵州桥所在地（河北省石家庄市赵县）的天气信息。' +
    '当用户询问天气、气温、是否适合出行时使用。' +
    '支持查询当天天气或未来几日预报。',

  queryHotels:
    '查询赵县周边的酒店住宿信息。当用户询问住宿、酒店、民宿时使用。' +
    '提供酒店名称、地址、价格区间、评分等基本信息。',
};
