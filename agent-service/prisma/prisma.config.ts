import { defineConfig } from "@prisma/config";

export default defineConfig({
  datasource: {
    url: "postgresql://postgres:password@localhost:5433/zhaozhou_bridge",
  },
  migrations: {
    path: "./migrations",
  },
});
