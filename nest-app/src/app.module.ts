import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CulturalModule } from './cultural/cultural.module';
import { GoodsModule } from './goods/goods.module';
import { TicketsModule } from './tickets/tickets.module';
import { OrdersModule } from './orders/orders.module';
import { FavoritesModule } from './favorites/favorites.module';
import { SessionsModule } from './sessions/sessions.module';
import { UploadModule } from './upload/upload.module';
import { CartModule } from './cart/cart.module';
import { AddressModule } from './addresses/address.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    AuthModule,
    CulturalModule,
    GoodsModule,
    TicketsModule,
    OrdersModule,
    FavoritesModule,
    SessionsModule,
    UploadModule,
    CartModule,
    AddressModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
