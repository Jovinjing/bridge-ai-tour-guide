import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtPublicKeyService } from './jwt-public-key.service';
import { JwtStrategy } from './jwt.strategy';
import { VerificationService } from './verification.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [JwtPublicKeyService],
      useFactory: (jwtPublicKeyService: JwtPublicKeyService) => ({
        publicKey: jwtPublicKeyService.getPublicKey(),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: '7d',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtPublicKeyService, JwtStrategy, VerificationService],
  exports: [AuthService, JwtModule, JwtPublicKeyService, PassportModule],
})
export class AuthModule {}
