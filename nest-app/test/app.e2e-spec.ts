import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, RequestMethod } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Phase 0 & Phase 1 E2E 集成测试', () => {
  let app: INestApplication<App>;
  let mockPrisma: any;

  beforeAll(async () => {
    // Mock PrismaService 避免真实数据库连接
    const models = ['user', 'verificationCode', 'good', 'ticket', 'order', 'cultural', 'favorite'];
    mockPrisma = {
      $transaction: jest.fn((arg: any) => Array.isArray(arg) ? Promise.all(arg) : arg(mockPrisma)),
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    };
    for (const m of models) {
      mockPrisma[m] = {
        findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(),
        create: jest.fn(), update: jest.fn(), delete: jest.fn(),
        deleteMany: jest.fn(), count: jest.fn(), upsert: jest.fn(),
      };
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => jest.clearAllMocks());

  // ======== Phase 0 ========
  it('GET /health → 200 ok', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  // ======== Phase 1.1 Auth ========
  it('POST /api/auth/send-code → 返回 6 位验证码', async () => {
    mockPrisma.verificationCode.findFirst.mockResolvedValue(null);
    mockPrisma.verificationCode.create.mockResolvedValue({
      id: 1, phone: '138', code: '123456', type: 'login',
      expiresAt: new Date(), createdAt: new Date(),
    });

    const res = await request(app.getHttpServer())
      .post('/api/auth/send-code')
      .send({ phone: '13800138000' })
      .expect(200);

    expect(res.body.code).toMatch(/^\d{6}$/);
  });

  // ======== Phase 1.3 Goods ========
  it('GET /api/goods → 分页列表', async () => {
    mockPrisma.good.findMany.mockResolvedValue([
      { id: 1, name: '冰箱贴', price: 20, stock: 100 },
    ]);
    mockPrisma.good.count.mockResolvedValue(1);

    const res = await request(app.getHttpServer())
      .get('/api/goods?page=1&pageSize=10')
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.totalPages).toBe(1);
  });

  // ======== Phase 1.4 Tickets ========
  it('GET /api/tickets → 门票列表', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([
      { id: 1, name: '成人票', price: 50, stock: 200 },
    ]);
    mockPrisma.ticket.count.mockResolvedValue(1);

    const res = await request(app.getHttpServer())
      .get('/api/tickets')
      .expect(200);

    expect(res.body.items).toHaveLength(1);
  });

  it('GET /api/tickets/heatmap → 热力图', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([
      { id: 1, name: '成人票', hotspots: [{ x: 100, y: 200, value: 10 }] },
    ]);

    const res = await request(app.getHttpServer())
      .get('/api/tickets/heatmap')
      .expect(200);

    expect(res.body.tickets).toHaveLength(1);
    expect(res.body.tickets[0].hotspots).toBeDefined();
  });

  // ======== Phase 1.6 Cultural ========
  it('GET /api/cultural → 文化内容', async () => {
    mockPrisma.cultural.findMany.mockResolvedValue([
      { id: 1, title: '赵州桥历史' },
    ]);
    mockPrisma.cultural.count.mockResolvedValue(1);

    const res = await request(app.getHttpServer())
      .get('/api/cultural')
      .expect(200);

    expect(res.body.items).toHaveLength(1);
  });

  // ======== JWT 保护验证 ========
  it('GET /api/auth/me 无 token → 401', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('POST /api/orders 无 token → 401', async () => {
    await request(app.getHttpServer())
      .post('/api/orders')
      .send({ goodId: 1 })
      .expect(401);
  });

  it('POST /api/favorites 无 token → 401', async () => {
    await request(app.getHttpServer())
      .post('/api/favorites')
      .send({ targetType: 'good', targetId: 1 })
      .expect(401);
  });
});
