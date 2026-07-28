import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone: string;
      };
    }
  }
}

/**
 * JWT 验证中间件（使用 RSA 私钥验证）
 * 验证来自 NestJS 的 JWT token
 */
export function jwtAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  try {
    // 从 .keys/private.key 加载私钥
    const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || join(process.cwd(), '.keys/private.key');

    if (!existsSync(privateKeyPath)) {
      return res.status(500).json({ error: 'JWT 私钥文件不存在' });
    }

    const privateKey = readFileSync(privateKeyPath, 'utf-8');

    // 验证 JWT
    const decoded = jwt.verify(token, privateKey, {
      algorithms: ['RS256'],
    }) as JwtPayload & { sub: string; phone: string };

    // 将用户信息附加到请求对象
    req.user = {
      id: decoded.sub,
      phone: decoded.phone,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: '令牌已过期' });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: '无效的令牌' });
    }
    return res.status(500).json({ error: '验证令牌时出错' });
  }
}
