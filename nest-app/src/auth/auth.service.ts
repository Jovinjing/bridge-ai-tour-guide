import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

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
    return { token, user: { id: user.id, phone: user.phone, nickname: user.nickname } };
  }
}
