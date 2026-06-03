import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    把 Next.js 15 的传统 ESLint 配置适配到 ESLint 9 flat config。
 *
 * 2. 关键部分拆解：
 *    - __dirname：为兼容器提供当前配置目录。
 *    - compat：把 extends 风格配置转换成 flat config 数组。
 *
 * 3. 重要概念与库：
 *    - FlatCompat：ESLint 官方提供的传统配置兼容工具。
 *    - fileURLToPath：在 ESM 配置文件中还原当前文件路径。
 *
 * 4. 潜在问题与改进建议：
 *    - Next.js 版本升级后可检查是否能直接使用原生 flat config。
 *
 * 5. 修改指南：
 *    - 如果要调整兼容基准目录，建议从 FlatCompat 的 baseDirectory 入手。
 * ========================================================
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    配置前端 ESLint 规则，覆盖 Next.js 性能规则和 TypeScript 规则。
 *
 * 2. 关键部分拆解：
 *    - ignores：排除构建产物和依赖目录。
 *    - compat.extends：加载 Next.js 15 官方 lint 规则。
 *
 * 3. 重要概念与库：
 *    - ESLint flat config：ESLint 9 使用的数组式配置格式。
 *    - eslint-config-next：Next.js 官方推荐的 lint 规则集合。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前只做基础 lint；后续可加入 import 边界或测试规则。
 *
 * 5. 修改指南：
 *    - 如果要放宽或加强规则，建议在该数组中新增配置对象。
 * ========================================================
 */
const eslintConfig = [
  {
    ignores: [".next/**", "next-env.d.ts", "node_modules/**"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
