import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtPublicKeyService } from './jwt-public-key.service';
import { JwtStrategy } from './jwt.strategy';
import { VerificationService } from './verification.service';

/**
 * 加载 RSA 公钥
 * 独立函数，不依赖 NestJS DI，在模块导入时即执行
 * 测试环境会通过 setup.ts 预创建 .keys/ 目录
 */
function loadPublicKey(): string {
  const keyPath = join(process.cwd(), '.keys', 'public.key');
  if (!existsSync(keyPath)) {
    throw new Error(`RSA 公钥文件不存在: ${keyPath}\n请先运行: npm run gen:keys`);
  }
  return readFileSync(keyPath, 'utf-8');
}

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      publicKey: loadPublicKey(),
      signOptions: { algorithm: 'RS256' as const, expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtPublicKeyService, JwtStrategy, VerificationService],
  exports: [AuthService, JwtModule, JwtPublicKeyService, PassportModule],
})
export class AuthModule {}
