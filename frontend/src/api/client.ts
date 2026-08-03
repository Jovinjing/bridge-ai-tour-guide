/**
 * API 客户端 — fetch 封装
 *
 * 统一处理：
 * - JWT 自动附 Header
 * - {code, message, data} 解包
 * - 401 自动跳登录
 * - 错误统一抛出
 */
// ApiResponse type used for response typing in generic functions below

const BASE = '';
const TOKEN_KEY = 'auth_token';

// ─── Token 管理 ────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── SessionId 管理 ────────────────────────────────────────────────

export function getSessionId(): string {
  let sid = localStorage.getItem('sessionId');
  if (sid) return sid;
  sid = crypto.randomUUID();
  localStorage.setItem('sessionId', sid);
  return sid;
}

// ─── 请求工具 ──────────────────────────────────────────────────────

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** 跳过自动 401 跳登录 */
  skipAuthRedirect?: boolean;
  /** 返回原始 Response 而非解包后的 data */
  raw?: boolean;
  signal?: AbortSignal;
}

class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuthRedirect, raw, signal } = options;

  const token = getToken();
  const finalHeaders: Record<string, string> = { ...headers };

  if (token) {
    finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (body && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (raw) {
    return resp as unknown as T;
  }

  // 非 JSON 响应
  const contentType = resp.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!resp.ok) throw new ApiError(5000, `HTTP ${resp.status}`);
    return { code: 0, message: 'success', data: null } as unknown as T;
  }

  // HTTP 错误（NestJS 返回 { statusCode, message, error }）
  if (!resp.ok) {
    let errorBody: Record<string, unknown> = {};
    try { errorBody = await resp.json(); } catch { /* 非 JSON 响应体 */ }
    throw new ApiError(
      (errorBody.statusCode as number) ?? 5000,
      (errorBody.message as string) ?? (errorBody.error as string) ?? `HTTP ${resp.status}`,
    );
  }

  const json = await resp.json();

  // 兼容两种响应格式：
  //   1. NestJS 裸数据格式：{ items, total, ... }（无 code 字段）
  //   2. 标准 { code, message, data } 包装格式
  if (typeof json.code === 'undefined') {
    return json as T;
  }

  if (json.code !== 0) {
    if (json.code === 1002 && !skipAuthRedirect) {
      clearToken();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    throw new ApiError(json.code, json.message);
  }

  return json.data;
}

// ─── Convenience 方法 ──────────────────────────────────────────────

export function get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>(path, { ...options, method: 'GET' });
}

export function post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>(path, { ...options, method: 'POST', body });
}

export function put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>(path, { ...options, method: 'PUT', body });
}

export function del<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>(path, { ...options, method: 'DELETE' });
}

export { ApiError };
export type { RequestOptions };
