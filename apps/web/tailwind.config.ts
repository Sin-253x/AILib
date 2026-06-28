import type { Config } from "tailwindcss";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    配置 AILib 前端使用的 Tailwind 扫描路径、主题色、字体和阴影 token。
 *
 * 2. 关键部分拆解：
 *    - content：声明 Tailwind 需要扫描的源码路径。
 *    - theme.extend.colors：定义项目 UI 的语义颜色，匹配浅色专业工作台风格。
 *    - theme.extend.fontFamily/boxShadow：统一中文字体栈和柔和阴影。
 *
 * 3. 重要概念与库：
 *    - Tailwind CSS：通过工具类快速构建一致的界面样式。
 *    - Config：为 Tailwind 配置提供类型检查。
 *
 * 4. 潜在问题与改进建议：
 *    - 如果后续加入图表，可在这里补充图表专用色，避免复用状态色造成语义混乱。
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
        ink: "#0F172A",
        muted: "#64748B",
        panel: "#F8FAFC",
        line: "#E2E8F0",
        brand: {
          DEFAULT: "#1E3A8A",
          deep: "#172554",
          soft: "#DBEAFE",
        },
        accent: {
          DEFAULT: "#0D9488",
          soft: "#CCFBF1",
        },
        skyline: {
          DEFAULT: "#0284C7",
          soft: "#E0F2FE",
        },
        berry: "#BE123C",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Noto Sans SC",
          "PingFang SC",
          "Microsoft YaHei",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 18px 48px rgba(15, 23, 42, 0.08)",
        card: "0 10px 30px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
