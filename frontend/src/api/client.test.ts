/**
 * client.test.ts — API 客户端单元测试
 *
 * TDD Red-Green-Refactor 原则：
 * 1. 先写失败测试（Red）
 * 2. 写最少代码通过（Green）
 * 3. 重构不改行为
 *
 * 覆盖：Token 管理 / SessionId / 请求构造 / 响应解包 / 错误处理
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getToken, setToken, clearToken, getSessionId } from './client';
import { get, post, put, del, ApiError } from './client';
import type { ApiResponse } from '../types';

// ─── 辅助：模拟 fetch ────────────────────────────────────────────────
function mockFetch(status: number, body: unknown, headers?: Record<string, string>) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        headers?.[name.toLowerCase()] ?? 'application/json',
    },
    json: () => Promise.resolve(body),
    clone: () => null,
  });
}

// ─── localStorage 模拟 ───────────────────────────────────────────────
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// =====================================================================
// Token 管理
// =====================================================================
describe('Token 管理', () => {
  it('setToken 写入 localStorage', () => {
    setToken('test-token');
    expect(localStorage.getItem('auth_token')).toBe('test-token');
  });

  it('getToken 读取 localStorage', () => {
    localStorage.setItem('auth_token', 'saved-token');
    expect(getToken()).toBe('saved-token');
  });

  it('getToken 无 token 返回 null', () => {
    expect(getToken()).toBeNull();
  });

  it('clearToken 移除 localStorage', () => {
    localStorage.setItem('auth_token', 'to-clear');
    clearToken();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});

// =====================================================================
// SessionId 管理
// =====================================================================
describe('SessionId 管理', () => {
  it('getSessionId 返回已存在的 sessionId', () => {
    localStorage.setItem('sessionId', 'existing-sid');
    expect(getSessionId()).toBe('existing-sid');
  });

  it('getSessionId 不存在时生成新 UUID 并持久化', () => {
    // 注：crypto.randomUUID 由 jsdom 提供模拟
    const sid = getSessionId();
    expect(sid).toBeTruthy();
    expect(typeof sid).toBe('string');
    expect(localStorage.getItem('sessionId')).toBe(sid);
  });

  it('getSessionId 多次调用返回相同值', () => {
    const a = getSessionId();
    const b = getSessionId();
    expect(a).toBe(b);
  });
});

// =====================================================================
// 请求构造 — get
// =====================================================================
describe('GET 请求', () => {
  it('发送 GET 请求到正确路径', async () => {
    const fetch = mockFetch(200, { code: 0, message: 'ok', data: null });
    vi.stubGlobal('fetch', fetch);
    await get('/api/test');
    expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({ method: 'GET' }));
  });

  it('有 token 时附带 Authorization header', async () => {
    localStorage.setItem('auth_token', 'my-jwt');
    const fetch = mockFetch(200, { code: 0, message: 'ok', data: null });
    vi.stubGlobal('fetch', fetch);
    await get('/api/secure');
    expect(fetch).toHaveBeenCalledWith(
      '/api/secure',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-jwt' }),
      }),
    );
  });

  it('无 token 时不带 Authorization header', async () => {
    const fetch = mockFetch(200, { code: 0, message: 'ok', data: null });
    vi.stubGlobal('fetch', fetch);
    await get('/api/public');
    const callHeaders = (fetch.mock.calls[0][1] as Record<string, unknown>).headers as Record<string, string>;
    expect(callHeaders.Authorization).toBeUndefined();
  });
});

// =====================================================================
// 请求构造 — post / put / del
// =====================================================================
describe('POST / PUT / DELETE 请求', () => {
  it('POST 发送 JSON body', async () => {
    const fetch = mockFetch(200, { code: 0, message: 'ok', data: { id: 1 } });
    vi.stubGlobal('fetch', fetch);
    await post('/api/create', { name: 'hello' });
    expect(fetch).toHaveBeenCalledWith(
      '/api/create',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'hello' }),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('POST 无 body 时不设 Content-Type', async () => {
    const fetch = mockFetch(200, { code: 0, message: 'ok', data: null });
    vi.stubGlobal('fetch', fetch);
    await post('/api/no-body');
    const callHeaders = (fetch.mock.calls[0][1] as Record<string, unknown>).headers as Record<string, string>;
    expect(callHeaders['Content-Type']).toBeUndefined();
  });

  it('POST FormData 不设 Content-Type（浏览器自动设置）', async () => {
    const fetch = mockFetch(200, { code: 0, message: 'ok', data: null });
    vi.stubGlobal('fetch', fetch);
    const fd = new FormData();
    fd.append('file', new Blob(['test']));
    await post('/api/upload', fd);
    const callHeaders = (fetch.mock.calls[0][1] as Record<string, unknown>).headers as Record<string, string>;
    expect(callHeaders['Content-Type']).toBeUndefined();
    expect((fetch.mock.calls[0][1] as Record<string, unknown>).body).toBeInstanceOf(FormData);
  });

  it('PUT 发送 JSON body', async () => {
    const fetch = mockFetch(200, { code: 0, message: 'ok', data: null });
    vi.stubGlobal('fetch', fetch);
    await put('/api/update/1', { nickname: 'new' });
    expect(fetch).toHaveBeenCalledWith(
      '/api/update/1',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ nickname: 'new' }) }),
    );
  });

  it('DELETE 发送 DELETE 请求', async () => {
    const fetch = mockFetch(200, { code: 0, message: 'ok', data: null });
    vi.stubGlobal('fetch', fetch);
    await del('/api/items/1');
    expect(fetch).toHaveBeenCalledWith(
      '/api/items/1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

// =====================================================================
// 响应解包
// =====================================================================
describe('响应解包', () => {
  it('成功时返回 json.data', async () => {
    const fetch = mockFetch(200, { code: 0, message: 'ok', data: { id: 42 } });
    vi.stubGlobal('fetch', fetch);
    const result = await get<{ id: number }>('/api/test');
    expect(result).toEqual({ id: 42 });
  });

  it('raw: true 时返回原始 Response', async () => {
    const fetch = mockFetch(200, { code: 0, message: 'ok', data: null });
    vi.stubGlobal('fetch', fetch);
    const result = await get('/api/raw', { raw: true });
    expect(result).toHaveProperty('ok', true);
    // result 应该是 Response 对象本身
  });

  it('非 JSON 响应（ok）返回默认成功', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'text/plain' },
    });
    vi.stubGlobal('fetch', fetch);
    const result = await get('/api/text');
    expect(result).toEqual({ code: 0, message: 'success', data: null });
  });

  it('非 JSON 响应（!ok）抛出 ApiError', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => 'text/plain' },
    });
    vi.stubGlobal('fetch', fetch);
    await expect(get('/api/error')).rejects.toThrow(ApiError);
    await expect(get('/api/error')).rejects.toThrow('HTTP 500');
  });
});

// =====================================================================
// 错误处理
// =====================================================================
describe('错误处理', () => {
  it('业务错误（code !== 0）抛出 ApiError', async () => {
    const fetch = mockFetch(200, { code: 4001, message: '参数错误' });
    vi.stubGlobal('fetch', fetch);
    await expect(get('/api/bad')).rejects.toThrow(ApiError);
    await expect(get('/api/bad')).rejects.toThrow('参数错误');
  });

  it('ApiError 携带正确 code', async () => {
    const fetch = mockFetch(200, { code: 4010, message: '未授权' });
    vi.stubGlobal('fetch', fetch);
    try {
      await get('/api/unauth');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe(4010);
    }
  });

  it('code 1002 清除 token', async () => {
    localStorage.setItem('auth_token', 'expired-jwt');
    const fetch = mockFetch(200, { code: 1002, message: 'token 过期' });
    vi.stubGlobal('fetch', fetch);
    try { await get('/api/expired'); } catch { /* 期望抛出 */ }
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('code 1002 + skipAuthRedirect 不清除 token', async () => {
    localStorage.setItem('auth_token', 'some-jwt');
    const fetch = mockFetch(200, { code: 1002, message: 'token 过期' });
    vi.stubGlobal('fetch', fetch);
    try { await get('/api/expired', { skipAuthRedirect: true }); } catch { /* 期望抛出 */ }
    // token 应该被保留
    expect(localStorage.getItem('auth_token')).toBe('some-jwt');
  });

  it('网络异常时 fetch 抛出', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('NetworkError')));
    await expect(get('/api/down')).rejects.toThrow('NetworkError');
  });
});

// =====================================================================
// ApiError 类
// =====================================================================
describe('ApiError', () => {
  it('实例化携带 code 和 message', () => {
    const err = new ApiError(404, 'Not Found');
    expect(err.code).toBe(404);
    expect(err.message).toBe('Not Found');
    expect(err.name).toBe('ApiError');
  });
});
