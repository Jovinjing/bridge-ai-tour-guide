import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class JwtPublicKeyService implements OnModuleInit {
  private publicKey: string;

  onModuleInit() {
    // 从 .keys/public.key 加载公钥
    const keysDir = join(process.cwd(), '.keys');
    const publicKeyPath = join(keysDir, 'public.key');

    if (!require('fs').existsSync(publicKeyPath)) {
      throw new Error(
        `RSA 公钥文件不存在: ${publicKeyPath}\n请先运行: npm run gen:keys`,
      );
    }

    this.publicKey = readFileSync(publicKeyPath, 'utf-8');
    console.log('✅ JWT 公钥已加载');
  }

  getPublicKey() {
    return this.publicKey;
  }
}
