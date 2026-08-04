import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AddressService } from './address.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../test-utils';

describe('AddressService', () => {
  let service: AddressService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const dto = {
    name: '张三',
    phone: '13800001234',
    province: '河北省',
    city: '石家庄市',
    district: '赵县',
    detail: '赵州桥景区',
    isDefault: true,
  };

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AddressService>(AddressService);
    jest.clearAllMocks();
  });

  describe('findByUser', () => {
    it('返回当前用户地址列表', async () => {
      mockPrisma.address.findMany.mockResolvedValue([{ id: 1, userId: 1, ...dto }]);
      const result = await service.findByUser(1);
      expect(result).toHaveLength(1);
      expect(mockPrisma.address.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('create', () => {
    it('新增普通地址', async () => {
      mockPrisma.address.create.mockResolvedValue({ id: 1, userId: 1, ...dto, isDefault: false });
      const result = await service.create(1, { ...dto, isDefault: false });
      expect(result.id).toBe(1);
      expect(mockPrisma.address.updateMany).not.toHaveBeenCalled();
    });

    it('设为默认地址时清除其他默认标记', async () => {
      mockPrisma.address.create.mockResolvedValue({ id: 2, userId: 1, ...dto, isDefault: true });
      const result = await service.create(1, dto);
      expect(result.isDefault).toBe(true);
      expect(mockPrisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { isDefault: false },
      });
    });
  });

  describe('update', () => {
    it('更新自己的地址', async () => {
      mockPrisma.address.findFirst.mockResolvedValue({ id: 1, userId: 1, ...dto });
      mockPrisma.address.update.mockResolvedValue({ id: 1, userId: 1, ...dto, name: '李四' });
      const result = await service.update(1, 1, { name: '李四' });
      expect(result.name).toBe('李四');
    });

    it('设为默认时只清其他地址的默认标记', async () => {
      mockPrisma.address.findFirst.mockResolvedValue({ id: 1, userId: 1, ...dto, isDefault: false });
      mockPrisma.address.update.mockResolvedValue({ id: 1, userId: 1, ...dto, isDefault: true });
      await service.update(1, 1, { isDefault: true });
      expect(mockPrisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, id: { not: 1 } },
        data: { isDefault: false },
      });
      expect(mockPrisma.address.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isDefault: true },
      });
    });

    it('地址不存在或非本人应抛出异常', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(null);
      await expect(service.update(1, 999, { name: 'x' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('删除自己的地址', async () => {
      mockPrisma.address.findFirst.mockResolvedValue({ id: 1, userId: 1, ...dto });
      mockPrisma.address.delete.mockResolvedValue({});
      const result = await service.remove(1, 1);
      expect(result.success).toBe(true);
    });

    it('地址不存在应抛出异常', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(null);
      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
    });
  });
});
