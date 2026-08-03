import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { CulturalService } from './cultural.service';

@Controller('cultural')
export class CulturalController {
  constructor(private readonly culturalService: CulturalService) {}

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('category') category?: string,
  ) {
    return this.culturalService.findAll({ page, pageSize, category });
  }

  /** 全部文化内容（商店页 info 标签，无分页）— 必须声明在 :id 之前 */
  @Get('all')
  findAllRaw() {
    return this.culturalService.findAllRaw();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.culturalService.findOne(id);
  }
}
