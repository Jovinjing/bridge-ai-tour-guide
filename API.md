# 赵州桥AI科普导游系统 — 前后端接口约定

> 版本: v1.0  
> 日期: 2026-07-27  
> 状态: 设计定型，与前端协调后冻结

---

## 1. 通用约定

### 1.1 基础 URL

| 环境 | 值 |
|------|-----|
| 开发 | `http://localhost:5173`（Vite proxy → Nginx → 后端） |
| 生产 | `https://<域名>`（Nginx 反向代理） |

### 1.2 统一响应格式

所有 HTTP API 使用统一包装：

```json
{
  "code": 0,
  "message": "success",
  "data": { }
}
```

| code | 含义 |
|------|------|
| `0` | 成功 |
| `1001` | 参数校验失败 |
| `1002` | 未登录 / Token 过期 |
| `1003` | 权限不足 |
| `1004` | 资源不存在 |
| `1005` | 业务逻辑错误（库存不足、订单已支付等） |
| `2001` | 验证码发送过于频繁 |
| `2002` | 验证码错误 |
| `5000` | 服务内部错误 |

- HTTP 状态码统一返回 `200`，靠 `code` 区分成功/失败
- **例外**：SSE 事件流（`/agent/chat`）不遵循此格式，使用独立事件协议

### 1.3 鉴权

```
Authorization: Bearer <jwt_token>
```

- 需要登录的接口标注 `🔒`
- 游客可访问的接口不标注
- SSE 连接通过 URL query 参数传递 `sessionId`，如携带 JWT 则 Header 传递

### 1.4 分页格式

请求：
```
GET /api/goods?page=1&pageSize=10
```

响应 `data`：
```json
{
  "content": [...],
  "totalElements": 100,
  "totalPages": 10,
  "page": 1,
  "pageSize": 10
}
```

---

## 2. 认证模块 `/api/auth`

### 2.1 发送验证码

```
POST /api/auth/send-code
```

请求：
```json
{
  "phone": "13800138000",
  "type": "login"
}
// type: "login" | "register" | "reset_password"
```

响应：
```json
{
  "code": 0,
  "message": "验证码已发送",
  "data": null
}
```

### 2.2 登录

```
POST /api/auth/login
```

请求：
```json
{
  "phone": "13800138000",
  "code": "123456"
}
// 或邮箱登录:
// { "email": "user@example.com", "password": "xxx" }
```

响应：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": 118,
      "nickname": "晓歌",
      "avatarUrl": "/user-service/avatars/abc.jpg",
      "phone": "138****0000",
      "email": null
    }
  }
}
```

### 2.3 获取当前用户 🔒

```
GET /api/auth/me
```

响应：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 118,
    "nickname": "晓歌",
    "avatarUrl": "...",
    "phone": "138****0000",
    "email": "2403@qq.com",
    "createdAt": "2026-06-15T22:36:17"
  }
}
```

### 2.4 更新个人信息 🔒

```
PATCH /api/auth/me
```

请求：
```json
{
  "nickname": "新昵称",
  "email": "new@example.com"
}
```

### 2.5 上传头像 🔒

```
POST /api/auth/avatar/upload
Content-Type: multipart/form-data
```

请求：`file` (图片，≤5MB，支持 jpg/png/webp)

响应：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "avatarUrl": "/uploads/avatars/abc123.jpg"
  }
}
```

---

## 3. 商品模块 `/api/goods`

### 3.1 商品列表

```
GET /api/goods?page=1&pageSize=10&category=纪念品&keyword=冰箱贴
```

响应 `data.content`：
```json
[{
  "id": 58,
  "name": "赵州桥冰箱贴",
  "category": "纪念品",
  "description": "珐琅工艺，精致美观",
  "price": 20.00,
  "imageUrl": "/assets/赵州桥冰箱贴.jpg",
  "stock": 493,
  "status": 1
}]
```

### 3.2 商品详情

```
GET /api/goods/:id
```

---

## 4. 门票模块 `/api/tickets`

### 4.1 门票列表

```
GET /api/tickets
```

响应：
```json
[{
  "id": 9,
  "name": "赵州桥成人票",
  "type": "成人票",
  "price": 40.00,
  "stock": 454,
  "description": "赵州桥景区成人参观门票",
  "validPeriod": "购买后30天内有效"
}]
```

### 4.2 门票详情

```
GET /api/tickets/:id
```

### 4.3 按类型筛选

```
GET /api/tickets/type/:type
```
// type: 成人票 | 学生票 | 团体票 | 免票预约

### 4.4 热力图数据

```
GET /api/tickets/heatmap?start=2026-07-01&end=2026-07-31
```

响应：
```json
[{
  "date": "2026-07-01",
  "timeSlot": "10:00-12:00",
  "count": 108
}, {
  "date": "2026-07-01",
  "timeSlot": "12:00-14:00",
  "count": 152
}]
```

- 前端用此数据渲染 ECharts 热力图，帮助游客选择人流较少的时间段

---

## 5. 订单模块 `/api/orders` 🔒

### 5.1 创建订单

```
POST /api/orders
```

请求：
```json
// 门票订单:
{
  "orderType": "ticket",
  "itemId": 9,
  "quantity": 2,
  "visitDate": "2026-08-01",
  "visitTimeSlot": "10:00-12:00"
}

// 文创商品订单:
{
  "orderType": "cultural",
  "itemId": 58,
  "quantity": 1,
  "addressId": 12
}
```

响应：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "orderNo": "ORD202607270001",
    "totalAmount": 80.00,
    "status": "PENDING"
  }
}
```

### 5.2 我的订单列表

```
GET /api/orders?status=PAID&page=1&pageSize=10
```

### 5.3 订单详情

```
GET /api/orders/:id
```

### 5.4 支付

```
POST /api/orders/:id/pay
```

请求：
```json
{
  "payMethod": "wechat"
}
```

### 5.5 取消订单 🔒

```
POST /api/orders/:id/cancel
```

### 5.6 退款 🔒

```
POST /api/orders/:id/refund
```

### 5.7 按用户查询 🔒

```
GET /api/orders/user/:userId?page=1&pageSize=10
```

---

## 6. 地址模块 `/api/addresses` 🔒

### 6.1 地址列表

```
GET /api/addresses
```

### 6.2 地址详情

```
GET /api/addresses/:id
```

### 6.3 新增地址

```
POST /api/addresses
```

请求：
```json
{
  "name": "张三",
  "phone": "13800138000",
  "province": "河北省",
  "city": "石家庄市",
  "district": "长安区",
  "detail": "中山东路100号",
  "isDefault": true
}
```

### 6.4 更新地址

```
PUT /api/addresses/:id
```

### 6.5 删除地址

```
DELETE /api/addresses/:id
```

---

## 7. 购物车模块 `/api/cart` 🔒

### 7.1 获取购物车

```
GET /api/cart
```

### 7.2 添加商品

```
POST /api/cart
```

请求：
```json
{
  "productId": 58,
  "quantity": 1
}
```

### 7.3 移除商品

```
DELETE /api/cart/:id
```

---

## 8. 文化内容模块 `/api/cultural`

### 8.1 内容列表

```
GET /api/cultural?page=1&pageSize=10&category=历史
```

### 8.2 内容详情

```
GET /api/cultural/:id
```

### 8.3 全量资讯

```
GET /api/cultural/all
```

---

## 9. 会话模块 `/api/sessions`（Nest 代理 → Agent）

### 9.1 我的会话列表 🔒

```
GET /api/sessions?page=1&pageSize=20
```

响应：
```json
[{
  "id": "uuid-xxx",
  "title": "赵州桥主拱结构",
  "sessionType": "registered",
  "messageCount": 12,
  "lastActivityAt": "2026-07-27T22:00:00",
  "createdAt": "2026-07-27T21:00:00"
}]
```

### 9.2 会话消息历史

```
GET /api/sessions/:id
```

响应：
```json
{
  "id": "uuid-xxx",
  "title": "赵州桥主拱结构",
  "messages": [{
    "id": 1,
    "role": "user",
    "content": "赵州桥的主拱为什么能承受这么大的重量？",
    "createdAt": "2026-07-27T21:00:00"
  }, {
    "id": 2,
    "role": "assistant",
    "content": "赵州桥的主拱采用敞肩式圆弧拱设计...",
    "contentBlocks": [
      {"type": "text", "content": "赵州桥的主拱采用敞肩式圆弧拱设计..."},
      {"type": "image", "url": "/assets/主拱结构.jpg", "caption": "赵州桥主拱结构示意图"}
    ],
    "toolCalls": [
      {"tool": "searchKnowledge", "args": {"query": "主拱结构"}, "resultSummary": "找到3条相关"}
    ],
    "createdAt": "2026-07-27T21:00:05"
  }]
}
```

### 9.3 更新会话

```
PATCH /api/sessions/:id
```

请求：
```json
{
  "title": "自定义标题"
}
```

### 9.4 删除会话

```
DELETE /api/sessions/:id
```

---

## 10. 收藏模块 `/api/favorites` 🔒

### 10.1 添加收藏

```
POST /api/favorites
```

请求：
```json
{
  "targetType": "product",
  "targetId": 58
}
// targetType: "product" | "ticket" | "article"
```

### 10.2 我的收藏

```
GET /api/favorites?page=1&pageSize=20
```

### 10.3 取消收藏

```
DELETE /api/favorites/:id
```

---

## 11. 文件上传 `/api/upload` 🔒

```
POST /api/upload
Content-Type: multipart/form-data
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `file` | File | 文件，≤10MB |
| `type` | String | `avatar` / `document` / `general` |

响应：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "fileId": 42,
    "fileName": "report.pdf",
    "fileUrl": "/uploads/documents/report.pdf",
    "fileSize": 2048000
  }
}
```

---

## 12. Agent SSE 对话（直连） `/agent/chat`

**不与 NestJS 交互，Nginx 直接路由至 Agent 服务。**

### 10.1 发起对话

```
POST /agent/chat
Content-Type: application/json
Authorization: Bearer <jwt_token>   (可选，游客省略)
Accept: text/event-stream
```

请求：
```json
{
  "sessionId": "uuid-xxx",
  "message": "赵州桥的主拱为什么能承受这么大的重量？"
}
```

- `sessionId`：游客传前端生成的 UUID；已登录用户传已有 sessionId 或新建 UUID
- 首次对话自动创建 session，后续对话传入同一个 `sessionId` 维持上下文

### 10.2 SSE 事件协议

```
event: status
data: {"type":"thinking","message":"正在思考..."}

event: status
data: {"type":"tool_call","tool":"searchKnowledge","args":{"query":"主拱结构"}}

event: status
data: {"type":"tool_result","tool":"searchKnowledge","found":3}

event: token
data: {"content":"赵州桥的主拱采用"}

event: token
data: {"content":"敞肩式圆弧拱设计..."}

event: done
data: {"sessionId":"uuid-xxx","totalTokens":456,"contentBlocks":[...]}
```

### 10.3 事件类型说明

| event | data.type | 触发时机 | 前端行为 |
|-------|-----------|----------|----------|
| `status` | `thinking` | Agent 开始处理 | 显示"思考中"动画 |
| `status` | `tool_call` | 调用工具前 | 显示"正在检索/查询..." |
| `status` | `tool_result` | 工具返回结果 | 更新状态提示 |
| `token` | — | LLM 逐 token 输出 | **逐字追加到聊天框** |
| `done` | — | 对话完成 | 关闭连接，渲染 contentBlocks |
| `error` | — | 异常 | 显示错误提示，关闭连接 |

### 10.4 contentBlocks 规范

`done` 事件的 `contentBlocks` 数组包含结构化富媒体内容：

```json
[
  {
    "type": "text",
    "content": "赵州桥的主拱采用敞肩式圆弧拱设计..."
  },
  {
    "type": "image",
    "url": "/assets/主拱结构.jpg",
    "caption": "赵州桥主拱结构示意图"
  },
  {
    "type": "route",
    "provider": "amap",
    "origin": {"name": "北京西站", "lng": 116.32, "lat": 39.89},
    "destination": {"name": "赵州桥景区", "lng": 114.78, "lat": 37.76},
    "duration": "1.5小时",
    "distance": "120km",
    "steps": [
      {"mode": "高铁", "from": "北京西站", "to": "石家庄站", "duration": "1小时"},
      {"mode": "公交", "from": "石家庄站", "to": "赵州桥景区", "duration": "30分钟"}
    ]
  },
  {
    "type": "product_card",
    "productId": 58,
    "name": "赵州桥冰箱贴",
    "price": 20.00,
    "imageUrl": "/assets/赵州桥冰箱贴.jpg"
  }
]
```

### 10.5 错误事件

```
event: error
data: {"code":"RATE_LIMITED","message":"请求过于频繁，请稍后重试"}
```

| code | 说明 |
|------|------|
| `INVALID_SESSION` | 会话无效或已过期 |
| `GUEST_LIMIT` | 游客对话轮次达到上限 |
| `TOKEN_EXPIRED` | JWT 过期 |
| `RATE_LIMITED` | 请求过于频繁 |
| `AI_ERROR` | 大模型调用失败 |
| `INTERNAL_ERROR` | 服务内部错误 |

## 13. 健康检查 `/api/health`

```
GET /api/health
```

响应：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "status": "ok",
    "services": {
      "nestjs": true,
      "agent": true,
      "postgres": true
    }
  }
}
```

---

## 14. 附录：旧 API → 新 API 迁移对照（完整）

| 旧接口 | 新接口 | 变更说明 |
|--------|--------|----------|
| **认证/用户** | | |
| `POST /api/user/login` | `POST /api/auth/login` | 参数格式变更（验证码替代密码） |
| `POST /api/user/register` | `POST /api/auth/send-code` + `POST /api/auth/login` | 两步流程 |
| `GET /api/user/users/{id}` | `GET /api/auth/me` | 仅查自己，不按 ID 查任意用户 |
| `PUT /api/user/users/{id}` | `PATCH /api/auth/me` | 更新个人信息 |
| `POST /api/user/avatar/upload` | `POST /api/auth/avatar/upload` | 收归 auth 模块 |
| `POST /api/user/wx-login` | 废弃 | PC 端不接入微信登录 |
| `GET /api/user/oauth/callback` | 废弃 | 同上 |
| **地址** | | |
| `GET /api/user/address` | `GET /api/addresses` | 独立模块 |
| `GET /api/user/address/{id}` | `GET /api/addresses/:id` | |
| `POST /api/user/address` | `POST /api/addresses` | |
| `PUT /api/user/address/{id}` | `PUT /api/addresses/:id` | |
| `DELETE /api/user/address/{id}` | `DELETE /api/addresses/:id` | |
| **商品** | | |
| `GET /api/cultural/products` | `GET /api/goods` | 路径重构 |
| `GET /api/cultural/products/{id}` | `GET /api/goods/:id` | |
| `GET /api/goods/all` | `GET /api/goods?pageSize=100` | 分页替代全量 |
| `GET /api/goods/one?id=x` | `GET /api/goods/:id` | RESTful |
| **门票** | | |
| `GET /api/goods/tickets` | `GET /api/tickets` | 独立门票模块 |
| `GET /api/goods/tickets/{id}` | `GET /api/tickets/:id` | |
| `GET /api/goods/tickets/type/{type}` | `GET /api/tickets/type/:type` | |
| `GET /api/goods/tickets/heatmap/range` | `GET /api/tickets/heatmap` | 参数名 startDate→start |
| **购物车** | | |
| `GET /api/cultural/cart` | `GET /api/cart` | 独立模块 |
| `POST /api/cultural/cart` | `POST /api/cart` | body 不再传 userId |
| **订单** | | |
| `POST /api/order/create/ticket` | `POST /api/orders` | 合并为单端点 + orderType |
| `POST /api/order/create/cultural` | `POST /api/orders` | 同上 |
| `GET /api/order/all` | `GET /api/orders` | |
| `GET /api/order/{id}` | `GET /api/orders/:id` | |
| `GET /api/order/no/{orderNo}` | `GET /api/orders?orderNo=xxx` | query 参数替代路径 |
| `GET /api/order/user/{userId}` | `GET /api/orders/user/:userId` | |
| `POST /api/order/pay` | `POST /api/orders/:id/pay` | RESTful |
| `POST /api/order/{id}/cancel` | `POST /api/orders/:id/cancel` | |
| `POST /api/order/{id}/refund` | `POST /api/orders/:id/refund` | |
| **文化内容** | | |
| `GET /api/cultural/info` | `GET /api/cultural` | |
| `GET /api/cultural/info/{id}` | `GET /api/cultural/:id` | |
| `GET /api/cultural/info/all` | `GET /api/cultural/all` | |
| **AI 对话** | | |
| SSE `GET /api/ai/explain/stream` | SSE `POST /agent/chat` | POST + ReadableStream 替代 EventSource |
| `POST /api/ai/agent` | 合并入 `/agent/chat` | 非流式废弃 |
| `DELETE /api/ai/session/{id}` | `DELETE /api/sessions/:id` | 归入 sessions 模块 |
| **新增** | | |
| — | `POST /api/favorites` | 收藏功能 |
| — | `POST /api/upload` | 通用文件上传 |
| — | `GET /api/health` | 健康检查 |
