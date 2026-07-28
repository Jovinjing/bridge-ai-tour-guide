import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';

@Module({
  imports: [HttpModule.register({ timeout: 300000 })], // 5 min timeout for SSE
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
