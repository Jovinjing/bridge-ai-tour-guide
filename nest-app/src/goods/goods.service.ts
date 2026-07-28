import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class GoodsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    inStock?: boolean;
    sortBy?: 'price' | 'createdAt';
    order?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize || 10));
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: Prisma.GoodWhereInput = {};

    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword, mode: 'insensitive' } },
        { description: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    if (query.inStock) {
      where.stock = { gt: 0 };
    }

    // 排序
    const sortBy = query.sortBy || 'createdAt';
    const order = query.order || 'desc';

    const [items, total] = await this.prisma.$transaction([
      this.prisma.good.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: order },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          stock: true,
          imageUrl: true,
          createdAt: true,
        },
      }),
      this.prisma.good.count({ where }),
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
    const item = await this.prisma.good.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!item) {
      throw new NotFoundException('商品不存在');
    }

    return item;
  }
}
