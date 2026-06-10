# ======================== 代码解释 ========================
# 1. 整体功能：
#    为 AILib 的 Next.js Web 应用构建可运行的生产 Docker 镜像。
# 2. 关键部分拆解：
#    - deps 阶段：只安装 Web 子应用依赖，减少构建上下文对 monorepo 其他目录的依赖。
#    - builder 阶段：注入 NEXT_PUBLIC_API_BASE_URL，并执行 Next.js 生产构建。
#    - runner 阶段：复制构建产物与运行依赖，用 next start 对外提供 Web 服务。
# 3. 重要概念与库：
#    - Docker multi-stage build：分阶段安装、构建、运行，避免把构建中间文件直接暴露给最终镜像。
#    - Next.js public env：NEXT_PUBLIC_* 会在构建期写入前端产物，因此 compose build args 必须同步。
# 4. 潜在问题与改进建议：
#    - 当前使用 npm install 适配子应用独立构建；后续可为 apps/web 增加 lockfile 来提升依赖复现性。
# 5. 修改指南：
#    - 如果 API 地址变化，请同步 docker-compose.yml 中的 NEXT_PUBLIC_API_BASE_URL。
# ========================================================
# 调试说明：Next.js 15 在当前 Docker Desktop 环境中使用 Node 22 构建时，曾在 build trace 阶段出现栈溢出或 SIGSEGV；
# 这里固定到 Node 20 LTS，让本地化部署使用更保守、兼容面更稳定的运行时。
FROM node:20-bookworm-slim AS deps
WORKDIR /app
# 安装说明：当前 Docker Desktop 环境中 npm install 会触发 V8 原生崩溃；
# 使用 Corepack 管理的 Yarn 4，并指定 node-modules 模式，既绕开 npm 安装路径，也保持 Next.js 运行时兼容。
ENV YARN_ENABLE_TELEMETRY=0
ENV YARN_NODE_LINKER=node-modules
COPY package.json ./
RUN corepack enable && corepack prepare yarn@4.9.4 --activate && yarn install --mode=skip-build

# 构建说明：builder 阶段和 deps 阶段使用相同 Node 版本，避免原生依赖在不同运行时之间产生不一致。
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
# 构建说明：关闭 Next.js 匿名遥测，减少生产构建中的外部网络与非业务变量。
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
RUN node node_modules/next/dist/bin/next build

# 运行说明：runner 阶段继续使用 Node 20 LTS，确保构建产物和生产运行时一致。
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# 运行说明：生产容器不需要遥测上报，关闭后也便于离线或内网部署。
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
# ======================== 代码解释 ========================
# 1. 整体功能：
#    在生产容器中启动 Next.js Web 服务。
# 2. 关键部分拆解：
#    - ${PORT:-3000}：优先使用 Railway 等平台注入的 PORT，没有注入时回退到本地 Docker 默认端口 3000。
#    - next start -p：显式指定监听端口，避免平台健康检查访问不到服务。
# 3. 重要概念与库：
#    - Next.js 生产运行时：使用构建后的 .next 产物提供页面和 API 代理逻辑。
# 4. 潜在问题与改进建议：
#    - NEXT_PUBLIC_API_BASE_URL 是构建期变量，Railway 修改该变量后必须重新部署 Web 服务。
# 5. 修改指南：
#    - 如果后续切到 standalone 输出，可以保留相同的 PORT 读取方式，只替换启动入口。
# ========================================================
CMD ["sh", "-c", "node node_modules/next/dist/bin/next start -p ${PORT:-3000}"]
