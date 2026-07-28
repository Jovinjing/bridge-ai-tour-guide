import { useState, useRef, useEffect, useCallback } from 'react';
import { sendChatMessage } from '../api';
import { getSessionId } from '../api/client';
import Icon from './Icon';
import MarkdownRenderer from './MarkdownRenderer';
import ContentBlocks from './ContentBlocks';
import type { User, SseStatusData, SseDoneData, ContentBlock, BridgeComponent } from '../types';

interface Props {
  sessionId: string;
  initialComponent?: string;
  componentKey?: number;
  onComponentClick?: (comp: BridgeComponent) => void;
  user?: User | null;
}

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contentBlocks?: ContentBlock[];
  isStreaming?: boolean;
}

export default function AiChatPanel({ sessionId, initialComponent, componentKey, onComponentClick, user }: Props) {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusText, setStatusText] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 语音
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const browserSupport = {
    stt: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    tts: !!window.speechSynthesis,
  };

  // 自动滚动
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // 语音朗读
  const speakText = useCallback((text: string) => {
    if (!ttsEnabled || !text) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#\[\]()`>|]/g, '').trim();
    if (!clean) return;
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'zh-CN';
    utter.rate = 1.1;
    window.speechSynthesis.speak(utter);
  }, [ttsEnabled]);

  // 语音输入
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const sendQuestion = useCallback((text: string) => {
    abortRef.current?.abort();
    window.speechSynthesis?.cancel();

    const userMsg: LocalMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const aiMsg: LocalMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', isStreaming: true };
    setMessages(prev => [...prev, userMsg, aiMsg]);
    setIsStreaming(true);
    setStatusText('AI导游正在思考...');

    const controller = sendChatMessage(text, sessionId, {
      onStatus: (data: SseStatusData) => {
        if (data.type === 'thinking') {
          setStatusText('AI导游正在思考...');
        } else if (data.type === 'tool_call') {
          setStatusText(`正在调用 ${data.tool}...`);
        } else if (data.type === 'tool_result') {
          setStatusText(`已获取相关信息`);
        }
      },
      onToken: (content: string) => {
        setStatusText('');
        setMessages(prev => {
          const idx = prev.length - 1;
          if (idx < 0 || prev[idx].role !== 'assistant') return prev;
          const updated = [...prev];
          updated[idx] = { ...updated[idx], content: updated[idx].content + content };
          return updated;
        });
      },
      onDone: (data: SseDoneData) => {
        setIsStreaming(false);
        setStatusText('');
        setMessages(prev => {
          const idx = prev.length - 1;
          if (idx < 0) return prev;
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            isStreaming: false,
            contentBlocks: data.contentBlocks,
          };
          return updated;
        });
        if (ttsEnabled && data.contentBlocks?.length) {
          const textBlock = data.contentBlocks.find(b => b.type === 'text');
          if (textBlock?.type === 'text') speakText(textBlock.content);
        }
      },
      onError: () => {
        setIsStreaming(false);
        setStatusText('');
        setMessages(prev => {
          const idx = prev.length - 1;
          if (idx < 0) return prev;
          const updated = [...prev];
          if (updated[idx].role === 'assistant' && !updated[idx].content) {
            updated[idx] = { ...updated[idx], content: '抱歉，AI导游服务暂时不可用，请稍后重试。', isStreaming: false };
          }
          return updated;
        });
      },
      onException: () => {
        setIsStreaming(false);
        setStatusText('');
      },
    });
    abortRef.current = controller;
  }, [sessionId, ttsEnabled, speakText]);

  // componentKey 变化 → 自动提问
  useEffect(() => {
    if (initialComponent && componentKey && componentKey > 0) {
      abortRef.current?.abort();
      setIsStreaming(false);
      setTimeout(() => {
        sendQuestion(`请介绍一下赵州桥的【${initialComponent}】部分`);
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    sendQuestion(text);
  };

  const handleQuickQuestion = (text: string) => {
    sendQuestion(text);
  };

  return (
    <div className="chat-panel">
      {/* 头部 */}
      <div className="chat-header">
        <div className="chat-header-info">
          <span className="chat-avatar"><Icon name="bridge" size={16} /></span>
          <div>
            <div className="chat-title">赵州桥 AI 导游</div>
            <div className="chat-subtitle">
              {isStreaming ? '正在回答...' : '随时向我提问'}
            </div>
          </div>
        </div>
        <div className="chat-header-actions">
          {browserSupport.tts && (
            <button
              className={`voice-toggle-btn ${ttsEnabled ? 'active' : ''}`}
              onClick={() => setTtsEnabled(v => !v)}
              title={ttsEnabled ? '关闭语音朗读' : '开启语音朗读'}
            >
              <Icon name={ttsEnabled ? 'megaphone' : 'megaphoneOff'} size={18} />
            </button>
          )}
          {isStreaming && (
            <div className="streaming-indicator">
              <span className="dot-pulse" />
            </div>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && !initialComponent && (
          <div className="chat-welcome">
            <div className="welcome-icon"><Icon name="bridge" size={32} /></div>
            <h3>欢迎来到赵州桥</h3>
            <p>我是 AI 导游，可以帮你了解赵州桥的历史、建筑结构和文化价值。</p>
            <div className="welcome-suggestions">
              <button onClick={() => handleQuickQuestion('请介绍一下赵州桥的主拱结构')}>
                <Icon name="wrench" size={14} /> 了解主拱
              </button>
              <button onClick={() => handleQuickQuestion('赵州桥有什么纪念品推荐？')}>
                <Icon name="shoppingCart" size={14} /> 文创推荐
              </button>
              <button onClick={() => handleQuickQuestion('怎么去赵州桥？')}>
                <Icon name="mapPinSearch" size={14} /> 路线规划
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user'
                ? (user?.avatarUrl
                    ? <img src={user.avatarUrl} alt="" className="chat-user-avatar" referrerPolicy="no-referrer" />
                    : <Icon name="userRound" size={16} />)
                : <Icon name="bridge" size={16} />}
            </div>
            <div className="message-content">
              <div className="message-text">
                {msg.content ? (
                  <div style={{ position: 'relative' }}>
                    <MarkdownRenderer text={msg.content} />
                    {msg.isStreaming && <span className="cursor-blink">|</span>}
                  </div>
                ) : (
                  msg.isStreaming && (
                    <span className="thinking-dots">思考中<span>.</span><span>.</span><span>.</span></span>
                  )
                )}
              </div>
              {/* contentBlocks */}
              {msg.contentBlocks && msg.contentBlocks.length > 0 && (
                <ContentBlocks blocks={msg.contentBlocks} />
              )}
              {/* 朗读按钮 */}
              {!msg.isStreaming && msg.role === 'assistant' && msg.content && browserSupport.tts && (
                <button
                  className="msg-speak-btn"
                  onClick={() => speakText(msg.content!)}
                  title="朗读此消息"
                >
                  <Icon name="megaphone" size={14} /> 朗读
                </button>
              )}
            </div>
          </div>
        ))}

        {/* 状态提示 */}
        {statusText && (
          <div className="tool-status">
            <span>{statusText}</span>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <form className="chat-input-area" onSubmit={handleSubmit}>
        {browserSupport.stt && (
          <button
            type="button"
            className={`voice-input-btn ${isListening ? 'listening' : ''}`}
            onClick={startListening}
            disabled={isStreaming}
            title={isListening ? '点击停止录音' : '语音输入'}
          >
            {isListening ? (
              <svg width="18" height="18" fill="none" stroke="#ffffff" strokeWidth={2} viewBox="0 0 24 24">
                <rect x="6" y="4" width="12" height="16" rx="2" />
              </svg>
            ) : (
              <svg width="18" height="18" fill="#ffffff" viewBox="0 0 24 24">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M9 18.93A7.004 7.004 0 0 1 5 12H3a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12h-2a7.004 7.004 0 0 1-4 6.93V17a3 3 0 0 0-6 0v1.93z" />
              </svg>
            )}
          </button>
        )}
        <input
          type="text"
          className="chat-input"
          placeholder={isStreaming ? 'AI导游正在回答...' : (isListening ? '正在聆听...' : '输入你的问题...')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isStreaming}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={isStreaming || !input.trim()}
        >
          {isStreaming ? '...' : '发送'}
        </button>
      </form>
    </div>
  );
}
