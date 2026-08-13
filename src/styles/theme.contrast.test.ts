import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

// `import.meta.dirname` (Node 24) rather than `import.meta.url`, because the
// file is rewritten by Vitest's transform — `new URL(…, import.meta.url)`
// gets a bare path as its base and dies with a scheme error.
const THEME_CSS = `${import.meta.dirname}/theme.css`;

// ---- Token parsing ----------------------------------------------------------

type TokenMap = Map<string, string>;

/**
 * Every `--name: value;` declaration inside a given block of CSS.
 * The regex is intentionally simple: it matches any `--custom-property: …;`
 * line, and `parseHsl` below validates the shape of the value.
 */
function extractDeclarations(block: string): TokenMap {
  const entries = [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)]
    .map((m): readonly [string, string] | null => {
      const name = m[1];
      const value = m[2];
      if (name === undefined || value === undefined) return null;
      return [name, value.trim()] as const;
    })
    .filter((e): e is readonly [string, string] => e !== null);
  return new Map(entries);
}

/**
 * Read the light tokens from the `@theme static { }` block. The regex is
 * lazy (`*?`) so it stops at the first closing `}` on its own line — the
 * `@theme static` block itself — rather than reaching past it into the
 * dark-theme overrides that follow.
 */
async function readLightTokens(): Promise<TokenMap> {
  const css = await readFile(THEME_CSS, "utf8");
  const block = /@theme static \{([\s\S]*?)\n\}/.exec(css)?.[1];
  if (block === undefined) throw new Error(`${THEME_CSS}: no "@theme static {" block found.`);
  return extractDeclarations(block);
}

/**
 * Read the dark tokens from the `:root[data-theme="dark"] { }` block.
 * Uses brace-depth counting to find the matching close brace, because the
 * block may contain nested comments or multi-line values that a simple
 * regex cannot handle.
 *
 * The marker `:root[data-theme="dark"] {` (with the opening brace) is used
 * rather than just the selector string, because the file's header comment
 * also mentions `:root[data-theme="dark"]` in prose — and a bare `indexOf`
 * would find that first and then latch onto the wrong opening brace.
 */
async function readDarkTokens(): Promise<TokenMap> {
  const css = await readFile(THEME_CSS, "utf8");
  const marker = ':root[data-theme="dark"] {';
  const start = css.indexOf(marker);
  if (start === -1) throw new Error(`${THEME_CSS}: no dark theme block found.`);

  const openBrace = start + marker.length - 1;
  if (openBrace === -1) throw new Error(`${THEME_CSS}: dark theme block has no opening brace.`);

  let depth = 0;
  let end = -1;
  for (let i = openBrace; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error(`${THEME_CSS}: dark theme block is never closed.`);

  return extractDeclarations(css.slice(openBrace + 1, end));
}

// ---- Colour math ------------------------------------------------------------

interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/**
 * Parse `hsl(H S% L%)` and the `/ alpha` form. Returns null for values
 * that are not a single HSL colour (shadows, durations, etc.).
 */
function parseHsl(value: string): Rgb | null {
  const match =
    /^hsl\(\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*\)$/.exec(value) ??
    /^hsl\(\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*\/\s*(\d+(?:\.\d+)?)%\s*\)$/.exec(
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
 * Resolve a token name to an opaque HSL colour, or throw. A missing or
 * non-HSL token is a structural defect the test must not silently skip.
 */
function colorOf(tokens: TokenMap, name: string, theme: string): Rgb {
  const value = tokens.get(name);
  const color = value === undefined ? null : parseHsl(value);
  if (!color) throw new Error(`"${name}" is not an opaque hsl token in the ${theme} theme`);
  if (color.a !== 1) throw new Error(`"${name}" carries an alpha; its ratio depends on the page`);
  return color;
}

// ---- Contrast floors --------------------------------------------------------

/** WCAG 1.4.3 AA for normal text. */
const TEXT_FLOOR = 4.5;
/** WCAG 1.4.11 AA for graphical objects and UI components. */
const GRAPHICAL_FLOOR = 3;

// ---- Pairings to verify -----------------------------------------------------
// Each pairing names a foreground (text/graphical) token against a background
// token. The same pairs are checked for both themes.

interface Pairing {
  readonly fg: string;
  readonly bg: string;
  readonly floor: number;
  readonly label: string;
}

const TEXT_PAIRINGS: Pairing[] = [
  // Structural text-on-background
  { fg: "color-foreground", bg: "color-background", floor: TEXT_FLOOR, label: "body text" },
  { fg: "color-foreground", bg: "color-card", floor: TEXT_FLOOR, label: "card text" },
  { fg: "color-foreground", bg: "color-popover", floor: TEXT_FLOOR, label: "popover text" },
  {
    fg: "color-card-foreground",
    bg: "color-card",
    floor: TEXT_FLOOR,
    label: "card-foreground on card",
  },
  {
    fg: "color-popover-foreground",
    bg: "color-popover",
    floor: TEXT_FLOOR,
    label: "popover-foreground on popover",
  },
  {
    fg: "color-muted-foreground",
    bg: "color-background",
    floor: TEXT_FLOOR,
    label: "secondary text",
  },
  {
    fg: "color-muted-foreground",
    bg: "color-card",
    floor: TEXT_FLOOR,
    label: "secondary text on card",
  },
  {
    fg: "color-muted-foreground",
    bg: "color-muted",
    floor: TEXT_FLOOR,
    label: "secondary text on muted",
  },
  { fg: "color-subtle-foreground", bg: "color-subtle", floor: TEXT_FLOOR, label: "subtle text" },
  {
    fg: "color-secondary-foreground",
    bg: "color-secondary",
    floor: TEXT_FLOOR,
    label: "secondary text on secondary",
  },

  // Action colour labels
  {
    fg: "color-primary-foreground",
    bg: "color-primary",
    floor: TEXT_FLOOR,
    label: "primary button label",
  },
  {
    fg: "color-accent-foreground",
    bg: "color-accent",
    floor: TEXT_FLOOR,
    label: "accent button label",
  },

  // Functional colour labels
  {
    fg: "color-destructive-foreground",
    bg: "color-destructive",
    floor: TEXT_FLOOR,
    label: "destructive button label",
  },
  {
    fg: "color-success-foreground",
    bg: "color-success",
    floor: TEXT_FLOOR,
    label: "success label",
  },
  {
    fg: "color-warning-foreground",
    bg: "color-warning",
    floor: TEXT_FLOOR,
    label: "warning label",
  },
  { fg: "color-info-foreground", bg: "color-info", floor: TEXT_FLOOR, label: "info label" },

  // Text on muted surfaces (foreground token, which should always be readable)
  {
    fg: "color-foreground",
    bg: "color-primary-muted",
    floor: TEXT_FLOOR,
    label: "text on primary-muted",
  },
  {
    fg: "color-foreground",
    bg: "color-destructive-muted",
    floor: TEXT_FLOOR,
    label: "text on destructive-muted",
  },
  {
    fg: "color-foreground",
    bg: "color-success-muted",
    floor: TEXT_FLOOR,
    label: "text on success-muted",
  },
  {
    fg: "color-foreground",
    bg: "color-warning-muted",
    floor: TEXT_FLOOR,
    label: "text on warning-muted",
  },
  {
    fg: "color-foreground",
    bg: "color-info-muted",
    floor: TEXT_FLOOR,
    label: "text on info-muted",
  },
];

const GRAPHICAL_PAIRINGS: Pairing[] = [
  // Graphical-object tokens
  {
    fg: "color-muted-foreground-soft",
    bg: "color-background",
    floor: GRAPHICAL_FLOOR,
    label: "muted-soft on background",
  },
  {
    fg: "color-muted-foreground-soft",
    bg: "color-card",
    floor: GRAPHICAL_FLOOR,
    label: "muted-soft on card",
  },

  // Functional colours as graphical indicators on their surfaces
  {
    fg: "color-primary",
    bg: "color-background",
    floor: GRAPHICAL_FLOOR,
    label: "primary indicator",
  },
  { fg: "color-accent", bg: "color-background", floor: GRAPHICAL_FLOOR, label: "accent indicator" },
  {
    fg: "color-destructive",
    bg: "color-background",
    floor: GRAPHICAL_FLOOR,
    label: "destructive indicator",
  },
  {
    fg: "color-success",
    bg: "color-background",
    floor: GRAPHICAL_FLOOR,
    label: "success indicator",
  },
  {
    fg: "color-warning",
    bg: "color-background",
    floor: GRAPHICAL_FLOOR,
    label: "warning indicator",
  },
  { fg: "color-info", bg: "color-background", floor: GRAPHICAL_FLOOR, label: "info indicator" },

  // Focus ring
  { fg: "color-ring", bg: "color-background", floor: GRAPHICAL_FLOOR, label: "focus ring" },

  // Functional hues on their own muted surface (icons, indicators)
  {
    fg: "color-primary",
    bg: "color-primary-muted",
    floor: GRAPHICAL_FLOOR,
    label: "primary on primary-muted",
  },
  {
    fg: "color-accent",
    bg: "color-accent-muted",
    floor: GRAPHICAL_FLOOR,
    label: "accent on accent-muted",
  },
  {
    fg: "color-destructive",
    bg: "color-destructive-muted",
    floor: GRAPHICAL_FLOOR,
    label: "destructive on destructive-muted",
  },
  {
    fg: "color-success",
    bg: "color-success-muted",
    floor: GRAPHICAL_FLOOR,
    label: "success on success-muted",
  },
  {
    fg: "color-warning",
    bg: "color-warning-muted",
    floor: GRAPHICAL_FLOOR,
    label: "warning on warning-muted",
  },
  { fg: "color-info", bg: "color-info-muted", floor: GRAPHICAL_FLOOR, label: "info on info-muted" },
];

const ALL_PAIRINGS = [...TEXT_PAIRINGS, ...GRAPHICAL_PAIRINGS];

// ---- Tests ------------------------------------------------------------------

describe("Light theme contrast", () => {
  it("meets the contrast floor for every structural pairing", async () => {
    const tokens = await readLightTokens();
    for (const { fg, bg, floor, label } of ALL_PAIRINGS) {
      const fgColor = colorOf(tokens, fg, "light");
      const bgColor = colorOf(tokens, bg, "light");
      const cr = contrastRatio(fgColor, bgColor);
      expect(
        cr,
        `${label}: ${fg} on ${bg} = ${cr.toFixed(2)}:1 (needs ${String(floor)})`,
      ).toBeGreaterThanOrEqual(floor);
    }
  });
});

describe("Dark theme contrast", () => {
  it("meets the contrast floor for every structural pairing", async () => {
    const tokens = await readDarkTokens();
    for (const { fg, bg, floor, label } of ALL_PAIRINGS) {
      const fgColor = colorOf(tokens, fg, "dark");
      const bgColor = colorOf(tokens, bg, "dark");
      const cr = contrastRatio(fgColor, bgColor);
      expect(
        cr,
        `${label}: ${fg} on ${bg} = ${cr.toFixed(2)}:1 (needs ${String(floor)})`,
      ).toBeGreaterThanOrEqual(floor);
    }
  });
});

describe("Elevation hierarchy", () => {
  it("light: sunken < background < card <= popover (by lightness)", async () => {
    const tokens = await readLightTokens();
    // In light mode, higher elevation = higher lightness
    const sunkenL = luminance(colorOf(tokens, "color-sunken", "light"));
    const backgroundL = luminance(colorOf(tokens, "color-background", "light"));
    const cardL = luminance(colorOf(tokens, "color-card", "light"));
    const popoverL = luminance(colorOf(tokens, "color-popover", "light"));
    expect(sunkenL, "sunken < background").toBeLessThan(backgroundL);
    expect(backgroundL, "background < card").toBeLessThan(cardL);
    expect(cardL, "card <= popover").toBeLessThanOrEqual(popoverL);
  });

  it("dark: sunken < background < card < popover (by lightness)", async () => {
    const tokens = await readDarkTokens();
    // In dark mode, higher elevation = higher lightness (lighter background)
    const sunkenL = luminance(colorOf(tokens, "color-sunken", "dark"));
    const backgroundL = luminance(colorOf(tokens, "color-background", "dark"));
    const cardL = luminance(colorOf(tokens, "color-card", "dark"));
    const popoverL = luminance(colorOf(tokens, "color-popover", "dark"));
    expect(sunkenL, "sunken < background").toBeLessThan(backgroundL);
    expect(backgroundL, "background < card").toBeLessThan(cardL);
    expect(cardL, "card < popover").toBeLessThan(popoverL);
  });
});

describe("Text prominence hierarchy", () => {
  it("light: muted-foreground-soft < muted-foreground < foreground (by luminance)", async () => {
    const tokens = await readLightTokens();
    // In light mode, less prominent text = higher luminance (lighter on light)
    const softL = luminance(colorOf(tokens, "color-muted-foreground-soft", "light"));
    const mutedL = luminance(colorOf(tokens, "color-muted-foreground", "light"));
    const fgL = luminance(colorOf(tokens, "color-foreground", "light"));
    expect(softL, "soft > muted (lighter = less prominent)").toBeGreaterThan(mutedL);
    expect(mutedL, "muted > foreground (lighter = less prominent)").toBeGreaterThan(fgL);
  });

  it("dark: muted-foreground-soft < muted-foreground < foreground (by luminance)", async () => {
    const tokens = await readDarkTokens();
    // In dark mode, less prominent text = lower luminance (darker on dark)
    const softL = luminance(colorOf(tokens, "color-muted-foreground-soft", "dark"));
    const mutedL = luminance(colorOf(tokens, "color-muted-foreground", "dark"));
    const fgL = luminance(colorOf(tokens, "color-foreground", "dark"));
    expect(softL, "soft < muted (darker = less prominent)").toBeLessThan(mutedL);
    expect(mutedL, "muted < foreground (darker = less prominent)").toBeLessThan(fgL);
  });
});

describe("Border visibility hierarchy", () => {
  it("light: border < input < border-strong (by luminance)", async () => {
    const tokens = await readLightTokens();
    // In light mode, more visible border = lower luminance (darker on light)
    const borderL = luminance(colorOf(tokens, "color-border", "light"));
    const inputL = luminance(colorOf(tokens, "color-input", "light"));
    const strongL = luminance(colorOf(tokens, "color-border-strong", "light"));
    expect(borderL, "border > input (lighter = less visible)").toBeGreaterThan(inputL);
    expect(inputL, "input > strong (lighter = less visible)").toBeGreaterThan(strongL);
  });

  it("dark: border < input < border-strong (by luminance)", async () => {
    const tokens = await readDarkTokens();
    // In dark mode, more visible border = higher luminance (lighter on dark)
    const borderL = luminance(colorOf(tokens, "color-border", "dark"));
    const inputL = luminance(colorOf(tokens, "color-input", "dark"));
    const strongL = luminance(colorOf(tokens, "color-border-strong", "dark"));
    expect(borderL, "border < input (darker = less visible)").toBeLessThan(inputL);
    expect(inputL, "input < strong (darker = less visible)").toBeLessThan(strongL);
  });
});
