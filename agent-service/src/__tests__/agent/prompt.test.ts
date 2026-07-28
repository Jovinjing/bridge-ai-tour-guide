/**
 * System Prompt 单元测试
 */
import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPT, buildMessages } from '../../agent/prompt';

describe('SYSTEM_PROMPT — 内容完整性', () => {
  it('非空', () => {
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it('包含核心职责段', () => {
    expect(SYSTEM_PROMPT).toContain('【核心职责】');
  });

  it('包含讲解原则', () => {
    expect(SYSTEM_PROMPT).toContain('【讲解原则】');
    expect(SYSTEM_PROMPT).toContain('准确性');
    expect(SYSTEM_PROMPT).toContain('生动性');
    expect(SYSTEM_PROMPT).toContain('层次性');
    expect(SYSTEM_PROMPT).toContain('互动性');
    expect(SYSTEM_PROMPT).toContain('文化性');
  });

  it('包含工具使用策略', () => {
    expect(SYSTEM_PROMPT).toContain('【工具使用策略】');
    expect(SYSTEM_PROMPT).toContain('searchKnowledge');
    expect(SYSTEM_PROMPT).toContain('queryProducts');
    expect(SYSTEM_PROMPT).toContain('planRoute');
    expect(SYSTEM_PROMPT).toContain('queryWeather');
    expect(SYSTEM_PROMPT).toContain('queryHotels');
  });

  it('包含回答格式段', () => {
    expect(SYSTEM_PROMPT).toContain('【回答格式】');
  });

  it('包含配图规则', () => {
    expect(SYSTEM_PROMPT).toContain('【配图规则】');
  });

  it('包含行为边界', () => {
    expect(SYSTEM_PROMPT).toContain('【行为边界】');
  });

  it('包含关键数据 (赵州桥主拱跨度)', () => {
    expect(SYSTEM_PROMPT).toContain('37.02');
  });
});

describe('buildMessages — 消息模板', () => {
  it('返回长度为 4 的消息数组', () => {
    const messages = buildMessages();
    expect(messages).toHaveLength(4);
  });

  it('第一条为 system 消息', () => {
    const messages = buildMessages();
    expect(messages[0][0]).toBe('system');
  });

  it('第二条为 chat_history 占位符', () => {
    const messages = buildMessages();
    expect(messages[1][0]).toBe('placeholder');
    expect(messages[1][1]).toBe('{chat_history}');
  });

  it('第三条为 human 消息', () => {
    const messages = buildMessages();
    expect(messages[2][0]).toBe('human');
    expect(messages[2][1]).toBe('{input}');
  });

  it('第四条为 agent_scratchpad 占位符', () => {
    const messages = buildMessages();
    expect(messages[3][0]).toBe('placeholder');
    expect(messages[3][1]).toBe('{agent_scratchpad}');
  });

  it('自定义 systemPrompt → 第一条为自定义内容', () => {
    const custom = '你是一个翻译助手。';
    const messages = buildMessages(custom);
    expect(messages[0][1]).toBe(custom);
  });
});
