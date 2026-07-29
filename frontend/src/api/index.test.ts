/**
 * index.test.ts — API 服务层单元测试
 *
 * 覆盖：所有 14 个模块端点 / 查询参数构造 / 商品图片映射 /
 *       FormData 上传 / SSE 重导出
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// 在 mock 之前 import 类型
import type { GoodsListParams } from './index';

// ─── mock client.ts ──────────────────────────────────────────────────
vi.mock('./client', () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockPut = vi.fn();
  const mockDel = vi.fn();
  return {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    del: mockDel,
    getToken: vi.fn(() => null),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    getSessionId: vi.fn(() => 'mock-sid'),
    ApiError: class extends Error {
      code: number;
      constructor(code: number, message: string) {
        super(message);
        this.code = code;
        this.name = 'ApiError';
      }
    },
  };
});

// ─── mock sse.ts ────────────────────────────────────────────────────
vi.mock('./sse', () => ({
  sendChatMessage: vi.fn(() => ({ abort: vi.fn() })),
  createSseConnection: vi.fn(() => vi.fn()),
}));

// mock bridgeData 中的 matchLocalImage
vi.mock('../constants/bridgeData', () => ({
  matchLocalImage: vi.fn((name: string) => {
    const map: Record<string, string> = {
      '赵州桥模型': '/images/model.jpg',
      '明信片': '/images/postcard.jpg',
    };
    return map[name] || null;
  }),
}));

// 在 mock 后 import 被测试模块
import {
  checkHealth, sendCode, loginByCode, login, getMe, updateMe, uploadAvatar,
  getGoods, getGoodsDetail, getGoodsDisplay,
  getTickets, getTicketDetail, getTicketsByType, getHeatmap,
  createOrder, getOrders, getOrderDetail, payOrder, cancelOrder, refundOrder,
  getAddresses, getAddressDetail, createAddress, updateAddress, deleteAddress,
  getCart, addToCart, removeFromCart,
  getCulturalList, getCulturalDetail, getCulturalAll,
  getSessions, getSessionDetail, updateSession, deleteSession,
  addFavorite, getFavorites, deleteFavorite,
  uploadFile,
  sendChatMessage, createSseConnection,
} from './index';

import { get, post, put, del } from './client';

beforeEach(() => {
  vi.clearAllMocks();
});

// =====================================================================
// 健康检查
// =====================================================================
describe('健康检查', () => {
  it('GET /health', () => {
    checkHealth();
    expect(get).toHaveBeenCalledWith('/health');
  });
});

// =====================================================================
// 认证模块
// =====================================================================
describe('认证模块', () => {
  it('sendCode POST /api/auth/send-code', () => {
    sendCode('13800138000', 'login');
    expect(post).toHaveBeenCalledWith('/api/auth/send-code', { phone: '13800138000', type: 'login' });
  });

  it('sendCode 默认 type 为 login', () => {
    sendCode('13800138000');
    expect(post).toHaveBeenCalledWith('/api/auth/send-code', { phone: '13800138000', type: 'login' });
  });

  it('loginByCode POST /api/auth/login-by-code', () => {
    loginByCode('13800138000', '123456');
    expect(post).toHaveBeenCalledWith('/api/auth/login-by-code', { phone: '13800138000', code: '123456' });
  });

  it('login POST /api/auth/login', () => {
    login('13800138000', 'pass123');
    expect(post).toHaveBeenCalledWith('/api/auth/login', { phone: '13800138000', password: 'pass123' });
  });

  it('getMe GET /api/auth/me', () => {
    getMe();
    expect(get).toHaveBeenCalledWith('/api/auth/me');
  });

  it('updateMe PUT /api/auth/me', () => {
    updateMe({ nickname: 'newName', email: 'a@b.com' });
    expect(put).toHaveBeenCalledWith('/api/auth/me', { nickname: 'newName', email: 'a@b.com' });
  });

  it('uploadAvatar POST FormData', () => {
    const file = new File(['test'], 'avatar.png', { type: 'image/png' });
    uploadAvatar(file);
    const callArg = (post as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArg[0]).toBe('/api/auth/avatar/upload');
    expect(callArg[1]).toBeInstanceOf(FormData);
    expect(callArg[1].get('file')).toBe(file);
  });
});

// =====================================================================
// 商品模块
// =====================================================================
describe('商品模块', () => {
  it('getGoods GET /api/goods', () => {
    getGoods();
    expect(get).toHaveBeenCalledWith('/api/goods?');
  });

  it('getGoods 完整参数', () => {
    const params: GoodsListParams = {
      page: 1, pageSize: 10, keyword: '赵州桥',
      inStock: true, sortBy: 'price', order: 'asc',
    };
    getGoods(params);
    expect(get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/goods\?/),
    );
    const callUrl = (get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(callUrl).toContain('page=1');
    expect(callUrl).toContain('pageSize=10');
    expect(callUrl).toContain('keyword=' + encodeURIComponent('赵州桥'));
    expect(callUrl).toContain('inStock=true');
    expect(callUrl).toContain('sortBy=price');
    expect(callUrl).toContain('order=asc');
  });

  it('getGoods 部分参数', () => {
    getGoods({ page: 2 });
    const callUrl = (get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(callUrl).toContain('page=2');
    expect(callUrl).not.toContain('keyword');
  });

  it('getGoodsDetail GET /api/goods/:id', () => {
    getGoodsDetail(5);
    expect(get).toHaveBeenCalledWith('/api/goods/5');
  });
});

// =====================================================================
// 商品展示映射
// =====================================================================
describe('getGoodsDisplay 图片映射', () => {
  it('匹配到本地图片时使用本地图', async () => {
    (get as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [{ id: 1, name: '赵州桥模型', imageUrl: null, description: null }],
      total: 1, page: 1, pageSize: 10, totalPages: 1,
    });
    const result = await getGoodsDisplay();
    expect(result.items[0].img).toBe('/images/model.jpg');
    expect(result.items[0].desc).toBe('');
  });

  it('有 imageUrl 时优先使用后端图片', async () => {
    (get as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [{ id: 2, name: '某商品', imageUrl: 'https://cdn.example.com/real.jpg', description: null }],
      total: 1, page: 1, pageSize: 10, totalPages: 1,
    });
    const result = await getGoodsDisplay();
    expect(result.items[0].img).toBe('https://cdn.example.com/real.jpg');
  });

  it('无图片无本地映射时使用 fallback', async () => {
    (get as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [{ id: 3, name: '未知商品', imageUrl: null, description: null }],
      total: 1, page: 1, pageSize: 10, totalPages: 1,
    });
    const result = await getGoodsDisplay();
    expect(result.items[0].img).toContain('unsplash.com');
  });

  it('保留分页信息', async () => {
    (get as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [], total: 0, page: 1, pageSize: 20, totalPages: 0,
    });
    const result = await getGoodsDisplay();
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });
});

// =====================================================================
// 门票模块
// =====================================================================
describe('门票模块', () => {
  it('getTickets GET /api/tickets', () => {
    getTickets();
    expect(get).toHaveBeenCalledWith('/api/tickets');
  });

  it('getTicketDetail GET /api/tickets/:id', () => {
    getTicketDetail(3);
    expect(get).toHaveBeenCalledWith('/api/tickets/3');
  });

  it('getTicketsByType GET 路径编码', () => {
    getTicketsByType('成人票');
    expect(get).toHaveBeenCalledWith('/api/tickets/type/%E6%88%90%E4%BA%BA%E7%A5%A8');
  });

  it('getHeatmap GET 查询参数', () => {
    getHeatmap('2026-07-01', '2026-07-31');
    expect(get).toHaveBeenCalledWith('/api/tickets/heatmap?start=2026-07-01&end=2026-07-31');
  });
});

// =====================================================================
// 订单模块
// =====================================================================
describe('订单模块', () => {
  const orderReq = { orderType: 'ticket' as const, itemId: 1, quantity: 2 };

  it('createOrder POST /api/orders', () => {
    createOrder(orderReq);
    expect(post).toHaveBeenCalledWith('/api/orders', orderReq);
  });

  it('getOrders GET /api/orders', () => {
    getOrders({ status: 'PAID', page: 1 });
    expect(get).toHaveBeenCalledWith('/api/orders?status=PAID&page=1');
  });

  it('getOrderDetail GET /api/orders/:id', () => {
    getOrderDetail(10);
    expect(get).toHaveBeenCalledWith('/api/orders/10');
  });

  it('payOrder POST /api/orders/:id/pay', () => {
    payOrder(1, 'alipay');
    expect(post).toHaveBeenCalledWith('/api/orders/1/pay', { payMethod: 'alipay' });
  });

  it('cancelOrder POST /api/orders/:id/cancel', () => {
    cancelOrder(2);
    expect(post).toHaveBeenCalledWith('/api/orders/2/cancel');
  });

  it('refundOrder POST /api/orders/:id/refund', () => {
    refundOrder(3);
    expect(post).toHaveBeenCalledWith('/api/orders/3/refund');
  });
});

// =====================================================================
// 地址模块
// =====================================================================
describe('地址模块', () => {
  it('CRUD 全部调用正确方法', () => {
    getAddresses();
    expect(get).toHaveBeenCalledWith('/api/addresses');

    getAddressDetail(1);
    expect(get).toHaveBeenCalledWith('/api/addresses/1');

    const addr = { name: '张', phone: '138', province: '河北', city: '石家庄', district: '长安区', detail: 'xx路', isDefault: true };
    createAddress(addr);
    expect(post).toHaveBeenCalledWith('/api/addresses', addr);

    updateAddress(1, { name: '张新' });
    expect(put).toHaveBeenCalledWith('/api/addresses/1', { name: '张新' });

    deleteAddress(1);
    expect(del).toHaveBeenCalledWith('/api/addresses/1');
  });
});

// =====================================================================
// 购物车模块
// =====================================================================
describe('购物车模块', () => {
  it('getCart GET /api/cart', () => {
    getCart();
    expect(get).toHaveBeenCalledWith('/api/cart');
  });

  it('addToCart POST /api/cart', () => {
    addToCart(1, 3);
    expect(post).toHaveBeenCalledWith('/api/cart', { productId: 1, quantity: 3 });
  });

  it('addToCart 默认数量 1', () => {
    addToCart(5);
    expect(post).toHaveBeenCalledWith('/api/cart', { productId: 5, quantity: 1 });
  });

  it('removeFromCart DELETE /api/cart/:id', () => {
    removeFromCart(2);
    expect(del).toHaveBeenCalledWith('/api/cart/2');
  });
});

// =====================================================================
// 文化内容模块
// =====================================================================
describe('文化内容模块', () => {
  it('getCulturalList GET /api/cultural 带参数', () => {
    getCulturalList({ category: '历史', page: 1 });
    expect(get).toHaveBeenCalledWith('/api/cultural?page=1&category=%E5%8E%86%E5%8F%B2');
  });

  it('getCulturalDetail GET /api/cultural/:id', () => {
    getCulturalDetail(7);
    expect(get).toHaveBeenCalledWith('/api/cultural/7');
  });

  it('getCulturalAll GET /api/cultural/all', () => {
    getCulturalAll();
    expect(get).toHaveBeenCalledWith('/api/cultural/all');
  });
});

// =====================================================================
// 会话模块
// =====================================================================
describe('会话模块', () => {
  it('getSessions GET /api/sessions', () => {
    getSessions({ page: 1, pageSize: 20 });
    expect(get).toHaveBeenCalledWith('/api/sessions?page=1&pageSize=20');
  });

  it('getSessionDetail GET /api/sessions/:id', () => {
    getSessionDetail('sid-abc');
    expect(get).toHaveBeenCalledWith('/api/sessions/sid-abc');
  });

  it('updateSession PUT /api/sessions/:id', () => {
    updateSession('sid-1', { title: '新标题' });
    expect(put).toHaveBeenCalledWith('/api/sessions/sid-1', { title: '新标题' });
  });

  it('deleteSession DELETE /api/sessions/:id', () => {
    deleteSession('sid-2');
    expect(del).toHaveBeenCalledWith('/api/sessions/sid-2');
  });
});

// =====================================================================
// 收藏模块
// =====================================================================
describe('收藏模块', () => {
  it('addFavorite POST /api/favorites', () => {
    addFavorite('product', 1);
    expect(post).toHaveBeenCalledWith('/api/favorites', { targetType: 'product', targetId: 1 });
  });

  it('getFavorites GET /api/favorites', () => {
    getFavorites({ page: 1 });
    expect(get).toHaveBeenCalledWith('/api/favorites?page=1');
  });

  it('deleteFavorite DELETE /api/favorites/:id', () => {
    deleteFavorite(5);
    expect(del).toHaveBeenCalledWith('/api/favorites/5');
  });
});

// =====================================================================
// 文件上传
// =====================================================================
describe('文件上传', () => {
  it('uploadFile POST FormData', () => {
    const file = new File(['doc'], 'doc.pdf', { type: 'application/pdf' });
    uploadFile(file, 'document');
    const callArg = (post as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArg[0]).toBe('/api/upload');
    expect(callArg[1]).toBeInstanceOf(FormData);
    expect(callArg[1].get('file')).toBe(file);
    expect(callArg[1].get('type')).toBe('document');
  });
});

// =====================================================================
// SSE 重导出
// =====================================================================
describe('SSE 重导出', () => {
  it('sendChatMessage 从 sse 重导出', () => {
    expect(sendChatMessage).toBeDefined();
    expect(typeof sendChatMessage).toBe('function');
  });

  it('createSseConnection 从 sse 重导出', () => {
    expect(createSseConnection).toBeDefined();
    expect(typeof createSseConnection).toBe('function');
  });
});
