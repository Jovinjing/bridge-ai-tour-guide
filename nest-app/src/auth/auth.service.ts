import {
  Injectable, UnauthorizedException, NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: { phone: string; password: string; nickname: string }) {
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new UnauthorizedException('手机号已注册');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        password: hashedPassword,
        nickname: dto.nickname || `用户${dto.phone.slice(-4)}`,
      },
    });

    const token = this.jwtService.sign({ sub: user.id, phone: user.phone });
    return { token, user: { id: user.id, phone: user.phone, nickname: user.nickname } };
  }

  async login(dto: { phone: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user || !user.password) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const token = this.jwtService.sign({ sub: user.id, phone: user.phone });
    return { token, user: { id: user.id, phone: user.phone, nickname: user.nickname } };
  }

  /** 验证码登录：无需密码，仅需手机号 */
  async loginByCode(phone: string) {
    let user = await this.prisma.user.findUnique({
      where: { phone },
    });

    // 新用户：自动注册
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone,
          nickname: `用户${phone.slice(-4)}`,
        },
      });
    }

    const token = this.jwtService.sign({ sub: user.id, phone: user.phone });
    return {
      token,
      user: this._sanitizeUser(user),
    };
  }

  /** 获取用户资料 */
  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return this._sanitizeUser(user);
  }

  /** 更新用户资料 */
  async updateProfile(userId: number, dto: { nickname?: string; email?: string; avatarUrl?: string }) {
    // 只允许更新非空字段
    const data: any = {};
    if (dto.nickname !== undefined) data.nickname = dto.nickname;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('未提供任何更新字段');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this._sanitizeUser(user);
  }

  /** 上传头像 */
  async uploadAvatar(userId: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请选择头像文件');
    }

    // 校验文件类型
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('头像仅支持 JPG、PNG、GIF、WebP 格式');
    }

    // 校验文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('头像大小不能超过 5MB');
    }

    // 保存到 uploads/avatars/ 目录
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${userId}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    writeFileSync(filePath, file.buffer);

    // 更新用户头像 URL
    const avatarUrl = `/uploads/avatars/${filename}`;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return { avatarUrl, user: this._sanitizeUser(user) };
  }

  /** 脱敏用户信息（剔除密码） */
  private _sanitizeUser(user: any) {
    const { password, ...safe } = user;
    return safe;
  }
}
