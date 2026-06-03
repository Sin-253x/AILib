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
};

export default nextConfig;
