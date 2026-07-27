# 赵州桥AI科普导游系统 — 后端架构设计

> 版本: v1.0  
> 日期: 2026-07-27  
> 状态: 设计定型，待实施

---

## 1. 架构总览

```
                    浏览器 (React TS)
                         │
                    Nginx (:80)
                    /        \
                   /          \
        /api/*   /              \   /agent/chat
        (HTTP)  /                \  (SSE 直连)
               /                  \
        NestJS (:3000)         Agent (:3001)
        [public schema]        [agent schema]
              \                    /
               \                  /
            PostgreSQL (:5432)
         ├─ public (业务数据)
         └─ agent  (会话/知识/向量)
```

| 角色 | 技术 | 端口 | 职责 |
|------|------|------|------|
| **Nginx** | 反向代理 | 80 | 路由分流、静态文件、SSL 终结 |
| **NestJS** | Node.js + Prisma | 3000 | 用户认证、商品/订单/门票 CRUD、文化内容管理、会话历史代理 |
| **Agent** | Express + LangChain.js | 3001 | AI 对话 SSE、向量检索、工具调用、会话管理 |
| **PostgreSQL** | pgvector | 5432 | 业务数据 + 向量存储 |

### 关键设计决策

- **单体数据库，双 Schema**：`public`（Nest 业务） + `agent`（Agent 会话/知识）。逻辑隔离，运维成本低。规模增长后可平滑拆库
- **前端直连 Agent SSE**：`/agent/chat` 由 Nginx 直接路由至 Agent，绕过 NestJS，避免大量长连接占用业务服务资源
- **单一主 Agent + 工具集合**：文化专家/文创销售/旅游助手三种能力统一封装为 LangChain Tool，一个 Agent 入口，LLM 自动按意图调度工具
- **游客优先，可选登录**：游客生成 UUID sessionId 即可对话（24h 过期），登录解锁云端持久化会话/收藏/订单
- **统一工具适配层**：一期封装 REST API 为 LangChain Tool；二期底层切换 MCP 协议，上层业务无感知
- **Nacos/APISIX 暂时不引入**：当前仅为 2 个服务，Nginx 反向代理足够。未来服务拆分到 5+ 再评估

---

## 2. 模块边界

### 2.1 NestJS 模块

```
nest-app/
├─ src/
│   ├─ auth/          认证模块
│   │   ├─ auth.controller.ts    POST /api/auth/*
│   │   ├─ auth.service.ts      JWT 签发/验证、验证码管理
│   │   └─ jwt.strategy.ts      RSA 密钥对 JWT
│   ├─ user/          用户模块
│   │   ├─ user.controller.ts   CRUD /api/user/*
│   │   └─ user.service.ts      用户资料管理
│   ├─ goods/         商品模块
│   │   ├─ goods.controller.ts  GET /api/goods/*
│   │   └─ goods.service.ts     商品列表/详情
│   ├─ orders/        订单模块
│   │   ├─ orders.controller.ts POST/GET /api/orders/*
│   │   └─ orders.service.ts    订单创建/支付、热力图更新
│   ├─ tickets/       门票模块
│   │   ├─ tickets.controller.ts
│   │   └─ tickets.service.ts   门票管理、库存
│   ├─ cultural/      文化内容模块
│   │   └─ cultural.controller.ts  GET /api/cultural/*
│   ├─ sessions/      会话代理模块
│   │   ├─ sessions.controller.ts  /api/sessions/* → Agent
│   │   └─ sessions.service.ts     HTTP 转发到 Agent 服务
│   ├─ favorites/     收藏模块
│   ├─ upload/        文件上传模块
│   └─ common/        公共层
│       ├─ filters/      统一异常过滤器
│       ├─ interceptors/ 响应包装拦截器 {code, message, data}
│       └─ guards/       JWT 鉴权守卫
└─ prisma/
    └─ schema.prisma    public schema 表定义
```

### 2.2 Agent 服务模块

```
agent-service/
├─ src/
│   ├─ index.ts           Express 入口
│   ├─ routes/
│   │   ├─ chat.ts        POST /agent/chat (SSE)
│   │   └─ sessions.ts    GET/PATCH/DELETE /agent/sessions/:id
│   ├─ agent/
│   │   ├─ agent.ts       AgentExecutor 组装
│   │   ├─ prompt.ts      SystemMessage 模板
│   │   └─ tools/
│   │       ├─ index.ts           工具注册表 + 适配层
│   │       ├─ searchKnowledge.ts 向量检索赵州桥知识库
│   │       ├─ queryProducts.ts   查询文创商品
│   │       ├─ planRoute.ts       高德地图路线规划
│   │       ├─ queryWeather.ts    天气查询
│   │       └─ queryHotels.ts     酒店信息查询
│   ├─ llm/
│   │   └─ deepseek.ts    DeepSeek Chat + Embedding 配置
│   ├─ db/
│   │   ├─ prisma.ts      Prisma Client (agent schema)
│   │   └─ vector.ts      pgvector 查询封装
│   ├─ memory/
│   │   └─ sessionStore.ts  会话记忆管理 (BufferWindowMemory)
│   └─ middleware/
│       └─ auth.ts        JWT 公钥验证中间件
└─ prisma/
    └─ schema.prisma      agent schema 表定义
```

---

## 3. Agent 设计

### 3.1 组装方式

```typescript
// agent/agent.ts
const agent = await createToolCallingAgent({
  llm: deepseekChatModel,
  tools: [
    searchKnowledgeTool,  // 赵州桥知识库检索
    queryProductsTool,    // 文创商品推荐
    planRouteTool,        // 高德地图路线规划
    queryWeatherTool,     // 天气查询
    queryHotelsTool,      // 酒店信息查询
  ],
  prompt: ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_MESSAGE],
    ["placeholder", "{chat_history}"],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
  ]),
});

const executor = new AgentExecutor({ agent, tools, memory });
```

### 3.2 System Prompt 结构

沿用旧项目 LangChain4j 的 `@SystemMessage` 内容，按以下结构改写为 LangChain.js prompt template：

1. **角色定义**：赵州桥 AI 导游，中国古代建筑史专家
2. **核心职责**：讲解建筑知识、推荐文创商品、规划旅游路线
3. **行为准则**：准确性（不编造）、简洁性、诚实（不知为不知）
4. **工具使用策略**：明确映射用户意图到工具调用（多工具可组合）
5. **富媒体输出规范**：图片保留 Markdown `![]()` 语法、路线数据输出 GeoJSON 结构、商品推荐输出结构化卡片

### 3.3 工具列表

| 工具 | 数据来源 | 说明 |
|------|----------|------|
| **searchKnowledge** | pgvector `documents` + `document_chunks` | 向量检索赵州桥 10 篇知识文档，返回图文内容 |
| **queryProducts** | Agent 直读 `public.cultural_product` | 商品推荐，按偏好关键词匹配 |
| **planRoute** | 高德地图 REST API | 根据出发地/人数/经费/时间规划路线 |
| **queryWeather** | 和风天气 REST API | 查询目的地天气 |
| **queryHotels** | 酒店 REST API (待定) | 推荐住宿 |

### 3.4 工具适配层

```
业务工具调用 → 统一适配层（interface ToolAdapter）→ REST API
                                                  → 数据库直查
                                                  → (二期) MCP 协议
```

每个工具不直接依赖外部 API，而是通过适配层接口调用。二期切换 MCP 时，只需新增 MCP Adapter 实现，不改 Agent 代码。

### 3.5 真流式 SSE 事件协议

```
event: status
data: {"type":"thinking","message":"正在检索赵州桥知识库..."}

event: status
data: {"type":"tool_call","tool":"searchKnowledge","args":{"query":"主拱结构"}}

event: status
data: {"type":"tool_result","tool":"searchKnowledge","found":3}

event: token
data: {"content":"赵州桥的主拱采用"}

event: token
data: {"content":"敞肩式圆弧拱设计..."}

event: done
data: {"sessionId":"uuid","totalTokens":456}

event: error
data: {"code":"RATE_LIMITED","message":"请求过于频繁"}
```

- 对话结束必须推送 `done` 或 `error`，前端借此关闭连接
- `content_blocks`（富媒体块）随 `done` 事件一次性推送，或在最后一个 `token` 事件中携带

### 3.6 会话记忆

- 使用 LangChain.js `BufferWindowMemory`，滑动窗口 10 条消息
- 按 `sessionId` 手动管理内存 Map：`Map<string, BufferWindowMemory>`
- 每次对话结束后，将完整消息写入 `agent.messages` 表（content_blocks + tool_calls JSONB）
- 重新打开会话时从 DB 加载最近 10 条消息重建 memory

### 3.7 Embedding 策略

- **主**：OpenAI `text-embedding-3-small`（1536 维），通过代理访问
- **降级备选**：国产 Embedding API（阿里云百炼 / 智谱）
- **不在 Node 服务本地部署 ONNX 模型**（规避运行稳定性问题）
- 10 篇知识文档的 embedding 成本几乎为零（约 5000 tokens，<$0.0001）

### 3.8 Multi-Agent 演进路线

```
当前 (v1)                    未来 (v2)
──────────                   ──────────
单 Agent + 5 工具            Supervisor Agent
                              ├─ 文化专家 Agent (知识库工具)
                              ├─ 文创销售 Agent (商品工具)
                              └─ 旅游助手 Agent (路线+天气+酒店工具)

共享 SessionStore        →   中心化 Session Store (所有 Agent 共用)
单一 prompt               →  各 Agent 独立 System Prompt
工具统一注册表            →  按 Agent 分组注册
```

触发升级的阈值：
- 单个 SystemMessage 超过 2000 字
- 工具超过 8 个，LLM 选工具准确率下降
- 不同领域需要截然不同的对话风格

---

## 4. 数据模型

### 4.1 public schema（NestJS 管理，Prisma 迁移）

```prisma
// ---- 认证 ----
model User {
  id             Int       @id @default(autoincrement())
  phone          String?   @unique
  email          String?   @unique
  passwordHash   String?
  authProvider   String    @default("phone") // phone | email | wechat
  status         Int       @default(1)
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  profile        UserProfile?
  addresses      Address[]
  orders         Order[]
  favorites      Favorite[]

  @@map("users")
}

model UserProfile {
  id          Int      @id @default(autoincrement())
  userId      Int      @unique @map("user_id")
  nickname    String?
  avatarUrl   String?  @map("avatar_url")
  preferences Json?    // JSON: { interests, travel_style, budget_level }
  user        User     @relation(fields: [userId], references: [id])

  @@map("user_profiles")
}

model VerificationCode {
  id        Int      @id @default(autoincrement())
  target    String                    // 手机号或邮箱
  code      String
  type      String   @default("login") // login | register | reset_password
  expiresAt DateTime @map("expires_at")
  used      Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  @@map("verification_codes")
}

// ---- 地址 ----
model Address {
  id         Int      @id @default(autoincrement())
  userId     Int      @map("user_id")
  name       String
  phone      String
  province   String
  city       String
  district   String
  detail     String
  isDefault  Boolean  @default(false) @map("is_default")
  createdAt  DateTime @default(now()) @map("create_time")
  updatedAt  DateTime @updatedAt @map("update_time")
  user       User     @relation(fields: [userId], references: [id])

  @@map("address")
}

// ---- 商品 ----
model CulturalProduct {
  id          Int      @id @default(autoincrement())
  name        String
  category    String
  description String?
  price       Decimal  @db.Decimal(10, 2)
  imageUrl    String?  @map("image_url")
  stock       Int      @default(0)
  status      Int      @default(1)
  createdAt   DateTime @default(now()) @map("create_time")
  updatedAt   DateTime @updatedAt @map("update_time")

  @@map("cultural_product")
}

// ---- 门票 ----
model Ticket {
  id          Int      @id @default(autoincrement())
  name        String
  type        String   // 成人票 | 学生票 | 团体票 | 免票预约
  price       Decimal  @db.Decimal(10, 2)
  stock       Int      @default(0)
  description String?
  validPeriod String?  @map("valid_date") // 购买后30天内有效
  status      Int      @default(1)
  createdAt   DateTime @default(now()) @map("create_time")
  updatedAt   DateTime @updatedAt @map("update_time")

  @@map("tickets")
}

// ---- 热力图 ----
model TicketHeatmap {
  id        Int      @id @default(autoincrement())
  date      DateTime @db.Date
  timeSlot  String   @map("time_slot") // 08:00-10:00 | 10:00-12:00 | ...
  count     Int      @default(0)
  createdAt DateTime @default(now()) @map("create_time")
  updatedAt DateTime @updatedAt @map("update_time")

  @@unique([date, timeSlot])
  @@map("ticket_heatmap")
}

// ---- 订单 ----
model Order {
  id           Int       @id @default(autoincrement())
  orderNo      String    @unique @map("order_no")
  userId       Int       @map("user_id")
  orderType    String    @map("order_type") // ticket | cultural
  itemId       Int       @map("item_id")
  itemName     String?   @map("item_name")
  price        Decimal   @db.Decimal(10, 2)
  quantity     Int       @default(1)
  totalAmount  Decimal   @db.Decimal(10, 2) @map("total_amount")
  status       String    @default("PENDING") // PENDING | PAID | CANCELLED
  payMethod    String?   @map("pay_method")
  payTime      DateTime? @map("pay_time")
  addressId    Int?      @map("address_id")
  visitDate    String?   @map("visit_date")
  visitTimeSlot String?  @map("visit_time_slot")
  remark       String?
  createdAt    DateTime  @default(now()) @map("create_time")
  updatedAt    DateTime  @updatedAt @map("update_time")
  user         User      @relation(fields: [userId], references: [id])

  @@map("orders")
}

// ---- 收藏 ----
model Favorite {
  id         Int      @id @default(autoincrement())
  userId     Int      @map("user_id")
  targetType String   @map("target_type") // product | ticket | article
  targetId   Int      @map("target_id")
  createdAt  DateTime @default(now()) @map("created_at")
  user       User     @relation(fields: [userId], references: [id])

  @@unique([userId, targetType, targetId])
  @@map("favorites")
}

// ---- 文化内容 ----
model CulturalInfo {
  id          Int      @id @default(autoincrement())
  title       String
  category    String
  content     String   @db.Text
  coverImage  String?  @map("cover_image")
  author      String?
  source      String?
  publishTime DateTime? @map("publish_time")
  viewCount   Int      @default(0) @map("view_count")
  status      Int      @default(1)
  createdAt   DateTime @default(now()) @map("create_time")
  updatedAt   DateTime @updatedAt @map("update_time")

  @@map("cultural_info")
}

// ---- 上传文件 ----
model Upload {
  id         Int      @id @default(autoincrement())
  userId     Int?     @map("user_id")
  fileName   String   @map("file_name")
  fileUrl    String   @map("file_url")
  fileSize   Int      @map("file_size")
  mimeType   String   @map("mime_type")
  uploadType String   @map("upload_type") // avatar | document | general
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("uploads")
}
```

### 4.2 agent schema（Agent 服务管理，Prisma 迁移）

```prisma
// ---- 会话 ----
model Session {
  id              String    @id @default(uuid())
  userId          Int?      @map("user_id")
  guestId         String?   @map("guest_id")
  sessionType     String    @default("guest") @map("session_type") // guest | registered
  title           String?   // 自动从第一条用户消息截取
  messageCount    Int       @default(0) @map("message_count")
  lastActivityAt  DateTime  @default(now()) @map("last_activity_at")
  expiresAt       DateTime? @map("expires_at") // 游客 24h
  createdAt       DateTime  @default(now()) @map("created_at")
  messages        Message[]

  @@map("sessions")
}

// ---- 消息（支持富媒体） ----
model Message {
  id            Int      @id @default(autoincrement())
  sessionId     String   @map("session_id")
  role          String   // user | assistant | tool
  content       String?  @db.Text  // 纯文本，用于全文搜索
  contentBlocks Json?    @map("content_blocks") // 富媒体块数组
  // content_blocks 结构:
  // [
  //   {"type":"text","content":"..."},
  //   {"type":"image","url":"...","caption":"..."},
  //   {"type":"route","provider":"amap","origin":"...","destination":"...","polyline":"...","duration":"..."},
  //   {"type":"product_card","product_id":58,"name":"...","price":20.00,"image_url":"..."},
  //   {"type":"weather","city":"石家庄","temp":32,"icon":"sunny"}
  // ]
  toolCalls     Json?    @map("tool_calls") // 工具调用记录
  tokenUsage    Json?    @map("token_usage") // {prompt_tokens, completion_tokens}
  createdAt     DateTime @default(now()) @map("created_at")
  session       Session  @relation(fields: [sessionId], references: [id])

  @@index([sessionId])
  @@map("messages")
}

// ---- 知识文档 ----
model Document {
  id         Int             @id @default(autoincrement())
  title      String
  content    String          @db.Text
  category   String          // overview | structure | art | history
  metadata   Json?           // {source, keywords, imageUrl, order}
  createdAt  DateTime        @default(now()) @map("created_at")
  chunks     DocumentChunk[]

  @@map("documents")
}

// ---- 文档分段 (pgvector) ----
model DocumentChunk {
  id          Int      @id @default(autoincrement())
  documentId  Int      @map("document_id")
  chunkIndex  Int      @map("chunk_index")
  chunkText   String   @map("chunk_text") @db.Text
  embedding   Unsupported("vector(1536)")? // pgvector
  createdAt   DateTime @default(now()) @map("created_at")
  document    Document @relation(fields: [documentId], references: [id])

  @@index([documentId])
  @@map("document_chunks")
}
```

### 4.3 热力图数据流

```
用户下单门票 (order_type=ticket)
       │
       ▼
NestJS OrderService.createOrder()
       │
       ├─ INSERT INTO orders (...)
       │
       └─ UPSERT ticket_heatmap:
          INSERT INTO ticket_heatmap (date, time_slot, count)
          VALUES (visitDate, visitTimeSlot, 1)
          ON CONFLICT (date, time_slot)
          DO UPDATE SET count = count + 1
       │
       ▼
前端 GET /api/tickets/heatmap?start=2026-07-01&end=2026-07-31
       │
       ▼
ECharts 热力图渲染
```

---

## 5. 鉴权方案

### 5.1 JWT 设计

```
签发方：  NestJS auth 模块
密钥：   RSA 非对称密钥对
私钥：   NestJS (签发)
公钥：   Agent (验证) + NestJS (自验证)

Payload:
{
  "sub": 118,           // user_id
  "type": "registered", // registered | guest
  "iat": 1722096000,
  "exp": 1722182400
}
```

- Agent 持有公钥，本地独立验证，SSE 长连接场景无需远程调用
- 游客请求不带 JWT，仅凭 `guestId`(UUID) + `sessionId`(UUID) 访问 Agent
- 密钥通过环境变量注入：`JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`

### 5.2 登录流程

```
手机号登录：
  前端 → POST /api/auth/send-code {phone}
  NestJS → 生成6位验证码 → 存 verification_codes + 发短信
  前端 → POST /api/auth/login {phone, code}
  NestJS → 验证 → 签发 JWT → 返回 {token, user}

  游客升级：
  前端 → POST /api/auth/upgrade {guestId} (带JWT)
  Agent → 将 guest sessions 绑定到 userId
```

---

## 6. 工具适配层设计

### 6.1 接口定义

```typescript
// agent/agent/tools/adapter.ts

interface ToolAdapter<TParams, TResult> {
  name: string;
  execute(params: TParams): Promise<TResult>;
}

// 一期：REST API 适配器
class AmapRouteAdapter implements ToolAdapter<RouteParams, RouteResult> {
  async execute(params: RouteParams): Promise<RouteResult> {
    return fetch(`https://restapi.amap.com/v3/direction/transit/...`, {
      headers: { 'x-amap-key': process.env.AMAP_API_KEY }
    }).then(r => r.json());
  }
}

// 二期：MCP 适配器（底层切换，接口不变）
class AmapRouteMCPAdapter implements ToolAdapter<RouteParams, RouteResult> {
  private mcpClient: Client;
  async execute(params: RouteParams): Promise<RouteResult> {
    return this.mcpClient.callTool('amap_route', params);
  }
}
```

### 6.2 工具注册

```typescript
// agent/agent/tools/index.ts
const toolRegistry = new Map<string, ToolAdapter>();

toolRegistry.set('searchKnowledge', new PgvectorAdapter(pgClient));
toolRegistry.set('queryProducts',   new ProductDBAdapter(prisma));
toolRegistry.set('planRoute',       new AmapRouteAdapter());
toolRegistry.set('queryWeather',    new QweatherAdapter());
toolRegistry.set('queryHotels',     new HotelAdapter());

// 生成 LangChain Tool 数组
const tools = Array.from(toolRegistry.entries()).map(([name, adapter]) =>
  new DynamicStructuredTool({
    name,
    description: TOOL_DESCRIPTIONS[name],
    schema: TOOL_SCHEMAS[name],
    func: async (params) => adapter.execute(params),
  })
);
```

---

## 7. 部署拓扑

### 7.1 Docker Compose（开发/生产统一）

```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes: ["./nginx.conf:/etc/nginx/nginx.conf"]

  nestjs:
    build: ./nest-app
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL=postgresql://...
      - JWT_PRIVATE_KEY=...
      - AGENT_SERVICE_URL=http://agent:3001

  agent:
    build: ./agent-service
    ports: ["3001:3001"]
    environment:
      - DATABASE_URL=postgresql://...
      - JWT_PUBLIC_KEY=...
      - DEEPSEEK_API_KEY=...
      - AMAP_API_KEY=...
      - OPENAI_API_KEY=...

  postgres:
    image: pgvector/pgvector:pg16
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
```

### 7.2 Nginx 路由配置

```nginx
server {
    listen 80;

    # 前端静态文件
    location / {
        root /usr/share/nginx/html;
        try_files $uri /index.html;
    }

    # NestJS 业务 API
    location /api/ {
        proxy_pass http://nestjs:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Agent SSE 对话（直连，绕过 NestJS）
    location /agent/chat {
        proxy_pass http://agent:3001;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;        # SSE 必须关缓冲
        proxy_cache off;
        proxy_read_timeout 180s;
    }

    # Agent 会话管理（经由 NestJS 代理）
    location /api/sessions/ {
        proxy_pass http://nestjs:3000;
    }
}
```
