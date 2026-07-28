import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { GoodsService } from './goods.service';

@Controller('goods')
export class GoodsController {
  constructor(private readonly goodsService: GoodsService) {}

  /** 商品列表（分页 + 搜索 + 筛选） */
  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('keyword') keyword?: string,
    @Query('inStock') inStock?: boolean,
    @Query('sortBy') sortBy?: 'price' | 'createdAt',
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.goodsService.findAll({ page, pageSize, keyword, inStock, sortBy, order });
  }

  /** 商品详情 */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.goodsService.findOne(id);
  }
}
