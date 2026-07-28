/**
 * ToolAdapter + createLangChainTool 单元测试
 *
 * 测试适配器工厂和 LangChain Tool 创建。
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createLangChainTool, ToolAdapter } from '../../../agent/tools/adapter';

// ======== Mock Adapter ========

interface EchoParams {
  text: string;
  repeat: number;
}

class EchoAdapter implements ToolAdapter<EchoParams, string> {
  name = 'echo';

  async execute(params: EchoParams): Promise<string> {
    return params.text.repeat(params.repeat);
  }
}

const EchoSchema = z.object({
  text: z.string().describe('要重复的文本'),
  repeat: z.number().min(1).max(10).describe('重复次数'),
});

describe('createLangChainTool — 工具工厂', () => {
  it('创建的工具有正确的 name', () => {
    const adapter = new EchoAdapter();
    const tool = createLangChainTool(adapter, EchoSchema, '回显测试工具');
    expect(tool.name).toBe('echo');
  });

  it('创建的工具包含 description', () => {
    const adapter = new EchoAdapter();
    const tool = createLangChainTool(adapter, EchoSchema, '回显测试工具');
    expect(tool.description).toBe('回显测试工具');
  });

  it('创建的工具包含正确的 schema', () => {
    const adapter = new EchoAdapter();
    const tool = createLangChainTool(adapter, EchoSchema, '回显测试工具');
    expect(tool.schema).toBe(EchoSchema);
  });

  it('工具执行返回 string (JSON 序列化非字符串结果)', async () => {
    const adapter = new EchoAdapter();
    const tool = createLangChainTool(adapter, EchoSchema, '回显');

    const result = await tool.func({ text: 'Hi', repeat: 2 });
    expect(result).toBe('HiHi');
    expect(typeof result).toBe('string');
  });

  it('对象结果自动 JSON.stringify', async () => {
    // 创建一个返回对象的 adapter
    interface ObjParams { key: string }
    class ObjAdapter implements ToolAdapter<ObjParams, Record<string, unknown>> {
      name = 'objTest';
      async execute(params: ObjParams): Promise<Record<string, unknown>> {
        return { result: params.key, count: 42 };
      }
    }
    const ObjSchema = z.object({ key: z.string() });
    const tool = createLangChainTool(new ObjAdapter(), ObjSchema, '对象结果测试');

    const result = await tool.func({ key: 'test' });
    expect(typeof result).toBe('string');
    const parsed = JSON.parse(result);
    expect(parsed.result).toBe('test');
    expect(parsed.count).toBe(42);
  });

  it('ToolAdapter 接口约束: 必须有 name 和 execute', () => {
    // 编译期检查, 运行时验证:
    const adapter: ToolAdapter<{ x: number }, number> = {
      name: 'test',
      execute: async (p) => p.x * 2,
    };
    expect(adapter.name).toBe('test');
    expect(typeof adapter.execute).toBe('function');
  });
});
