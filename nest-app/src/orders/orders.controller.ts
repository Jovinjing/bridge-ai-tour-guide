import { Controller, Post, Get, Param, Query, Body, HttpCode, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** 创建订单 🔒 */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  create(
    @Req() req: Request,
    @Body() dto: { goodId?: number; ticketId?: number; quantity?: number },
  ) {
    return this.ordersService.create((req.user as any).id, dto);
  }

  /** 我的订单列表 🔒 */
  @Get()
  @UseGuards(JwtAuthGuard)
  findByUser(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.ordersService.findByUser((req.user as any).id, { page, pageSize });
  }

  /** 订单详情 🔒 */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id, (req.user as any).id);
  }
}
