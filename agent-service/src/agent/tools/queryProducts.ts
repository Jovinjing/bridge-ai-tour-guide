/**
 * 文创商品查询工具
 *
 * 直接查询 public schema 的 cultural_product 表，
 * 支持关键词搜索和分类筛选。
 */
import { ToolAdapter } from './adapter';
import { prisma } from '../../db/prisma';

interface QueryProductsParams {
  keyword?: string;
  category?: string;
  limit?: number;
}

interface ProductItem {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
}

interface QueryProductsResult {
  keyword?: string;
  category?: string;
  products: ProductItem[];
  total: number;
}

export class QueryProductsAdapter implements ToolAdapter<QueryProductsParams, QueryProductsResult> {
  name = 'queryProducts';

  async execute(params: QueryProductsParams): Promise<QueryProductsResult> {
    const { keyword, category, limit = 5 } = params;

    // 使用 $queryRawUnsafe 跨 schema 查询 public.cultural_product
    let sql = `SELECT id, name, category, description, price::text, stock, image_url FROM public.cultural_product WHERE status = 1`;
    const conditions: string[] = [];
    const values: any[] = [];

    if (keyword) {
      conditions.push(`(name ILIKE $${values.length + 1} OR description ILIKE $${values.length + 1})`);
      values.push(`%${keyword}%`);
    }
    if (category) {
      conditions.push(`category = $${values.length + 1}`);
      values.push(category);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    sql += ` ORDER BY id DESC LIMIT $${values.length + 1}`;
    values.push(limit);

    const rows = await prisma.$queryRawUnsafe<Array<{
      id: number;
      name: string;
      category: string;
      description: string | null;
      price: string;
      stock: number;
      image_url: string | null;
    }>>(sql, ...values);

    const products: ProductItem[] = rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      description: r.description || '',
      price: parseFloat(r.price),
      stock: r.stock,
      imageUrl: r.image_url || undefined,
    }));

    return {
      keyword,
      category,
      products,
      total: products.length,
    };
  }
}
