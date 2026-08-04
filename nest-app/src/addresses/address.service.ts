import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAddressDto {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault?: boolean;
}

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  /** 地址列表（默认地址排前） */
  async findByUser(userId: number) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /** 新增地址（默认地址互斥） */
  async create(userId: number, dto: CreateAddressDto) {
    const isDefault = !!dto.isDefault;
    if (isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.create({
      data: { userId, ...dto, isDefault },
    });
  }

  /** 更新地址（校验归属 + 默认互斥） */
  async update(userId: number, id: number, dto: Partial<CreateAddressDto>) {
    const addr = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!addr) throw new NotFoundException('地址不存在');

    const { isDefault, ...rest } = dto;
    if (isDefault) {
      // 设为默认 → 清除该用户其他地址的默认标记
      await this.prisma.address.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id },
      data: isDefault !== undefined ? { ...rest, isDefault } : rest,
    });
  }

  /** 删除地址（校验归属） */
  async remove(userId: number, id: number) {
    const addr = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!addr) throw new NotFoundException('地址不存在');
    await this.prisma.address.delete({ where: { id } });
    return { success: true };
  }
}
