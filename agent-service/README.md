# Agent 服务

LangChain.js Agent + 真流式 SSE + pgvector 知识库

## 端口

- 3001: Agent SSE 端点 `/agent/chat`

## 环境变量

- `DATABASE_URL`: PostgreSQL 数据库连接（agent schema）

## API

### POST /agent/chat

SSE 流式对话接口

请求：
```json
{
  "sessionId": "游客ID 或 JWT token"
}
```

响应（SSE）：
```
data: {"type": "message", "content": "你好！"}
data: {"type": "tool_call", "toolName": "searchKnowledge", "arguments": {...}}
data: {"type": "message", "content": "赵州桥建于隋代大业年间..."}
data: {"type": "done"}
```

## 下一步

Phase 2: DeepSeek Chat + Embedding 配置、工具适配层、AgentExecutor 组装、真流式 SSE
