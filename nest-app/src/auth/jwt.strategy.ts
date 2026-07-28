import { Injectable, OnModuleInit } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * JWT 策略 — 使用 RSA 公钥验证 token
 * 替代旧对称密钥方案，与 Agent 服务的私钥验证配套
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const publicKeyPath = join(process.cwd(), '.keys', 'public.key');

    if (!existsSync(publicKeyPath)) {
      throw new Error(
        `RSA 公钥文件不存在: ${publicKeyPath}\n请先运行: npm run gen:keys`,
      );
    }

    const publicKey = readFileSync(publicKeyPath, 'utf-8');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
    });

    console.log('✅ JWT 策略已加载（RSA 公钥验证）');
  }

  async validate(payload: { sub: number; phone: string }) {
    return { id: payload.sub, phone: payload.phone };
  }
}
