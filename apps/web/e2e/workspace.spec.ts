import { expect, test } from "@playwright/test";
import type { ApiDocument } from "../lib/api";

const apiBaseUrl = "http://localhost:8000";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    端到端验证 AILib 工作台的登录、文档创建、文件上传、语义搜索和 RAG 流式回答流程。
 *
 * 2. 关键部分拆解：
 *    - route：拦截浏览器 API 请求，用稳定 mock 替代真实数据库和模型服务。
 *    - auth/me/login：模拟 httpOnly Cookie 会话恢复和登录成功。
 *    - chat/stream：返回 SSE sources/token/done 事件，验证前端增量渲染。
 *
 * 3. 重要概念与库：
 *    - Playwright：通过真实浏览器执行用户级操作。
 *    - SSE mock：用 text/event-stream 响应模拟后端 RAG 流式输出。
 *
 * 4. 潜在问题与改进建议：
 *    - 本测试不覆盖真实 PostgreSQL、Alembic 或 DeepSeek 联调；这些由后端测试和部署验证补充。
 *
 * 5. 修改指南：
 *    - 如果前端文案或接口路径变化，应同步更新选择器和 route 分支。
 * ========================================================
 */
test("authenticated workspace supports documents, upload, search, and streaming RAG", async ({
  page,
}) => {
  let isAuthenticated = false;
  /**
   * ======================== 代码解释 ========================
   * 1. 整体功能：
   *    显式声明 mock 文档列表使用前端 API 契约类型，避免 TypeScript 根据第一条数据把可空字段误推断为纯 string/number。
   * 2. 关键部分拆解：
   *    - ApiDocument[]：复用真实接口类型，让 E2E mock 与页面数据契约保持一致。
   *    - source_* 可空字段：覆盖手动创建文档没有上传来源文件的场景。
   * 3. 重要概念与库：
   *    - type-only import：只参与类型检查，不会影响 Playwright 运行时打包。
   * 4. 潜在问题与改进建议：
   *    - 如果后端文档响应字段变化，应优先修改 lib/api.ts 的 ApiDocument，再让本测试跟随类型报错修正。
   * 5. 修改指南：
   *    - 新增 mock 文档字段时，保持这里和 ApiDocument 类型同步。
   * ========================================================
   */
  const documents: ApiDocument[] = [
    {
      id: 1,
      title: "Vector Notes",
      content: "AILib stores document chunks as embeddings in pgvector.",
      embedding_dimensions: null,
      created_at: "2026-06-09T00:00:00Z",
      owner_id: 7,
      source_filename: "vector.md",
      source_mime_type: "text/markdown",
      source_size_bytes: 58,
      chunk_count: 1,
    },
  ];

  await page.route(`${apiBaseUrl}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/auth/me") {
      await route.fulfill({
        status: isAuthenticated ? 200 : 401,
        contentType: "application/json",
        body: isAuthenticated
          ? JSON.stringify({ id: 7, email: "demo@ailib.dev", created_at: "2026-06-09T00:00:00Z" })
          : JSON.stringify({ detail: "Missing authentication token" }),
      });
      return;
    }

    if (url.pathname === "/auth/login") {
      isAuthenticated = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "set-cookie": "ailib_access_token=mock-token; HttpOnly; SameSite=Lax; Path=/",
        },
        body: JSON.stringify({
          access_token: "mock-token",
          token_type: "bearer",
          user: { id: 7, email: "demo@ailib.dev", created_at: "2026-06-09T00:00:00Z" },
        }),
      });
      return;
    }

    if (url.pathname === "/auth/logout") {
      isAuthenticated = false;
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return;
    }

    if (url.pathname === "/documents" && request.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(documents) });
      return;
    }

    if (url.pathname === "/documents" && request.method() === "POST") {
      const created = {
        ...documents[0],
        id: 2,
        title: "Manual RAG Note",
        content: "RAG answers should cite retrieved chunks.",
        source_filename: null,
        source_mime_type: null,
        source_size_bytes: null,
      };
      documents.unshift(created);
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(created) });
      return;
    }

    if (url.pathname === "/documents/upload") {
      const uploaded = {
        ...documents[0],
        id: 3,
        title: "Upload",
        content: "PDF and DOCX uploads are parsed before indexing.",
        source_filename: "upload.pdf",
        source_mime_type: "application/pdf",
        source_size_bytes: 32,
      };
      documents.unshift(uploaded);
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(uploaded) });
      return;
    }

    if (url.pathname === "/search") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            document_id: 1,
            document_title: "Vector Notes",
            chunk_id: 11,
            chunk_index: 0,
            content: "AILib stores document chunks as embeddings in pgvector.",
            score: 0.94,
            source_filename: "vector.md",
          },
        ]),
      });
      return;
    }

    if (url.pathname === "/chat/stream") {
      const body = [
        'event: sources\ndata: [{"document_id":1,"document_title":"Vector Notes","chunk_id":11,"chunk_index":0,"content":"AILib stores document chunks as embeddings in pgvector.","score":0.94,"source_filename":"vector.md"}]\n\n',
        'event: token\ndata: "AILib streams "\n\n',
        'event: token\ndata: "RAG answers with citations [1]."\n\n',
        'event: done\ndata: {"status":"ok"}\n\n',
      ].join("");
      await route.fulfill({ status: 200, contentType: "text/event-stream", body });
      return;
    }

    await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  });

  await page.goto("/");
  await expect(page.getByText("登录后进入你的文件目录与问答工作台。")).toBeVisible();

  await page.getByLabel("Email").fill("demo@ailib.dev");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "进入工作台" }).click();
  await expect(page.getByText("个人工作台")).toBeVisible();
  await expect(page.getByText("文件目录")).toBeVisible();
  await expect(page.getByText("Vector Notes").first()).toBeVisible();

  await page.getByRole("button", { name: /上传/ }).click();
  await page.getByLabel("Title").fill("Manual RAG Note");
  await page.getByLabel("Content").fill("RAG answers should cite retrieved chunks.");
  await page.getByRole("button", { name: "Save document" }).click();
  await expect(page.getByText("Document saved")).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: "upload.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF mocked upload"),
  });
  await page.getByRole("button", { name: "Upload document" }).click();
  await expect(page.getByText("Document uploaded")).toBeVisible();

  await page.getByRole("button", { name: /语义搜索/ }).click();
  await page.getByPlaceholder("Ask what your documents discuss").fill("How are vectors stored?");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("94%")).toBeVisible();

  await page.getByRole("button", { name: /问答/ }).click();
  await page.getByPlaceholder("Ask your knowledge base").fill("How does AILib answer?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText("AILib streams RAG answers with citations [1].")).toBeVisible();
  await expect(page.getByText("[1] Vector Notes")).toBeVisible();
});
