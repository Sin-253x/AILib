/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    配置 PostCSS 使用 Tailwind CSS 插件处理样式。
 *
 * 2. 关键部分拆解：
 *    - tailwindcss：把 Tailwind 指令转换为最终 CSS。
 *
 * 3. 重要概念与库：
 *    - PostCSS：CSS 转换工具链，Next.js 构建时会读取该配置。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前没有 autoprefixer；如需更细浏览器兼容可后续补充。
 *
 * 5. 修改指南：
 *    - 如果要新增 CSS 插件，建议在 plugins 对象中添加对应插件配置。
 * ========================================================
 */
const config = {
  plugins: {
    tailwindcss: {},
  },
};

export default config;
