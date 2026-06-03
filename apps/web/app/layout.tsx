import type { Metadata } from "next";
import "./globals.css";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    定义 AILib 前端应用的页面元信息。
 *
 * 2. 关键部分拆解：
 *    - title：浏览器标签和搜索展示标题。
 *    - description：项目简介。
 *
 * 3. 重要概念与库：
 *    - Metadata：Next.js App Router 的元数据类型。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前描述偏 starter；后续完成 RAG 后应更新为完整产品描述。
 *
 * 5. 修改指南：
 *    - 如果要调整 SEO 信息，建议直接修改 metadata 字段。
 * ========================================================
 */
export const metadata: Metadata = {
  title: "AILib",
  description: "AI knowledge library starter",
};

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    提供 Next.js 应用的根布局。
 *
 * 2. 关键部分拆解：
 *    - html lang：声明页面语言。
 *    - body：承载所有页面内容。
 *
 * 3. 重要概念与库：
 *    - App Router Layout：Next.js 中跨页面共享外壳的机制。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前没有全局认证状态；认证阶段可在这里接入会话 provider。
 *
 * 5. 修改指南：
 *    - 如果要加入全局导航或 provider，建议从 body 内部包裹 children 入手。
 * ========================================================
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
