# ============================================
# 赵州桥AI科普导游系统 — NestJS 后端 Dockerfile
# 端口: 3002
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

EXPOSE 3002

CMD ["node", "dist/src/main.js"]
