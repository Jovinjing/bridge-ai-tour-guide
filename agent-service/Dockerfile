# ============================================
# 赵州桥AI科普导游系统 — Agent 服务 Dockerfile
# 端口: 3001
# ============================================

# ---- 构建阶段 ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ---- 生产阶段 ----
FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
# Prisma 配置（启动时 db push 同步 schema 用；CLI 由 prisma 依赖提供）
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3001

# 启动前先同步数据库 schema（幂等），再启动服务
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
