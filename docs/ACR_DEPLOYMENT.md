# AILib 阿里云 ACR 预构建镜像部署指南

## 1. 整体功能

这套方案用于阿里云中国大陆轻量服务器：镜像在 GitHub Actions 或本地高资源机器构建并推送到阿里云 ACR，轻量服务器只执行 `docker pull` 和 `docker compose up`。

它解决的问题是：2G 左右内存的轻量服务器在 `uv pip install`、`yarn install`、`next build` 阶段容易卡死，无法可靠完成本机 Docker build。

## 2. 关键部分拆解

| 文件 | 作用 |
| --- | --- |
| `.github/workflows/build-acr.yml` | 手动触发 GitHub Actions 构建并推送 `ailib-api`、`ailib-web` 镜像 |
| `deploy/docker-compose.acr.yml` | 覆盖生产 Compose，让服务器拉取 ACR 镜像而不是本机构建 |
| `deploy/env.acr.example` | 需要追加到服务器 `deploy/.env.prod` 的 ACR 变量示例 |

## 3. 阿里云 ACR 准备

在阿里云控制台进入：

```text
容器镜像服务 ACR -> 实例列表 -> 个人版实例
```

创建或确认：

```text
地域：华东2（上海）
命名空间：例如 ailib
镜像仓库：ailib-api
镜像仓库：ailib-web
```

记录：

```text
ACR_REGISTRY=registry.cn-shanghai.aliyuncs.com
ACR_NAMESPACE=你的命名空间
ACR_USERNAME=你的阿里云 ACR 登录用户名
ACR_PASSWORD=你的 ACR 固定密码或临时访问凭据
```

## 4. GitHub Secrets

在 GitHub 仓库：

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

添加：

```text
ACR_REGISTRY
ACR_NAMESPACE
ACR_USERNAME
ACR_PASSWORD
```

然后进入：

```text
Actions -> Build and Push AILib Images to ACR -> Run workflow
```

建议 `image_tag` 填当前 Git commit 短哈希，例如：

```text
2c35ba6
```

## 5. 服务器部署

服务器的 `deploy/.env.prod` 末尾追加：

```env
ACR_REGISTRY=registry.cn-shanghai.aliyuncs.com
ACR_NAMESPACE=你的命名空间
AILIB_IMAGE_TAG=2c35ba6
```

服务器登录 ACR：

```bash
sudo docker login registry.cn-shanghai.aliyuncs.com
```

启动：

```bash
cd /opt/AILib/deploy

sudo docker compose \
  --env-file .env.prod \
  -f docker-compose.prod.yml \
  -f docker-compose.acr.yml \
  pull

sudo docker compose \
  --env-file .env.prod \
  -f docker-compose.prod.yml \
  -f docker-compose.acr.yml \
  up -d --no-build
```

## 6. 验证

```bash
sudo docker compose \
  --env-file .env.prod \
  -f docker-compose.prod.yml \
  -f docker-compose.acr.yml \
  ps
```

```bash
curl https://你的域名/api/health
```

期望返回：

```json
{"status":"ok","api":"ok","database":"ok","rag_provider":"deepseek","rag_config":"ok"}
```

## 7. 重要概念与库

- 阿里云 ACR：国内镜像仓库，适合中国大陆服务器快速拉取。
- GitHub Actions：远程构建镜像，避免轻量服务器内存不足。
- Docker Compose override：把原生产配置中的 build 替换为 image。
- Caddy：继续负责 HTTPS 和同源 `/api` 反向代理。

## 8. 潜在问题与改进建议

- 如果 `pull access denied`，先检查服务器是否 `docker login` 到正确 registry。
- 如果 `manifest unknown`，说明 GitHub Actions 没有推送该 tag，检查 Actions 日志。
- 如果 Caddy 证书失败，检查域名 A 记录是否指向服务器公网 IP，以及 80/443 是否放行。
- 如果 API health 显示 RAG 配置缺失，检查服务器 `.env.prod` 中的 `DEEPSEEK_API_KEY`。

## 9. 修改指南

- 更新版本：重新运行 GitHub Actions，换一个 `AILIB_IMAGE_TAG`，服务器重新 `pull` 和 `up -d --no-build`。
- 回滚版本：把 `AILIB_IMAGE_TAG` 改回旧 tag，再重新部署。
- 切回服务器本机构建：去掉 `-f docker-compose.acr.yml`，但不建议在 2G 轻量服务器上这样做。
