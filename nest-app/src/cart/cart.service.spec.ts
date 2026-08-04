import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../test-utils';

describe('CartService', () => {
  let service: CartService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    jest.clearAllMocks();
  });

  describe('add', () => {
    it('未指定 productId 应抛出异常', async () => {
      await expect(service.add(1, {})).rejects.toThrow(BadRequestException);
    });

    it('商品不存在应抛出异常', async () => {
      mockPrisma.good.findUnique.mockResolvedValue(null);
      await expect(
        service.add(1, { productId: 999, quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('购物车已存在同商品时累加数量', async () => {
      mockPrisma.good.findUnique.mockResolvedValue({ id: 1, name: '冰箱贴', price: 20, stock: 100 });
      mockPrisma.cartItem.findFirst.mockResolvedValue({ id: 7, userId: 1, goodId: 1, quantity: 2 });
      mockPrisma.cartItem.update.mockResolvedValue({ id: 7, userId: 1, goodId: 1, quantity: 3 });
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 7, userId: 1, goodId: 1, quantity: 3, good: { id: 1, name: '冰箱贴' },
      });

      const result = await service.add(1, { productId: 1, quantity: 1 });

      expect(mockPrisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { quantity: 3 },
      });
      expect(result.productId).toBe(1);
      expect(result.quantity).toBe(3);
      expect(result.product.name).toBe('冰箱贴');
    });

    it('购物车不存在该商品时创建新项', async () => {
      mockPrisma.good.findUnique.mockResolvedValue({ id: 2, name: '明信片', price: 5, stock: 50 });
      mockPrisma.cartItem.findFirst.mockResolvedValue(null);
      mockPrisma.cartItem.create.mockResolvedValue({ id: 8, userId: 1, goodId: 2, quantity: 2 });
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 8, userId: 1, goodId: 2, quantity: 2, good: { id: 2, name: '明信片' },
      });

      const result = await service.add(1, { productId: 2, quantity: 2 });

      expect(mockPrisma.cartItem.create).toHaveBeenCalledWith({
        data: { userId: 1, goodId: 2, quantity: 2 },
      });
      expect(result.productId).toBe(2);
      expect(result.quantity).toBe(2);
    });

    it('数量为 0 或负数时按 1 处理', async () => {
      mockPrisma.good.findUnique.mockResolvedValue({ id: 3, name: '书签', price: 8, stock: 50 });
      mockPrisma.cartItem.findFirst.mockResolvedValue(null);
      mockPrisma.cartItem.create.mockResolvedValue({ id: 9, userId: 1, goodId: 3, quantity: 1 });
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 9, userId: 1, goodId: 3, quantity: 1, good: { id: 3, name: '书签' },
      });

      await service.add(1, { productId: 3, quantity: 0 });
      expect(mockPrisma.cartItem.create).toHaveBeenCalledWith({
        data: { userId: 1, goodId: 3, quantity: 1 },
      });
    });
  });

  describe('findByUser', () => {
    it('返回购物车列表并映射 productId/product', async () => {
      mockPrisma.cartItem.findMany.mockResolvedValue([
        {
          id: 1, userId: 1, goodId: 10, quantity: 2,
          good: { id: 10, name: '冰箱贴', price: 20, stock: 100 },
        },
      ]);

      const result = await service.findByUser(1);

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe(10);
      expect(result[0].product.name).toBe('冰箱贴');
    });
  });

  describe('remove', () => {
    it('删除自己的购物车项', async () => {
      mockPrisma.cartItem.findFirst.mockResolvedValue({ id: 5, userId: 1, goodId: 1, quantity: 1 });
      mockPrisma.cartItem.delete.mockResolvedValue({});

      const result = await service.remove(1, 5);
      expect(result.success).toBe(true);
      expect(mockPrisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it('非本人购物车项应抛出异常', async () => {
      mockPrisma.cartItem.findFirst.mockResolvedValue(null);
      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
    });
  });
});
