/**
 * 会话管理模块
 *
 * 管理 Agent 会话生命周期：
 * - 创建/查找/更新/删除会话
 * - 游客模式：UUID 会话，24h 过期，限 10 轮对话
 * - 用户模式：绑定 userId，持久化存储
 * - 游客升级：将 guest session 绑定到 userId
 */
import { prisma } from '../db/prisma';
import { randomUUID } from 'crypto';

// ======== 类型定义 ========

export interface SessionInfo {
  id: string;
  sessionId: string;
  userId?: string | null;
  guestId?: string | null;
  sessionType: 'guest' | 'registered';
  title?: string | null;
  messageCount: number;
  lastActivityAt: Date;
  expiresAt?: Date | null;
  createdAt: Date;
}

export interface CreateSessionParams {
  userId?: string;
  guestId?: string;
  sessionType?: 'guest' | 'registered';
  title?: string;
}

// ======== 常量 ========

/** 游客会话有效期（24 小时） */
const GUEST_SESSION_TTL_HOURS = 24;
/** 游客最大对话轮次 */
const GUEST_MAX_ROUNDS = 10;

// ======== CRUD 操作 ========

/**
 * 创建新会话
 */
export async function createSession(params: CreateSessionParams = {}): Promise<SessionInfo> {
  const sessionId = randomUUID();
  const sessionType = params.sessionType || (params.userId ? 'registered' : 'guest');
  const expiresAt = sessionType === 'guest'
    ? new Date(Date.now() + GUEST_SESSION_TTL_HOURS * 3600 * 1000)
    : null;

  const record = await prisma.agentSession.create({
    data: {
      id: sessionId,
      sessionId,
      userId: params.userId || null,
      guestId: params.guestId || (sessionType === 'guest' ? randomUUID() : null),
      sessionType,
      title: params.title || null,
      messageCount: 0,
      expiresAt,
    },
  });

  return mapSession(record);
}

/**
 * 根据 sessionId 查找会话
 */
export async function findSession(sessionId: string): Promise<SessionInfo | null> {
  const record = await prisma.agentSession.findUnique({
    where: { id: sessionId },
  });

  if (!record) return null;

  // 检查游客会话是否过期
  if (record.sessionType === 'guest' && record.expiresAt && new Date() > record.expiresAt) {
    await deleteSession(sessionId);
    return null;
  }

  return mapSession(record);
}

/**
 * 获取用户的所有会话（按活动时间倒序）
 */
export async function getUserSessions(
  userId: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<{ sessions: SessionInfo[]; total: number }> {
  const where = { userId };

  const [sessions, total] = await Promise.all([
    prisma.agentSession.findMany({
      where,
      orderBy: { lastActivityAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.agentSession.count({ where }),
  ]);

  return {
    sessions: sessions.map(mapSession),
    total,
  };
}

/**
 * 更新会话标题
 */
export async function updateSessionTitle(
  sessionId: string,
  title: string,
): Promise<SessionInfo | null> {
  const record = await prisma.agentSession.update({
    where: { id: sessionId },
    data: { title },
  });

  return mapSession(record);
}

/**
 * 更新会话活动时间 + 消息计数
 */
export async function touchSession(sessionId: string): Promise<void> {
  await prisma.agentSession.update({
    where: { id: sessionId },
    data: {
      lastActivityAt: new Date(),
      messageCount: { increment: 1 },
    },
  });
}

/**
 * 删除会话
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.agentSession.delete({
    where: { id: sessionId },
  });
  // 级联删除会自动清除关联的消息和工具调用记录
}

// ======== 游客模式 ========

/**
 * 检查游客会话是否超过轮次限制
 *
 * 返回: { allowed: boolean, remaining: number, reason?: string }
 */
export function checkGuestRoundLimit(messageCount: number): {
  allowed: boolean;
  remaining: number;
  reason?: string;
} {
  const remaining = Math.max(0, GUEST_MAX_ROUNDS - messageCount);

  if (messageCount >= GUEST_MAX_ROUNDS) {
    return {
      allowed: false,
      remaining: 0,
      reason: `游客模式最多支持 ${GUEST_MAX_ROUNDS} 轮对话。登录后可畅享无限制对话和更多功能！`,
    };
  }

  return { allowed: true, remaining };
}

/**
 * 是否会话即将过期（剩余 < 1 小时）
 */
export function isSessionExpiringSoon(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  const oneHour = 3600 * 1000;
  return new Date(Date.now() + oneHour) > expiresAt;
}

// ======== 游客升级 ========

/**
 * 将游客会话升级为注册用户会话
 *
 * 游客对话历史保留，userId 绑定，清除过期时间。
 */
export async function upgradeGuestSession(
  sessionId: string,
  userId: string,
): Promise<SessionInfo | null> {
  const session = await findSession(sessionId);

  if (!session || session.sessionType !== 'guest') {
    return null;
  }

  const record = await prisma.agentSession.update({
    where: { id: sessionId },
    data: {
      userId,
      sessionType: 'registered',
      expiresAt: null,
    },
  });

  return mapSession(record);
}

// ======== 消息持久化 ========

/**
 * 保存一条消息记录
 */
export async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'tool',
  content: string | null,
  contentBlocks?: Record<string, unknown>[],
  toolCalls?: Array<{ toolName: string; arguments: string; result?: string }>,
): Promise<string> {
  const msgId = randomUUID();

  await prisma.agentMessage.create({
    data: {
      id: msgId,
      sessionId,
      role,
      content,
      contentBlocks: contentBlocks as any || undefined,
    },
  });

  // 保存工具调用记录
  if (toolCalls && toolCalls.length > 0) {
    await Promise.all(toolCalls.map(tc =>
      prisma.agentToolCall.create({
        data: {
          id: randomUUID(),
          messageId: msgId,
          toolName: tc.toolName,
          arguments: tc.arguments,
          result: tc.result || null,
        },
      })
    ));
  }

  return msgId;
}

/**
 * 获取会话的最近消息（用于重建对话历史）
 */
export async function getRecentMessages(
  sessionId: string,
  limit: number = 10,
): Promise<Array<{ role: string; content: string | null }>> {
  const messages = await prisma.agentMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return messages.reverse().map(m => ({
    role: m.role,
    content: m.content,
  }));
}

// ======== 内部辅助 ========

function mapSession(record: any): SessionInfo {
  return {
    id: record.id,
    sessionId: record.sessionId,
    userId: record.userId,
    guestId: record.guestId,
    sessionType: record.sessionType,
    title: record.title,
    messageCount: record.messageCount,
    lastActivityAt: record.lastActivityAt,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
  };
}
