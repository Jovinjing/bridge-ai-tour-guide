import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable as NestInjectable } from '@nestjs/common';

@NestInjectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'zhaozhou-bridge-jwt-secret-dev',
    });
  }

  async validate(payload: { sub: number; phone: string }) {
    return { id: payload.sub, phone: payload.phone };
  }
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
