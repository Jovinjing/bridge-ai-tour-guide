import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../test-utils';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockJwtService: { sign: jest.Mock };

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockJwtService = { sign: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ========== register ==========
  describe('register', () => {
    it('应成功注册新用户', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 1, phone: '13800138000', nickname: '测试',
        password: 'hashed_xxx',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_xxx');
      mockJwtService.sign.mockReturnValue('jwt_token_xxx');

      const result = await service.register({
        phone: '13800138000', password: '123456', nickname: '测试',
      });

      expect(result.token).toBe('jwt_token_xxx');
      expect(result.user.phone).toBe('13800138000');
      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
    });

    it('手机号已注册应抛出异常', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });

      await expect(
        service.register({ phone: '13800138000', password: '123456', nickname: '测试' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ========== login ==========
  describe('login', () => {
    it('密码正确应返回 token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1, phone: '13800138000', password: 'hashed', nickname: '测试',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt_token_xxx');

      const result = await service.login({ phone: '13800138000', password: '123456' });

      expect(result.token).toBe('jwt_token_xxx');
    });

    it('密码错误应抛出异常', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1, phone: '13800138000', password: 'hashed', nickname: '测试',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ phone: '13800138000', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('用户不存在应抛出异常', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ phone: '13800138000', password: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ========== loginByCode ==========
  describe('loginByCode', () => {
    it('已有用户应返回 token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1, phone: '13800138000', nickname: '老用户',
      });
      mockJwtService.sign.mockReturnValue('jwt_xxx');

      const result = await service.loginByCode('13800138000');

      expect(result.user.nickname).toBe('老用户');
      expect(result.token).toBe('jwt_xxx');
    });

    it('新用户应自动注册并返回 token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 2, phone: '13800138001', nickname: '用户0001',
      });
      mockJwtService.sign.mockReturnValue('jwt_new');

      const result = await service.loginByCode('13800138001');

      expect(result.user.nickname).toBe('用户0001');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });
  });

  // ========== getProfile ==========
  describe('getProfile', () => {
    it('应返回用户资料（不含密码）', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1, phone: '138', nickname: 'nn', email: 'a@b.com',
        password: 'SECRET',
      });

      const result = await service.getProfile(1);

      expect(result).not.toHaveProperty('password');
      expect(result.nickname).toBe('nn');
    });

    it('用户不存在应抛出异常', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ========== updateProfile ==========
  describe('updateProfile', () => {
    it('应成功更新昵称', async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: 1, nickname: '新昵称', phone: '138',
      });

      const result = await service.updateProfile(1, { nickname: '新昵称' });

      expect(result.nickname).toBe('新昵称');
    });
  });
});
