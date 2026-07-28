import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { VerificationService } from './verification.service';

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
}
