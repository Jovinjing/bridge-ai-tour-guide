import 'dotenv/config';

import express from 'express';
import { Server } from 'http';
import { chatRoute } from './routes/chat';
import { printLLMConfig } from './llm/deepseek';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
let server: Server | undefined;

// 中间件
app.use(express.json());

// 路由
app.use('/agent', chatRoute);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'agent-service' });
});

export function startServer(): void {
  server = app.listen(PORT, () => {
    console.log(`🚀 Agent 服务启动在 http://localhost:${PORT}`);
    printLLMConfig();
  });
}

export function stopServer(): void {
  if (server) {
    server.close();
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM 信号接收，正在关闭服务...');
  stopServer();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT 信号接收，正在关闭服务...');
  stopServer();
  process.exit(0);
});

// 仅在直接运行时启动服务器
if (require.main === module) {
  startServer();
}
