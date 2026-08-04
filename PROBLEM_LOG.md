# PROBLEM_LOG — 赵州桥AI科普导游系统

> 按 STAR 格式记录：遇到的状况 → 原因分析 → 考虑的方案 → 最终解决方案。
> 新条目在上，时间倒序。

---

## [prisma migrate dev 要求 reset 全库：migrations 历史与数据库脱节] - 2026-08-04

**遇到的状况**：新增 `CartItem`/`Address` 表后执行 `prisma migrate dev --name cart_addresses`，Prisma 检测到数据库与迁移历史不一致，提示 "We need to reset the public schema"（drop 全部数据）。

**原因分析**：`migrations/01_init.sql` 是**旧版残留文件**——表名用 PascalCase（`"User"`/`"Good"`/`"Order"`、TEXT 类型），而数据库实际是重构后的新 schema（`users`/`goods`/`orders` snake_case、VarChar、@map）。迁移历史与数据库状态完全对不上，`migrate dev` 认为数据库被"篡改"，只能 reset 重建。

**考虑的方案**：
- 方案A：`prisma migrate reset` 接受重置（开发库有用户/订单/文化文档等测试数据，不可接受）
- 方案B：手写 SQL 匹配**实际数据库表名**，`prisma db execute` 执行 + `prisma generate`，不碰 `_prisma_migrations`（推荐）

**最终解决方案**：方案B。手写 `migrations/02_cart_addresses.sql`（cart_items/addresses 两表 + 索引 + 外键，文件头部注释说明同步方式），`db execute --file` 执行成功，`generate` 更新 client。验证：新模块 16 测试全绿，E2E 加购/地址全通过。
**环境结论**：本项目开发库的 schema 同步方式是 `db execute + generate`（db push 流），**不要再用 `prisma migrate dev`**（会触发 reset 提示，误操作会丢数据）。

---

## [图形验证码每敲一键就刷新，登录页无法输入验证码] - 2026-08-03

**遇到的状况**：登录页输入图形验证码时，每敲一个字符验证码就重新生成，输入框被清空，永远无法通过验证。Playwright 实测发现：`page.fill` 触发 input 事件后，输入值立即被还原为空。

**原因分析**：`CaptchaCanvas` 的 `useEffect(() => { refresh(); }, [refresh])` 依赖链问题——`refresh` 的 useCallback 依赖 `[draw, onChange]`，而 `onChange`（AuthPage 的 `handleCaptchaChange`）在父组件每次渲染时都是新函数引用 → `refresh` 引用每次渲染都变 → effect 每次渲染后都重跑 → `refresh()` 重新生成验证码并调用 `onChange` 清空输入框。任何导致 AuthPage 重渲染的操作（输入手机号、输入验证码）都会触发。

**考虑的方案**：
- 方案A：父组件用 `useCallback` 稳定 `handleCaptchaChange`（治标，其他调用方仍会踩坑）
- 方案B：组件内用 ref 保存最新 `onChange`，`refresh` 只依赖稳定的 `draw`（组件自愈，推荐）

**最终解决方案**：方案B。`onChangeRef.current = onChange`（React 官方推荐的"渲染期间写 ref"模式），`refresh` 的 useCallback 依赖改为 `[draw]`。验证：修复后 Playwright 全流程实测登录通过。

---

## [AI 回答渲染出 {"content":"好的"} 原始 JSON 片段] - 2026-08-03

**遇到的状况**：AI 对话页面回答显示 `{"content":"好的"}{"content":"，"}` 这样的 JSON 片段，而不是正常文本。

**原因分析**：`frontend/src/api/sse.ts` 的 `parseSseBlock` 中，`case 'token'` 直接把 `dataStr`（完整 JSON `{"content":"好的"}`）传给 `onToken` 回调，没有解析出 `.content` 字段。AiChatPanel 把原始 JSON 字符串拼进 `msg.content`，最终渲染为 JSON 文本。

**考虑的方案**：
- 方案A：前端解析 token 事件 JSON（改动小，符合职责：客户端负责解包）
- 方案B：后端 token 事件直接发纯文本（改变 SSE 协议，前后端都要动）

**最终解决方案**：方案A。`JSON.parse(dataStr)` 取 `content` 字段，非 JSON 时兜底透传。验证：修复后回答正常显示"赵州桥建于隋代开皇至大业年间（595-605年），由著名匠师李春设计建造"。

---

## [vite 代理 /agent/* 指向 3003，AI 对话全部失败] - 2026-08-03

**遇到的状况**：前端 AI 对话请求无响应（无法通过 `/agent/chat` 建立 SSE）。

**原因分析**：`frontend/vite.config.ts` 代理配置 `/agent/chat` 和 `/agent/sessions` 指向 `localhost:3003`，但 agent 服务实际运行在 `3001`（3003 是旧端口）。

**最终解决方案**：代理 target 改为 `localhost:3001`。验证：SSE 流式对话实测通过。

---

## [LLM fallback 链报错 "llm [object Object] must define bindTools method"] - 2026-08-02

**遇到的状况**：配置主备模型自动切换（智谱 glm-4-flash → DeepSeek deepseek-chat）后，Agent 创建失败或调用失败，报 `bindTools` 未定义；第二次修复后报 `_streamResponseChunks` 缺失。

**原因分析**：`RunnableWithFallbacks`（`withFallbacks` 返回）缺少 LangChain v1 Agent 要求的两个能力：
1. `bindTools` — Agent 绑定工具时调用（`_isChatModelWithBindTools` 检查）
2. `_streamResponseChunks` — `isBaseChatModel` 用它判断模型类型
两个缺失都会导致 `validateLLMHasNoBoundTools` 或 `_simpleBindTools` 阶段抛错。

**考虑的方案**：
- 方案A：用 `RunnableSequence` 手写 fallback 逻辑（复杂，流式难处理）
- 方案B：包装 `RunnableWithFallbacks`，补齐两个方法（最小侵入）

**最终解决方案**：方案B。`buildFallbackChain` 包装 primary.withFallbacks([fallback])：
- `_streamResponseChunks` 直接委托 primary
- `bindTools` 返回"两模型都绑定同一批工具"的新链（递归包装）
故障模拟验证：主模型 key 改无效值 → 自动切换到 DeepSeek 正常响应。

---

## [prisma db push 想要 DROP public 表（cultural/goods/users 有数据）] - 2026-08-02

**遇到的状况**：执行 `prisma db push` 同步 agent 表结构时，Prisma 检测到 public schema 中 NestJS 管理的业务表不在 schema 里，提示需要 DROP 这些表（含数据），且 `?schema=agent` 后 `::vector` 类型解析失败。

**原因分析**：
1. agent 和 NestJS 共用同一数据库，Prisma 的 schema 不包含 NestJS 的表 → db push 视为多余表
2. pgvector extension 只能安装一次（public），`search_path=agent` 下裸 `vector` 类型解析不到

**考虑的方案**：
- 方案A：`--accept-data-loss` 接受删除（数据丢失，不可接受）
- 方案B：agent 表隔离到独立 `agent` schema，SQL 显式限定 `::public.vector`（推荐）

**最终解决方案**：方案B。
- `prisma.config.ts` 中 `DATABASE_URL` 加 `?schema=agent`
- schema.prisma datasource 加 `schemas = ["agent"]`，5 个 model 加 `@@schema("agent")`
- 向量检索 SQL 显式写 `agent.document_chunks`、`dc.embedding::public.vector`
验证：db push 成功，public 表数据完好，向量检索可用。

---

## [Agent 启动报错：column guest_id of relation agent_sessions does not exist] - 2026-08-02

**遇到的状况**：Agent 服务启动后会话相关操作报 P2022/42703，`guest_id` 列不存在。

**原因分析**：agent schema 从未执行过 migration/db push（`migrations/` 目录不存在），表结构停留在最初版本。

**最终解决方案**：对 agent schema 执行 `prisma db push`（配合 schema 隔离方案，见上条），补全 `agent_sessions` 等表结构。

---

## [SiliconFlow bge-m3 返回 400 code 20015（dimensions 参数无效）] - 2026-08-02

**遇到的状况**：切换硅基流动 bge-m3 做 embedding 后，向量化请求全部 400。

**原因分析**：`OpenAIEmbeddings` 默认传 `dimensions` 参数，硅基流动 bge-m3 固定 1024 维，**拒绝该字段**。

**最终解决方案**：`createEmbeddingModel()` 和 `import-documents.ts` 中不传 `dimensions`。验证：10 篇文档 10 个 chunks 导入成功。

---

## [searchKnowledge 向量检索返回空结果] - 2026-08-02

**遇到的状况**：知识库检索工具查询返回 `totalFound: 0`。

**原因分析**：相似度阈值 0.7 是为 OpenAI text-embedding-3-small 定的，bge-m3 中文语义匹配分数整体偏低（相关文档常见 0.55-0.8），0.7 阈值过严全部被过滤。

**考虑的方案**：
- 方案A：阈值直接调低到 0.55（适配 bge-m3 的常见分数区间）
- 方案B：只调阈值不改代码，用环境变量可配

**最终解决方案**：两者结合。`vector.ts` 默认阈值改为 `SEARCH_THRESHOLD` 环境变量（默认 0.55），`searchKnowledge` 不再硬编码 0.7。验证：知识库检索命中，AI 回答引用文档内容。
