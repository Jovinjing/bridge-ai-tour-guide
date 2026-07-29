/**
 * CaptchaCanvas — 图形验证码组件
 *
 * 白底画布，布满彩色干扰斜线，4 位字符（1 数字 + 3 小写字母）。
 * 点击画布刷新验证码。
 */
import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';

export interface CaptchaRef {
  /** 当前验证码字符串 */
  currentCode: string;
  /** 重新生成验证码 */
  refresh: () => void;
}

interface Props {
  /** 验证码变化回调 */
  onChange?: (code: string) => void;
  width?: number;
  height?: number;
}

/** 生成 1 位数字 + 3 位小写字母，保证相邻不重复 */
function generateCode(): string {
  const digits = '0123456789';
  const letters = 'abcdefghjkmnpqrstuvwxyz'; // 去掉易混淆的 i l o

  let code = '';
  code += digits[Math.floor(Math.random() * digits.length)];

  for (let i = 0; i < 3; i++) {
    const last = code[code.length - 1];
    let ch: string;
    do {
      ch = letters[Math.floor(Math.random() * letters.length)];
    } while (ch === last);
    code += ch;
  }

  return code;
}

const LINE_COLORS = ['#FF4444', '#22AA22', '#AA44AA', '#DDCC00', '#22AAAA'];
const CHAR_COLORS = ['#D32F2F', '#2E7D32', '#1565C0', '#E65100', '#6A1B9A', '#00838F'];

const CaptchaCanvas = forwardRef<CaptchaRef, Props>(
  ({ onChange, width = 120, height = 44 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const codeRef = useRef<string>('');

    const draw = useCallback((code: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // 白底
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);

      // —— 干扰斜线（在字符底层画一部分，字符上层再画一部分，体现线条穿插） ——

      // 底层干扰线
      for (let i = 0; i < 18; i++) {
        ctx.strokeStyle = LINE_COLORS[i % LINE_COLORS.length];
        ctx.lineWidth = 0.6 + Math.random() * 1.2;
        ctx.globalAlpha = 0.35 + Math.random() * 0.3;
        ctx.beginPath();
        const x1 = Math.random() * w;
        const y1 = Math.random() * h;
        const len = 20 + Math.random() * 50;
        const angle = (Math.random() - 0.5) * Math.PI * 0.8;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + Math.cos(angle) * len, y1 + Math.sin(angle) * len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // —— 4 位字符 ——
      const charW = w / 4;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      for (let i = 0; i < code.length; i++) {
        const x = charW * i + charW / 2;
        const y = h / 2 + (Math.random() - 0.5) * 8;

        ctx.fillStyle = CHAR_COLORS[i % CHAR_COLORS.length];
        ctx.font = `bold ${22 + Math.random() * 6}px Arial, sans-serif`;

        // 轻微旋转
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((Math.random() - 0.5) * 0.25);
        ctx.fillText(code[i], 0, 0);
        ctx.restore();
      }

      // —— 上层干扰线 ——
      for (let i = 0; i < 14; i++) {
        ctx.strokeStyle = LINE_COLORS[i % LINE_COLORS.length];
        ctx.lineWidth = 0.5 + Math.random() * 1.0;
        ctx.globalAlpha = 0.25 + Math.random() * 0.25;
        ctx.beginPath();
        const x1 = Math.random() * w;
        const y1 = Math.random() * h;
        const len = 15 + Math.random() * 45;
        const angle = (Math.random() - 0.5) * Math.PI * 0.8;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + Math.cos(angle) * len, y1 + Math.sin(angle) * len);
        ctx.stroke();
      }

      // 小噪点
      ctx.fillStyle = '#888888';
      ctx.globalAlpha = 0.2;
      for (let i = 0; i < 20; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;
    }, []);

    const refresh = useCallback(() => {
      const code = generateCode();
      codeRef.current = code;
      draw(code);
      onChange?.(code);
    }, [draw, onChange]);

    // 首次挂载生成
    useEffect(() => {
      refresh();
    }, [refresh]);

    useImperativeHandle(ref, () => ({
      get currentCode() { return codeRef.current; },
      refresh,
    }), [refresh]);

    return (
      <canvas
        ref={canvasRef}
        width={width * 2}
        height={height * 2}
        style={{
          width,
          height,
          cursor: 'pointer',
          borderRadius: 6,
          border: '1px solid #d9d9d9',
          display: 'block',
        }}
        onClick={refresh}
        title="点击刷新验证码"
      />
    );
  },
);

CaptchaCanvas.displayName = 'CaptchaCanvas';
export default CaptchaCanvas;
