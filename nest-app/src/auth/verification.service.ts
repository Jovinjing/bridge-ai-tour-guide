import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

/**
 * 验证码服务
 * - 生成 6 位数字验证码
 * - 持久化到 verification_codes 表
 * - 开发模式：日志输出验证码（生产环境需接入真实短信服务）
 * - 验证码有效期：5 分钟
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  /** 同一手机号发送间隔（秒） */
  private readonly RATE_LIMIT_SECONDS = 60;
  /** 验证码有效期（分钟） */
  private readonly CODE_EXPIRY_MINUTES = 5;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 发送验证码
   * @returns 验证码 ID（供前端返回用于校验）+ 开发模式的验证码明文
   */
  async sendCode(phone: string, type: 'register' | 'login' = 'login') {
    // 频率限制：检查上次发送时间
    const last = await this.prisma.verificationCode.findFirst({
      where: { phone, type },
      orderBy: { createdAt: 'desc' },
    });

    if (last) {
      const secondsSince = (Date.now() - last.createdAt!.getTime()) / 1000;
      if (secondsSince < this.RATE_LIMIT_SECONDS) {
        const waitSeconds = Math.ceil(this.RATE_LIMIT_SECONDS - secondsSince);
        throw new Error(`发送过于频繁，请 ${waitSeconds} 秒后再试`);
      }
    }

    // 生成 6 位随机验证码（加密安全的随机数）
    const code = crypto.randomInt(100000, 999999).toString();

    // 持久化
    const record = await this.prisma.verificationCode.create({
      data: {
        phone,
        code,
        type,
        expiresAt: new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    // 开发模式：日志输出验证码
    this.logger.warn(`📱 [验证码] 手机 ${phone} | 验证码: ${code} | 类型: ${type}`);
    this.logger.warn(`   ⏰ 有效期至: ${record.expiresAt.toISOString()}`);

    return {
      id: record.id,
      phone: record.phone,
      // 生产环境应移除 code 字段，仅通过短信发送
      code: process.env.NODE_ENV === 'production' ? undefined : code,
    };
  }

  /**
   * 校验验证码
   * @returns 有效则返回 true，无效则抛出异常
   */
  async verifyCode(phone: string, code: string, type: 'register' | 'login' = 'login') {
    // 查找最新的有效验证码
    const record = await this.prisma.verificationCode.findFirst({
      where: {
        phone,
        code,
        type,
        expiresAt: { gte: new Date() }, // 未过期
      },
      orderBy: { expiresAt: 'desc' },
    });

    if (!record) {
      throw new Error('验证码无效或已过期');
    }

    // 删除已使用的验证码，防止重复使用
    await this.prisma.verificationCode.delete({
      where: { id: record.id },
    });

    return true;
  }

  /**
   * 清理过期验证码（定时任务调用）
   */
  async cleanExpired() {
    const { count } = await this.prisma.verificationCode.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    if (count > 0) {
      this.logger.log(`🧹 清理了 ${count} 条过期验证码`);
    }
    return count;
  }
}
