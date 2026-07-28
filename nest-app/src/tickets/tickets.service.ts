import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { page?: number; pageSize?: number }) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize || 10));
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          stock: true,
          imageUrls: true,
          createdAt: true,
        },
      }),
      this.prisma.ticket.count(),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: number) {
    const item = await this.prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        hotspots: true,
        imageUrls: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!item) throw new NotFoundException('门票不存在');
    return item;
  }

  /** 热力图数据：返回所有门票的 hotspots 聚合 */
  async getHeatmap(start?: string, end?: string) {
    const tickets = await this.prisma.ticket.findMany({
      select: {
        id: true,
        name: true,
        hotspots: true,
      },
    });

    // 过滤有 hotspots 的门票
    const withHotspots = tickets.filter((t) => t.hotspots != null);

    return {
      tickets: withHotspots.map((t) => ({
        id: t.id,
        name: t.name,
        hotspots: t.hotspots,
      })),
    };
  }
}
