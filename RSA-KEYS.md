# RSA 密钥对使用指南

## 概述

本项目使用 RSA 非对称加密进行 JWT 认证：
- **NestJS（后端）** 使用公钥（`public.key`）**签名** JWT token
- **Agent 服务（AI 导游）** 使用私钥（`private.key`）**验证** JWT token

---

## 生成密钥对

### 步骤 1：在 nest-app 目录生成密钥

```bash
cd nest-app
npm run gen:keys
```

这将生成以下文件：
- `.keys/public.key` - RSA 公钥（NestJS 用于签名）
- `.keys/private.key` - RSA 私钥（Agent 服务用于验证）

### 步骤 2：复制私钥到 agent-service

```bash
cp nest-app/.keys/private.key agent-service/.keys/private.key
```

或者使用 docker-compose 复制：

```bash
docker compose cp nest-app_1:/app/.keys/private.key agent-service/.keys/private.key
```

---

## 配置文件

### nest-app/.env

```bash
# JWT 公钥路径（用于签名）
JWT_PUBLIC_KEY_PATH="/app/.keys/public.key"

# JWT 私钥路径（仅用于签发 token，可选）
JWT_PRIVATE_KEY_PATH="/app/.keys/private.key"
```

### agent-service/.env

```bash
# JWT 私钥路径（用于验证）
JWT_PRIVATE_KEY_PATH="/app/.keys/private.key"
```

---

## Docker 部署注意事项

### 方案 1：将密钥作为环境变量注入（推荐）

```yaml
# docker-compose.yml
services:
  nest-app:
    environment:
      - JWT_PUBLIC_KEY_PATH=/run/secrets/jwt_public_key
    secrets:
      - jwt_public_key

  agent-service:
    environment:
      - JWT_PRIVATE_KEY_PATH=/run/secrets/jwt_private_key
    secrets:
      - jwt_private_key

secrets:
  jwt_public_key:
    file: ./nest-app/.keys/public.key
  jwt_private_key:
    file: ./agent-service/.keys/private.key
```

### 方案 2：将密钥挂载到容器

```yaml
# docker-compose.yml
services:
  nest-app:
    volumes:
      - ./nest-app/.keys:/app/.keys:ro

  agent-service:
    volumes:
      - ./agent-service/.keys:/app/.keys:ro
```

---

## 安全建议

1. **不要将密钥提交到 Git**
   - `.keys/` 目录已在 `.gitignore` 中
   - `.env` 文件也已排除

2. **生产环境密钥管理**
   - 使用 Kubernetes Secrets
   - 使用 Vault 或其他密钥管理工具
   - 定期轮换密钥

3. **文件权限**
   - 公钥：`chmod 644`
   - 私钥：`chmod 600`（仅所有者可读写）

---

## 故障排查

### 问题：JWT 验证失败

**症状**：Agent 服务返回 "无效的令牌" 或 "验证令牌时出错"

**可能原因**：
1. 密钥文件路径不正确
2. 密钥文件内容不完整
3. 两个服务使用的密钥不一致

**解决方法**：
1. 检查 `.env` 中的 `JWT_PRIVATE_KEY_PATH` 是否正确
2. 确认密钥文件存在且有读取权限
3. 重新生成密钥对，并确保两个服务使用相同的私钥

### 问题：NestJS 启动失败

**症状**：启动时报错 "RSA 公钥文件不存在"

**解决方法**：
```bash
cd nest-app
npm run gen:keys
```

---

## 技术细节

- **算法**：RSA
- **密钥长度**：2048 位
- **签名算法**：RS256（推荐）
- **令牌有效期**：7 天
- **包含信息**：
  - `sub`：用户 ID
  - `phone`：手机号
  - `iat`：签发时间
  - `exp`：过期时间
