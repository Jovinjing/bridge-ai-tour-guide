// ===================================================================
// 赵州桥AI科普导游系统 — 前端类型定义
// ===================================================================

// ─── 通用 API 响应 ───────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface PageData<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

// ─── 认证 / 用户 ─────────────────────────────────────────────────────
export interface User {
  id: number;
  nickname: string | null;
  avatarUrl: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface UserProfile {
  id: number;
  userId: number;
  nickname: string | null;
  avatarUrl: string | null;
  preferences: Record<string, unknown> | null;
}

// ─── 商品 ────────────────────────────────────────────────────────────
export interface Product {
  id: number;
  name: string;
  category: string;
  description: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// 前端展示用（含本地图片映射）
export interface ProductDisplay extends Product {
  img: string;
  desc: string;
}

// ─── 门票 ────────────────────────────────────────────────────────────
export interface Ticket {
  id: number;
  name: string;
  type: string;
  price: number;
  stock: number;
  description: string | null;
  validPeriod: string | null;
  status: number;
}

export interface TicketHeatmap {
  date: string;
  timeSlot: string;
  count: number;
}

// ─── 订单 ────────────────────────────────────────────────────────────
export interface Order {
  id: number;
  orderNo: string;
  userId: number;
  orderType: 'ticket' | 'cultural';
  itemId: number;
  itemName: string | null;
  price: number;
  quantity: number;
  totalAmount: number;
  status: OrderStatus;
  payMethod: string | null;
  payTime: string | null;
  addressId: number | null;
  visitDate: string | null;
  visitTimeSlot: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDING' | 'REFUNDED';

export interface CreateOrderRequest {
  orderType: 'ticket' | 'cultural';
  itemId: number;
  quantity: number;
  visitDate?: string;
  visitTimeSlot?: string;
  addressId?: number;
}

// ─── 地址 ────────────────────────────────────────────────────────────
export interface Address {
  id: number;
  userId: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressRequest {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

// ─── 购物车 ──────────────────────────────────────────────────────────
export interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  product: Product;
}

// ─── 收藏 ────────────────────────────────────────────────────────────
export interface Favorite {
  id: number;
  userId: number;
  targetType: 'product' | 'ticket' | 'article';
  targetId: number;
  createdAt: string;
}

// ─── 文化内容 ────────────────────────────────────────────────────────
export interface CulturalInfo {
  id: number;
  title: string;
  category: string;
  content: string;
  coverImage: string | null;
  author: string | null;
  source: string | null;
  publishTime: string | null;
  viewCount: number;
  status: number;
  createdAt: string;
  updatedAt: string;
}

// ─── 文件上传 ────────────────────────────────────────────────────────
export interface UploadResult {
  fileId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
}

// ─── 会话 / AI 对话 ──────────────────────────────────────────────────
export interface Session {
  id: string;
  userId: number | null;
  guestId: string | null;
  sessionType: 'guest' | 'registered';
  title: string | null;
  messageCount: number;
  lastActivityAt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  sessionId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string | null;
  contentBlocks: ContentBlock[] | null;
  toolCalls: ToolCall[] | null;
  createdAt: string;
}

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  resultSummary: string;
}

// ─── 富媒体块 ────────────────────────────────────────────────────────
export type ContentBlock =
  | TextBlock
  | ImageBlock
  | RouteBlock
  | ProductCardBlock
  | WeatherBlock;

export interface TextBlock {
  type: 'text';
  content: string;
}

export interface ImageBlock {
  type: 'image';
  url: string;
  caption?: string;
}

export interface RouteBlock {
  type: 'route';
  provider: string;
  origin: { name: string; lng: number; lat: number };
  destination: { name: string; lng: number; lat: number };
  duration: string;
  distance: string;
  steps: RouteStep[];
}

export interface RouteStep {
  mode: string;
  from: string;
  to: string;
  duration: string;
}

export interface ProductCardBlock {
  type: 'product_card';
  productId: number;
  name: string;
  price: number;
  imageUrl: string;
}

export interface WeatherBlock {
  type: 'weather';
  city: string;
  temp: number;
  icon: string;
}

// ─── SSE 事件 ────────────────────────────────────────────────────────
export type SseStatusType = 'thinking' | 'tool_call' | 'tool_result';

export interface SseStatusData {
  type: SseStatusType;
  message?: string;
  tool?: string;
  args?: Record<string, unknown>;
  found?: number;
}

export interface SseDoneData {
  sessionId: string;
  totalTokens: number;
  contentBlocks?: ContentBlock[];
}

export interface SseErrorData {
  code: string;
  message: string;
}

// ─── 桥梁构件 ────────────────────────────────────────────────────────
export interface BridgeComponent {
  id: string;
  name: string;
  category: 'structure' | 'art';
  desc: string;
}

// ─── 全景热点 ────────────────────────────────────────────────────────
export interface Hotspot {
  id: string;
  name: string;
  theta: number;
  phi: number;
  color: string;
}

// ─── 行程规划 ────────────────────────────────────────────────────────
export interface ItineraryItem {
  id: number;
  date: string;
  time: string;
  activity: string;
}

// ─── 选购商品（前端购物车用，即将迁移到后端） ────────────────────────
export interface CartItemLocal {
  product: ProductDisplay;
  qty: number;
}

// ─── 健康检查 ────────────────────────────────────────────────────────
export interface HealthStatus {
  status: string;
  services: {
    nestjs: boolean;
    agent: boolean;
    postgres: boolean;
  };
}

// ─── 预约打卡 ────────────────────────────────────────────────────────
export interface Reservation {
  id: number;
  userId: number;
  date: string;
  timeSlot: string;
  remark: string | null;
}
