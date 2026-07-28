import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  /** 创建订单 */
  async create(userId: number, dto: {
    goodId?: number;
    ticketId?: number;
    quantity?: number;
  }) {
    if (!dto.goodId && !dto.ticketId) {
      throw new BadRequestException('必须指定 goodId 或 ticketId');
    }

    // 查询商品/门票 获取价格
    let unitPrice = 0;
    let itemName = '';

    if (dto.goodId) {
      const good = await this.prisma.good.findUnique({ where: { id: dto.goodId } });
      if (!good) throw new NotFoundException('商品不存在');
      if (good.stock! < (dto.quantity || 1)) throw new BadRequestException('库存不足');
      unitPrice = Number(good.price);
      itemName = good.name;

      // 扣减库存
      await this.prisma.good.update({
        where: { id: dto.goodId },
        data: { stock: { decrement: dto.quantity || 1 } },
      });
    }

    if (dto.ticketId) {
      const ticket = await this.prisma.ticket.findUnique({ where: { id: dto.ticketId } });
      if (!ticket) throw new NotFoundException('门票不存在');
      if (ticket.stock! < (dto.quantity || 1)) throw new BadRequestException('库存不足');
      unitPrice = Number(ticket.price);
      itemName = ticket.name;

      await this.prisma.ticket.update({
        where: { id: dto.ticketId },
        data: { stock: { decrement: dto.quantity || 1 } },
      });
    }

    const quantity = dto.quantity || 1;
    const totalAmount = unitPrice * quantity;

    const order = await this.prisma.order.create({
      data: {
        userId,
        goodId: dto.goodId || null,
        ticketId: dto.ticketId || null,
        quantity,
        totalAmount,
        status: 'pending',
      },
      include: { good: true, ticket: true },
    });

    return { order, itemName, totalAmount };
  }

  /** 订单列表（当前用户） */
  async findByUser(userId: number, query: { page?: number; pageSize?: number }) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize || 10));
    const skip = (page - 1) * pageSize;

    const where = { userId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { good: true, ticket: true },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /** 订单详情 */
  async findOne(id: number, userId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { good: true, ticket: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }
}
