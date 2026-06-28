"use client";

import { FormEvent, useState } from "react";
import { LogIn, UserPlus } from "lucide-react";

import { AuthResponse, loginUser, registerUser } from "@/lib/api";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    渲染独立登录/注册卡片，并在认证成功后把 token 与用户信息交给父组件。
 *
 * 2. 关键部分拆解：
 *    - mode：控制当前是登录还是注册，并同步按钮激活态。
 *    - handleSubmit：调用 loginUser 或 registerUser。
 *    - onAuthenticated：把后端返回的认证结果传出，进入个人工作台。
 *
 * 3. 重要概念与库：
 *    - Client Component：表单状态和提交交互需要在浏览器端执行。
 *    - AuthResponse：包含访问令牌和当前用户信息。
 *
 * 4. 潜在问题与改进建议：
 *    - 正常状态不展示技术说明；只有失败时给出可操作错误提示。
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
    <div className="app-card p-6 shadow-soft sm:p-7">
      <div className="mb-6">
        <p className="app-kicker">账号</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">登录 AILib</h2>
      </div>

      <div className="grid rounded-2xl border border-slate-200 bg-slate-100 p-1 sm:grid-cols-2">
        <button
          aria-pressed={mode === "login"}
          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition duration-200 ${
            mode === "login"
              ? "bg-white text-ink shadow-sm"
              : "text-slate-500 hover:bg-white/70 hover:text-ink"
          }`}
          onClick={() => setMode("login")}
          type="button"
        >
          <LogIn size={16} aria-hidden="true" />
          登录
        </button>
        <button
          aria-pressed={mode === "register"}
          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition duration-200 ${
            mode === "register"
              ? "bg-white text-ink shadow-sm"
              : "text-slate-500 hover:bg-white/70 hover:text-ink"
          }`}
          onClick={() => setMode("register")}
          type="button"
        >
          <UserPlus size={16} aria-hidden="true" />
          注册
        </button>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="app-label">邮箱</span>
          <input
            autoComplete="email"
            className="app-input mt-1"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block">
          <span className="app-label">密码</span>
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="app-input mt-1"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 8 位字符"
            required
            type="password"
            value={password}
          />
        </label>
        <button
          className="app-button-primary interactive-lift w-full"
          disabled={status === "submitting"}
          type="submit"
        >
          {status === "submitting"
            ? "提交中"
            : mode === "login"
              ? "进入工作台"
              : "创建账号"}
        </button>
        <p className={`min-h-6 text-sm ${status === "error" ? "text-berry" : "text-slate-500"}`}>
          {status === "error" ? "登录失败，请检查邮箱和密码。" : ""}
        </p>
      </form>
    </div>
  );
}
