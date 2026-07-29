/**
 * AiChatPanel.test.tsx — AI 聊天面板单元测试
 *
 * 覆盖：欢迎屏 / 快速提问 / 消息渲染 / 输入与发送 /
 *       流式状态 / 错误处理 / ContentBlocks 集成 /
 *       语音控制 / 自动提问触发
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiChatPanel from './AiChatPanel';

// ─── Mock 子组件 ─────────────────────────────────────────────────────
vi.mock('./Icon', () => ({
  default: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

vi.mock('./MarkdownRenderer', () => ({
  default: ({ text }: { text: string }) => (
    <div data-testid="markdown-renderer">{text}</div>
  ),
}));

// ─── Mock API ────────────────────────────────────────────────────────
const mockAbort = vi.fn();
const mockSendChatMessage = vi.fn(() => ({ abort: mockAbort }));

vi.mock('../api', () => ({
  sendChatMessage: (...args: unknown[]) => mockSendChatMessage(...args),
  createSseConnection: vi.fn(() => vi.fn()),
}));

// ─── Mock 浏览器 API ──────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockAbort.mockClear();

  // window.speechSynthesis
  Object.defineProperty(window, 'speechSynthesis', {
    value: { speak: vi.fn(), cancel: vi.fn() },
    writable: true,
    configurable: true,
  });

  // window.SpeechRecognition 不可用（大多数测试模拟不支持）
  Object.defineProperty(window, 'SpeechRecognition', {
    value: undefined,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, 'webkitSpeechRecognition', {
    value: undefined,
    writable: true,
    configurable: true,
  });
});

// =====================================================================
// 初始渲染 — 欢迎屏幕
// =====================================================================
describe('初始渲染 — 欢迎屏幕', () => {
  it('无初始组件时显示欢迎屏', () => {
    render(<AiChatPanel sessionId="sid-1" />);

    expect(screen.getByText('欢迎来到赵州桥')).toBeInTheDocument();
    // AI 导游同时出现在标题和欢迎语中
    const aiTexts = screen.getAllByText(/AI 导游/);
    expect(aiTexts.length).toBeGreaterThanOrEqual(2);
  });

  it('显示三个快速提问按钮', () => {
    render(<AiChatPanel sessionId="sid-1" />);

    expect(screen.getByText('了解主拱')).toBeInTheDocument();
    expect(screen.getByText('文创推荐')).toBeInTheDocument();
    expect(screen.getByText('路线规划')).toBeInTheDocument();
  });

  it('聊天头部显示标题和副标题', () => {
    render(<AiChatPanel sessionId="sid-1" />);

    expect(screen.getByText('赵州桥 AI 导游')).toBeInTheDocument();
    expect(screen.getByText('随时向我提问')).toBeInTheDocument();
  });

  it('输入框存在且可交互', () => {
    render(<AiChatPanel sessionId="sid-1" />);
    const input = screen.getByPlaceholderText('输入你的问题...');
    expect(input).toBeInTheDocument();
    expect(input).not.toBeDisabled();
  });

  it('发送按钮初始为禁用状态（无输入）', () => {
    render(<AiChatPanel sessionId="sid-1" />);
    expect(screen.getByText('发送')).toBeDisabled();
  });
});

// =====================================================================
// 快速提问
// =====================================================================
describe('快速提问', () => {
  it('点击快速提问按钮发送消息', async () => {
    const user = userEvent.setup();
    render(<AiChatPanel sessionId="sid-1" />);

    // 为 sendChatMessage 提供可立即解析的模拟
    mockSendChatMessage.mockImplementation((_msg: string, _sid: string, cbs: {
      onDone?: (data: unknown) => void;
      onError?: () => void;
      onException?: () => void;
    }) => {
      // 模拟异步回复
      setTimeout(() => cbs.onDone?.({ sessionId: 'sid-1', totalTokens: 10 }), 10);
      return { abort: mockAbort };
    });

    await user.click(screen.getByText('了解主拱'));

    // 用户消息应出现（按钮绑定的是"请介绍一下赵州桥的主拱结构"）
    await waitFor(() => {
      expect(screen.getByText('请介绍一下赵州桥的主拱结构')).toBeInTheDocument();
    });
  });

  it('快速提问后关闭欢迎屏', async () => {
    const user = userEvent.setup();
    render(<AiChatPanel sessionId="sid-1" />);

    mockSendChatMessage.mockImplementation((_msg: string, _sid: string, cbs: {
      onDone?: (data: unknown) => void;
    }) => {
      setTimeout(() => cbs.onDone?.({ sessionId: 'sid-1', totalTokens: 10 }), 10);
      return { abort: mockAbort };
    });

    await user.click(screen.getByText('文创推荐'));

    await waitFor(() => {
      expect(screen.queryByText('欢迎来到赵州桥')).not.toBeInTheDocument();
    });
  });
});

// =====================================================================
// 消息渲染
// =====================================================================
describe('消息渲染', () => {
  it('用户消息显示在面板中', async () => {
    const user = userEvent.setup();
    render(<AiChatPanel sessionId="sid-1" />);

    mockSendChatMessage.mockImplementation((_msg: string, _sid: string, cbs: {
      onDone?: (data: unknown) => void;
    }) => {
      setTimeout(() => cbs.onDone?.({ sessionId: 'sid-1', totalTokens: 10 }), 10);
      return { abort: mockAbort };
    });

    const input = screen.getByPlaceholderText('输入你的问题...');
    await user.type(input, '赵州桥有多长？');
    await user.click(screen.getByText('发送'));

    await waitFor(() => {
      expect(screen.getByText('赵州桥有多长？')).toBeInTheDocument();
    });
  });
});

// =====================================================================
// 输入与发送
// =====================================================================
describe('输入与发送', () => {
  it('空输入阻止提交', async () => {
    const user = userEvent.setup();
    render(<AiChatPanel sessionId="sid-1" />);

    const input = screen.getByPlaceholderText('输入你的问题...');
    await user.type(input, '   ');
    await user.click(screen.getByText('发送'));

    // sendChatMessage 不应被调用
    expect(mockSendChatMessage).not.toHaveBeenCalled();
  });

  it('发送后清空输入框', async () => {
    const user = userEvent.setup();
    render(<AiChatPanel sessionId="sid-1" />);

    mockSendChatMessage.mockImplementation((_msg: string, _sid: string, cbs: {
      onDone?: (data: unknown) => void;
    }) => {
      setTimeout(() => cbs.onDone?.({ sessionId: 'sid-1', totalTokens: 10 }), 10);
      return { abort: mockAbort };
    });

    const input = screen.getByPlaceholderText('输入你的问题...');
    await user.type(input, '你好');
    await user.click(screen.getByText('发送'));

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });
});

// =====================================================================
// 流式状态
// =====================================================================
describe('流式状态', () => {
  it('发送消息后显示"AI导游正在思考"状态', async () => {
    const user = userEvent.setup();
    render(<AiChatPanel sessionId="sid-1" />);

    // 不立即回调 onToken，保持 streaming 状态
    mockSendChatMessage.mockImplementation((_msg: string, _sid: string, _cbs: unknown) => {
      return { abort: mockAbort };
    });

    const input = screen.getByPlaceholderText('输入你的问题...');
    await user.type(input, '你好');
    await user.click(screen.getByText('发送'));

    expect(screen.getByText('AI导游正在思考...')).toBeInTheDocument();
  });

  it('流式接收 token 时状态文本消失', async () => {
    const user = userEvent.setup();
    render(<AiChatPanel sessionId="sid-1" />);

    mockSendChatMessage.mockImplementation((_msg: string, _sid: string, cbs: {
      onToken?: (content: string) => void;
      onDone?: (data: unknown) => void;
    }) => {
      // 先发 token，再 done
      setTimeout(() => {
        cbs.onToken?.('赵');
        setTimeout(() => cbs.onDone?.({ sessionId: 'sid-1', totalTokens: 10 }), 5);
      }, 10);
      return { abort: mockAbort };
    });

    const input = screen.getByPlaceholderText('输入你的问题...');
    await user.type(input, '桥');
    await user.click(screen.getByText('发送'));

    // 状态文本应该消失
    await waitFor(() => {
      expect(screen.queryByText('AI导游正在思考...')).not.toBeInTheDocument();
    });
  });

  it('流式渲染 token 内容', async () => {
    const user = userEvent.setup();
    render(<AiChatPanel sessionId="sid-1" />);

    let onTokenCb: ((content: string) => void) | undefined;
    mockSendChatMessage.mockImplementation((_msg: string, _sid: string, cbs: {
      onToken?: (content: string) => void;
      onDone?: (data: unknown) => void;
    }) => {
      onTokenCb = cbs.onToken;
      setTimeout(() => cbs.onDone?.({ sessionId: 'sid-1', totalTokens: 10 }), 50);
      return { abort: mockAbort };
    });

    await user.type(screen.getByPlaceholderText('输入你的问题...'), '桥');
    await user.click(screen.getByText('发送'));

    // 模拟收到 token
    await waitFor(() => {
      expect(onTokenCb).toBeDefined();
    });
    onTokenCb!('赵州桥建于隋代');

    await waitFor(() => {
      expect(screen.getByText('赵州桥建于隋代')).toBeInTheDocument();
    });
  });

  it('streaming 时发送按钮禁用', async () => {
    const user = userEvent.setup();
    render(<AiChatPanel sessionId="sid-1" />);

    mockSendChatMessage.mockImplementation(() => {
      return { abort: mockAbort };
    });

    const input = screen.getByPlaceholderText('输入你的问题...');
    await user.type(input, '测试');
    await user.click(screen.getByText('发送'));

    // streaming 中...
    expect(screen.getByText('...')).toBeDisabled();
  });
});

// =====================================================================
// 错误处理
// =====================================================================
describe('错误处理', () => {
  it('onError 时显示错误消息占位', async () => {
    const user = userEvent.setup();
    render(<AiChatPanel sessionId="sid-1" />);

    mockSendChatMessage.mockImplementation((_msg: string, _sid: string, cbs: {
      onError?: () => void;
    }) => {
      setTimeout(() => cbs.onError?.(), 10);
      return { abort: mockAbort };
    });

    const input = screen.getByPlaceholderText('输入你的问题...');
    await user.type(input, '会出错吗');
    await user.click(screen.getByText('发送'));

    await waitFor(() => {
      expect(screen.getByText('抱歉，AI导游服务暂时不可用，请稍后重试。')).toBeInTheDocument();
    });
  });
});

// =====================================================================
// ContentBlocks 集成
// =====================================================================
describe('ContentBlocks 集成', () => {
  it('onDone 携带 contentBlocks 时渲染', async () => {
    const user = userEvent.setup();
    render(<AiChatPanel sessionId="sid-1" />);

    mockSendChatMessage.mockImplementation((_msg: string, _sid: string, cbs: {
      onDone?: (data: { contentBlocks: unknown[] }) => void;
    }) => {
      setTimeout(() => cbs.onDone?.({
        sessionId: 'sid-1',
        totalTokens: 20,
        contentBlocks: [
          { type: 'weather', city: '赵县', temp: 28, icon: '☀️' },
        ],
      }), 10);
      return { abort: mockAbort };
    });

    const input = screen.getByPlaceholderText('输入你的问题...');
    await user.type(input, '天气如何');
    await user.click(screen.getByText('发送'));

    await waitFor(() => {
      expect(screen.getByText('28°C')).toBeInTheDocument();
    });
  });
});

// =====================================================================
// componentKey 自动提问
// =====================================================================
describe('componentKey 自动提问', () => {
  it('componentKey > 0 时自动发送问题', async () => {
    mockSendChatMessage.mockImplementation((msg: string, _sid: string, _cbs: unknown) => {
      return { abort: mockAbort };
    });

    render(
      <AiChatPanel
        sessionId="sid-1"
        initialComponent="主拱"
        componentKey={1}
      />
    );

    // 等待自动提问触发
    await waitFor(() => {
      expect(mockSendChatMessage).toHaveBeenCalled();
      const callArg = mockSendChatMessage.mock.calls[0][0];
      expect(callArg).toContain('主拱');
    });
  });

  it('componentKey 变化时自动重新提问', async () => {
    mockSendChatMessage.mockImplementation((msg: string, _sid: string, _cbs: unknown) => {
      return { abort: mockAbort };
    });

    // 先以 key=1 渲染
    const { rerender } = render(
      <AiChatPanel
        sessionId="sid-1"
        initialComponent="主拱"
        componentKey={1}
      />
    );

    // 改为 key=2
    rerender(
      <AiChatPanel
        sessionId="sid-1"
        initialComponent="栏板"
        componentKey={2}
      />
    );

    await waitFor(() => {
      // 第二次调用应包含新的组件名
      const calls = mockSendChatMessage.mock.calls;
      const lastCall = calls[calls.length - 1][0] as string;
      expect(lastCall).toContain('栏板');
    });
  });
});

// =====================================================================
// 语音控制
// =====================================================================
describe('语音控制', () => {
  it('浏览器支持 TTS 时显示语音开关按钮', () => {
    // speechSynthesis 已在 beforeEach 中 mock 为存在
    render(<AiChatPanel sessionId="sid-1" />);
    // 开关按钮 title 为 '开启语音朗读' / '关闭语音朗读'
    expect(screen.getByTitle('开启语音朗读')).toBeInTheDocument();
  });

  it('浏览器不支持 TTS 时不显示语音开关按钮', () => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    render(<AiChatPanel sessionId="sid-1" />);
    expect(screen.queryByTitle('开启语音朗读')).not.toBeInTheDocument();
    expect(screen.queryByTitle('关闭语音朗读')).not.toBeInTheDocument();
  });
});

// =====================================================================
// 组件卸载清理
// =====================================================================
describe('组件卸载清理', () => {
  it('有活跃请求时卸载自动 abort', async () => {
    const user = userEvent.setup();
    mockSendChatMessage.mockReturnValue({ abort: mockAbort });
    const { unmount } = render(<AiChatPanel sessionId="sid-1" />);

    // 先触发一次发送，让 abortRef.current 有值
    await user.type(screen.getByPlaceholderText('输入你的问题...'), '测试');
    await user.click(screen.getByText('发送'));

    unmount();
    expect(mockAbort).toHaveBeenCalled();
  });

  it('卸载时取消语音合成', () => {
    const cancelSpy = vi.spyOn(window.speechSynthesis, 'cancel');
    const { unmount } = render(<AiChatPanel sessionId="sid-1" />);
    unmount();
    expect(cancelSpy).toHaveBeenCalled();
  });
});
