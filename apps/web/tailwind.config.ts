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
  content: {
    /**
     * ======================== 代码解释 ========================
     * 1. 整体功能：
     *    让 Tailwind 在本地 workspace 构建和 Docker monorepo 根目录构建时都能扫描到 Web 源码。
     * 2. 关键部分拆解：
     *    - relative: true：把下方 files 路径固定为相对本配置文件，而不是相对执行命令的当前目录。
     *    - files：覆盖 app、components、lib 三类会写 Tailwind className 的源码目录。
     * 3. 重要概念与库：
     *    - Tailwind content scan：生产 CSS 只会保留扫描到的工具类；扫描路径错误会导致 UI 退化成默认 HTML。
     * 4. 潜在问题与改进建议：
     *    - 如果后续把组件移动到 packages/ 等共享目录，需要把共享目录显式加入 files。
     * 5. 修改指南：
     *    - Dockerfile 中从仓库根目录执行 next build 时，不要把 relative 改回 false。
     * ========================================================
     */
    relative: true,
    files: [
      "./app/**/*.{js,ts,jsx,tsx,mdx}",
      "./components/**/*.{js,ts,jsx,tsx,mdx}",
      "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    ],
  },
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
