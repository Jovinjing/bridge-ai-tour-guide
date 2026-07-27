# 数据库启动指南

## 快速启动

```bash
# 启动 PostgreSQL + pgvector
docker-compose up -d

# 查看日志
docker-compose logs -f postgres

# 停止数据库
docker-compose down
```

## 数据库信息

- **地址**: localhost:5432
- **用户**: postgres
- **密码**: password
- **数据库**: zhaozhou_bridge
- **Schema**: public（业务数据） + agent（会话/工具调用）

## 验证安装

```bash
# 进入 PostgreSQL
docker exec -it zhaozhou_bridge_db psql -U postgres -d zhaozhou_bridge

# 检查 pgvector 扩展
\dx

# 查看 public schema 表
\dt public.*

# 查看 agent schema 表
\dt agent.*

# 查看初始数据
SELECT * FROM goods;
SELECT * FROM cultural;
```

## 初始化

数据库首次启动时会自动执行 `init.sql`：
- 创建 pgvector 扩展
- 创建 public schema（7 张表）
- 创建 agent schema（3 张表）
- 插入初始商品和文化内容数据

## 客户端连接示例

```typescript
// PostgreSQL
const url = 'postgresql://postgres:password@localhost:5432/zhaozhou_bridge';

// Prisma
DATABASE_URL="postgresql://postgres:password@localhost:5432/zhaozhou_bridge?schema=public"

// Agent Schema
DATABASE_URL="postgresql://postgres:password@localhost:5432/zhaozhou_bridge?schema=agent"
```

## pgvector 向量检索

Agent 服务的向量检索功能需要在数据导入后通过 pgvector 扩展实现。

```sql
-- 创建向量列（示例）
CREATE TABLE knowledge (
  id SERIAL PRIMARY KEY,
  content TEXT,
  embedding vector(1536)  -- OpenAI embedding 维度
);

-- 向量检索
SELECT * FROM knowledge
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```
