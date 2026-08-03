import { defineConfig } from "@prisma/config";
import "dotenv/config";

export default defineConfig({
  datasource: {
    // 从环境变量读取（本地 .env 指向 localhost:5433，容器由 compose 注入 postgres:5432）
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: "./migrations",
  },
});
