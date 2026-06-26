# AILib 私有轻量部署指南

## 1. 整体功能

这套方案用于个人自用：AILib 运行在你自己的电脑或一台低配小主机上，通过 Docker Compose 启动 Web、API、PostgreSQL + pgvector，并可选用 Tailscale/ZeroTier 做私网访问。

它不依赖 Railway 付费资源，也不要求把 DeepSeek Key 放到 Vercel。DeepSeek Key 只保存在本机根目录 `.env.private`，不会提交到 Git。

为适配当前 Windows Docker Desktop 环境，私有模式的 Web 容器使用 `next dev` 运行，避免 Next.js 生产构建在 Docker 内 trace 阶段崩溃。它适合个人私网自用；如果要做公网网站，请使用 `deploy/README_DEPLOY.md` 中的生产部署方案。

## 2. 关键部分拆解

| 模块 | 文件 | 作用 |
| --- | --- | --- |
| 环境模板 | `deploy/private/env.private.example` | 复制为 `.env.private` 后保存私有密钥和端口配置 |
| 编排文件 | `deploy/private/docker-compose.private.yml` | 启动 Caddy、Next.js、FastAPI、PostgreSQL + pgvector |
| Web 镜像 | `deploy/private/Dockerfile.web-dev` | 使用 Next.js dev server 运行私有 Web，避开本机 Docker production build 崩溃 |
| 网关配置 | `deploy/private/Caddyfile.private` | 把 `/api/*` 转发到 FastAPI，其余请求转发到 Next.js |
| 启动脚本 | `scripts/private/Start-AILibPrivate.ps1` | 自动生成 `.env.private`、启动容器、检查健康状态 |
| 状态脚本 | `scripts/private/Status-AILibPrivate.ps1` | 查看容器、健康检查和可访问地址 |
| 停止脚本 | `scripts/private/Stop-AILibPrivate.ps1` | 停止容器，默认保留数据库数据卷 |

## 3. 首次启动

在仓库根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/private/Start-AILibPrivate.ps1 -OpenBrowser
```

脚本会做这些事：

1. 如果根目录没有 `.env.private`，就从 `deploy/private/env.private.example` 创建。
2. 自动生成 `SECRET_KEY` 和 `POSTGRES_PASSWORD`。
3. 如果现有 `.env` 或 `apps/api/.env` 里已经有 `DEEPSEEK_API_KEY`，会自动复制到 `.env.private`，但不会打印密钥。
4. 启动 Docker Compose。
5. 通过 `http://127.0.0.1:3000/api/health` 检查 API、数据库和 RAG provider。

启动后访问：

```text
http://127.0.0.1:3000
```

## 4. 让手机或另一台电脑访问

默认配置只监听本机：

```env
PRIVATE_BIND_HOST=127.0.0.1
```

如果你要通过 Tailscale/ZeroTier 私网访问，运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/private/Start-AILibPrivate.ps1 -ExposePrivateNetwork
```

脚本会把 `.env.private` 中的监听地址改为：

```env
PRIVATE_BIND_HOST=0.0.0.0
```

然后它会输出 Tailscale IP 或局域网 IP，例如：

```text
http://100.x.y.z:3000
```

注意：`0.0.0.0` 也会让同一局域网设备看到 3000 端口。自用时建议优先通过 Tailscale ACL、Windows 防火墙或可信家庭网络限制访问。

## 5. 日常命令

查看状态：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/private/Status-AILibPrivate.ps1
```

停止服务但保留数据：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/private/Stop-AILibPrivate.ps1
```

停止并删除数据库数据卷：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/private/Stop-AILibPrivate.ps1 -DeleteData
```

## 6. 重要概念与库

- Docker Compose：把多个容器作为一个应用启动和停止。
- pgvector：PostgreSQL 的向量扩展，用于语义搜索和 RAG 检索。
- Caddy：轻量反向代理，在本方案中负责同源 `/api`。
- Tailscale/ZeroTier：把个人设备组成一个私有网络，避免公网域名、备案和云服务器费用。
- DeepSeek：RAG 对话模型提供商，本项目通过 `langchain-deepseek` 调用。

## 7. 潜在问题与改进建议

- 首次 Docker 构建会下载镜像和依赖，网络慢时可能需要较长时间。
- 如果修改了 `POSTGRES_PASSWORD`，但旧的 `private-postgres-data` 数据卷还在，数据库密码不会自动变更。
- 如果浏览器能打开页面但状态 offline，先运行状态脚本，看 `gateway`、`api`、`postgres` 哪个容器异常。
- 如果手机打不开，确认使用了 `-ExposePrivateNetwork`，并检查 Windows 防火墙是否允许 3000 端口。

## 8. 修改指南

- 改端口：修改 `.env.private` 的 `WEB_PORT`，然后重新运行启动脚本。
- 改模型：修改 `.env.private` 的 `CHAT_PROVIDER`、`CHAT_MODEL` 和对应 API Key。
- 改为公网网站：不要继续用本私有方案，改用 `deploy/README_DEPLOY.md` 的 VPS + Caddy HTTPS 方案。
- 备份数据：后续可以在 `scripts/private` 下新增备份脚本，通过 `docker compose exec postgres pg_dump` 导出数据库。
