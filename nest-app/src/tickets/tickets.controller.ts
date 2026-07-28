import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findAll(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.ticketsService.findAll({ page, pageSize });
  }

  @Get('heatmap')
  getHeatmap(@Query('start') start?: string, @Query('end') end?: string) {
    return this.ticketsService.getHeatmap(start, end);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.findOne(id);
  }
}
