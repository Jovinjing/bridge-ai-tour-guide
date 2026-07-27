import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CulturalModule } from './cultural/cultural.module';

@Module({
  imports: [PrismaModule, AuthModule, CulturalModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
