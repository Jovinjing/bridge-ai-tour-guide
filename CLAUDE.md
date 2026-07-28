# 赵州桥AI科普导游系统 — 工作区指令

## 项目身份

| 项 | 值 |
|----|-----|
| **项目名** | 赵州桥AI科普导游系统 |
| **英文名** | Zhaozhou Bridge AI Tour Guide |
| **仓库** | `Jovinjing/bridge-ai-tour-guide` |
| **定位** | PC 端 AI 导游网站（非小程序） |
| **远程** | `git@github.com:Jovinjing/bridge-ai-tour-guide.git` |

## 技术栈

| 层 | 技术 |
|----|------|
| **前端** | React 19 + TypeScript + Vite 8 + Three.js |
| **后端** | NestJS (Node.js) + LangChain.js |
| **数据库** | PostgreSQL + pgvector（向量检索） |
| **LLM** | DeepSeek Chat API（OpenAI 兼容） |
| **部署** | Docker Compose + Nginx |

**废弃的旧技术栈**（旧项目 `赵州桥科普小程序3.0`，仅作素材参考）：
Spring Boot + Spring Cloud (Eureka/Config/Zuul) + LangChain4j + MySQL

---

## 三层文档体系

| 文件 | 作用 | 更新时机 |
|------|------|----------|
| `CLAUDE.md`（本文件） | 项目总览、工作流规则、权限、当前状态 | 每个 Phase 完成后更新 |
| `DESIGN.md` | 后端架构设计、模块边界、Agent 设计、数据模型 | 设计讨论定型后 |
| `API.md` | 前后端接口约定、请求/响应格式 | 接口变更时同步更新 |
| `ROADMAP.md` | 分阶段实施计划 + 当前任务指针 | 每完成一个功能单元更新 |

**会话启动时，雅只需：**
1. `git log --oneline -10` 了解进度
2. 读 `ROADMAP.md` 知道下一步做什么
3. （按需）读 `DESIGN.md` / `API.md`
不需要重新扫描代码库。

---

## Git 工作流（铁律，自动执行）

```
feature/<功能名> ──→ 用户检查 ──→ main
      │                  │
      │            验证通过：自动 merge
      │            发现问题：修复 → commit（body 写问题+方案）
      │
      └── 每个功能完成 → git add + commit + push
```

### 自动执行规则

| 触发条件 | 雅的行为 |
|----------|----------|
| **完成一个功能单元** | `git add` + `git commit -m "feat: xxx"` + `git push origin feature/<分支名>` |
| **完成一个大模块** | 主动提醒 paci 检查："这个模块完成了，检查一下？" |
| **paci 说"没问题"** | 自动 `git checkout main && git merge feature/<分支名> && git push origin main` |
| **paci 指出问题** | 修复 → `git commit -m "fix: xxx"`，body 写：**问题** + **原因** + **修复方案** |
| **paci 验证通过后** | 自动 merge 到 main，不再额外提醒 |

### 分支命名
- `feature/<模块名>`（如 `feature/nestjs-init`、`feature/agent-streaming`）
- `fix/<问题简述>`（如 `fix/jwt-token-expiry`）

### 禁止
- ❌ `git push --force` 到任何分支
- ❌ 直接 push 到 `main`
- ❌ 删除 `CLAUDE.md` / `DESIGN.md` / `API.md` / `ROADMAP.md`

---

## 项目权限（自动审批，无需逐次确认）

### ✅ 默认允许
- 读写项目目录下所有源码文件
- 执行 `npm` / `pnpm` / `nest` 命令
- 执行 `git add` / `git commit` / `git push`（仅 feature 分支）
- 执行 `git merge`（需 paci 验证通过后，仅 feature → main）
- 修改 `CLAUDE.md` / `DESIGN.md` / `API.md` / `ROADMAP.md`
- 读写 `D:/my-memory-vault/projects/bridge-ai-tour-guide.md`
- 执行 `docker compose` 命令（开发环境）

### ⛔ 需要确认
- `git push --force`
- 修改全局 `~/.claude/CLAUDE.md`
- 安装新的系统级依赖

### 🔧 可用 MCP 工具
| 工具 | 用途 |
|------|------|
| **Tavily 搜索** | 查技术文档、报错方案 |
| **Playwright** | 验证页面渲染效果 |
| **Omnibase** | 操作 PostgreSQL 数据库 |
| **GitHub MCP** | 管理 Issues、PR |

---

## 当前状态

| 项 | 值 |
|----|-----|
| **阶段** | Phase 0-2 已完成 ✅ → Phase 3 🚧 |
| **当前任务** | Phase 3 — 前端适配（新建 `frontend/` Vite + React 19 + TS） |
| **下一步** | Step 1 — 项目初始化 + 类型定义 + 资源迁移 |
| **最新 commit** | `c396cbc` — fix: splitIntoChunks 死循环修复 + Phase 2 单元测试 (106 tests) |
| **当前分支** | `feature/nestjs-init` |
| **设计文档** | DESIGN.md ✅ / API.md ✅ / ROADMAP.md ✅ |

### Phase 0 已完成项
- ✅ NestJS 脚手架 + Prisma Client（pg adapter）
- ✅ Express Agent 服务骨架
- ✅ PostgreSQL + pgvector Docker 容器（端口 5433）
- ✅ Auth API（register/login + JWT）
- ✅ Cultural API（列表 + 详情，含分页）
- ✅ Nginx 反向代理配置
- ✅ 健康检查端点 (/health)
- ✅ RSA 密钥对生成 + JWT 签发/验证联调

### Phase 1 已完成项
- ✅ 9 个业务模块 + 14 个 API 端点
- ✅ 36 个测试（27 单元 + 9 E2E）全部通过

### Phase 2 已完成项
- ✅ 2.1 DeepSeek Chat + Embedding LLM 配置
- ✅ 2.2 10 篇赵州桥知识文档 + 向量化导入脚本
- ✅ 2.3 工具适配层 + 5 个工具（searchKnowledge / queryProducts / planRoute / queryWeather / queryHotels）
- ✅ 2.4 System Prompt 移植 + Agent 组装（langchain v1 createAgent）
- ✅ 2.5 真流式 SSE 端点（token 流 + tool_call 中间态 + contentBlocks）
- ✅ 2.6 会话管理（CRUD + 消息持久化）
- ✅ 2.7 游客模式（UUID session + 10 轮限制 + 24h 过期 + 升级绑定）
- ✅ 2.8 JWT 公钥验证中间件（Phase 0.5 已完成）
- ✅ 2.9 106 个单元测试（12 个测试文件）全部通过
- ✅ 2.10 splitIntoChunks 死循环 Bug 修复

### Phase 3 规划（🚧 进行中）
- 🚧 3.1 项目初始化：新建 `frontend/` Vite + React 19 + TypeScript
- ⬜ 3.2 API 层重写：`api/client.ts` + `api/index.ts` + `api/sse.ts` POST SSE
- ⬜ 3.3 基础组件：ErrorBoundary, Icon, MarkdownRenderer, PanoramaViewer, ContentBlocks
- ⬜ 3.4 页面组件：App.tsx + 8 个页面（含 AiChatPanel POST SSE 重构）
- ⬜ 3.5 新功能：游客模式 UI, 代码高亮, 文件上传 UI
- 架构变更：EventSource(GET) → fetch ReadableStream(POST) | username/pwd → 验证码登录 | `res.success` → `{code,message,data}`

---

## 与旧项目的关系

旧项目路径：`D:\2026大三下\微信小程序\赵州桥科普小程序3.0`
- **可复用素材**：全景图（`public/panorama/`）、商品图、10 篇赵州桥知识文档、SystemMessage prompt 文本
- **不可复用代码**：全部 Java 后端、Spring Cloud 配置、React JSX（需迁移到 TS）
- **参考价值**：API 接口设计、Agent 工具逻辑、前端 UI 布局

---

## 全局记忆

paci 的记忆库位于 `D:/my-memory-vault`，包含：
- `memories/owner-core.md` — paci 的核心信息
- `memories/owner-ai-interaction-styles.md` — 互动风格
- `projects/bridge-ai-tour-guide.md` — 本项目跨会话记忆（待创建）
