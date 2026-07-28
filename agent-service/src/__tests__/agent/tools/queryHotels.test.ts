/**
 * queryHotels 单元测试
 *
 * 测试酒店筛选逻辑（纯逻辑，不依赖外部 API）。
 */
import { describe, it, expect } from 'vitest';
import { HotelsAdapter } from '../../../agent/tools/queryHotels';

describe('HotelsAdapter — 酒店查询', () => {
  const adapter = new HotelsAdapter();

  it('name 为 "queryHotels"', () => {
    expect(adapter.name).toBe('queryHotels');
  });

  it('默认查询 → 返回所有 5 家酒店（按评分排序）', async () => {
    const result = await adapter.execute({});
    expect(result.city).toContain('赵县');
    expect(result.total).toBe(5);
    expect(result.hotels).toHaveLength(5);
    // 按评分降序排列
    for (let i = 1; i < result.hotels.length; i++) {
      const prev = parseFloat(result.hotels[i - 1].rating);
      const curr = parseFloat(result.hotels[i].rating);
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it('limit=2 → 返回 2 家酒店', async () => {
    const result = await adapter.execute({ limit: 2 });
    expect(result.hotels).toHaveLength(2);
    expect(result.total).toBe(5); // total 是筛选后总数
  });

  it('budget="经济型" → 只返回经济型', async () => {
    const result = await adapter.execute({ budget: '经济型' });
    expect(result.hotels.length).toBeGreaterThan(0);
    for (const hotel of result.hotels) {
      expect(hotel.type).toBe('经济型');
    }
  });

  it('budget="高档型" → 只返回高档型', async () => {
    const result = await adapter.execute({ budget: '高档型' });
    expect(result.hotels).toHaveLength(1);
    expect(result.hotels[0].name).toBe('石家庄希尔顿酒店');
  });

  it('budget="经济" (无"型"后缀) → 也能匹配', async () => {
    const result = await adapter.execute({ budget: '经济' });
    expect(result.hotels.length).toBeGreaterThan(0);
    for (const hotel of result.hotels) {
      expect(hotel.type).toBe('经济型');
    }
  });

  it('budget="未知类型" → 返回空 (无可匹配)', async () => {
    const result = await adapter.execute({ budget: '超级豪华型' });
    expect(result.hotels).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('每间酒店有完整字段', async () => {
    const result = await adapter.execute({ limit: 1 });
    const hotel = result.hotels[0];
    expect(hotel.name).toBeTruthy();
    expect(hotel.address).toBeTruthy();
    expect(hotel.type).toBeTruthy();
    expect(hotel.priceRange).toBeTruthy();
    expect(hotel.rating).toBeTruthy();
    expect(hotel.distance).toBeTruthy();
    expect(hotel.features.length).toBeGreaterThan(0);
  });

  it('经济型酒店数量 ≥ 3', async () => {
    const result = await adapter.execute({ budget: '经济型' });
    expect(result.total).toBeGreaterThanOrEqual(3);
  });
});
