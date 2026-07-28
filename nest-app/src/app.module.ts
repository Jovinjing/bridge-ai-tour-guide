import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CulturalModule } from './cultural/cultural.module';
import { GoodsModule } from './goods/goods.module';

@Module({
  imports: [PrismaModule, AuthModule, CulturalModule, GoodsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
