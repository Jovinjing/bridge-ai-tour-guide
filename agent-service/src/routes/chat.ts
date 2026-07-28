import { Router } from 'express';
import { chatController } from '../agent/chat';
import { jwtAuth } from '../middleware/jwt-auth';

const router = Router();

/**
 * POST /agent/chat
 * SSE 流式对话接口（需要 JWT 认证）
 */
router.post('/chat', jwtAuth, chatController);

export { router as chatRoute };
