"use client";

import { FormEvent, useState } from "react";
import { FilePlus2 } from "lucide-react";

import { createDocument } from "@/lib/api";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    提供 starter 文档创建表单，把标题和正文提交到 FastAPI。
 *
 * 2. 关键部分拆解：
 *    - title/content：保存用户输入。
 *    - status：控制保存中、成功和失败提示。
 *    - handleSubmit：带 token 提交 JSON 请求并通知父组件刷新列表。
 *
 * 3. 重要概念与库：
 *    - Client Component：需要使用 useState，所以声明为客户端组件。
 *    - httpOnly Cookie：浏览器默认把当前用户身份传给后端。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前只是文本创建；上传阶段应改为文件选择和上传进度。
 *    - 当前只是文本创建；上传阶段应改为文件选择和上传进度。
 *
 * 5. 修改指南：
 *    - 如果要扩展表单字段，建议先增加 state，再同步 createDocument 和后端 schema。
 * ========================================================
 */
export function DocumentForm({ token, onSaved }: { token: string | null; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  /**
   * ======================== 代码解释 ========================
   * 1. 整体功能：
   *    处理创建文档表单提交。
   *
   * 2. 关键部分拆解：
   *    - preventDefault：阻止浏览器默认刷新。
   *    - createDocument：向受保护后端接口发送标题和正文。
   *    - setStatus：反馈提交状态。
   *
   * 3. 重要概念与库：
   *    - FormEvent：React 表单事件类型。
   *    - JSON API：当前 starter 使用 JSON 创建文档。
   *    - 回调刷新：保存成功后由父组件重新读取文档列表。
   *
   * 4. 潜在问题与改进建议：
   *    - 当前错误提示不区分原因；后续可解析后端错误详情。
   *
   * 5. 修改指南：
   *    - 如果要接入上传接口，建议把 fetch 的 body 改成 FormData。
   * ========================================================
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");

    try {
      await createDocument(token, { title, content });
      setTitle("");
      setContent("");
      setStatus("saved");
      onSaved();
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Title</span>
        <input
          className="mt-1 h-10 w-full rounded-md border border-line px-3 outline-none focus:border-teal-700"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Research note"
          required
          value={title}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Content</span>
        <textarea
          className="mt-1 min-h-32 w-full resize-y rounded-md border border-line px-3 py-2 outline-none focus:border-teal-700"
          onChange={(event) => setContent(event.target.value)}
          placeholder="Paste source text here"
          required
          value={content}
        />
      </label>
      <button
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={status === "saving"}
        type="submit"
      >
        <FilePlus2 size={16} aria-hidden="true" />
        {status === "saving" ? "Saving" : "Save document"}
      </button>
      <p
        className={`min-h-5 text-sm ${
          status === "error" ? "text-berry" : status === "saved" ? "text-teal-700" : "text-slate-500"
        }`}
      >
        {status === "error"
          ? "API is unavailable"
          : status === "saved"
            ? "Document saved"
            : ""}
      </p>
    </form>
  );
}
