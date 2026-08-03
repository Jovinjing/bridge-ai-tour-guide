import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { Response, Request } from 'express';
import type { AxiosResponse } from 'axios';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly AGENT_URL = process.env.AGENT_SERVICE_URL ?? 'http://localhost:3001';

  constructor(private readonly httpService: HttpService) {}

  /** 透传请求到 Agent 服务 */
  async proxyToAgent(req: Request, res: Response, path: string) {
    const url = `${this.AGENT_URL}/agent${path}`;
    const method = req.method;

    this.logger.log(`📡 ${method} ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url,
          headers: {
            authorization: req.headers.authorization,
            'content-type': req.headers['content-type'],
          },
          data: req.body,
          responseType: 'stream', // 支持 SSE 流
        }),
      );

      // 透传响应头
      const contentType = response.headers['content-type'];
      if (contentType) {
        res.setHeader('content-type', String(contentType));
      }

      // 流式转发响应体
      response.data.pipe(res);
    } catch (err) {
      this.logger.error(`代理失败: ${err.message}`);
      if (!res.headersSent) {
        res.status(err.response?.status || 502).json({
          error: 'Agent 服务不可用',
        });
      }
    }
  }
}
