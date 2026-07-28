/**
 * planRoute 单元测试
 *
 * 降级测试: AMAP_API_KEY 未配置时的 graceful degradation。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const originalEnv = { ...process.env };

describe('AmapRouteAdapter — 降级行为', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.AMAP_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('AMAP_API_KEY 未配置 → 返回降级提示', async () => {
    const { AmapRouteAdapter } = await import('../../../agent/tools/planRoute');
    const adapter = new AmapRouteAdapter();
    const result = await adapter.execute({
      origin: '北京西站',
    });

    expect(result.origin).toBe('北京西站');
    expect(result.destination).toContain('赵州桥');
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].description).toContain('未配置');
    expect(result.routes[0].steps[0]).toContain('.env');
  });

  it('降级时仍然保留传入的参数', async () => {
    const { AmapRouteAdapter } = await import('../../../agent/tools/planRoute');
    const adapter = new AmapRouteAdapter();
    const result = await adapter.execute({
      origin: '石家庄火车站',
      destination: '赵县赵州桥',
      transportMode: 'driving',
    });

    expect(result.origin).toBe('石家庄火车站');
    expect(result.destination).toBe('赵县赵州桥');
    expect(result.transportMode).toBe('driving');
  });

  it('默认 transportMode = transit', async () => {
    const { AmapRouteAdapter } = await import('../../../agent/tools/planRoute');
    const adapter = new AmapRouteAdapter();
    const result = await adapter.execute({ origin: 'test' });

    expect(result.transportMode).toBe('transit');
  });

  it('name 为 "planRoute"', async () => {
    const { AmapRouteAdapter } = await import('../../../agent/tools/planRoute');
    const adapter = new AmapRouteAdapter();
    expect(adapter.name).toBe('planRoute');
  });
});

describe('AmapRouteAdapter — 网络错误降级', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.AMAP_API_KEY = 'test-key-456';
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('网络异常时 → 返回降级路线提示', async () => {
    const { AmapRouteAdapter } = await import('../../../agent/tools/planRoute');
    const adapter = new AmapRouteAdapter();
    const result = await adapter.execute({ origin: '北京' });

    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].description).toContain('查询异常');
    expect(result.routes[0].description).toContain('Connection refused');
  });
});

describe('AmapRouteAdapter — API 错误 status', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.AMAP_API_KEY = 'test-key-456';
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        status: '0',
        info: 'INVALID_USER_KEY',
      }),
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('API 返回 status != 1 → 返回失败描述', async () => {
    const { AmapRouteAdapter } = await import('../../../agent/tools/planRoute');
    const adapter = new AmapRouteAdapter();
    const result = await adapter.execute({ origin: '北京' });

    expect(result.routes[0].description).toContain('查询失败');
    expect(result.routes[0].description).toContain('INVALID_USER_KEY');
  });
});
