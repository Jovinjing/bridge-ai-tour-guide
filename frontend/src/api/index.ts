/**
 * 赵州桥AI科普导游 — 统一 API 服务层
 *
 * 对照 API.md 实现，所有后端接口的 TypeScript 封装。
 *
 * 响应格式：所有函数返回已解包的 data（通过 client.ts 的 request），
 * 调用方直接拿数据，错误统一由 ApiError 抛出。
 */
import { get, post, put, del } from './client';
import type {
  User, LoginResponse, Product, Ticket, TicketHeatmap,
  Order, CreateOrderRequest, Address, CreateAddressRequest,
  CartItem, Favorite, CulturalInfo, UploadResult,
  Session, ChatMessage, PageData, HealthStatus, ProductDisplay,
} from '../types';
import { matchLocalImage } from '../constants/bridgeData';

export { sendChatMessage, createSseConnection } from './sse';

// ─── ===== 健康检查 ===== ─────────────────────────────────────────

export function checkHealth(): Promise<HealthStatus> {
  return get('/health');
}

// ─── ===== 认证模块 ===== ─────────────────────────────────────────

/** 发送验证码 */
export function sendCode(phone: string, type: 'login' | 'register' | 'reset_password' = 'login'): Promise<null> {
  return post('/api/auth/send-code', { phone, type });
}

/** 验证码登录（新用户自动注册） */
export function loginByCode(phone: string, code: string): Promise<LoginResponse> {
  return post('/api/auth/login-by-code', { phone, code });
}

/** 密码登录 */
export function login(phone: string, password: string): Promise<LoginResponse> {
  return post('/api/auth/login', { phone, password });
}

/** 获取当前用户 */
export function getMe(): Promise<User> {
  return get('/api/auth/me');
}

/** 更新个人信息 */
export function updateMe(data: { nickname?: string; email?: string }): Promise<User> {
  return put('/api/auth/me', data);
}

/** 上传头像 */
export function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const form = new FormData();
  form.append('file', file);
  return post('/api/auth/avatar/upload', form);
}

// ─── ===== 商品模块 ===== ─────────────────────────────────────────

export interface GoodsListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  inStock?: boolean;
  sortBy?: 'price' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface GoodsListResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 商品列表 */
export function getGoods(params: GoodsListParams = {}): Promise<GoodsListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.keyword) qs.set('keyword', params.keyword);
  if (params.inStock) qs.set('inStock', 'true');
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.order) qs.set('order', params.order);
  return get(`/api/goods?${qs.toString()}`);
}

/**
 * 获取商品列表（前端展示格式）
 * 自动匹配本地图片
 */
export async function getGoodsDisplay(params: GoodsListParams = {}): Promise<{
  items: ProductDisplay[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const res = await getGoods(params);
  const fallbackImg = 'https://images.unsplash.com/photo-1608756077923-970e2b9f8851?w=400&h=300&fit=crop&auto=format';
  return {
    ...res,
    items: res.items.map(p => ({
      ...p,
      img: p.imageUrl || matchLocalImage(p.name) || fallbackImg,
      desc: p.description || '',
    })),
  };
}

/** 商品详情 */
export function getGoodsDetail(id: number): Promise<Product> {
  return get(`/api/goods/${id}`);
}

// ─── ===== 门票模块 ===== ─────────────────────────────────────────

/** 门票列表 */
export function getTickets(): Promise<Ticket[]> {
  return get('/api/tickets');
}

/** 门票详情 */
export function getTicketDetail(id: number): Promise<Ticket> {
  return get(`/api/tickets/${id}`);
}

/** 按类型筛选门票 */
export function getTicketsByType(type: string): Promise<Ticket[]> {
  return get(`/api/tickets/type/${encodeURIComponent(type)}`);
}

/** 热力图数据 */
export function getHeatmap(start: string, end: string): Promise<TicketHeatmap[]> {
  return get(`/api/tickets/heatmap?start=${start}&end=${end}`);
}

// ─── ===== 订单模块 ===== ─────────────────────────────────────────

/** 创建订单 */
export function createOrder(data: CreateOrderRequest): Promise<{ orderNo: string; totalAmount: number; status: string }> {
  return post('/api/orders', data);
}

/** 订单列表 */
export function getOrders(params: { status?: string; page?: number; pageSize?: number } = {}): Promise<PageData<Order>> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  return get(`/api/orders?${qs.toString()}`);
}

/** 订单详情 */
export function getOrderDetail(id: number): Promise<Order> {
  return get(`/api/orders/${id}`);
}

/** 支付 */
export function payOrder(id: number, payMethod: string = 'wechat'): Promise<{ status: string }> {
  return post(`/api/orders/${id}/pay`, { payMethod });
}

/** 取消订单 */
export function cancelOrder(id: number): Promise<null> {
  return post(`/api/orders/${id}/cancel`);
}

/** 退款 */
export function refundOrder(id: number): Promise<null> {
  return post(`/api/orders/${id}/refund`);
}

/** 按用户查询订单 */
export function getOrdersByUser(userId: number, params: { page?: number; pageSize?: number } = {}): Promise<PageData<Order>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  return get(`/api/orders/user/${userId}?${qs.toString()}`);
}

// ─── ===== 地址模块 ===== ─────────────────────────────────────────

/** 地址列表 */
export function getAddresses(): Promise<Address[]> {
  return get('/api/addresses');
}

/** 地址详情 */
export function getAddressDetail(id: number): Promise<Address> {
  return get(`/api/addresses/${id}`);
}

/** 新增地址 */
export function createAddress(data: CreateAddressRequest): Promise<Address> {
  return post('/api/addresses', data);
}

/** 更新地址 */
export function updateAddress(id: number, data: Partial<CreateAddressRequest>): Promise<Address> {
  return put(`/api/addresses/${id}`, data);
}

/** 删除地址 */
export function deleteAddress(id: number): Promise<null> {
  return del(`/api/addresses/${id}`);
}

// ─── ===== 购物车模块 ===== ───────────────────────────────────────

/** 获取购物车 */
export function getCart(): Promise<CartItem[]> {
  return get('/api/cart');
}

/** 添加商品到购物车 */
export function addToCart(productId: number, quantity: number = 1): Promise<CartItem> {
  return post('/api/cart', { productId, quantity });
}

/** 移除商品 */
export function removeFromCart(id: number): Promise<null> {
  return del(`/api/cart/${id}`);
}

// ─── ===== 文化内容 ===== ─────────────────────────────────────────

/** 内容列表 */
export function getCulturalList(params: { page?: number; pageSize?: number; category?: string } = {}): Promise<PageData<CulturalInfo>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.category) qs.set('category', params.category);
  return get(`/api/cultural?${qs.toString()}`);
}

/** 内容详情 */
export function getCulturalDetail(id: number): Promise<CulturalInfo> {
  return get(`/api/cultural/${id}`);
}

/** 全量资讯 */
export function getCulturalAll(): Promise<CulturalInfo[]> {
  return get('/api/cultural/all');
}

// ─── ===== 会话模块 ===== ─────────────────────────────────────────

/** 会话列表 */
export function getSessions(params: { page?: number; pageSize?: number } = {}): Promise<Session[]> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  return get(`/api/sessions?${qs.toString()}`);
}

/** 会话消息历史 */
export function getSessionDetail(id: string): Promise<{ id: string; title: string; messages: ChatMessage[] }> {
  return get(`/api/sessions/${id}`);
}

/** 更新会话 */
export function updateSession(id: string, data: { title: string }): Promise<null> {
  return put(`/api/sessions/${id}`, data);
}

/** 删除会话 */
export function deleteSession(id: string): Promise<null> {
  return del(`/api/sessions/${id}`);
}

// ─── ===== 收藏模块 ===== ─────────────────────────────────────────

/** 添加收藏 */
export function addFavorite(targetType: 'product' | 'ticket' | 'article', targetId: number): Promise<Favorite> {
  return post('/api/favorites', { targetType, targetId });
}

/** 我的收藏 */
export function getFavorites(params: { page?: number; pageSize?: number } = {}): Promise<PageData<Favorite>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  return get(`/api/favorites?${qs.toString()}`);
}

/** 取消收藏 */
export function deleteFavorite(id: number): Promise<null> {
  return del(`/api/favorites/${id}`);
}

// ─── ===== 文件上传 ===== ─────────────────────────────────────────

/** 通用文件上传 */
export function uploadFile(file: File, type: 'avatar' | 'document' | 'general' = 'general'): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('type', type);
  return post('/api/upload', form);
}
