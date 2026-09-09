// @vitest-environment node
//
// Node rather than jsdom: this test drives Tailwind's own compiler API over
// the real theme, and no DOM is involved.
//
// The wide breakpoints are declared in rem rather than px for a reason the
// build proves every time it runs (ecoma-io/loom#282): the compiler orders
// breakpoint media blocks by comparing the unit string before the number, so
// px-valued 3xl–5xl blocks were emitted BEFORE the sm–2xl ones — and at
// ≥1920px every default-breakpoint utility overrode its 3xl counterpart, the
// cascade reading backwards. This pin compiles the theme exactly as a
// consumer does and fails if the emitted sheet ever stops ascending, or if a
// wide-step declaration ever lands ahead of a default-breakpoint one.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { compile } from "tailwindcss";

const THEME = readFileSync(join(import.meta.dirname, "..", "src", "theme.css"), "utf8");

/**
 * A consumer's stylesheet, assembled the way the harness and the docs site
 * assemble theirs: the engine first, then the real theme verbatim. `compile`
 * generates utility classes only for an input that pulls the engine in, so
 * the theme alone would emit nothing to order.
 */
const CONSUMER_SHEET = `@import "tailwindcss";\n${THEME}`;

/** The scale ascending: the five built-in rem steps, then the three wide ones. */
const REM_STEPS = ["40rem", "48rem", "64rem", "80rem", "96rem", "120rem", "160rem", "215rem"];

/** The gutter and height pair the defect actually bit, one per breakpoint. */
const CANDIDATES = [
  "sm:px-6",
  "md:px-6",
  "lg:px-6",
  "xl:px-6",
  "2xl:px-6",
  "3xl:px-8",
  "4xl:px-8",
  "5xl:px-8",
  "sm:h-14",
  "3xl:h-16",
];

/**
 * `compile` resolves `@import` only through a caller-provided loader; this
 * one reads the engine off the workspace root's own node_modules (the same
 * copy the docs site and the harness build against) and everything else
 * relative to its importer, which is all the engine's own index.css needs.
 */
const require = createRequire(import.meta.url);
const ENGINE_DIR = dirname(require.resolve("tailwindcss/package.json"));
const THEME_DIR = join(import.meta.dirname, "..", "src");

function loadStylesheet(id: string, base: string) {
  // The only bare specifier this sheet names is the engine itself; anything
  // else non-relative has no business resolving here.
  if (!id.startsWith(".") && id !== "tailwindcss") {
    throw new Error(`this test's sheet must not import ${id}`);
  }
  const path = id.startsWith(".") ? resolve(base, id) : join(ENGINE_DIR, "index.css");
  // `compile`'s loader type is promise-valued, but every read here is sync —
  // resolve immediately rather than marking the function async for nothing.
  return Promise.resolve({ path, base: dirname(path), content: readFileSync(path, "utf8") });
}

async function compiledSheet(): Promise<string> {
  const compiler = await compile(CONSUMER_SHEET, { base: THEME_DIR, loadStylesheet });
  return compiler.build(CANDIDATES);
}

describe("the theme's breakpoint media blocks", () => {
  it("are emitted ascending by width, rem steps and wide steps alike", async () => {
    const css = await compiledSheet();
    // The compiler API emits the modern range syntax where the Vite build
    // emits the `min-width` translation — accept either, require ascending.
    const blockAt = (step: string): number =>
      Math.max(
        css.indexOf(`@media (min-width: ${step})`),
        css.indexOf(`@media (width >= ${step})`),
      );
    let last = -1;
    for (const step of REM_STEPS) {
      const at = blockAt(step);
      expect(at, `a ${step} block must exist in the emitted sheet`).toBeGreaterThan(-1);
      expect(
        at,
        `the ${step} block must come after every narrower one (the sheet must ascend)`,
      ).toBeGreaterThan(last);
      last = at;
    }
  });

  it("never let a wide-step declaration precede the default-breakpoint one it must override", async () => {
    const css = await compiledSheet();
    // `3xl:` escapes with the digit: `.\33 xl\:px-8`. Below `sm` the gutter
    // pair reads 16px then 24px; at 3xl both must resolve 32px — which only
    // happens if the 3xl declarations sit LATER in the sheet than the sm ones.
    for (const [narrow, wide] of [
      [".sm\\:px-6", ".\\33 xl\\:px-8"],
      [".sm\\:h-14", ".\\33 xl\\:h-16"],
    ] as const) {
      const narrowAt = css.indexOf(narrow);
      const wideAt = css.indexOf(wide);
      expect(narrowAt, `${narrow} must be generated`).toBeGreaterThan(-1);
      expect(wideAt, `${wide} must be generated`).toBeGreaterThan(-1);
      expect(wideAt, `${wide} must override ${narrow} at ≥120rem`).toBeGreaterThan(narrowAt);
    }
  });
});
