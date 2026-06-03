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
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
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
