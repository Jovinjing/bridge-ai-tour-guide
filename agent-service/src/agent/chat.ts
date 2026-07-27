import { Request, Response } from 'express';

/**
 * POST /agent/chat
 * SSE 流式对话端点（占位符）
 *
 * TODO Phase 2: 实现 LangChain.js Agent + 真流式 SSE
 */
export function chatController(req: Request, res: Response): void {
  // SSE 需要设置正确的 headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // TODO: 实现真流式 SSE
  res.write(`data: ${JSON.stringify({
    type: 'message',
    content: 'Agent 服务骨架已搭建，Phase 2 实现 SSE 对话流',
  })}\n\n`);

  res.write(`data: ${JSON.stringify({
    type: 'done',
  })}\n\n`);

  res.end();
}
