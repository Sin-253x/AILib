"use client";

import { FormEvent, useState } from "react";
import { LogIn, UserPlus } from "lucide-react";

import { AuthResponse, loginUser, registerUser } from "@/lib/api";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    渲染登录和注册表单，并在认证成功后把 token 交给父组件。
 *
 * 2. 关键部分拆解：
 *    - mode：控制当前是登录还是注册。
 *    - handleSubmit：调用 loginUser 或 registerUser。
 *    - onAuthenticated：把后端返回的认证结果传出。
 *
 * 3. 重要概念与库：
 *    - Client Component：表单状态和提交交互需要在浏览器端执行。
 *    - AuthResponse：包含访问令牌和当前用户信息。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前错误提示较通用；后续可展示后端 detail。
 *    - 当前没有忘记密码流程；正式产品可补充。
 *
 * 5. 修改指南：
 *    - 如果要增加验证码或用户名字段，建议扩展本组件 state 和 API helper。
 * ========================================================
 */
export function AuthPanel({ onAuthenticated }: { onAuthenticated: (auth: AuthResponse) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");

  /**
   * ======================== 代码解释 ========================
   * 1. 整体功能：
   *    处理登录或注册表单提交。
   *
   * 2. 关键部分拆解：
   *    - preventDefault：阻止浏览器默认刷新。
   *    - mode 分支：根据用户选择调用不同认证接口。
   *    - setStatus：控制按钮禁用和错误提示。
   *
   * 3. 重要概念与库：
   *    - FormEvent：React 表单事件类型。
   *    - async/await：等待后端认证结果。
   *
   * 4. 潜在问题与改进建议：
   *    - 当前只做浏览器 required 校验；可增加密码强度提示。
   *
   * 5. 修改指南：
   *    - 如果要扩展认证流程，建议从 mode 分支和 API helper 入手。
   * ========================================================
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    try {
      const auth =
        mode === "login" ? await loginUser(email, password) : await registerUser(email, password);
      onAuthenticated(auth);
      setPassword("");
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="flex gap-2">
        <button
          className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold ${
            mode === "login" ? "border-ink bg-ink text-white" : "border-line text-ink"
          }`}
          onClick={() => setMode("login")}
          type="button"
        >
          <LogIn size={16} aria-hidden="true" />
          Login
        </button>
        <button
          className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold ${
            mode === "register" ? "border-ink bg-ink text-white" : "border-line text-ink"
          }`}
          onClick={() => setMode("register")}
          type="button"
        >
          <UserPlus size={16} aria-hidden="true" />
          Register
        </button>
      </div>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            autoComplete="email"
            className="mt-1 h-10 w-full rounded-md border border-line px-3 outline-none focus:border-teal-700"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="mt-1 h-10 w-full rounded-md border border-line px-3 outline-none focus:border-teal-700"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
            type="password"
            value={password}
          />
        </label>
        <button
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={status === "submitting"}
          type="submit"
        >
          {status === "submitting"
            ? "Submitting"
            : mode === "login"
              ? "Login to workspace"
              : "Create account"}
        </button>
        <p className={`min-h-5 text-sm ${status === "error" ? "text-berry" : "text-slate-500"}`}>
          {status === "error" ? "Authentication failed. Check your email and password." : ""}
        </p>
      </form>
    </div>
  );
}
