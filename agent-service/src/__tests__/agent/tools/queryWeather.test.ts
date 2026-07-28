/**
 * queryWeather 单元测试
 *
 * 降级测试: QWEATHER_API_KEY 未配置时的 graceful degradation。
 * 网络错误时的 fallback。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const originalEnv = { ...process.env };

describe('QweatherAdapter — 降级行为', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.QWEATHER_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('QWEATHER_API_KEY 未配置 → 返回降级预报', async () => {
    const { QweatherAdapter } = await import('../../../agent/tools/queryWeather');
    const adapter = new QweatherAdapter();
    const result = await adapter.execute({ city: '石家庄' });

    expect(result.city).toBe('石家庄');
    expect(result.forecasts).toHaveLength(1);
    expect(result.forecasts[0].weather).toContain('API 未配置');
    expect(result.forecasts[0].tempMax).toBeTruthy();
    expect(result.forecasts[0].suggestion).toContain('春秋');
  });

  it('降级预报包含游览建议', async () => {
    const { QweatherAdapter } = await import('../../../agent/tools/queryWeather');
    const adapter = new QweatherAdapter();
    const result = await adapter.execute({});

    expect(result.forecasts[0].suggestion.length).toBeGreaterThan(20);
  });

  it('name 为 "queryWeather"', async () => {
    const { QweatherAdapter } = await import('../../../agent/tools/queryWeather');
    const adapter = new QweatherAdapter();
    expect(adapter.name).toBe('queryWeather');
  });
});

describe('QweatherAdapter — API 调用失败降级', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.QWEATHER_API_KEY = 'test-key-123';
    // Mock fetch 模拟网络失败
    global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('网络错误时 → 降级返回错误信息', async () => {
    const { QweatherAdapter } = await import('../../../agent/tools/queryWeather');
    const adapter = new QweatherAdapter();
    const result = await adapter.execute({ city: '石家庄' });

    expect(result.city).toBe('石家庄');
    expect(result.forecasts).toHaveLength(1);
    expect(result.forecasts[0].weather).toContain('查询失败');
    expect(result.forecasts[0].weather).toContain('Network timeout');
  });
});

describe('QweatherAdapter — API 正常响应', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.QWEATHER_API_KEY = 'test-key-123';
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        code: '200',
        updateTime: '2026-07-28T08:00+08:00',
        daily: [
          {
            fxDate: '2026-07-28',
            tempMax: '35',
            tempMin: '24',
            textDay: '晴',
            textNight: '多云',
            windDirDay: '南风',
            windScaleDay: '3',
            humidity: '50',
          },
          {
            fxDate: '2026-07-29',
            tempMax: '33',
            tempMin: '23',
            textDay: '多云',
            textNight: '阴',
            windDirDay: '东南风',
            windScaleDay: '2',
            humidity: '60',
          },
        ],
      }),
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('正常响应 → 返回天气预报数组', async () => {
    const { QweatherAdapter } = await import('../../../agent/tools/queryWeather');
    const adapter = new QweatherAdapter();
    const result = await adapter.execute({ city: '石家庄', days: 2 });

    expect(result.city).toBe('石家庄');
    expect(result.forecasts).toHaveLength(2);
    expect(result.forecasts[0].tempMax).toBe('35°C');
    expect(result.forecasts[0].weather).toBe('晴 / 多云');
  });

  it('晴天 → 建议包含"非常适合"', async () => {
    const { QweatherAdapter } = await import('../../../agent/tools/queryWeather');
    const adapter = new QweatherAdapter();
    const result = await adapter.execute({});

    expect(result.forecasts[0].suggestion).toContain('非常适合');
  });
});

describe('QweatherAdapter — API 返回错误 code', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.QWEATHER_API_KEY = 'test-key-123';
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        code: '400',
      }),
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('API 返回非 200 code → forecasts 为空', async () => {
    const { QweatherAdapter } = await import('../../../agent/tools/queryWeather');
    const adapter = new QweatherAdapter();
    const result = await adapter.execute({});

    expect(result.forecasts).toHaveLength(0);
  });
});
