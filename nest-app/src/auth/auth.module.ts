import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtPublicKeyService } from './jwt-public-key.service';

@Module({
  imports: [
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
  providers: [AuthService, JwtPublicKeyService],
  exports: [AuthService, JwtModule, JwtPublicKeyService],
})
export class AuthModule {}
