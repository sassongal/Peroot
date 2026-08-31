import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local experimentation / audit tooling — contains a Python venv with
    // >500MB of third-party JS that OOMs the linter.
    "tools/**",
    // Git worktrees — avoid double-linting files shared with the main tree.
    ".worktrees/**",
    // Generated codebase snapshot (~160K tokens)
    "repomix-output.*",
    // Plain CSS — no ESLint processor; avoids "no matching configuration" when linting explicitly
    "src/app/globals.css",
    // Separate Chrome extension tree (plain JS, not the Next app)
    "chrome-extension-v2.1/**",
  ]),
  // Project law (2026-08-31, owner decision): no em/en dashes in any text a
  // human can see. AI-generated writing leans on them and it reads as
  // machine-made; human Hebrew uses commas, colons and plain hyphens. The rule
  // covers string literals, template strings and JSX text (comments are not
  // user-facing). Number ranges use a plain hyphen: "2-3", not "2\u20133".
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/[\u2013\u2014]/]",
          message:
            "Project law: no em/en dashes in user-facing text. Use a comma, colon, or plain hyphen.",
        },
        {
          selector: "TemplateElement[value.raw=/[\u2013\u2014]/]",
          message:
            "Project law: no em/en dashes in user-facing text. Use a comma, colon, or plain hyphen.",
        },
        {
          selector: "JSXText[value=/[\u2013\u2014]/]",
          message:
            "Project law: no em/en dashes in user-facing text. Use a comma, colon, or plain hyphen.",
        },
      ],
    },
  },
  // Test files legitimately use `any` for mock builders / partial stubs; the
  // no-explicit-any rule there produced 6 CI-blocking errors of no real value.
  // Relax it (and the noisy unused-vars) for tests only — production code keeps
  // the strict rule.
  {
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]);

export default eslintConfig;
