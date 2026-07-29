/**
 * 登录/注册页 — 手机号 + 图形验证码 + 短信验证码
 *
 * 验证码流程：
 *   1. 用户输入手机号
 *   2. 用户识别图形验证码并输入
 *   3. 图形验证码通过后，方可点击"获取短信验证码"
 *   4. 输入短信验证码完成登录
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import CaptchaCanvas, { type CaptchaRef } from '../components/CaptchaCanvas';
import { sendCode, loginByCode } from '../api';

interface Props {
  onLogin: (token: string) => void;
}

export default function AuthPage({ onLogin }: Props) {
  const navigate = useNavigate();
  const captchaRef = useRef<CaptchaRef>(null);

  const [phone, setPhone] = useState('');
  // 图形验证码
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaPassed, setCaptchaPassed] = useState(false);
  // 短信验证码
  const [smsCode, setSmsCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /** 图形验证码生成/刷新时 */
  const handleCaptchaChange = () => {
    setCaptchaInput('');
    setCaptchaPassed(false);
  };

  /** 图形验证码输入变化 */
  const handleCaptchaInput = (value: string) => {
    // 只允许 4 位小写字母/数字
    const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4);
    setCaptchaInput(cleaned);
    setCaptchaPassed(cleaned.length === 4 && cleaned === (captchaRef.current?.currentCode ?? ''));
  };

  const handleSendCode = async () => {
    if (!phone || phone.length < 11) {
      setError('请输入正确的手机号');
      return;
    }
    if (!captchaPassed) {
      setError('请先输入正确的图形验证码');
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
    if (!phone || !smsCode) return;
    setError('');
    setLoading(true);
    try {
      const res = await loginByCode(phone, smsCode);
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

              {/* 图形验证码 */}
              <div className="auth-field">
                <label>图形验证码</label>
                <div className="auth-captcha-row">
                  <CaptchaCanvas ref={captchaRef} onChange={handleCaptchaChange} />
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={e => handleCaptchaInput(e.target.value)}
                    placeholder="输入验证码"
                    maxLength={4}
                    className={`auth-captcha-input ${captchaPassed ? 'captcha-ok' : captchaInput.length > 0 && !captchaPassed ? 'captcha-err' : ''}`}
                  />
                </div>
                <p className="auth-captcha-hint">点击验证码图片可刷新</p>
              </div>

              {/* 手机验证码 — 需要先通过图形验证码 */}
              <div className="auth-field">
                <label>短信验证码</label>
                <div className="auth-code-row">
                  <input
                    type="text"
                    value={smsCode}
                    onChange={e => setSmsCode(e.target.value)}
                    placeholder="6 位短信验证码"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    className="auth-send-code-btn"
                    onClick={handleSendCode}
                    disabled={countdown > 0 || !captchaPassed || phone.length < 11}
                  >
                    {!captchaPassed
                      ? '请完成验证'
                      : countdown > 0
                        ? `${countdown}s`
                        : codeSent
                          ? '重新发送'
                          : '获取验证码'}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-submit" disabled={loading || !phone || !smsCode}>
                {loading ? '登录中...' : '登录 / 注册'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
