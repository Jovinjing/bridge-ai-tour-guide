import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../test-utils';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockPrisma.$transaction = jest.fn((args: any) => {
      if (typeof args[0] === 'function') return args[0](mockPrisma);
      return Promise.all(args);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    // price 在 Prisma 中返回 Decimal 对象，但它实现了 valueOf()
    // 在测试中直接用数字模拟
    const mockGood: any = {
      id: 1, name: '冰箱贴', price: 20, stock: 100,
    };

    it('创建商品订单并扣库存', async () => {
      mockPrisma.good.findUnique.mockResolvedValue(mockGood);
      mockPrisma.good.update.mockResolvedValue({});
      mockPrisma.order.create.mockResolvedValue({
        id: 1, userId: 1, goodId: 1, quantity: 2,
        totalAmount: 40, status: 'pending',
        good: mockGood, ticket: null,
      });

      const result = await service.create(1, { goodId: 1, quantity: 2 });

      expect(result.totalAmount).toBe(40);
      expect(result.itemName).toBe('冰箱贴');
      expect(mockPrisma.good.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { stock: { decrement: 2 } },
      });
    });

    it('库存不足应抛出异常', async () => {
      mockPrisma.good.findUnique.mockResolvedValue({
        ...mockGood, stock: 0,
      });

      await expect(
        service.create(1, { goodId: 1, quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('必须指定 goodId 或 ticketId', async () => {
      await expect(
        service.create(1, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('商品不存在应抛出异常', async () => {
      mockPrisma.good.findUnique.mockResolvedValue(null);
      await expect(
        service.create(1, { goodId: 999, quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUser', () => {
    it('返回用户订单列表', async () => {
      mockPrisma.order.findMany.mockResolvedValue([{
        id: 1, userId: 1, good: null, ticket: null, totalAmount: 100,
      }]);
      mockPrisma.order.count.mockResolvedValue(1);

      const result = await service.findByUser(1, { page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('返回订单详情', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 1, userId: 1, totalAmount: 100, good: null, ticket: null,
      });

      const result = await service.findOne(1, 1);
      expect(result.id).toBe(1);
    });

    it('订单不存在应抛出异常', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);
      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
