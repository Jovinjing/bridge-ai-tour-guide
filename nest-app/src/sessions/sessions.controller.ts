import { Controller, All, Req, Res, Param } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import type { Request, Response } from 'express';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /** 通用代理：POST /api/sessions/* → POST /agent/* */
  @All('*path')
  proxy(@Req() req: Request, @Res() res: Response) {
    const path = req.url.replace('/sessions', '') || '/chat';
    return this.sessionsService.proxyToAgent(req, res, path);
  }
}
