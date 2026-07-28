#!/usr/bin/env node
/**
 * RSA 密钥对生成脚本
 * 用于生成 NestJS 签名和 Agent 验证所需的 RSA 密钥对
 */

import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { generateKeyPair } from 'crypto/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_DIR = join(__dirname, '..', '.keys');

// 确保密钥目录存在
if (!existsSync(KEYS_DIR)) {
  console.log('创建密钥目录:', KEYS_DIR);
  require('fs').mkdirSync(KEYS_DIR, { recursive: true });
}

const publicKeyPath = join(KEYS_DIR, 'public.key');
const privateKeyPath = join(KEYS_DIR, 'private.key');

// 检查密钥是否已存在
if (existsSync(publicKeyPath) && existsSync(privateKeyPath)) {
  console.log('✅ 密钥对已存在，跳过生成');
  console.log('公钥路径:', publicKeyPath);
  console.log('私钥路径:', privateKeyPath);
  process.exit(0);
}

// 生成 RSA 密钥对
console.log('🔐 正在生成 RSA 密钥对...');
const { publicKey, privateKey } = await generateKeyPair('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

// 写入文件
writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });
writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });

console.log('');
console.log('✅ RSA 密钥对生成成功！');
console.log('');
console.log('文件位置:');
console.log('  公钥 (签名用):', publicKeyPath);
console.log('  私钥 (验证用):', privateKeyPath);
console.log('');
console.log('⚠️  重要提示:');
console.log('  - 请妥善保管 private.key，不要提交到 Git');
console.log('  - .gitignore 中已包含 .keys/');
console.log('  - 部署时确保两个服务能访问到这两个文件');
console.log('');
