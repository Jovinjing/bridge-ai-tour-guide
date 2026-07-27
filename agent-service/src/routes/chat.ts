import { Router } from 'express';
import { chatController } from '../agent/chat';

const router = Router();

/**
 * POST /agent/chat
 * SSE 流式对话接口
 */
router.post('/chat', chatController);

export { router as chatRoute };
