import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buttonVariantClasses, buttonVariants, type ButtonVariant } from "./Button.vue";

// Why this file exists: the accessibility gate cannot see Button's labels at
// all. The label and the loading layer share one `[grid-area:1/1]` cell so the
// button never changes width mid-swap, and every sibling overlap makes
// axe-core's `color-contrast` rule return `incomplete` with messageKey
// `bgOverlap` rather than a verdict. The end-to-end suite asserts on
// `violations`, so it passes, and it would keep passing at any contrast
// whatsoever — 21 of the 24 incompletes on the Button page are every Button
// label on the page. The same shape of gap already shipped a real defect:
// axe never evaluated ColorPicker's disabled hex input (absent from passes,
// incomplete and violations alike), and a 3.08:1 value sat on a published page
// with a green gate.
//
// Measured independently by compositing the ancestor chain, every label is
// fine today — the worst is the Disabled button at 4.68:1, the rest run from
// 5.77:1 to 15.49:1. So there is nothing to fix in the palette; what needs
// pinning is the pairings, against the palette itself. Reading `theme.css`
// rather than a copy of its values means a token change that drops a pair
// below the floor fails here — the drift is caught the same day it is made
// instead of on a consumer's contrast report.
//
// The floor is 4.5:1 (WCAG 1.4.3 AA for normal text): `text-sm font-medium`
// is 14px/500, the exact boundary case the normal-text floor exists for.

// `import.meta.dirname` (Node 24) rather than `import.meta.url`, because the
// file is rewritten by Vitest's transform — `new URL(…, import.meta.url)`
// gets a bare path as its base and dies with a scheme error, which is what
// the docs plugin can get away with because VitePress runs it untransformed.
const THEME_CSS = `${import.meta.dirname}/../../styles/theme.css`;

/** The text-contrast floor the whole palette is held to, WCAG 1.4.3 AA. */
const TEXT_FLOOR = 4.5;

/**
 * Every `--name: value;` declaration inside `theme.css`'s one `@theme static`
 * block. The block is found textually — `@theme static {` is a keyword the
 * file's own header comment does not use elsewhere — and its declarations are
 * the only source of token values this test trusts.
 *
 * The regex is lazy (`*?` rather than `*`) so it stops at the FIRST closing
 * `}` on its own line — the `@theme static` block itself — rather than
 * reaching past it into the dark-theme overrides or utility blocks that follow.
 */
async function readTokens(): Promise<Map<string, string>> {
  const css = await readFile(THEME_CSS, "utf8");
  const block = /@theme static \{([\s\S]*?)\n\}/.exec(css)?.[1];
  if (block === undefined) throw new Error(`${THEME_CSS}: no "@theme static {" block found.`);
  return new Map(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => {
      const name = m[1];
      const value = m[2];
      if (name === undefined || value === undefined) {
        throw new Error(`${THEME_CSS}: malformed token declaration: ${m[0]}`);
      }
      return [name, value.trim()];
    }),
  );
}

interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  /** The token's own alpha, 1 for an opaque paint. */
  readonly a: number;
}

/**
 * `hsl(213 29% 15%)`, with the `/ alpha` form accepted because a fill with an
 * alpha is a fill whose ratio against the label depends on what sits behind
 * it — which is exactly what this test is not equipped to measure, and which
 * the assertion below is told about rather than silently mis-measured.
 */
function parseHsl(value: string): Rgb | null {
  const match =
    /^hsl\((\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%(?:\s*\/\s*(\d+(?:\.\d+)?)%)?\)$/.exec(
      value,
    );
  if (!match) return null;
  const h = Number(match[1]);
  const s = Number(match[2]) / 100;
  const l = Number(match[3]) / 100;
  const a = match[4] === undefined ? 1 : Number(match[4]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = h / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (hPrime < 1) rgb = [c, x, 0];
  else if (hPrime < 2) rgb = [x, c, 0];
  else if (hPrime < 3) rgb = [0, c, x];
  else if (hPrime < 4) rgb = [0, x, c];
  else if (hPrime < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
    a,
  };
}

function linear(v: number): number {
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(c: Rgb): number {
  return 0.2126 * linear(c.r / 255) + 0.7152 * linear(c.g / 255) + 0.0722 * linear(c.b / 255);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * The `<utility-name>` token behind a `bg-` / `text-` class, parsed out of
 * `theme.css`, or a descriptive throw — a missing or non-hsl token is a
 * miswritten class or a palette change this test must not silently skip.
 */
function colorOf(tokens: Map<string, string>, name: string): Rgb {
  const value = tokens.get(`color-${name}`);
  const color = value === undefined ? null : parseHsl(value);
  if (!color) throw new Error(`"${name}" is not an opaque hsl token in theme.css`);
  if (color.a !== 1) throw new Error(`"${name}" carries an alpha; its ratio depends on the page`);
  return color;
}

// The pairs every rest-state Button paints. `cva` returns one flat string, so
// each row's tokens are pulled out of the classes the map actually declares —
// pulling them from a list kept in this file instead would let the map drift
// and this file stay green, which is the exact failure being closed. Only the
// rest state is resolved: a utility carrying a `:` (`hover:` above all) is a
// different state, and a different state is a different measurement contract.
function tokensOf(className: string, known: Set<string>): { fill: string[]; label: string[] } {
  const fill: string[] = [];
  const label: string[] = [];
  for (const cls of className.split(/\s+/)) {
    if (cls.includes(":")) continue;
    const match = /^(bg|text)-(.+)$/.exec(cls);
    const prefix = match?.[1];
    const name = match?.[2];
    // `bg-transparent` names no token — it is the absence of a fill — but it
    // is a real pairing the map declares and one variant row is built on, so
    // it is recognised rather than filtered.
    if (
      prefix === undefined ||
      name === undefined ||
      (name !== "transparent" && !known.has(`color-${name}`))
    ) {
      continue;
    }
    (prefix === "bg" ? fill : label).push(name);
  }
  return { fill, label };
}

describe("Button palette", () => {
  it("labels every variant at the 4.5:1 text floor against its own fill, measured from the palette", async () => {
    const tokens = await readTokens();
    const known = new Set(tokens.keys());

    // The map in `Button.vue` is the single list, and `satisfies
    // Record<ButtonVariant, string>` already holds it against the union, so a
    // variant added there is exercised here without this file being told.
    for (const variant of Object.keys(buttonVariantClasses) as ButtonVariant[]) {
      const classes = buttonVariants({ variant });
      const { fill, label } = tokensOf(classes, known);
      // Exactly one of each: a typo'd token name would fall out of `known`
      // and shrink the row to one, which is the assertion that catches it.
      expect(fill, `${variant}: fill ${fill.join(", ")}`).toHaveLength(1);
      expect(label, `${variant}: label ${label.join(", ")}`).toHaveLength(1);

      if (fill[0] === "transparent") continue;

      // `colorOf` throws rather than let the test measure nothing, and its
      // throw is the entire point: a palette change that introduces an alpha
      // is a change whose ratios depend on the page, which is a measurement
      // this test refuses to guess at.
      expect(
        contrastRatio(colorOf(tokens, label[0] ?? ""), colorOf(tokens, fill[0] ?? "")),
        `${variant}: "text-${label[0] ?? ""}" on "bg-${fill[0] ?? ""}"`,
      ).toBeGreaterThanOrEqual(TEXT_FLOOR);
    }
  });

  it("grounds the three transparent variants on the palette's lightest surface, their least room", async () => {
    const tokens = await readTokens();
    const known = new Set(tokens.keys());

    const ground = colorOf(tokens, "card");

    for (const variant of ["subtle", "outline", "ghost"] as const) {
      const classes = buttonVariants({ variant });
      const { fill, label } = tokensOf(classes, known);
      expect(fill).toEqual(["transparent"]);
      expect(label).toHaveLength(1);

      // A ghost label sits on whatever the consumer put the button on, and a
      // button in a card header is the realistic worst case. `--color-card`
      // being the lightest token in the palette is asserted by being read
      // from the palette itself — if a lighter surface ever joins, this test
      // starts measuring against it without being told.
      expect(
        contrastRatio(colorOf(tokens, label[0] ?? ""), ground),
        `${variant}: "text-${label[0] ?? ""}" on the lightest ground`,
      ).toBeGreaterThanOrEqual(TEXT_FLOOR);
    }
  });

  // The Disabled button is the pair closest to the floor — 4.68:1 measured,
  // against a treatment axe never evaluates at all (a disabled element is
  // skipped wholesale by `color-contrast`, which is how a 3.08:1 disabled
  // hex input once shipped). The pairing itself (`bg-muted
  // text-muted-foreground`) is pinned verbatim in Button.test.ts; this is the
  // other half, the ratio between the two tokens.
  it("labels the disabled treatment at the 4.5:1 floor, the pair no gate ever visits", async () => {
    const tokens = await readTokens();
    expect(
      contrastRatio(colorOf(tokens, "muted-foreground"), colorOf(tokens, "muted")),
    ).toBeGreaterThanOrEqual(TEXT_FLOOR);
  });
});
