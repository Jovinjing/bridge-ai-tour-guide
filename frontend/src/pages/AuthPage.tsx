/**
 * 登录/注册页 — 手机号 + 验证码登录
 *
 * 替换旧版 username/password 登录和微信 OAuth
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { sendCode, loginByCode } from '../api';

interface Props {
  onLogin: (token: string) => void;
}

export default function AuthPage({ onLogin }: Props) {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!phone || phone.length < 11) {
      setError('请输入正确的手机号');
      return;
    }
    setError('');
    try {
      await sendCode(phone);
      setCodeSent(true);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '发送验证码失败');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !code) return;
    setError('');
    setLoading(true);
    try {
      const res = await loginByCode(phone, code);
      onLogin(res.token);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-left">
          <div className="auth-left-bg" />
          <div className="auth-left-overlay" />
          <div className="auth-left-content">
            <div className="auth-left-text">
              <p className="auth-left-slogan">千年赵州桥 · 科普新体验</p>
              <p className="auth-left-sub">AI 导游带你穿越 1400 年</p>
            </div>
            <div className="auth-left-dots">
              <span className="auth-dot active" />
              <span className="auth-dot" />
              <span className="auth-dot" />
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-container">
            <div className="auth-brand-section">
              <div className="auth-brand-logo">
                <Icon name="bridge" size={28} />
              </div>
              <h1 className="auth-brand-title">ZhaoZhouBridge</h1>
              <p className="auth-brand-welcome">手机号登录 / 注册</p>
            </div>

            {error && <div className="auth-error-msg">{error}</div>}

            <form onSubmit={handleLogin} className="auth-form">
              <div className="auth-field">
                <label>手机号</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="11 位手机号"
                  maxLength={11}
                />
              </div>

              <div className="auth-field">
                <label>验证码</label>
                <div className="auth-code-row">
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="6 位验证码"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    className="auth-send-code-btn"
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                  >
                    {countdown > 0 ? `${countdown}s` : codeSent ? '重新发送' : '获取验证码'}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-submit" disabled={loading || !phone || !code}>
                {loading ? '登录中...' : '登录 / 注册'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
