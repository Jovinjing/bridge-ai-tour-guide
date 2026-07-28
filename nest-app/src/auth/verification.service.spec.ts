import { Test, TestingModule } from '@nestjs/testing';
import { VerificationService } from './verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../test-utils';

describe('VerificationService', () => {
  let service: VerificationService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
    jest.clearAllMocks();
  });

  describe('sendCode', () => {
    it('生成 6 位验证码并持久化', async () => {
      mockPrisma.verificationCode.findFirst.mockResolvedValue(null); // 无频率限制
      mockPrisma.verificationCode.create.mockResolvedValue({
        id: 1, phone: '13800138000', code: '123456', type: 'login',
        expiresAt: new Date(Date.now() + 300000),
        createdAt: new Date(),
      });

      const result = await service.sendCode('13800138000', 'login');

      expect(result.phone).toBe('13800138000');
      expect(result.code).toMatch(/^\d{6}$/);
      expect(mockPrisma.verificationCode.create).toHaveBeenCalled();
    });

    it('60 秒内重复发送应抛出异常', async () => {
      mockPrisma.verificationCode.findFirst.mockResolvedValue({
        createdAt: new Date(), // 刚刚发送过
      });

      await expect(
        service.sendCode('13800138000', 'login'),
      ).rejects.toThrow('发送过于频繁');
    });
  });

  describe('verifyCode', () => {
    it('验证码正确应返回 true', async () => {
      mockPrisma.verificationCode.findFirst.mockResolvedValue({
        id: 1, phone: '138', code: '123456', type: 'login',
        expiresAt: new Date(Date.now() + 300000),
      });
      mockPrisma.verificationCode.delete.mockResolvedValue({});

      const result = await service.verifyCode('138', '123456', 'login');
      expect(result).toBe(true);
      expect(mockPrisma.verificationCode.delete).toHaveBeenCalled(); // 用后即删
    });

    it('验证码无效或过期应抛出异常', async () => {
      mockPrisma.verificationCode.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyCode('138', '000000', 'login'),
      ).rejects.toThrow('验证码无效或已过期');
    });
  });
});
