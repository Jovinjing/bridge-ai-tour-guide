import { PrismaService } from '../prisma/prisma.service';

/**
 * 创建 Mock PrismaService
 * 通过代理模式拦截 Prisma 方法调用，返回 jest.fn() 以便灵活控制返回值
 *
 * 用法：
 *   const mockPrisma = createMockPrisma();
 *   mockPrisma.user.findUnique.mockResolvedValue(null);
 *   const service = new AuthService(mockPrisma as any, mockJwtService);
 */
export function createMockPrisma(): Record<string, any> {
  const models = [
    'user', 'verificationCode', 'good', 'ticket',
    'order', 'cultural', 'favorite',
    'cartItem', 'address',
    'agentSessions', 'agentMessages', 'agentToolCalls',
  ];

  const mock: Record<string, any> = {
    $transaction: jest.fn((fn: any) => fn(mock)),
  };

  for (const model of models) {
    mock[model] = {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    };
  }

  return mock;
}
