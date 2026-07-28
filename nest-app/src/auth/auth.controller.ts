import {
  Controller, Post, Get, Patch, Body, HttpCode,
  UseGuards, Req, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly verificationService: VerificationService,
  ) {}

  /** 注册（密码） */
  @Post('register')
  @HttpCode(200)
  register(@Body() dto: { phone: string; password: string; nickname: string }) {
    return this.authService.register(dto);
  }

  /** 密码登录 */
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: { phone: string; password: string }) {
    return this.authService.login(dto);
  }

  /** 发送验证码 */
  @Post('send-code')
  @HttpCode(200)
  sendCode(@Body() dto: { phone: string; type?: 'register' | 'login' }) {
    return this.verificationService.sendCode(dto.phone, dto.type || 'login');
  }

  /** 验证码登录 */
  @Post('login-by-code')
  @HttpCode(200)
  async loginByCode(@Body() dto: { phone: string; code: string }) {
    await this.verificationService.verifyCode(dto.phone, dto.code, 'login');
    return this.authService.loginByCode(dto.phone);
  }

  /** 获取当前用户资料 🔒 */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: Request) {
    return this.authService.getProfile((req.user as any).id);
  }

  /** 更新用户资料 🔒 */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Req() req: Request,
    @Body() dto: { nickname?: string; email?: string; avatarUrl?: string },
  ) {
    return this.authService.updateProfile((req.user as any).id, dto);
  }

  /** 上传头像 🔒 */
  @Post('avatar/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.authService.uploadAvatar((req.user as any).id, file);
  }
}
