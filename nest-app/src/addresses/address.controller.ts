import { Controller, Post, Get, Put, Delete, Param, Body, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { AddressService } from './address.service';
import type { CreateAddressDto } from './address.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  /** 地址列表 🔒 */
  @Get()
  findByUser(@Req() req: Request) {
    return this.addressService.findByUser((req.user as any).id);
  }

  /** 新增地址 🔒 */
  @Post()
  create(@Req() req: Request, @Body() dto: CreateAddressDto) {
    return this.addressService.create((req.user as any).id, dto);
  }

  /** 更新地址 🔒 */
  @Put(':id')
  update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateAddressDto>,
  ) {
    return this.addressService.update((req.user as any).id, id, dto);
  }

  /** 删除地址 🔒 */
  @Delete(':id')
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.addressService.remove((req.user as any).id, id);
  }
}
