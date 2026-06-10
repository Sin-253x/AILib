# AILib VPS Deployment Guide

这份文档用于把 AILib 部署成一个可长期访问的个人知识库网站，例如：

```text
https://kb.example.com
```

## 目标架构

```text
Internet
  |
  | HTTPS 80/443
  v
Caddy
  |-- /       -> Next.js Web
  |-- /api/*  -> FastAPI API

Docker internal network
  Web       :3000
  API       :8000
  Postgres  :5432
```

## 服务器要求

推荐最低配置：

- Ubuntu 22.04 或 24.04
- 2 CPU
- 2 GB RAM
- 20 GB disk
- Docker Engine + Docker Compose plugin
- 一个域名，例如 `kb.example.com`

DNS 要求：

```text
kb.example.com A <your_server_public_ip>
```

安全组或防火墙只需要开放：

- TCP 22: SSH
- TCP 80: Caddy HTTP challenge
- TCP 443: HTTPS

不要开放 PostgreSQL 5432。

## 部署步骤

1. 登录服务器并安装 Docker。

```bash
docker --version
docker compose version
```

2. 克隆项目。

```bash
git clone <your-repo-url> AILib
cd AILib
```

3. 创建生产环境变量。

```bash
cp deploy/.env.prod.example deploy/.env.prod
nano deploy/.env.prod
```

至少修改：

```env
AILIB_DOMAIN=kb.example.com
ACME_EMAIL=you@example.com
POSTGRES_PASSWORD=long-random-password
SECRET_KEY=long-random-secret
DEEPSEEK_API_KEY=your-valid-key
```

4. 启动。

```bash
cd deploy
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

5. 查看状态。

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api
```

6. 打开网站。

```text
https://kb.example.com
```

API 文档地址：

```text
https://kb.example.com/api/docs
```

## 更新部署

```bash
git pull
cd deploy
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

API 容器启动时会自动执行：

```bash
alembic upgrade head
```

## 数据备份

在服务器项目根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy/Backup-AILibDatabase.ps1
```

如果服务器只有 bash，可以直接执行：

```bash
mkdir -p backups
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "backups/ailib-$(date +%Y%m%d-%H%M%S).sql"
```

## 还原备份

```bash
cat backups/your-backup.sql | docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml exec -T postgres \
  psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

## 常见问题

### HTTPS 证书没有签发

检查：

- 域名 A 记录是否指向服务器公网 IP。
- 80/443 是否开放。
- `deploy/.env.prod` 的 `AILIB_DOMAIN` 是否和域名一致。
- Caddy 日志：

```bash
docker logs ailib-caddy
```

### 登录后接口 401

生产部署使用同域 `/api` 反代，不应出现 localhost/127.0.0.1 Cookie 域混用。检查 Web 构建参数：

```bash
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml build --no-cache web
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml up -d
```

### DeepSeek key 有效但仍报 401

检查 `deploy/.env.prod` 中的：

```env
CHAT_PROVIDER=deepseek
CHAT_MODEL=deepseek-v4-pro
DEEPSEEK_API_KEY=your-valid-key
DEEPSEEK_API_BASE=https://api.deepseek.com
```

然后重启 API：

```bash
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml up -d --build api
```
