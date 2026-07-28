import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GoodsService } from './goods.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../test-utils';

describe('GoodsService', () => {
  let service: GoodsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    // 模拟 $transaction：执行 findMany + count
    mockPrisma.$transaction = jest.fn((args: any) => {
      if (typeof args[0] === 'function') return args[0](mockPrisma);
      return Promise.all(args);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoodsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<GoodsService>(GoodsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('返回分页商品列表', async () => {
      mockPrisma.good.findMany.mockResolvedValue([
        { id: 1, name: '冰箱贴', price: 20, stock: 100 },
      ]);
      mockPrisma.good.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('关键词搜索', async () => {
      mockPrisma.good.findMany.mockResolvedValue([]);
      mockPrisma.good.count.mockResolvedValue(0);

      await service.findAll({ keyword: '赵州桥' });

      // 验证 findMany 被调用时 where 条件包含 keyword
      const callArgs = mockPrisma.good.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toBeDefined();
      expect(callArgs.where.OR.length).toBe(2);
    });

    it('inStock 筛选仅显示有库存', async () => {
      mockPrisma.good.findMany.mockResolvedValue([]);
      mockPrisma.good.count.mockResolvedValue(0);

      await service.findAll({ inStock: true });

      const callArgs = mockPrisma.good.findMany.mock.calls[0][0];
      expect(callArgs.where.stock).toEqual({ gt: 0 });
    });
  });

  describe('findOne', () => {
    it('返回商品详情', async () => {
      mockPrisma.good.findUnique.mockResolvedValue({
        id: 1, name: '冰箱贴', price: 20, stock: 100,
      });

      const result = await service.findOne(1);
      expect(result.name).toBe('冰箱贴');
    });

    it('商品不存在抛出 NotFoundException', async () => {
      mockPrisma.good.findUnique.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
