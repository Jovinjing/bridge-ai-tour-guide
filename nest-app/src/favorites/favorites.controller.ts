import { Controller, Post, Get, Delete, Param, Body, HttpCode, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  /** 添加收藏 🔒 */
  @Post()
  @HttpCode(200)
  add(@Req() req: Request, @Body() dto: { targetType: string; targetId: number }) {
    return this.favoritesService.add((req.user as any).id, dto);
  }

  /** 收藏列表 🔒 */
  @Get()
  findByUser(@Req() req: Request) {
    return this.favoritesService.findByUser((req.user as any).id);
  }

  /** 取消收藏 🔒 */
  @Delete(':id')
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.favoritesService.remove((req.user as any).id, id);
  }
}
