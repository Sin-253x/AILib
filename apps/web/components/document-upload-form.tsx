"use client";

import { FormEvent, useState } from "react";
import { Upload } from "lucide-react";

import { uploadDocument } from "@/lib/api";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    提供认证后的文件上传表单，把 TXT、Markdown、PDF 或 DOCX 文件提交给后端解析。
 *
 * 2. 关键部分拆解：
 *    - file：保存用户选择的文件。
 *    - handleSubmit：调用 uploadDocument 上传文件。
 *    - onUploaded：上传成功后通知父组件刷新文档列表。
 *
 * 3. 重要概念与库：
 *    - Client Component：文件选择和 FormData 上传必须在浏览器端执行。
 *    - multipart/form-data：浏览器上传二进制文件的标准格式。
 *
 * 4. 潜在问题与改进建议：
 *    - PDF/DOCX 解析依赖后端 pypdf 和 python-docx，扫描件仍需要 OCR。
 *    - 当前没有上传进度；大文件场景可接入进度反馈。
 *
 * 5. 修改指南：
 *    - 如果要支持更多扩展名，建议同步修改 accept 属性和后端解析服务。
 * ========================================================
 */
export function DocumentUploadForm({
  token,
  onUploaded,
}: {
  token: string | null;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");

  /**
   * ======================== 代码解释 ========================
   * 1. 整体功能：
   *    处理文件上传表单提交。
   *
   * 2. 关键部分拆解：
   *    - preventDefault：阻止浏览器默认提交。
   *    - uploadDocument：带 token 调用后端上传接口。
   *    - setStatus：显示上传中、成功或失败状态。
   *
   * 3. 重要概念与库：
   *    - File：浏览器表示用户选择文件的对象。
   *    - async/await：等待上传请求完成后刷新列表。
   *
   * 4. 潜在问题与改进建议：
   *    - 当前错误提示不展示后端 detail；后续可解析失败原因。
   *
   * 5. 修改指南：
   *    - 如果要加入拖拽上传，建议把 setFile 逻辑复用到 drop 事件。
   * ========================================================
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (file === null) return;

    setStatus("uploading");
    try {
      await uploadDocument(token, file);
      setFile(null);
      setStatus("uploaded");
      onUploaded();
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Upload file</span>
        <input
          accept=".txt,.md,.markdown,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink focus:border-teal-700"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          type="file"
        />
      </label>
      <button
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={file === null || status === "uploading"}
        type="submit"
      >
        <Upload size={16} aria-hidden="true" />
        {status === "uploading" ? "Uploading" : "Upload document"}
      </button>
      <p
        className={`min-h-5 text-sm ${
          status === "error"
            ? "text-berry"
            : status === "uploaded"
              ? "text-teal-700"
              : "text-slate-500"
        }`}
      >
        {status === "error"
          ? "Upload failed. Use a TXT or Markdown file under the size limit."
          : status === "uploaded"
            ? "Document uploaded"
            : "Supported: .txt, .md, .markdown, .pdf, .docx"}
      </p>
    </form>
  );
}
