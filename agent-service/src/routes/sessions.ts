/**
 * GET /agent/sessions — 会话管理 API
 *
 * - GET    /agent/sessions      获取用户会话列表
 * - GET    /agent/sessions/:id  获取单个会话详情
 * - PATCH  /agent/sessions/:id  更新会话标题
 * - DELETE /agent/sessions/:id  删除会话
 * - POST   /agent/sessions/:id/upgrade  游客升级
 */
import { Router, Request, Response } from 'express';
import { jwtAuth } from '../middleware/jwt-auth';
import {
  getUserSessions,
  findSession,
  updateSessionTitle,
  deleteSession,
  upgradeGuestSession,
} from '../memory/sessionStore';

const router = Router();

/** 获取用户会话列表 */
router.get('/', jwtAuth, async (req: Request, res: Response) => {
  try {
    const userId = String(req.user!.id);
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '20');

    const result = await getUserSessions(userId, page, pageSize);
    res.json({ code: 200, data: result });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

/** 获取单个会话详情 */
router.get('/:id', jwtAuth, async (req: Request, res: Response) => {
  try {
    const session = await findSession(req.params.id as string);
    if (!session) {
      res.status(404).json({ code: 404, message: '会话不存在或已过期' });
      return;
    }
    res.json({ code: 200, data: session });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

/** 更新会话标题 */
router.patch('/:id', jwtAuth, async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    if (!title) {
      res.status(400).json({ code: 400, message: 'title 字段必填' });
      return;
    }

    const session = await updateSessionTitle(req.params.id as string, title);
    if (!session) {
      res.status(404).json({ code: 404, message: '会话不存在' });
      return;
    }
    res.json({ code: 200, data: session });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

/** 删除会话 */
router.delete('/:id', jwtAuth, async (req: Request, res: Response) => {
  try {
    await deleteSession(req.params.id as string);
    res.json({ code: 200, message: '删除成功' });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

/** 游客升级（将游客会话绑定到当前用户） */
router.post('/:id/upgrade', jwtAuth, async (req: Request, res: Response) => {
  try {
    const userId = String(req.user!.id);
    const session = await upgradeGuestSession(req.params.id as string, userId);
    if (!session) {
      res.status(404).json({ code: 404, message: '游客会话不存在或已过期' });
      return;
    }
    res.json({ code: 200, data: session, message: '会话已升级为注册用户模式' });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

export { router as sessionsRoute };
