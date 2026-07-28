/**
 * 工具注册表
 *
 * 将所有 ToolAdapter 注册为 LangChain DynamicStructuredTool，
 * 统一注入 AgentExecutor。
 *
 * 工具注册模式：
 * 1. 创建 ToolAdapter 实例
 * 2. 定义 Zod Schema 描述参数结构
 * 3. 调用 createLangChainTool() 生成 LangChain Tool
 */
import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { createLangChainTool } from './adapter';

// 导入所有适配器
import { SearchKnowledgeAdapter } from './searchKnowledge';
import { QueryProductsAdapter } from './queryProducts';
import { AmapRouteAdapter } from './planRoute';
import { QweatherAdapter } from './queryWeather';
import { HotelsAdapter } from './queryHotels';

// ======== 创建适配器实例 ========

const searchKnowledgeAdapter = new SearchKnowledgeAdapter();
const queryProductsAdapter = new QueryProductsAdapter();
const amapRouteAdapter = new AmapRouteAdapter();
const qweatherAdapter = new QweatherAdapter();
const hotelsAdapter = new HotelsAdapter();

// ======== 工具 Schema 定义 ========

const SearchKnowledgeSchema = z.object({
  query: z.string().describe('搜索查询文本。应使用自然语言描述用户想了解的内容，如"赵州桥的主拱跨度是多少？"'),
});

const QueryProductsSchema = z.object({
  keyword: z.string().optional().describe('商品关键词，如"冰箱贴""折扇""印章"'),
  category: z.string().optional().describe('商品分类：文具 | 摆件 | 服饰 | 食品 | 其他'),
  limit: z.number().optional().default(5).describe('返回数量上限'),
});

const PlanRouteSchema = z.object({
  origin: z.string().describe('出发地地址，如"北京西站""石家庄火车站"'),
  destination: z.string().optional().describe('目的地地址，默认为赵州桥'),
  transportMode: z.enum(['driving', 'transit', 'walking']).optional().default('transit')
    .describe('交通方式：driving=驾车, transit=公交地铁路线, walking=步行'),
});

const QueryWeatherSchema = z.object({
  city: z.string().optional().default('石家庄').describe('城市名称'),
  days: z.number().optional().default(3).describe('预报天数，1-3'),
});

const QueryHotelsSchema = z.object({
  city: z.string().optional().default('石家庄赵县').describe('城市名称'),
  budget: z.string().optional().describe('预算区间：经济型 | 舒适型 | 高档型'),
  limit: z.number().optional().default(5).describe('返回数量上限'),
});

// ======== 工具注册表 ========

/**
 * 全部 5 个工具
 */
export const allTools: DynamicStructuredTool[] = [
  createLangChainTool(searchKnowledgeAdapter, SearchKnowledgeSchema,
    '在赵州桥知识库中进行语义检索。当用户询问关于赵州桥的历史、建筑结构、文化背景、艺术特色、工程工艺等问题时使用此工具。query 参数应为自然语言描述的问题。返回最相关的知识文档片段。'),
  createLangChainTool(queryProductsAdapter, QueryProductsSchema,
    '查询赵州桥文创商品。当用户想买纪念品、询问商品价格或了解商品详情时使用。支持按关键词和分类筛选。category 可选值: 文具, 摆件, 服饰, 食品, 其他。'),
  createLangChainTool(amapRouteAdapter, PlanRouteSchema,
    '规划从出发地到赵州桥（河北省石家庄市赵县）的交通路线。当用户询问"怎么去""路线""交通方式"时使用。origin 为出发地，transportMode 为交通方式。'),
  createLangChainTool(qweatherAdapter, QueryWeatherSchema,
    '查询赵州桥所在地（河北石家庄赵县）的天气。当用户询问天气、气温、是否适合出行时使用。'),
  createLangChainTool(hotelsAdapter, QueryHotelsSchema,
    '查询赵县周边的酒店和住宿。当用户询问住宿、酒店、民宿时使用。budget 可选: 经济型, 舒适型, 高档型。'),
];

/**
 * 按名称查找工具
 */
export function getToolByName(name: string): DynamicStructuredTool | undefined {
  return allTools.find(t => t.name === name);
}

/**
 * 获取所有工具名称列表（用于调试）
 */
export function getToolNames(): string[] {
  return allTools.map(t => t.name);
}
