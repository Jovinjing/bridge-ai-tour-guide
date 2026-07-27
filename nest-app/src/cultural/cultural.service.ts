import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CulturalService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { page?: number; pageSize?: number; category?: string }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where = query.category ? { category: query.category } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.cultural.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.cultural.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number) {
    const item = await this.prisma.cultural.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('文化内容不存在');
    }
    return item;
  }
}
