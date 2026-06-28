import { defineConfig, devices } from "@playwright/test";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    配置 AILib 前端 Playwright E2E 测试运行方式。
 *
 * 2. 关键部分拆解：
 *    - testDir：把端到端测试集中放在 apps/web/e2e。
 *    - webServer：测试前直接启动 web workspace 的 Next.js dev server，并固定到本机可用端口。
 *    - projects：先覆盖桌面 Chromium 主流程，后续可追加移动端项目。
 *
 * 3. 重要概念与库：
 *    - Playwright：用于真实浏览器级别验证登录、上传、搜索和 RAG 流式交互。
 *    - reuseExistingServer：本地已有 3100 服务时复用，减少重复启动。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前 E2E mock 后端 API，适合稳定验证前端流程；完整联调可增加真实 Docker 场景。
 *
 * 5. 修改指南：
 *    - Windows 可能保留 3000 端口段；如果前端端口变化，同步修改 baseURL 和 webServer.url。
 * ========================================================
 */
export default defineConfig({
  testDir: "./apps/web/e2e",
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev --workspace @ailib/web -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
