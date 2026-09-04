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
import pluginVue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import vueA11y from "eslint-plugin-vuejs-accessibility";
import vitest from "@vitest/eslint-plugin";
import playwright from "eslint-plugin-playwright";
import prettier from "eslint-config-prettier";

// The `.ts` block uses `projectService` with `loadTypeScriptPlugins: true` so
// the Vue TypeScript language-service plugin (configured in `tsconfig.json`)
// decorates the host and `.vue` files resolve to virtual TypeScript content.
// That is what lets `.ts` files resolve `.vue` module types under the type-aware
// rules — the fix for the five workarounds removed in the same commit.
//
// The `.vue` block does NOT use `projectService`. `vue-eslint-parser` already
// understands SFCs, and no type-aware rules target `.vue` files — the
// `strictTypeChecked` and `stylisticTypeChecked` extends are scoped to
// `**/*.ts`. Running `projectService` there loads the same Vue TS plugin, which
// generates `__VLS_*` synthetic declarations that `no-unused-vars` then reports.
// The parserOptions that remain (`tsconfigRootDir`, `extraFileExtensions`) are
// sufficient for `vue-eslint-parser` to hand the `<script>` block to the
// TypeScript parser for syntax-level analysis.
const tsParserOptions = {
  projectService: { loadTypeScriptPlugins: true },
  extraFileExtensions: [".vue"],
  tsconfigRootDir: import.meta.dirname,
};

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
      "docs/.vitepress/dist/**",
      "docs/.vitepress/cache/**",
      // The templates build in place (moon run <template>:build) and their
      // output lands nested — which `dist/**` above does not match, the same
      // way it never matched docs' nested dist, hence this entry.
      "templates/*/dist/**",
      // The same built site again, nested under the path it is served from.
      // `docs:stage` copies rather than moves, so linting this would report
      // every minified bundle twice over.
      ".cloudflare/**",
      ".wrangler/**",
      // Agent worktrees are isolated copies of the repository used during
      // development — they are not part of the package surface and linting them
      // doubles the work and reports stale references from killed agents.
      ".claude/worktrees/**",
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
      parserOptions: tsParserOptions,
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
    files: ["packages/**/*.ts"],
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "error",
    },
  },

  // Single-file components. `vue-eslint-parser` owns the file and hands the
  // `<script>` block to the TypeScript parser, which is the arrangement that
  // makes both halves visible at once — the template to the Vue rules, the
  // script to the type-aware ones. Order matters: the parser assignment has to
  // come after the `**/*.ts` block above, or that block's parser wins for the
  // script block and the template goes unparsed.
  //
  // `flat/recommended` is the strongest tier the plugin ships, and it is the
  // right one here for the same reason the TypeScript rules are: inside an SFC
  // ESLint is the only analyser that reads the code at all.
  ...pluginVue.configs["flat/recommended"],
  ...vueA11y.configs["flat/recommended"],
  {
    // Unscoped, because the rule also fires on a global registration in a
    // plain `.ts` theme file — and the answer is the same wherever it fires.
    // A design system's vocabulary IS single words: `Button`, `Card`, `Dialog`.
    // Prefixing every one of them to satisfy a rule aimed at application code
    // would rename the public API to avoid a collision with HTML elements that
    // Vue already resolves in favour of the registered component.
    rules: { "vue/multi-word-component-names": "off" },
  },
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The prop tables in the documentation are generated from these
      // declarations, so a prop without a type produces a documentation row
      // that says nothing.
      "vue/require-prop-types": "error",
      "vue/require-default-prop": "off",
      // `v-html` is the XSS sink Semgrep also watches, but Semgrep lost its
      // Vue parser and only reaches the template by text match. This is the
      // analyser that actually understands what it is looking at.
      "vue/no-v-html": "error",
      "vue/component-api-style": ["error", ["script-setup"]],
      "vue/define-macros-order": "error",
      "vue/no-undef-components": "error",
    },
  },

  // Tests. These rules catch the two ways a suite reports green for something
  // nobody ran — a focused test that silences its siblings, and a skipped one
  // that silences itself — plus assertions that can never fail.
  {
    files: ["packages/**/*.test.ts", "e2e/**/*.e2e.ts", "playwright/harness/**/*.e2e.ts"],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/no-focused-tests": "error",
      "vitest/no-disabled-tests": "error",
      "vitest/expect-expect": "error",
      "vitest/valid-expect": "error",
      // A test file mounts components and reaches into the DOM; the strictest
      // type-aware rules fight that without catching anything real there.
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/unbound-method": "off",
      // A test defines the host components it needs to exercise a composable,
      // and they belong beside the assertions that explain them. The rule is
      // about a shipped module's identity, which a test file does not have.
      "vue/one-component-per-file": "off",
    },
  },

  {
    files: ["e2e/**/*.e2e.ts", "playwright/harness/**/*.e2e.ts"],
    ...playwright.configs["flat/recommended"],
  },

  // Node context: config files, build plugins, repository checks and hooks all
  // run outside the browser. `no-console` is off here because for a check that
  // is invoked from a terminal, what it writes to stdout is its entire output —
  // silencing it would leave a command that only communicates by exit code.
  {
    files: [
      "*.config.{ts,mts,mjs}",
      "eslint.config.mjs",
      "docs/.vitepress/**/*.{ts,mts}",
      "tools/**/*.ts",
      ".claude/hooks/**/*.mjs",
    ],
    languageOptions: { globals: { ...globals.node } },
    rules: { "no-console": "off" },
  },

  prettier,
);
