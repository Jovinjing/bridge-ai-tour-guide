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

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.culturalService.findOne(id);
  }
}
