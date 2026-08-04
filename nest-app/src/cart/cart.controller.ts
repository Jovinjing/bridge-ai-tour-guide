import { Controller, Post, Get, Delete, Param, Body, HttpCode, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /** 添加商品到购物车 🔒 */
  @Post()
  @HttpCode(200)
  add(@Req() req: Request, @Body() dto: { productId?: number; quantity?: number }) {
    return this.cartService.add((req.user as any).id, dto);
  }

  /** 我的购物车 🔒 */
  @Get()
  findByUser(@Req() req: Request) {
    return this.cartService.findByUser((req.user as any).id);
  }

  /** 移除购物车项 🔒 */
  @Delete(':id')
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.cartService.remove((req.user as any).id, id);
  }
}
