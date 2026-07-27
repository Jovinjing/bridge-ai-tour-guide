import { Module } from '@nestjs/common';
import { CulturalService } from './cultural.service';
import { CulturalController } from './cultural.controller';

@Module({
  controllers: [CulturalController],
  providers: [CulturalService],
})
export class CulturalModule {}
