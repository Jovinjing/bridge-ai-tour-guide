import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// 在测试开始前创建测试用 RSA 密钥
const keysDir = join(process.cwd(), '.keys');
if (!existsSync(keysDir)) {
  mkdirSync(keysDir, { recursive: true });
}

const pubKeyPath = join(keysDir, 'public.key');
if (!existsSync(pubKeyPath)) {
  writeFileSync(pubKeyPath, '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuhF6gqvRXN3Yj\n-----END PUBLIC KEY-----');
}

const privKeyPath = join(keysDir, 'private.key');
if (!existsSync(privKeyPath)) {
  writeFileSync(privKeyPath, '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC6EXqCq9Fc3diO\n-----END PRIVATE KEY-----');
}
