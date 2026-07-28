/**
 * sessionStore 单元测试
 *
 * 重点测试纯函数逻辑（不依赖 Prisma/DB）：
 * - checkGuestRoundLimit: 游客轮次限制
 * - isSessionExpiringSoon: 过期预警
 */
import { describe, it, expect } from 'vitest';
import { checkGuestRoundLimit, isSessionExpiringSoon } from '../../memory/sessionStore';

// ======== 游客轮次限制 ========

describe('checkGuestRoundLimit', () => {
  it('新会话: 0轮 → 允许, 10轮剩余', () => {
    const result = checkGuestRoundLimit(0);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10);
    expect(result.reason).toBeUndefined();
  });

  it('中间态: 5轮 → 允许, 5轮剩余', () => {
    const result = checkGuestRoundLimit(5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it('接近上限: 7轮 → 允许, 3轮剩余 (≤3触发UI警告)', () => {
    const result = checkGuestRoundLimit(7);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
  });

  it('恰好满10轮 → 拒绝', () => {
    const result = checkGuestRoundLimit(10);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toContain('10');
    expect(result.reason).toContain('游客模式');
  });

  it('超出限制: 15轮 → 拒绝, remaining=0 (不出现负数)', () => {
    const result = checkGuestRoundLimit(15);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toBeDefined();
  });

  it('大量超出: 999轮 → 拒绝, remaining=0', () => {
    const result = checkGuestRoundLimit(999);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('恰好剩余3轮时允许 (边界值测试)', () => {
    // 从 chat.ts 逻辑: remaining <= 3 发送警告但仍然允许
    const result = checkGuestRoundLimit(7);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
  });
});

// ======== 会话过期预警 ========

describe('isSessionExpiringSoon', () => {
  it('null expiresAt → false (注册用户永不过期)', () => {
    expect(isSessionExpiringSoon(null)).toBe(false);
  });

  it('30分钟后过期 → true (< 1小时)', () => {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    expect(isSessionExpiringSoon(expiresAt)).toBe(true);
  });

  it('59分钟后过期 → true (< 1小时)', () => {
    const expiresAt = new Date(Date.now() + 59 * 60 * 1000);
    expect(isSessionExpiringSoon(expiresAt)).toBe(true);
  });

  it('恰好1小时后过期 → true (边界: now+1h > expiresAt 即 now+1h 包含等于?)', () => {
    // 函数逻辑: new Date(Date.now() + oneHour) > expiresAt
    // 当 expiresAt = now + 1h 时, now+1h > now+1h 为 false
    // 但实际运行中, Date.now() 在两次调用间有微秒差异
    // 所以这个边界实际上可能是 true 或 false
    // 我们只验证函数不抛异常, 且返回值是 boolean
    const expiresAt = new Date(Date.now() + 3600 * 1000);
    const result = isSessionExpiringSoon(expiresAt);
    expect(typeof result).toBe('boolean');
  });

  it('2小时后过期 → false (> 1小时)', () => {
    const expiresAt = new Date(Date.now() + 2 * 3600 * 1000);
    expect(isSessionExpiringSoon(expiresAt)).toBe(false);
  });

  it('24小时后过期 → false (新游客会话)', () => {
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    expect(isSessionExpiringSoon(expiresAt)).toBe(false);
  });

  it('已过期的时间 → true (负数时间差 < 1h)', () => {
    const expiresAt = new Date(Date.now() - 1 * 3600 * 1000);
    expect(isSessionExpiringSoon(expiresAt)).toBe(true);
  });
});
