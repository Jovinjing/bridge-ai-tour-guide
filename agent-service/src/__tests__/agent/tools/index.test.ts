/**
 * 工具注册表单元测试
 *
 * 测试 allTools 正确注册、getToolByName 查找逻辑。
 */
import { describe, it, expect } from 'vitest';
import { allTools, getToolByName, getToolNames } from '../../../agent/tools';

describe('工具注册表', () => {
  it('allTools 包含 5 个工具', () => {
    expect(allTools).toHaveLength(5);
  });

  it('所有工具都有 name 和 description', () => {
    for (const tool of allTools) {
      expect(tool.name).toBeTruthy();
      expect(tool.name.length).toBeGreaterThan(0);
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it('所有工具都有有效的 schema', () => {
    for (const tool of allTools) {
      expect(tool.schema).toBeDefined();
    }
  });

  it('所有工具都有 func 方法', () => {
    for (const tool of allTools) {
      expect(typeof tool.func).toBe('function');
    }
  });

  it('getToolNames 返回 5 个名称', () => {
    const names = getToolNames();
    expect(names).toHaveLength(5);
  });

  it('所有工具名称唯一', () => {
    const names = getToolNames();
    expect(new Set(names).size).toBe(5);
  });

  it('getToolByName("searchKnowledge") → 返回对应工具', () => {
    const tool = getToolByName('searchKnowledge');
    expect(tool).toBeDefined();
    expect(tool!.name).toBe('searchKnowledge');
  });

  it('getToolByName("queryProducts") → 返回对应工具', () => {
    const tool = getToolByName('queryProducts');
    expect(tool).toBeDefined();
    expect(tool!.name).toBe('queryProducts');
  });

  it('getToolByName("planRoute") → 返回对应工具', () => {
    const tool = getToolByName('planRoute');
    expect(tool).toBeDefined();
    expect(tool!.name).toBe('planRoute');
  });

  it('getToolByName("queryWeather") → 返回对应工具', () => {
    const tool = getToolByName('queryWeather');
    expect(tool).toBeDefined();
    expect(tool!.name).toBe('queryWeather');
  });

  it('getToolByName("queryHotels") → 返回对应工具', () => {
    const tool = getToolByName('queryHotels');
    expect(tool).toBeDefined();
    expect(tool!.name).toBe('queryHotels');
  });

  it('getToolByName("nonExistent") → undefined', () => {
    const tool = getToolByName('nonExistent');
    expect(tool).toBeUndefined();
  });

  it('getToolByName("") → undefined', () => {
    const tool = getToolByName('');
    expect(tool).toBeUndefined();
  });

  it('所有工具有不同的 name (不重复)', () => {
    const nameSet = new Set<string>();
    for (const tool of allTools) {
      expect(nameSet.has(tool.name)).toBe(false);
      nameSet.add(tool.name);
    }
  });
});
