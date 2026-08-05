// Flat ESLint config. Prettier owns formatting — `eslint-config-prettier` is
// last so it switches off every stylistic rule the two would otherwise fight
// over, leaving ESLint to judge correctness only.
//
// Inside a single-file component ESLint is the only analyser that reads the
// `<script>` block at all: Semgrep dropped its Vue parser in 1.93.0 and never
// replaced it. That is why the rule set here is deliberately at the strict end
// rather than the recommended one — the alternative is not a milder check, it
// is no check.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      "blob-report/**",
      // Semgrep rule fixtures are deliberately unsafe code whose whole purpose
      // is to be reported by Semgrep. `semgrep --test` is what checks them.
      ".github/semgrep/**",
    ],
  },

  js.configs.recommended,

  // TypeScript, linted with type information. `projectService` hands the parser
  // the same program `tsc` builds, which is what makes the rules below possible
  // at all: a floating promise, an unawaited thenable or a comparison that can
  // never be false are invisible to a parser that only sees syntax.
  //
  // Every `.ts` file in the repository is already inside `tsconfig.json`'s
  // `include`, so no file needs an escape hatch. Adding one that is not — a new
  // top-level script, say — means adding it to `include` rather than loosening
  // this.
  {
    files: ["**/*.ts", "**/*.mts", "**/*.cts"],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // An unused binding is a leftover unless it is deliberately named with a
      // leading underscore.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // `verbatimModuleSyntax` erases nothing it was not told to erase, so a
      // type imported without the `type` keyword becomes a real runtime import
      // of a module that may only exist at build time.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },

  // Plain ESM JavaScript — this config and the agent hooks. No tsconfig covers
  // them, so the type-aware rules have no program to consult and are switched
  // off explicitly rather than left to fail at parse time.
  {
    files: ["**/*.mjs", "**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      // The core rule, scoped here rather than shared: the TypeScript files use
      // the `@typescript-eslint` version, which understands type-only bindings.
      // Enabling this one for them too reports every unused binding twice —
      // `strictTypeChecked` switches the core rule off for `.ts` precisely so
      // that cannot happen, and a later unscoped block would switch it back on.
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },

  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.es2024 },
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
      "no-var": "error",
    },
  },

  // The public surface is the product. An exported signature that TypeScript
  // infers is a signature nobody reviewed, and it changes silently when the
  // implementation does — for a consumer, that is the same as a breaking change
  // nobody announced.
  {
    files: ["src/**/*.ts"],
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "error",
    },
  },

  // Node context: config files and hooks run outside the browser.
  {
    files: ["*.config.{ts,mts,mjs}", "eslint.config.mjs", ".claude/hooks/**/*.mjs"],
    languageOptions: { globals: { ...globals.node } },
    rules: { "no-console": "off" },
  },

  prettier,
);
