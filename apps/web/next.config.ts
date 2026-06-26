import type { NextConfig } from "next";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    配置 Next.js 15 前端应用的构建行为。
 *
 * 2. 关键部分拆解：
 *    - transpilePackages：让 lucide-react 在构建时被 Next.js 正确转译。
 *
 * 3. 重要概念与库：
 *    - NextConfig：Next.js 配置对象的 TypeScript 类型。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前配置很轻；后续如接入代理或图片域名，应集中在这里维护。
 *
 * 5. 修改指南：
 *    - 如果要调整构建或路由行为，建议先查 Next.js 15 配置项再修改本对象。
 * ========================================================
 */
const nextConfig: NextConfig = {
  transpilePackages: ["lucide-react"],
  async rewrites() {
    // ======================== 代码解释 ========================
    // 1. 整体功能：
    //    在 Vercel 上把同域 /api 请求代理到 Railway FastAPI 公网地址。
    // 2. 关键部分拆解：
    //    - API_PROXY_TARGET：部署时填写 Railway API 服务 URL，不包含末尾斜杠。
    //    - /api/:path*：前端浏览器始终访问同域路径，减少 CORS 和 Cookie 域名问题。
    //    - 空数组回退：本地未配置代理目标时保持现有直连 API 行为。
    // 3. 重要概念与库：
    //    - Next.js rewrites：让请求保持原 URL 展示，同时转发到外部服务。
    //    - Vercel reverse proxy：适合 Vercel 前端 + Railway 后端的拆分部署。
    // 4. 潜在问题与改进建议：
    //    - 修改 API_PROXY_TARGET 后需要重新部署 Vercel，让构建配置生效。
    // 5. 修改指南：
    //    - 如果 API 改为自定义同域反代，可删除该 rewrite 并保留 NEXT_PUBLIC_API_BASE_URL=/api。
    // ========================================================
    const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/$/, "");
    if (!apiProxyTarget) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
