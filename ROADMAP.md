# 赵州桥AI科普导游系统 — 实施路线图

> 日期: 2026-07-28  
> 状态: Phase 1 已完成 ✅，进入 Phase 2

---

## Phase 0：项目初始化 ✅

**目标**：跑通开发环境，两个服务能启动、能通信。

| # | 任务 | 产出 | 状态 |
|---|------|------|------|
| 0.1 | NestJS 脚手架 + Prisma + public schema 迁移 | `nest-app/` 可启动 | ✅ |
| 0.2 | Express Agent 服务骨架 + Prisma + agent schema 迁移 | `agent-service/` 可启动 | ✅ |
| 0.3 | PostgreSQL Docker + pgvector 扩展 + 初始数据导入 | 数据库就绪 | ✅ |
| 0.4 | Nginx 开发配置 + Vite proxy 对接 | 前端能调通后端 | ✅ |
| 0.5 | RSA 密钥对生成 + JWT 签发/验证联调 | Nest → Agent JWT 互通 | ✅ |

**预计**：2 天

---

## Phase 1：NestJS 业务 CRUD ✅

**目标**：替代旧项目 4 个 CRUD 微服务。

| # | 任务 | API | 状态 |
|---|------|-----|------|
| 1.1 | 认证模块（验证码 + 登录 + JWT） | `POST /api/auth/*` | ✅ |
| 1.2 | 用户模块（资料 + 头像上传） | `GET/PATCH /api/auth/me` | ✅ |
| 1.3 | 商品模块（列表 + 详情） | `GET /api/goods/*` | ✅ |
| 1.4 | 门票模块（列表 + 热力图） | `GET /api/tickets/*` | ✅ |
| 1.5 | 订单模块（创建 + 查询） | `POST/GET /api/orders/*` | ✅ |
| 1.6 | 文化内容模块（列表 + 详情） | `GET /api/cultural/*` | ✅ |
| 1.7 | 收藏模块 | `POST/GET/DELETE /api/favorites/*` | ✅ |
| 1.8 | 会话代理模块（Nest → Agent HTTP 转发） | `/api/sessions/*` | ✅ |
| 1.9 | 文件上传模块 | `POST /api/upload` | ✅ |

**预计**：4-5 天

---

## Phase 2：Agent 服务

**目标**：LangChain.js Agent + 真流式 SSE + pgvector 知识库。

| # | 任务 | 产出 | 状态 |
|---|------|------|------|
| 2.1 | DeepSeek Chat + Embedding 配置 | LLM 连接就绪 | ✅ |
| 2.2 | 10 篇赵州桥知识文档导入 + 向量化 | pgvector 数据就绪 | ✅ |
| 2.3 | 工具适配层 + 5 个工具实现 | 工具全部可用 | ✅ |
| 2.4 | System Prompt 移植 + AgentExecutor 组装 | Agent 能对话 | ✅ |
| 2.5 | 真流式 SSE + contentBlocks + tool_call 中间态 | SSE 端点完整 | ✅ |
| 2.6 | 会话管理（CRUD + 记忆持久化） | session CRUD | ✅ |
| 2.7 | 游客模式（限轮次 + 24h 过期 + 升级绑定） | 游客流程 | ✅ |
| 2.8 | JWT 公钥验证中间件 | Agent 鉴权 | ✅（Phase 0.5 已完成） |
| 2.9 | Phase 2 单元测试（106 tests） | 12 文件，全降级路径覆盖 | ✅ |

**预计**：6-8 天

**Bug 修复**：
- `splitIntoChunks` 死循环：短文本时 `chunkText.length <= overlap` 导致 `start` 不前进 → 已修复

---

## Phase 3：前端适配 ✅

**目标**：旧前端 JSX → TSX 迁移 + 新增功能 + API 全量对接。
**结果**：`tsc --noEmit` 零错误 + `vite build` 构建成功 + `git push` ✅

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 3.1 | 项目 TS 化（类型定义 + 配置 + 常量） | `types/index.ts` + `config.ts` + `constants/` | ✅ |
| 3.2 | API 层全量重写（新路径 + 新响应格式） | `api/client.ts` + `api/index.ts`，对照 API.md §14 | ✅ |
| 3.3 | **EventSource → fetch ReadableStream** | `api/sse.ts` — POST SSE 替代 EventSource | ✅ |
| 3.4 | SSE 真流式 UI（逐字渲染 + 状态提示 + 工具调用进度） | `AiChatPanel.tsx` 重构 | ✅ |
| 3.5 | contentBlocks 渲染器（文本/Markdown/地图/商品卡片） | `ContentBlocks.tsx` 富媒体块分发渲染 | ✅ |
| 3.6 | 两步注册/登录 UI（验证码 → 登录） | `AuthPage.tsx` — 手机号 + 验证码 | ✅ |
| 3.7 | React Router 路由 + 导航栏 | `App.tsx` 路由 + 认证状态 + 导航 | ✅ |
| 3.8 | 地址管理页面（CRUD + 默认地址） | `ProfilePage.tsx` → 地址子页面 | ✅ |
| 3.9 | 购物车页面（列表 + 增减 + 去结算） | `ProfilePage.tsx` → 购物车子页面 | ✅ |
| 3.10 | 订单管理（列表 + 状态过滤） | `ProfilePage.tsx` → 订单子页面 | ✅ |
| 3.11 | 全景 3D 场景（Three.js） | `PanoramaViewer.tsx` + `HotspotMarker.tsx` | ✅ |
| 3.12 | 基础组件迁移 | ErrorBoundary, Icon, MarkdownRenderer, AiChatPanel | ✅ |

****v1.0 完成**：tsc --noEmit 零错误 ✅ / vite build 构建成功 ✅ / git push ✅**

---

## Phase 4：部署上线

**目标**：生产可用的 Docker Compose + Nginx。

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 4.1 | Dockerfile × 2（NestJS + Agent） | 多阶段构建 | ⏳ |
| 4.2 | docker-compose.yml（全栈） | 4 个 service | ⏳ |
| 4.3 | Nginx 生产配置（SSL + Gzip + 缓存） | 生产级 nginx.conf | ⏳ |
| 4.4 | 前端 `vite build` 生产构建 | `dist/` 静态资源 | ⏳ |
| 4.5 | 环境变量清单 + 密钥管理方案 | `.env.example` | ⏳ |
| 4.6 | 数据库初始化脚本（schema + seed data） | `init.sql` | ⏳ |

**预计**：2-3 天

---

## 当前任务指针

→ **Phase 3 ✅ 完成 — 进入 Phase 4 🚧**

```
上次完成：Phase 3 — 前端适配（Vite + React 19 + TS，全部 12 个子任务）
当前：    Phase 4 — 部署上线
下一步：  Step 1 — Dockerfile 编写 + docker-compose.yml 完善
```

---

## 总时间估算

| Phase | 内容 | 时间 |
|-------|------|------|
| Phase 0 | 项目初始化 | 2 天 |
| Phase 1 | NestJS CRUD | 4-5 天 |
| Phase 2 | Agent 服务 | 6-8 天 |
| Phase 3 | 前端适配 | 5-7 天 |
| Phase 4 | 部署上线 | 2-3 天 |
| **合计** | | **19-25 天** |
