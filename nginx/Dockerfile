# ============================================
# 赵州桥AI科普导游系统 — Nginx + 前端 Dockerfile
# 多阶段：构建前端 → Nginx 静态托管 + API 反向代理
# ============================================

# ---- 阶段1: 构建前端 ----
FROM node:22-alpine AS frontend-builder
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# ---- 阶段2: Nginx 生产服务 ----
FROM nginx:alpine

# 从构建阶段复制前端产物
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
