import type { Config } from "tailwindcss";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    配置 AILib 前端使用的 Tailwind 扫描路径和主题色。
 *
 * 2. 关键部分拆解：
 *    - content：声明 Tailwind 需要扫描的源码路径。
 *    - theme.extend.colors：定义项目 UI 的语义颜色。
 *
 * 3. 重要概念与库：
 *    - Tailwind CSS：通过工具类快速构建一致的界面样式。
 *    - Config：为 Tailwind 配置提供类型检查。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前颜色数量较少；完整工作台阶段可扩展状态色和图表色。
 *
 * 5. 修改指南：
 *    - 如果要新增设计 token，建议在 theme.extend 中添加并在组件中复用。
 * ========================================================
 */
const config: Config = {
  /**
   * ======================== 代码解释 ========================
   * 1. 整体功能：
   *    明确告诉 Tailwind 去哪里扫描 className，避免生产 CSS 缺少布局和组件样式。
   * 2. 关键部分拆解：
   *    - ./app、./components、./lib：支持在 apps/web 目录内执行构建或 Tailwind CLI。
   *    - ./apps/web/...：支持 Dockerfile 从 monorepo 根目录执行 next build apps/web。
   * 3. 重要概念与库：
   *    - Tailwind content scan：生产环境只保留扫描到的工具类；路径不匹配会让页面退化成未排版 HTML。
   * 4. 潜在问题与改进建议：
   *    - 如果未来把共享组件移动到 packages/，需要继续把共享目录加入这里。
   * 5. 修改指南：
   *    - 不要只保留其中一组路径；本地构建和 Docker 构建的当前目录不同。
   * ========================================================
   */
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./apps/web/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./apps/web/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./apps/web/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14213d",
        panel: "#f7f7f2",
        line: "#d8d5cc",
        teal: "#0f766e",
        amber: "#b45309",
        berry: "#9f1239",
      },
    },
  },
  plugins: [],
};

export default config;
