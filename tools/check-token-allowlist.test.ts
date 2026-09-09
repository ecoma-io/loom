// @vitest-environment node
//
// Node rather than the project-wide jsdom, because these tests exercise the
// token gate against fixture trees on the filesystem — the same reason
// check-a11y-evidence.test.ts opts out of jsdom.
//
// The gate is itself tested because a check that always passes is not a
// check, and doubly so here: the gate reads its law by PARSING a TypeScript
// file, so its fixtures must also prove the parse is fail-closed — a contract
// the parser cannot read must stop the gate, never empty it. Each scan case
// builds a minimal `packages/` tree carrying exactly the shape needed to trip
// one rule — a hex in a template, a bare quantity on a style-bearing utility,
// a bare inline duration, a dead register entry — and asserts the reported
// failure names the file and the line. The last suite runs over the REAL tree:
// every TOKEN_EXCEPTIONS entry is removed one at a time and the scan must then
// fail at that entry's own file:line, which is the proof that no entry in the
// register is decorative.
import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  collectVueFiles,
  failureFor,
  isAllowedValue,
  parseThemeContract,
  readThemeContract,
  readTokenNames,
  runScan,
  scanVueFile,
} from "./check-token-allowlist.ts";

/**
 * A minimal but parseable contract. The same flat `as const` shape the real
 * one keeps — the parser judges shape, not content, and a smaller vocabulary
 * makes each fixture's failure readable.
 */
const CONTRACT = `
export const TOKEN_VALUE_SHAPES = [
  { shape: "var(--<name>)", because: "the vocabulary." },
  { shape: "currentColor", because: "a derived value." },
  { shape: "transparent", because: "the platform's zero." },
] as const;
export const TOKEN_EXCEPTIONS = [] as const;
`;

/** A contract with one exception, for the register-matching cases. */
const CONTRACT_WITH_EXCEPTION = CONTRACT.replace(
  "export const TOKEN_EXCEPTIONS = [] as const;",
  [
    "export const TOKEN_EXCEPTIONS = [",
    '  { path: "packages/primitives/demo/src/Demo.vue", value: "w-[9rem]", because: "a fixture width." },',
    "] as const;",
  ].join("\n"),
);

/** The token source, carrying the one block the gate reads. */
const THEME_CSS = `
@theme static {
  --color-foreground: hsl(213 29% 15%);
  --duration-fast: 100ms;
}
`;

const roots: string[] = [];
function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "loom-token-allowlist-"));
  roots.push(root);
  return root;
}
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** A tree with the law and the token source in place; no components yet. */
function makeTree(contract = CONTRACT, css = THEME_CSS): string {
  const root = makeRoot();
  mkdirSync(join(root, "packages", "core", "src"), { recursive: true });
  writeFileSync(join(root, "packages", "core", "src", "theme-contract.ts"), contract);
  mkdirSync(join(root, "packages", "theme-core", "src"), { recursive: true });
  writeFileSync(join(root, "packages", "theme-core", "src", "theme.css"), css);
  return root;
}

function writeVue(root: string, rel: string, content: string): string {
  mkdirSync(join(root, ...rel.split("/").slice(0, -1)), { recursive: true });
  writeFileSync(join(root, ...rel.split("/")), content);
  return rel;
}

const DEMO = "packages/primitives/demo/src/Demo.vue";

/** A clean single-file component every fixture starts from. */
function sfc(body: string): string {
  return `<script setup lang="ts">
const label = "demo";
</script>

<template>
  <button type="button">${body}</button>
</template>
`;
}

function law() {
  return parseThemeContract(CONTRACT);
}

/** The first failure mentioning `path`, or undefined. */
function failureOn(failures: string[], path: string): string | undefined {
  return failures.find((failure) => failure.includes(`token-allowlist: ${path}:`));
}

// ---- The law, parsed ---------------------------------------------------------

describe("parseThemeContract", () => {
  it("parses the shapes into the capabilities the scan judges by", () => {
    const parsed = law();
    expect(parsed.allowsTokenReference).toBe(true);
    expect(parsed.allowsAlpha).toBe(false);
    expect(parsed.keywords).toEqual(["currentColor", "transparent"]);
    expect(parsed.allowsEnv).toBe(false);
    expect(parsed.exceptions).toEqual([]);
  });

  it("carries the exception register through", () => {
    const parsed = parseThemeContract(CONTRACT_WITH_EXCEPTION);
    expect(parsed.exceptions).toEqual([
      {
        path: "packages/primitives/demo/src/Demo.vue",
        value: "w-[9rem]",
        because: "a fixture width.",
      },
    ]);
  });

  it("stops on a value shape it cannot interpret", () => {
    const lawless = CONTRACT.replace(
      '{ shape: "currentColor", because: "a derived value." },',
      '{ shape: "oklch(<l> <c> <h>)", because: "a colour space the gate never learned." },',
    );
    expect(() => parseThemeContract(lawless)).toThrow(
      /one the gate cannot interpret — extend the contract and this gate together/,
    );
  });

  it("stops when a value-shape record carries no shape", () => {
    const shapeless = CONTRACT.replace(
      '{ shape: "currentColor", because: "a derived value." },',
      '{ because: "a record that lost its shape." },',
    );
    expect(() => parseThemeContract(shapeless)).toThrow(/carries no shape/);
  });

  it("stops when no bare keyword shape is declared", () => {
    const keywordless = CONTRACT.replace(
      '{ shape: "currentColor", because: "a derived value." },\n  { shape: "transparent", because: "the platform\'s zero." },',
      "",
    );
    expect(() => parseThemeContract(keywordless)).toThrow(/names no bare keyword shape/);
  });

  it("stops when an exception record has no because", () => {
    const unexplained = CONTRACT.replace(
      "export const TOKEN_EXCEPTIONS = [] as const;",
      'export const TOKEN_EXCEPTIONS = [{ path: "a.vue", value: "w-[1rem]" }] as const;',
    );
    expect(() => parseThemeContract(unexplained)).toThrow(/missing path, value or because/);
  });

  it("stops when a path+value registers twice", () => {
    const doubled = CONTRACT.replace(
      "export const TOKEN_EXCEPTIONS = [] as const;",
      [
        "export const TOKEN_EXCEPTIONS = [",
        '  { path: "a.vue", value: "w-[1rem]", because: "once." },',
        '  { path: "a.vue", value: "w-[1rem]", because: "twice." },',
        "] as const;",
      ].join("\n"),
    );
    expect(() => parseThemeContract(doubled)).toThrow(/registers a\.vue "w-\[1rem\]" twice/);
  });
});

describe("readThemeContract", () => {
  it("fails closed naming the file when the contract is unreadable", () => {
    const root = makeTree("this is not the contract");
    expect(() => readThemeContract(root)).toThrow(/theme-contract\.ts is unreadable as law/);
  });
});

describe("readTokenNames", () => {
  it("reads the names a @theme static block declares", () => {
    expect(readTokenNames(THEME_CSS)).toEqual(["color-foreground", "duration-fast"]);
  });

  it("fails closed naming the file when the block is missing", () => {
    expect(() => readTokenNames(":root { --x: 1; }")).toThrow(
      /theme\.css carries no "@theme static \{" block/,
    );
  });

  it("fails closed when the block never closes", () => {
    expect(() => readTokenNames("@theme static {\n  --x: 1;\n")).toThrow(/never closed/);
  });

  it("fails closed when the block declares no tokens", () => {
    expect(() => readTokenNames("@theme static {\n  color-scheme: light;\n}\n")).toThrow(
      /declares no tokens/,
    );
  });
});

// ---- The judgment ------------------------------------------------------------

describe("isAllowedValue", () => {
  const parsed = law();

  it("passes a token reference, with or without a fallback", () => {
    expect(isAllowedValue("var(--color-foreground)", parsed)).toBe(true);
    expect(isAllowedValue("var(--switch-travel-x, 1rem)", parsed)).toBe(true);
    expect(isAllowedValue("linear-gradient(90deg, transparent, var(--color-x))", parsed)).toBe(
      true,
    );
  });

  it("passes a bare declared keyword", () => {
    expect(isAllowedValue("currentColor", parsed)).toBe(true);
    expect(isAllowedValue("transparent", parsed)).toBe(true);
  });

  it("rejects a bare quantity", () => {
    expect(isAllowedValue("min(90vw, 20rem)", parsed)).toBe(false);
    expect(isAllowedValue("0.995", parsed)).toBe(false);
    expect(isAllowedValue("4.5rem", parsed)).toBe(false);
  });

  it("does not let a literal ride beside a token reference", () => {
    // The laundering shape a substring test cannot see: the reference is
    // real, but the quantity or the hex beside it is the decision.
    expect(isAllowedValue("4px var(--color-x)", parsed)).toBe(false);
    expect(isAllowedValue("#ff0000 var(--color-x)", parsed)).toBe(false);
  });

  it("keeps a reference's own composition arguments legal — the sheen's angle, the alpha weight", () => {
    expect(
      isAllowedValue(
        "linear-gradient(110deg, transparent 35%, --alpha(var(--color-primary)/25%) 50%, transparent 65%)",
        parsed,
      ),
    ).toBe(true);
  });

  it("does not let env() carry a neighbouring literal", () => {
    // The composition that made ToastStack's padding a finding rather than a
    // pass: the env() atom is host geometry, the 1rem beside it is a decision.
    const withEnv = parseThemeContract(
      CONTRACT.replace(
        "] as const;",
        '  { shape: "env(<safe-area-inset-…>)", because: "host geometry." },\n] as const;',
      ),
    );
    expect(withEnv.allowsEnv).toBe(true);
    expect(isAllowedValue("max(1rem, env(safe-area-inset-bottom))", withEnv)).toBe(false);
    expect(isAllowedValue("env(safe-area-inset-bottom)", withEnv)).toBe(true);
  });
});

// ---- The scan ----------------------------------------------------------------

describe("scanVueFile", () => {
  it("finds a hex in a template style attribute, on its own line", () => {
    const file = sfc('<span style="color: #ff0000">x</span>');
    const scan = scanVueFile(file, law());
    expect(scan.findings).toEqual([{ line: 6, value: "#ff0000" }]);
    expect(scan.judged).toBe(1);
  });

  it("finds a colour function in a bound style object", () => {
    const scan = scanVueFile(sfc(`<span :style="{ color: 'rgb(255, 0, 0)' }">x</span>`), law());
    expect(scan.findings).toEqual([{ line: 6, value: "rgb(" }]);
  });

  it("passes a colour function wrapping a token reference", () => {
    const scan = scanVueFile(sfc(`<span style="color: hsl(var(--color-x))">x</span>`), law());
    expect(scan.findings).toEqual([]);
  });

  it("never judges a script-side colour literal — picked data is not styling", () => {
    const file = [
      `<script setup lang="ts">`,
      `const FALLBACK = "#000000";`,
      `</script>`,
      `<template><span>{{ FALLBACK }}</span></template>`,
    ].join("\n");
    expect(scanVueFile(file, law()).findings).toEqual([]);
  });

  it("never judges a hex inside a comment", () => {
    const file = [
      `<template>`,
      `  <!-- the fallback is #000000, see the script -->`,
      `  <span>x</span>`,
      `</template>`,
    ].join("\n");
    expect(scanVueFile(file, law()).findings).toEqual([]);
  });

  it("finds a bare quantity on a style-bearing utility, naming it as written", () => {
    const scan = scanVueFile(sfc(`<span class="w-[22rem]">x</span>`), law());
    expect(scan.findings).toEqual([{ line: 6, value: "w-[22rem]" }]);
  });

  it("finds a bare quantity behind a variant chain, still on its own line", () => {
    const scan = scanVueFile(sfc(`<span class="data-[state=open]:pl-[13px]">x</span>`), law());
    expect(scan.findings).toEqual([{ line: 6, value: "pl-[13px]" }]);
  });

  it("passes a token-anchored arbitrary value, runtime property or not", () => {
    const scan = scanVueFile(
      sfc(`<span class="w-[var(--reka-select-trigger-width)]">x</span>`),
      law(),
    );
    expect(scan.findings).toEqual([]);
    expect(scan.judged).toBe(1);
  });

  it("passes an --alpha composition of a token", () => {
    const parsed = parseThemeContract(
      CONTRACT.replace(
        "] as const;",
        '  { shape: "--alpha(var(--<name>) / <n>)", because: "a derived translucency." },\n] as const;',
      ),
    );
    const scan = scanVueFile(
      sfc(
        `<span class="bg-[linear-gradient(90deg,transparent,--alpha(var(--color-x)/6%))]">x</span>`,
      ),
      parsed,
    );
    expect(scan.findings).toEqual([]);
  });

  it("lets a type-hinted length pass on bg but judges it on text", () => {
    const bg = scanVueFile(sfc(`<span class="bg-[length:200%_100%]">x</span>`), law());
    expect(bg.findings).toEqual([]);
    const text = scanVueFile(sfc(`<span class="text-[length:13px]">x</span>`), law());
    expect(text.findings).toEqual([{ line: 6, value: "text-[length:13px]" }]);
  });

  it("is out of scope for the layout-structural brackets", () => {
    const scan = scanVueFile(sfc(`<span class="grow-[999] grid-cols-[200px_1fr]">x</span>`), law());
    expect(scan.findings).toEqual([]);
  });

  it("is out of scope for a transition property list", () => {
    const scan = scanVueFile(
      sfc(`<span class="transition-[color,background-color,box-shadow]">x</span>`),
      law(),
    );
    expect(scan.findings).toEqual([]);
  });

  it("judges the bare arbitrary-property form once", () => {
    const clean = scanVueFile(
      sfc(`<span class="[transition:transform_var(--duration-fast)_var(--ease-out)]">x</span>`),
      law(),
    );
    expect(clean.findings).toEqual([]);
    expect(clean.judged).toBe(1);
    const bare = scanVueFile(sfc(`<span class="[transition:transform_120ms]">x</span>`), law());
    expect(bare.findings).toEqual([{ line: 6, value: "[transition:transform_120ms]" }]);
    const laundered = scanVueFile(sfc(`<span class="[padding-left:13px]">x</span>`), law());
    expect(laundered.findings).toEqual([{ line: 6, value: "[padding-left:13px]" }]);
  });

  it("is out of scope for the structural bare properties — placement and technique", () => {
    // The real carriers: the overlay-cell trick, the visually-hidden recipe,
    // tabular digits. None of them is a step on a themable ladder.
    const scan = scanVueFile(
      sfc(
        `<span class="[grid-area:1/1] [clip:rect(0,0,0,0)] [clip-path:inset(50%)] [font-variant-numeric:tabular-nums]">x</span>`,
      ),
      law(),
    );
    expect(scan.findings).toEqual([]);
  });

  it("skips a custom-property assignment — the var() that reads it is judged instead", () => {
    const scan = scanVueFile(sfc(`<span class="rtl:[--switch-travel-x:-1rem]">x</span>`), law());
    expect(scan.findings).toEqual([]);
  });

  it("finds a bare inline duration and passes the zero and the token forms", () => {
    const bare = scanVueFile(sfc(`<span :style="{ animationDelay: '60ms' }">x</span>`), law());
    expect(bare.findings).toEqual([{ line: 6, value: "60ms" }]);
    const zero = scanVueFile(sfc(`<span :style="{ animationDelay: '0ms' }">x</span>`), law());
    expect(zero.findings).toEqual([]);
    const token = scanVueFile(
      sfc(`<span :style="{ transitionDelay: 'var(--duration-fast)' }">x</span>`),
      law(),
    );
    expect(token.findings).toEqual([]);
  });

  it("skips a token the script computes — the stated review-held limit", () => {
    const scan = scanVueFile(sfc(`<span :class="\`w-[min(90vw,\${width})]\`">x</span>`), law());
    expect(scan.findings).toEqual([]);
  });

  it("judges a static class behind a template-literal binding", () => {
    // Where the literal sits must not decide whether it is judged: the
    // backtick the binding puts in front of the class stripped like any
    // other punctuation, or the script-side form is held and this one is not.
    const scan = scanVueFile(sfc(`<span :class="\`w-[999px]\`">x</span>`), law());
    expect(scan.findings).toEqual([{ line: 6, value: "w-[999px]" }]);
    expect(scan.judged).toBe(1);
    const anchored = scanVueFile(sfc(`<span :class="\`w-[var(--x)]\`">x</span>`), law());
    expect(anchored.findings).toEqual([]);
    expect(anchored.judged).toBe(1);
  });

  it("judges an important-marked bracket value from either end", () => {
    const before = scanVueFile(sfc(`<span class="!w-[999px]">x</span>`), law());
    expect(before.findings).toEqual([{ line: 6, value: "w-[999px]" }]);
    const after = scanVueFile(sfc(`<span class="w-[999px]!">x</span>`), law());
    expect(after.findings).toEqual([{ line: 6, value: "w-[999px]" }]);
    const anchored = scanVueFile(sfc(`<span class="!w-[var(--x)]">x</span>`), law());
    expect(anchored.findings).toEqual([]);
    expect(anchored.judged).toBe(1);
  });

  it("judges a class attribute broken across lines", () => {
    // A quoted attribute value may span lines — valid HTML, valid Vue — and
    // the single-line literal pass cannot see it.
    const file = [
      `<template>`,
      `  <span class="flex items-center`,
      `       w-[999px]">x</span>`,
      `</template>`,
    ].join("\n");
    const scan = scanVueFile(file, law());
    expect(scan.findings).toEqual([{ line: 3, value: "w-[999px]" }]);
    expect(scan.judged).toBe(1);
  });

  it("does not double-judge the quoted strings inside a multiline binding", () => {
    // The multiline pass blanks what the literal pass already judged, so one
    // value is one finding and one judged count.
    const file = [
      `<template>`,
      `  <span :class="cn(`,
      `    'w-[999px]',`,
      `    cond`,
      `  )">x</span>`,
      `</template>`,
    ].join("\n");
    const scan = scanVueFile(file, law());
    expect(scan.findings).toEqual([{ line: 3, value: "w-[999px]" }]);
    expect(scan.judged).toBe(1);
  });

  it("judges the directional and axis spellings of the style-bearing families", () => {
    // Same decisions, other spellings: a side border, a child-flow divider,
    // a flow-direction gap, a child-flow margin, a blur radius, a filter
    // weight, a text indent.
    const tokens = [
      "border-t-[3px]",
      "border-e-[3px]",
      "divide-x-[2px]",
      "gap-x-[999px]",
      "space-y-[999px]",
      "blur-[2px]",
      "backdrop-brightness-[1.4]",
      "brightness-[1.4]",
      "indent-[3rem]",
    ];
    for (const token of tokens) {
      const scan = scanVueFile(sfc(`<span class="${token}">x</span>`), law());
      expect(scan.findings, token).toEqual([{ line: 6, value: token }]);
    }
  });

  it("passes a token reference on the newly judged families", () => {
    const scan = scanVueFile(
      sfc(`<span class="border-t-[var(--x)] blur-[var(--x)]">x</span>`),
      law(),
    );
    expect(scan.findings).toEqual([]);
    expect(scan.judged).toBe(2);
  });

  it("finds the CSS colour functions inline", () => {
    const oklch = scanVueFile(sfc(`<span style="background: oklch(70% 0.1 200)">x</span>`), law());
    expect(oklch.findings).toEqual([{ line: 6, value: "oklch(" }]);
    const mix = scanVueFile(
      sfc(`<span style="background: color-mix(in srgb, red 50%, white)">x</span>`),
      law(),
    );
    // The function and both named stops are colour literals in one value.
    expect(mix.findings).toEqual([
      { line: 6, value: "color-mix(" },
      { line: 6, value: "red" },
      { line: 6, value: "white" },
    ]);
  });

  it("finds a bare CSS colour name written as a style value", () => {
    const scan = scanVueFile(sfc(`<span style="color: crimson">x</span>`), law());
    expect(scan.findings).toEqual([{ line: 6, value: "crimson" }]);
    expect(scan.judged).toBe(1);
  });

  it("does not judge a colour word in the prose a class binding carries", () => {
    // The real shape: `//` comments live inside a multi-line attribute
    // expression, where the comment stripper cannot reach (the attribute is a
    // string to it), and they talk about colours in English. A bare name is
    // judged only in a style value; hex and the function spellings need no
    // such context.
    const file = [
      `<template>`,
      `  <span :class="cn(`,
      `    // it punches a grey hole through the fill`,
      `    'bg-foreground/10',`,
      `  )">x</span>`,
      `</template>`,
    ].join("\n");
    const scan = scanVueFile(file, law());
    expect(scan.findings).toEqual([]);
  });

  it("passes a colour function wrapping a token reference — the new functions too", () => {
    const scan = scanVueFile(
      sfc(`<span style="background: oklch(var(--color-x))">x</span>`),
      law(),
    );
    expect(scan.findings).toEqual([]);
  });

  it("stops at a style block, naming its line", () => {
    const file = [
      `<template><span>x</span></template>`,
      ``,
      `<style>`,
      `.x { color: #fff; }`,
      `</style>`,
    ].join("\n");
    const scan = scanVueFile(file, law());
    expect(scan.findings).toEqual([{ line: 3, value: "<style> block" }]);
  });

  it("stops at a style block whatever its case — HTML is not", () => {
    const file = [
      `<template><span>x</span></template>`,
      ``,
      `<STYLE>`,
      `.x { color: #fff; }`,
      `</STYLE>`,
    ].join("\n");
    const scan = scanVueFile(file, law());
    expect(scan.findings).toEqual([{ line: 3, value: "<style> block" }]);
  });

  it("judges the shorthand bare properties — border, outline, text-shadow", () => {
    // The shorthands write colour, width and style in one property; left
    // unjudged they are the cheapest way around the longhands.
    const tokens = [
      "[border:1px_solid_red]",
      "[outline:2px_solid_red]",
      "[text-shadow:0_1px_2px_black]",
    ];
    for (const token of tokens) {
      const scan = scanVueFile(sfc(`<span class="${token}">x</span>`), law());
      expect(scan.findings, token).toEqual([{ line: 6, value: token }]);
    }
    // `none` is the removal of the effect — the keyword the law declares.
    const withNone = parseThemeContract(
      CONTRACT.replace(
        "] as const;",
        '  { shape: "none", because: "removal of the effect." },\n] as const;',
      ),
    );
    const none = scanVueFile(sfc(`<span class="[text-shadow:none]">x</span>`), withNone);
    expect(none.findings).toEqual([]);
  });

  it("refuses to narrow the colour net to an unterminated template", () => {
    // With no end the in-template test fails for every offset, which would
    // silently judge nothing — a gate narrowing itself without saying so.
    expect(() => scanVueFile('<template><span style="color: #ff0000">x</span>', law())).toThrow(
      /never closes/,
    );
  });

  it("reports nothing for a file that writes only token-shaped values", () => {
    const scan = scanVueFile(
      sfc(`<span class="text-foreground bg-subtle w-[var(--x)]">x</span>`),
      law(),
    );
    expect(scan.findings).toEqual([]);
  });
});

// ---- The driver, over fixture trees -------------------------------------------

describe("runScan", () => {
  it("reports a satisfying tree with its counts of record", () => {
    const root = makeTree(CONTRACT_WITH_EXCEPTION);
    writeVue(root, DEMO, sfc(`<span class="w-[var(--ok)] w-[9rem]">x</span>`));
    const { stats, failures } = runScan(root);
    expect(failures).toEqual([]);
    expect(stats.files).toBe(1);
    expect(stats.judged).toBe(2);
    expect(stats.tokens).toBe(2);
    expect(stats.exceptionsUsed).toBe(1);
    expect(stats.exceptionFiles).toBe(1);
  });

  it("names file and line when the tree breaks the law", () => {
    const root = makeTree();
    const rel = writeVue(root, DEMO, sfc(`<span class="w-[22rem]">x</span>`));
    const { failures } = runScan(root);
    expect(failures).toEqual([failureFor(rel, { line: 6, value: "w-[22rem]" })]);
    expect(failureOn(failures, rel)).toMatch(/"w-\[22rem\]" is a bare literal/);
    expect(failureOn(failures, rel)).toMatch(/TOKEN_EXCEPTIONS/);
  });

  it("fails on a register entry the tree no longer carries", () => {
    const root = makeTree(CONTRACT_WITH_EXCEPTION);
    writeVue(root, DEMO, sfc(`<span class="w-[var(--ok)]">x</span>`));
    const { failures } = runScan(root);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('TOKEN_EXCEPTIONS carries "w-[9rem]"');
  });

  it("fails closed when the fixture contract is unreadable", () => {
    const root = makeTree("not a contract");
    writeVue(root, DEMO, sfc("x"));
    expect(() => runScan(root)).toThrow(/theme-contract\.ts is unreadable as law/);
  });

  it("fails closed when the fixture token source is broken", () => {
    const root = makeTree(CONTRACT, "@theme static {\n  --x: 1;\n");
    writeVue(root, DEMO, sfc("x"));
    expect(() => runScan(root)).toThrow(/never closed/);
  });

  it("refuses the vacuous green when the scope carries no file", () => {
    // Law and token source in place, nothing scanned: every count of record
    // would be zero, and zero must not print as clean.
    const root = makeTree();
    const { failures, stats } = runScan(root);
    expect(stats.files).toBe(0);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("the scan scope is empty");
  });

  it("fails closed, naming the file, when a template block never closes", () => {
    const root = makeTree();
    writeVue(root, DEMO, '<template><span style="color: #ff0000">x</span>');
    expect(() => runScan(root)).toThrow(/Demo\.vue.*never closes/s);
  });

  it("collects component sources under each tier and the template roots", () => {
    const root = makeTree();
    writeVue(root, "packages/primitives/a/src/A.vue", sfc("x"));
    writeVue(root, "packages/patterns/b/src/B.vue", sfc("x"));
    writeVue(root, "packages/primitives/a/tests/A.test.ts", "not a component");
    writeVue(root, "templates/portal/Portal.vue", sfc("x"));
    writeVue(root, "docs/demos/ADemo.vue", sfc("x"));
    expect(collectVueFiles(root)).toEqual([
      "packages/patterns/b/src/B.vue",
      "packages/primitives/a/src/A.vue",
      "templates/portal/Portal.vue",
    ]);
  });
});

// ---- The register, proven necessary over the real tree ------------------------

const REPO_ROOT = join(import.meta.dirname, "..");

/** The one exception record naming `path` and `value`, lifted out of the source. */
function removeException(source: string, path: string, value: string): string {
  const pathMarker = `path: "${path}"`;
  const valueMarker = `value: "${value}"`;
  let from = 0;
  for (;;) {
    const pathAt = source.indexOf(pathMarker, from);
    if (pathAt === -1) throw new Error(`no register record for ${path}`);
    const valueAt = source.indexOf(valueMarker, pathAt);
    const nextPathAt = source.indexOf(pathMarker, pathAt + 1);
    if (valueAt !== -1 && (nextPathAt === -1 || valueAt < nextPathAt)) {
      const open = source.lastIndexOf("{", valueAt);
      const close = source.indexOf("}", valueAt);
      let end = close + 1;
      if (source[end] === ",") end += 1;
      return source.slice(0, open) + source.slice(end);
    }
    from = pathAt + 1;
  }
}

/** The 1-based line `value` is written on in `path`. */
function lineOf(path: string, value: string): number {
  const text = readFileSync(join(REPO_ROOT, path), "utf8");
  return text.slice(0, Math.max(0, text.indexOf(value))).split("\n").length;
}

describe("the real tree against the real law", () => {
  it("is green exactly as the register records it", () => {
    const law = readThemeContract(REPO_ROOT);
    const { stats, failures } = runScan(REPO_ROOT, { contract: law });
    expect(failures).toEqual([]);
    expect(stats.exceptionsUsed).toBe(law.exceptions.length);
    expect(stats.exceptionFiles).toBe(new Set(law.exceptions.map((e) => e.path)).size);
  });

  it("fails at each exception's own file:line when that exception is removed", () => {
    const source = readFileSync(join(REPO_ROOT, "packages/core/src/theme-contract.ts"), "utf8");
    const law = parseThemeContract(source);
    for (const exception of law.exceptions) {
      const mutated = parseThemeContract(removeException(source, exception.path, exception.value));
      const { failures } = runScan(REPO_ROOT, { contract: mutated });
      const expected = failureFor(exception.path, {
        line: lineOf(exception.path, exception.value),
        value: exception.value,
      });
      // The whole point of the entry: without it, this exact position is bare.
      expect(
        failures,
        `removing "${exception.value}" (${exception.path}) must fail the gate at that entry's own file:line`,
      ).toEqual([expected]);
    }
  });
});
