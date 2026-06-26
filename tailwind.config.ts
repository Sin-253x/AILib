/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    为 monorepo 根目录提供 Tailwind 配置入口，确保 Docker 从仓库根目录构建 Web 应用时能读取样式扫描规则。
 * 2. 关键部分拆解：
 *    - export { default }：复用 apps/web/tailwind.config.ts，避免根目录和子应用维护两份主题配置。
 *    - 根目录入口：匹配 deploy/Dockerfile.web 中的 next build apps/web 执行方式。
 * 3. 重要概念与库：
 *    - Tailwind config discovery：Tailwind 默认会从当前工作目录向上查找配置；Docker 构建时当前目录是仓库根目录。
 * 4. 潜在问题与改进建议：
 *    - 如果未来新增多个前端应用，应改成按应用拆分配置或抽取共享 preset。
 * 5. 修改指南：
 *    - 修改 Web 主题和 content 路径时仍然优先改 apps/web/tailwind.config.ts，本文件只作为根目录代理入口。
 * ========================================================
 */
export { default } from "./apps/web/tailwind.config";
