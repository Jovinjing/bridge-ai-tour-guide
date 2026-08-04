import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  /** 加购（同商品累加数量） */
  async add(userId: number, dto: { productId?: number; quantity?: number }) {
    const goodId = dto.productId;
    if (!goodId) throw new BadRequestException('必须指定 productId');

    const good = await this.prisma.good.findUnique({ where: { id: goodId } });
    if (!good) throw new NotFoundException('商品不存在');

    const quantity = Math.max(1, dto.quantity || 1);
    const existing = await this.prisma.cartItem.findFirst({ where: { userId, goodId } });

    const item = existing
      ? await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + quantity },
        })
      : await this.prisma.cartItem.create({
          data: { userId, goodId, quantity },
        });

    const full = await this.prisma.cartItem.findUnique({
      where: { id: item.id },
      include: { good: true },
    });
    return this.toCartItem(full!);
  }

  /** 购物车列表 */
  async findByUser(userId: number) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { good: true },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(i => this.toCartItem(i));
  }

  /** 移除购物车项（校验归属） */
  async remove(userId: number, id: number) {
    const item = await this.prisma.cartItem.findFirst({ where: { id, userId } });
    if (!item) throw new NotFoundException('购物车项不存在');
    await this.prisma.cartItem.delete({ where: { id } });
    return { success: true };
  }

  /** 前端契约：{ id, productId, quantity, product } */
  private toCartItem(item: {
    id: number;
    goodId: number | null;
    quantity: number;
    good: any;
  }) {
    return {
      id: item.id,
      productId: item.goodId,
      quantity: item.quantity,
      product: item.good,
    };
  }
}
