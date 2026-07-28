import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  /** 添加收藏 */
  async add(userId: number, dto: { targetType: string; targetId: number }) {
    const existing = await this.prisma.favorite.findFirst({
      where: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
    });
    if (existing) throw new ConflictException('已收藏');

    return this.prisma.favorite.create({
      data: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
    });
  }

  /** 收藏列表 */
  async findByUser(userId: number) {
    return this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 取消收藏 */
  async remove(userId: number, id: number) {
    const fav = await this.prisma.favorite.findFirst({
      where: { id, userId },
    });
    if (!fav) throw new NotFoundException('收藏不存在');

    await this.prisma.favorite.delete({ where: { id } });
    return { message: '已取消收藏' };
  }
}
