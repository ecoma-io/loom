// The token allowlist gate: every style-bearing value a component writes in
// the surface this scan reads — bracket arbitrary values, bare arbitrary
// properties, inline motion declarations and template colour literals — is
// token-anchored or a recorded exception. The named utility spellings are the
// gate's stated blind spot, not a hidden one: `duration-100`, `z-50`,
// `opacity-50` and a default-palette `bg-red-500` carry the same decisions and
// pass unjudged, because widening to them is a new enforcement surface whose
// in-tree migrations are their own change — until it lands, the interface
// contract's Theming row reads PARTIALLY_ENFORCED and says so.
//
// The law is `theme.css`'s own docblock — "everything a consumer can theme
// lives here and nowhere else: no colour, duration, easing, radius or shadow
// is written literally in a component" — made enforceable by
// `packages/core/src/theme-contract.ts` (the allowed value shapes and the
// exception register) and held to components by this scan. Neither is
// restated here. The contract is PARSED, not imported: the tooling layer's
// boundary row forbids importing the library it checks, and the parse is
// fail-closed — a law this tool cannot read exits non-zero naming the file,
// never an empty verdict. So does the token source: a `@theme static` block
// that is missing or never closes stops the run, because a gate whose source
// of truth is unreadable must never read as one with nothing to say.
//
// SCOPE. The scan reads every `*.vue` under `packages/{primitives,composition,
// patterns,layouts}/**/src/` plus `templates/**` — the library surface and the
// consumer-shaped one. `docs/` is out of scope on purpose (demos are demo-stage
// scaffolding and the markdown fences teach the token system with raw values
// by design), as are `packages/core`, `packages/labels` (no styled .vue) and
// theme-core itself (the source the law lives in). Within a file the scan is a
// literal read:
//
//   - arbitrary Tailwind values whose utility is style-bearing — the colour
//     families (including the directional borders and dividers), radius,
//     elevation, the filter weights (the whole family, each with its backdrop
//     twin), motion, transforms,
//     box dimension, spacing (axis pairs and child-flow margins included),
//     inset positioning, stacking, translucency and typographic rhythm — are
//     judged against the contract's value shapes. A value that references a
//     token (`var(--…`, `--alpha(var(…))`) or is entirely a declared keyword
//     or `env(…)` composition passes; anything carrying a bare quantity
//     (`4.5rem`, `min(90vw,20rem)`, `1.15`, `200ms`) fails. A `type:`-hinted
//     value (`bg-[length:200%_100%]`) is judged only where the named property
//     has a token home — colour and image hints, and a length on `text` (the
//     type scale); `length` on `bg` is background-size, which no token
//     namespace answers. `transition-[property,list]` and the layout-structural
//     brackets (`grid-cols-[…]`, `grow-[…]`, `aspect-[…]`) name structure, not a
//     themable value, and are out of scope by the same statement.
//   - a class string is judged wherever the literal sits — a template
//     attribute, a cva table, a `cn()` map — because that vocabulary is
//     shape-recognizable text. The bare arbitrary-property form
//     (`[transition:transform_120ms]`) is judged when the property is one the
//     theme owns; placement and technique (`[grid-area:1/1]`,
//     `[clip-path:inset(50%)]`, `[font-variant-numeric:tabular-nums]`) is
//     structural CSS, not a themable decision, and is out of scope. A
//     custom-property assignment (`[--name:value]`, even behind a variant) is
//     parameter plumbing between a component's own rules; the `var()` that
//     reads the parameter is what the gate judges. A property defined locally
//     with a literal and read back through `var()` can launder that literal
//     past this scan; it is the same review-held class as the computed values
//     below.
//   - inline duration and delay declarations (`transition…:`/`animation…:`,
//     in a style attribute, a `:style` binding or a script-side style object)
//     fail on a bare time literal. A bare ZERO is allowed — `0ms` is the
//     absence of the decision, and the vocabulary carries no zero token to
//     reach for.
//   - colour literals — hex, the CSS colour functions (`rgb(`, `hsl(`,
//     `oklch(`, `oklab(`, `color(`, `color-mix(`) and the CSS named colours —
//     fail in template positions, where the property context is unambiguous.
//
// ONE RESIDUAL LIMIT INSIDE THAT SURFACE, stated rather than papered over:
// the dynamic half of script-side styling stays review-held. A value the script COMPUTES
// (concatenation, a template literal, a variable) is invisible to a scan of
// string literals — a token containing `${` is skipped for exactly that
// reason — and a colour literal in script is indistinguishable from domain
// data (a colour picker's fallback value is picked data, not styling). The
// semgrep leak rules accept the same scoping (`interface-contract.md` records
// it): a parse-only reader judges what a literal read can see, and never
// pretends to have executed the module it reads. A `<style>` block, the one
// shape that is always a violation, fails outright.
//
// What a failure owes, in the failure style of the other gates: the
// `file:line`, the value, and the remedy — a token reference or a recorded
// exception. Success is one green line whose counts are the numbers of
// record; an exception the tree no longer produces is itself a failure, so
// the register can only shrink deliberately.
//
// Run: `node --experimental-strip-types tools/check-token-allowlist.ts`
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { TIERS } from "./architecture/graph.ts";

/** The law, parsed out of the contract module's source text. */
export interface ParsedThemeContract {
  /** A `var(…)` reference — the token vocabulary itself — passes. */
  allowsTokenReference: boolean;
  /** A `--alpha(…)` composition of a token passes. */
  allowsAlpha: boolean;
  /** Bare platform keywords the contract declares. */
  keywords: string[];
  /** Host-supplied `env(…)` geometry passes as an atom. */
  allowsEnv: boolean;
  exceptions: { path: string; value: string; because: string }[];
}

/** One style-bearing value this scan flagged, at its own line. */
export interface Finding {
  line: number;
  value: string;
}

/** One file's verdict: the findings plus how many values were judged. */
export interface FileScan {
  findings: Finding[];
  judged: number;
}

/** The scan's counts of record — the numbers the green line quotes. */
export interface ScanStats {
  files: number;
  judged: number;
  /** Token names the `@theme static` source declares. */
  tokens: number;
  /** Exceptions that matched a finding — the register's live entries. */
  exceptionsUsed: number;
  /** Files carrying at least one live exception. */
  exceptionFiles: number;
}

export interface ScanResult {
  stats: ScanStats;
  failures: string[];
}

// ---- The contract, parsed ----------------------------------------------------

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** The `[ ... ]` block of one exported const, tracked by bracket depth. */
function constArray(source: string, name: string): string {
  const start = source.indexOf(`export const ${name} = [`);
  if (start === -1) {
    throw new Error(`the contract exports no \`const ${name}\` array`);
  }
  const open = source.indexOf("[", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const char = source[i];
    if (char === "[") depth++;
    else if (char === "]") {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  throw new Error(`the contract's \`const ${name}\` array never closes`);
}

/** Each flat `{ ... }` record inside one array block, in order. */
function records(block: string): string[] {
  const found: string[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < block.length; i++) {
    const char = block[i];
    if (char === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        found.push(block.slice(start + 1, i));
        start = -1;
      }
    }
  }
  return found;
}

/** One record's string fields: `path: "x"` shapes. */
function stringFields(record: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const match of record.matchAll(/([\w$]+)\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
    const key = match[1];
    const value = match[2];
    if (key && value !== undefined) out.set(key, value);
  }
  return out;
}

function unreadable(why: string): never {
  throw new Error(why);
}

/**
 * Parse the contract into its working sets. Every structural fault is a thrown
 * Error naming the contract file, which the CLI turns into a non-zero exit: a
 * law the gate cannot read must stop the gate, not empty it.
 */
export function parseThemeContract(source: string): ParsedThemeContract {
  try {
    return parseContract(stripComments(source));
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    throw new Error(`packages/core/src/theme-contract.ts is unreadable as law: ${why}`, {
      cause: error,
    });
  }
}

function parseContract(text: string): ParsedThemeContract {
  const parsed: ParsedThemeContract = {
    allowsTokenReference: false,
    allowsAlpha: false,
    keywords: [],
    allowsEnv: false,
    exceptions: [],
  };
  for (const record of records(constArray(text, "TOKEN_VALUE_SHAPES"))) {
    const shape = stringFields(record).get("shape");
    if (shape === undefined) {
      unreadable(`a value-shape record carries no shape: ${record.slice(0, 60)}`);
    }
    const named = shape;
    // The gate interprets exactly three kinds of shape. Anything else in the
    // law is a shape it would silently allow without knowing how to judge —
    // extending the vocabulary is an edit to both files, never a string.
    if (named.startsWith("var(--")) parsed.allowsTokenReference = true;
    else if (named.startsWith("--alpha(")) parsed.allowsAlpha = true;
    else if (named.startsWith("env(")) parsed.allowsEnv = true;
    else if (/^[A-Za-z]+$/.test(named)) parsed.keywords.push(named);
    else {
      unreadable(
        `value shape "${named}" is one the gate cannot interpret — extend the contract and this gate together`,
      );
    }
  }
  if (parsed.keywords.length === 0) unreadable("TOKEN_VALUE_SHAPES names no bare keyword shape");

  for (const record of records(constArray(text, "TOKEN_EXCEPTIONS"))) {
    const fields = stringFields(record);
    const path = fields.get("path");
    const value = fields.get("value");
    const because = fields.get("because");
    if (
      path === undefined ||
      value === undefined ||
      because === undefined ||
      because.length === 0
    ) {
      unreadable(`an exception record is missing path, value or because: ${record.slice(0, 60)}`);
    }
    parsed.exceptions.push({ path, value, because });
  }
  const seen = new Set<string>();
  for (const exception of parsed.exceptions) {
    const key = `${exception.path}|${exception.value}`;
    if (seen.has(key)) {
      unreadable(`TOKEN_EXCEPTIONS registers ${exception.path} "${exception.value}" twice`);
    }
    seen.add(key);
  }

  return parsed;
}

/** The contract read from the repository this tool runs against. */
export function readThemeContract(root: string): ParsedThemeContract {
  return parseThemeContract(
    readFileSync(join(root, "packages", "core", "src", "theme-contract.ts"), "utf8"),
  );
}

/**
 * The token names, read out of the `@theme static` block — the same parse
 * `theme.contrast.test.ts` and the docs' `design-tokens.ts` plugin perform.
 * Fail-closed both ways: a block that is missing or never closes is a thrown
 * Error, because an unreadable source of truth must never read as an empty
 * vocabulary. The names are the gate's count of record, not its judge — a
 * `var()` reference is judged by shape, so a runtime-supplied property such as
 * `--reka-select-trigger-width` passes without being in the theme.
 */
export function readTokenNames(css: string): string[] {
  const marker = "@theme static {";
  const start = css.indexOf(marker);
  if (start === -1) {
    throw new Error(`packages/theme-core/src/theme.css carries no "${marker}" block`);
  }
  const openBrace = start + marker.length - 1;
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
  if (end === -1) {
    throw new Error(
      'packages/theme-core/src/theme.css: the "@theme static {" block is never closed',
    );
  }

  const names = [...css.slice(openBrace + 1, end).matchAll(/--([\w-]+):/g)].map(
    (match) => match[1] ?? "",
  );
  if (names.length === 0) {
    throw new Error(
      'packages/theme-core/src/theme.css: the "@theme static {" block declares no tokens',
    );
  }
  return names;
}

// ---- The scan ----------------------------------------------------------------

/**
 * Remove comments while keeping every newline, so line numbers in the stripped
 * text are the file's own. Quote-aware — inside a string nothing is a comment,
 * inside a comment nothing opens a string — the same approximation
 * tools/check-architecture.ts makes for its reads. This is a parser for files
 * this repository owns, not a Vue front end.
 */
function stripCommentsKeepLines(text: string): string {
  const out: string[] = [];
  let i = 0;
  let blockComment = false;
  let htmlComment = false;
  let lineComment = false;
  let quote: string | null = null;
  while (i < text.length) {
    const ch = text[i] ?? "";
    if (blockComment || htmlComment || lineComment) {
      if (blockComment && ch === "*" && text[i + 1] === "/") {
        blockComment = false;
        i += 2;
        continue;
      }
      if (htmlComment && ch === "-" && text.startsWith("-->", i)) {
        htmlComment = false;
        i += 3;
        continue;
      }
      if (lineComment && ch === "\n") lineComment = false;
      if (ch === "\n") out.push(ch);
      i++;
      continue;
    }
    if (quote !== null) {
      out.push(ch);
      if (ch === "\\") {
        out.push(text[i + 1] ?? "");
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i++;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      blockComment = true;
      i += 2;
      continue;
    }
    if (ch === "<" && text.startsWith("<!--", i)) {
      htmlComment = true;
      i += 4;
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") {
      lineComment = true;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    out.push(ch);
    i++;
  }
  return out.join("");
}

/** Offset → 1-based line, over a precomputed table of line starts. */
function lineCounter(text: string): (offset: number) => number {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") starts.push(i + 1);
  }
  return (offset: number) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if ((starts[mid] ?? 0) <= offset) low = mid;
      else high = mid - 1;
    }
    return low + 1;
  };
}

/**
 * Style-bearing utility prefixes — the visual families the law names and the
 * theme namespaces carry. A bracket value on any other utility is layout
 * structure, not a themable decision, and is out of scope by the header's
 * statement.
 *
 * The filter functions are enumerated as a whole family, every weight with its
 * `backdrop-*` twin, because a member left out is not a blind spot but a
 * laundering path: `blur-[…]` judged while `backdrop-blur-[…]` passed unjudged
 * would move a decision to the spelling the gate does not read, and the same
 * holds between a weight and its sibling (`saturate` next to `brightness`).
 * `text-shadow` is here for the same reason `shadow` and `drop-shadow` are —
 * it paints, so its radius and colour are themable quantities.
 */
const STYLE_BEARING = new Set([
  // Colour.
  "bg",
  "text",
  "border",
  // The directional borders are the same width/colour decision split across
  // sides — `border-t-[3px]` must not launder what `border-[3px]` is judged
  // for. (`-s`/`-e` are the logical properties, `-x`/`-y` the axis pairs.)
  "border-t",
  "border-r",
  "border-b",
  "border-l",
  "border-s",
  "border-e",
  "border-x",
  "border-y",
  "ring",
  "fill",
  "stroke",
  "outline",
  "decoration",
  "divide",
  // The directional dividers are border widths between children, not colour.
  "divide-x",
  "divide-y",
  "accent",
  "caret",
  "from",
  "via",
  "to",
  // Shape and elevation.
  "rounded",
  "shadow",
  "drop-shadow",
  // Paints, so its blur radius and colour are themable quantities like the
  // box shadows' are.
  "text-shadow",
  "indent",
  // The filter weights, each with its backdrop twin — a blur radius is a
  // themable quantity, and the weights are steps on the same ladder.
  "blur",
  "backdrop-blur",
  "brightness",
  "backdrop-brightness",
  "contrast",
  "backdrop-contrast",
  "saturate",
  "backdrop-saturate",
  "hue-rotate",
  "backdrop-hue-rotate",
  "grayscale",
  "backdrop-grayscale",
  "invert",
  "backdrop-invert",
  "sepia",
  "backdrop-sepia",
  "backdrop-opacity",
  // Motion.
  "animate",
  "duration",
  "delay",
  "ease",
  // Transforms.
  "scale",
  "scale-x",
  "scale-y",
  "translate-x",
  "translate-y",
  "rotate",
  // Box dimension.
  "w",
  "h",
  "min-w",
  "max-w",
  "min-h",
  "max-h",
  "size",
  "basis",
  // Spacing — the axis pairs and the child-flow spacings carry the same
  // spacing decision their single-axis siblings do.
  "p",
  "px",
  "py",
  "ps",
  "pe",
  "pt",
  "pb",
  "pl",
  "pr",
  "m",
  "mx",
  "my",
  "ms",
  "me",
  "mt",
  "mb",
  "ml",
  "mr",
  "gap",
  "gap-x",
  "gap-y",
  "space-x",
  "space-y",
  // Inset positioning.
  "inset",
  "inset-x",
  "inset-y",
  "top",
  "right",
  "bottom",
  "left",
  "start",
  "end",
  // Stacking, translucency, typographic rhythm.
  "z",
  "opacity",
  "leading",
  "tracking",
]);

/**
 * Type-hinted arbitrary values (`bg-[length:200%_100%]`) name their real
 * property in the hint. `color` and `image` have a token home and are judged;
 * `length` only where the utility's own property is a tokened one (`text` is
 * the type scale); every other hint resolves to a property no token namespace
 * answers, and is out of scope.
 */
const JUDGED_TYPE_HINTS = new Set(["color", "image"]);

/**
 * The CSS property names a bare arbitrary property is judged on — the same
 * families the utility prefixes cover, spelled as properties, so
 * `[padding-left:13px]` cannot launder what `pl-[13px]` would be judged for.
 * What stays OUT is placement and technique, none of which the law claims:
 * `[grid-area:1/1]` is the overlay-cell trick, `[clip:rect(0,0,0,0)]` and
 * `[clip-path:inset(50%)]` are the visually-hidden recipe,
 * `[font-variant-numeric:tabular-nums]` asks the font for lining digits —
 * structure and features, not steps on a themable ladder.
 */
const BARE_JUDGED = new Set([
  // Colour.
  "background",
  "background-color",
  "background-image",
  "color",
  "border-color",
  "outline-color",
  "text-decoration-color",
  "fill",
  "stroke",
  "caret-color",
  "accent-color",
  // Shape and elevation — the shorthand forms too: `[border:1px_solid_red]`
  // writes colour, width and style in one property, and a shorthand that
  // stayed unjudged would be the cheapest way around the longhands below.
  "border",
  "outline",
  "border-radius",
  "box-shadow",
  "text-shadow",
  // Motion — the value-bearing longhands only; fill-mode and friends carry no
  // themable value.
  "transition",
  "transition-duration",
  "transition-delay",
  "transition-timing-function",
  "animation",
  "animation-duration",
  "animation-delay",
  "animation-timing-function",
  // Transforms.
  "transform",
  "scale",
  "translate",
  "rotate",
  // Box dimension.
  "width",
  "height",
  "min-width",
  "max-width",
  "min-height",
  "max-height",
  // Spacing and inset positioning.
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "gap",
  "inset",
  "top",
  "right",
  "bottom",
  "left",
  // Stacking and typographic rhythm.
  "opacity",
  "z-index",
  "font-size",
  "line-height",
  "letter-spacing",
]);

function hintedValueIsJudged(prefix: string, hint: string): boolean {
  if (JUDGED_TYPE_HINTS.has(hint)) return true;
  return hint === "length" && prefix === "text";
}

/**
 * One candidate utility, normalised: the variant chain (everything through the
 * last top-level colon — `data-[state=open]:` keeps its own colon out of the
 * split) and the punctuation a template expression leaves on it come off
 * first.
 */
function normalizeToken(raw: string): string {
  let depth = 0;
  let split = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "[") depth++;
    else if (ch === "]") depth = Math.max(0, depth - 1);
    else if (ch === ":" && depth === 0) split = i + 1;
  }
  return (
    raw
      .slice(split)
      // The leading strip never takes `[`: the arbitrary-value form IS a bracket
      // token, and eating its opener would turn `[transition:transform_120ms]`
      // into a token no rule below recognises — a silent pass. The backtick is
      // here and not only in the trailing strip because a static class in a
      // template-literal binding carries it in front — :class="`w-[999px]`" —
      // the same literal the script-side backtick string is stripped from, so
      // where the literal sits must not decide whether it is judged.
      .replace(/^["'`(,!]+/, "")
      // `!` marks an important on either side in Tailwind (`!w-[4px]`,
      // `w-[4px]!`); the importance flag is not a themable decision, so it
      // comes off rather than hiding the token from the bracket grammar.
      .replace(/["'`,;:.!]+$/, "")
  );
}

/**
 * Excise every whole `head(…)` call from `value` — balanced parens, so a
 * fallback's own parens are part of what goes (`var(--x, 1rem)` leaves
 * nothing behind, and a fallback cannot hide a rider outside the reference).
 * A call that never closes is left in place for the walk below to judge as
 * the fragments it is.
 */
function exciseCalls(value: string, head: string): string {
  let out = "";
  let i = 0;
  while (i < value.length) {
    const opensHere = value.startsWith(`${head}(`, i) && !/[\w$-]/.test(value[i - 1] ?? "");
    if (!opensHere) {
      out += value[i] ?? "";
      i++;
      continue;
    }
    let depth = 0;
    let j = i + head.length;
    for (; j < value.length; j++) {
      const ch = value[j];
      if (ch === "(") depth++;
      else if (ch === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (j >= value.length) {
      out += value[i] ?? "";
      i++;
      continue;
    }
    i = j + 1;
  }
  return out;
}

/**
 * A bare quantity — a number with an optional unit or percent — the atom a
 * themable value is made of when it is not a token.
 */
const QUANTITY = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:%|[a-zA-Z]+)?$/;

/**
 * One judged value: is it made of the shapes the contract allows?
 *
 * The reference shapes are excised whole, and what may remain beside them is
 * decided per shape, because the law gives them different company:
 *
 * - `env(…)` is an atom — host geometry handed over whole, carrying no
 *   neighbour: after excision only declared keywords may remain.
 * - a `var(…)`/`--alpha(…)` reference tolerates structure beside it — the
 *   composition heads and property words of the declarations it rides in —
 *   but never a free-standing quantity or a hex, which is the laundering
 *   shape (`4px var(--x)`, `#ff0000 var(--x)`): a decision riding beside the
 *   token instead of behind it. Quantities inside a composition's argument
 *   list are that composition's own arguments — the sheen's angle, the alpha
 *   weight — the compositions the law's shapes name.
 * - with no reference at all, only the declared keywords stand.
 */
export function isAllowedValue(value: string, law: ParsedThemeContract): boolean {
  const usesVar = law.allowsTokenReference && value.includes("var(--");
  const usesAlpha = law.allowsAlpha && value.includes("--alpha(");
  const usesEnv = law.allowsEnv && value.includes("env(");

  let rest = value;
  if (usesAlpha) rest = exciseCalls(rest, "--alpha");
  if (usesVar) rest = exciseCalls(rest, "var");
  if (usesEnv) rest = exciseCalls(rest, "env");

  const atoms = rest.split(/[\s,/()[\]{}]+/).filter((atom) => atom.length > 0);
  if (!usesVar && !usesAlpha && !usesEnv) {
    return atoms.every((atom) => law.keywords.includes(atom));
  }
  // A hex is a colour decision in any position, not only beside a reference.
  if (rest.includes("#")) return false;
  if (usesEnv) {
    return atoms.every((atom) => law.keywords.includes(atom));
  }
  let depth = 0;
  let i = 0;
  while (i < rest.length) {
    const ch = rest[i];
    if (ch === "(") {
      depth++;
      i++;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }
    if (/[\s,]/.test(ch ?? "")) {
      i++;
      continue;
    }
    let j = i;
    while (j < rest.length && !/[\s,()]/.test(rest[j] ?? "")) j++;
    const atom = rest.slice(i, j);
    if (depth === 0 && QUANTITY.test(atom)) return false;
    i = j;
  }
  return true;
}

/** A bare, non-zero time — the one literal an inline motion value may not carry. */
const TIME_LITERAL = /\d+(?:\.\d+)?(?:ms|s)(?![\w-])/;
const ZERO_TIME = /^(?:0(?:\.0+)?(?:ms|s)?)$/;

/**
 * An inline duration/delay declaration: `transition…:`/`animation…:` with its
 * value, matched wherever the declaration is written — a style attribute, a
 * `:style` binding, a script-side style object. The lookbehind keeps the
 * bare-property form (`[transition:transform_var(…)]`) out of this pass — it
 * is judged once, as a class token. The zero exemption lives here: `0ms` is
 * the absence of a decision, not a step on the vocabulary.
 */
const MOTION_DECLARATION =
  // The lookbehind's class leads with the hyphen on purpose: `[\w$-[]` would
  // parse `$` through `[` as a range (CodeQL js/overly-large-range), not as
  // the four separate characters the boundary means.
  /(?<![-\w$[])(?:transition|animation)[\w-]*\s*:\s*(?:"([^"\n]*)"|'([^'\n]*)'|([^;}"'`\n]+))/g;

/**
 * The CSS named colours — the closed set the platform itself defines (CSS
 * Color 4's named colours: the X11 inheritance plus `rebeccapurple`), not a
 * Tailwind palette. It is data, not regex text, because the set is closed by
 * the CSS spec and moves only when CSS moves; a Tailwind colour name would be
 * wrong here twice over, since a default-palette utility (`bg-red-500`) is a
 * different spelling of the decision, tracked as the gate's named-utility
 * blind spot rather than smuggled in through this list.
 */
const CSS_NAMED_COLOURS = [
  "aliceblue",
  "antiquewhite",
  "aqua",
  "aquamarine",
  "azure",
  "beige",
  "bisque",
  "black",
  "blanchedalmond",
  "blue",
  "blueviolet",
  "brown",
  "burlywood",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "cornsilk",
  "crimson",
  "cyan",
  "darkblue",
  "darkcyan",
  "darkgoldenrod",
  "darkgray",
  "darkgreen",
  "darkgrey",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darkred",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategray",
  "darkslategrey",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
  "dimgray",
  "dimgrey",
  "dodgerblue",
  "firebrick",
  "floralwhite",
  "forestgreen",
  "fuchsia",
  "gainsboro",
  "ghostwhite",
  "gold",
  "goldenrod",
  "gray",
  "green",
  "greenyellow",
  "grey",
  "honeydew",
  "hotpink",
  "indianred",
  "indigo",
  "ivory",
  "khaki",
  "lavender",
  "lavenderblush",
  "lawngreen",
  "lemonchiffon",
  "lightblue",
  "lightcoral",
  "lightcyan",
  "lightgoldenrodyellow",
  "lightgray",
  "lightgreen",
  "lightgrey",
  "lightpink",
  "lightsalmon",
  "lightseagreen",
  "lightskyblue",
  "lightslategray",
  "lightslategrey",
  "lightsteelblue",
  "lightyellow",
  "lime",
  "limegreen",
  "linen",
  "magenta",
  "maroon",
  "mediumaquamarine",
  "mediumblue",
  "mediumorchid",
  "mediumpurple",
  "mediumseagreen",
  "mediumslateblue",
  "mediumspringgreen",
  "mediumturquoise",
  "mediumvioletred",
  "midnightblue",
  "mintcream",
  "mistyrose",
  "moccasin",
  "navajowhite",
  "navy",
  "oldlace",
  "olive",
  "olivedrab",
  "orange",
  "orangered",
  "orchid",
  "palegoldenrod",
  "palegreen",
  "paleturquoise",
  "palevioletred",
  "papayawhip",
  "peachpuff",
  "peru",
  "pink",
  "plum",
  "powderblue",
  "purple",
  "rebeccapurple",
  "red",
  "rosybrown",
  "royalblue",
  "saddlebrown",
  "salmon",
  "sandybrown",
  "seagreen",
  "seashell",
  "sienna",
  "silver",
  "skyblue",
  "slateblue",
  "slategray",
  "slategrey",
  "snow",
  "springgreen",
  "steelblue",
  "tan",
  "teal",
  "thistle",
  "tomato",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "whitesmoke",
  "yellow",
  "yellowgreen",
];

/**
 * A colour written literally: hex, the CSS colour functions, or a bare CSS
 * colour name — in a template position. The name guards keep the match off
 * anything a colour word is glued into (`text-red-500` stays the named-
 * utility blind spot, not a colour literal; `whitesmoke` is one colour, not
 * `white` inside a word).
 *
 * Case-insensitive, the way the `<style` matcher below already is: CSS is not
 * case-sensitive — `HSL(…)` parses as the same declaration `hsl(…)` does — so
 * a literal is a literal in any casing, and the hex alternation has read
 * `#DEADBEEF` and `#deadbeef` alike from the start. A case-sensitive read
 * makes the escape a matter of reaching for the shift key.
 */
const COLOUR_LITERAL = new RegExp(
  "#[0-9a-fA-F]{3,8}\\b|\\brgba?\\(|\\bhsla?\\(|\\boklch\\(|\\boklab\\(|\\bcolor\\(|\\bcolor-mix\\(" +
    `|(?<![\\w-])(?:${CSS_NAMED_COLOURS.join("|")})(?![\\w-])`,
  "gi",
);

interface RawFinding {
  offset: number;
  value: string;
}

/**
 * Judge the class/utility tokens of one string — a template attribute's value
 * or a quoted class string from the script half. `base` is the string's
 * absolute offset in the file, so each finding lands on its own token's line.
 */
function judgeClassTokens(
  source: string,
  base: number,
  law: ParsedThemeContract,
): { findings: RawFinding[]; judged: number } {
  const findings: RawFinding[] = [];
  let judged = 0;
  for (const match of source.matchAll(/\S+/g)) {
    const offset = base + match.index;
    const token = normalizeToken(match[0]);
    if (!token.includes("[") || token.includes("${")) continue;

    // A bare arbitrary property: `[transition:transform_var(--duration-fast)]`.
    // Judged only when the property is one the theme owns (BARE_JUDGED) — a
    // structural property such as `[grid-area:1/1]` is not a themable
    // decision. A custom-property assignment (`[--name:value]`) matches
    // neither branch — parameter plumbing is not a style-bearing utility, and
    // the var() that reads the parameter is what gets judged.
    const bareProperty = /^\[([A-Za-z][\w-]*):(.*)\]$/.exec(token);
    if (bareProperty && !BARE_JUDGED.has(bareProperty[1] ?? "")) continue;
    if (bareProperty) {
      const value = (bareProperty[2] ?? "").replaceAll("_", " ");
      judged++;
      if (!isAllowedValue(value, law)) {
        findings.push({ offset, value: token });
      }
      continue;
    }

    const bracket = /^(-?)([a-zA-Z][\w-]*)-\[(.*)\]$/.exec(token);
    if (!bracket) continue;
    const prefix = bracket[2] ?? "";
    if (!STYLE_BEARING.has(prefix)) continue;

    // Tailwind encodes spaces as underscores inside brackets; the judgment
    // reads CSS, so put them back.
    let content = (bracket[3] ?? "").replaceAll("_", " ");
    const hint = /^([a-z-]+):(.*)$/.exec(content);
    if (hint) {
      const name = hint[1] ?? "";
      if (!hintedValueIsJudged(prefix, name)) continue;
      content = hint[2] ?? "";
    }
    judged++;
    if (!isAllowedValue(content, law)) {
      // The failure names the utility as written, not the normalised content —
      // the register and a remediation grep must name the same string.
      findings.push({ offset, value: token });
    }
  }
  return { findings, judged };
}

/** The `file:line` a finding at an offset into the stripped text reports. */
function at(lines: (offset: number) => number, finding: RawFinding): Finding {
  return { line: lines(finding.offset), value: finding.value };
}

/** One file's style-bearing violations, each on the line it is written on. */
export function scanVueFile(text: string, law: ParsedThemeContract): FileScan {
  // Case-insensitive on purpose: HTML is not, and `<STYLE>` is the same CSS
  // outside the token source that a lowercase block would be stopped for.
  if (/<style[\s>/]/i.test(text)) {
    // Reported at the block's own line: a style block is CSS outside the token
    // source, the law's most direct violation, and the scan stops there.
    const match = /<style[\s>/]/i.exec(text);
    const line = match ? lineCounter(text)(match.index) : 1;
    return { findings: [{ line, value: "<style> block" }], judged: 0 };
  }

  const stripped = stripCommentsKeepLines(text);
  const lines = lineCounter(stripped);
  const raw: RawFinding[] = [];
  let judged = 0;

  // The template region is the first top-level `<template>` block, tracked by
  // depth so nested `<template #slot>` elements stay inside it. Colour
  // literals are judged only there: in a script, a hex is as likely to be
  // domain data as styling (a colour picker's fallback is picked data), and
  // guessing is how a gate learns to cry wolf.
  let templateStart = -1;
  let templateEnd = -1;
  let depth = 0;
  for (const match of stripped.matchAll(/<\/?template[\s>]/g)) {
    if (match[0].startsWith("</")) {
      depth--;
      if (depth === 0 && templateStart !== -1) {
        templateEnd = match.index;
        break;
      }
    } else {
      depth++;
      if (templateStart === -1) templateStart = match.index;
    }
  }
  const inTemplate = (offset: number): boolean =>
    templateStart !== -1 && templateEnd !== -1 && offset > templateStart && offset < templateEnd;

  // Fail closed on the unclosed block: with no end the colour net would
  // silently judge nothing (every offset fails the inTemplate test), and a
  // gate that narrows itself without saying so is a gate pretending to have
  // read a file it stopped reading half way.
  if (templateStart !== -1 && templateEnd === -1) {
    throw new Error(
      "the top-level <template> block never closes — the scan cannot tell where the template ends, so it refuses to judge the file at all",
    );
  }

  // Class vocabulary, wherever the string literal sits — template attribute,
  // cva table, cn() map.
  const STRING_LITERAL = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  const literalSpans: [number, number][] = [];
  for (const match of stripped.matchAll(STRING_LITERAL)) {
    const content = match[1] ?? match[2] ?? match[3] ?? "";
    const result = judgeClassTokens(content, match.index, law);
    judged += result.judged;
    raw.push(...result.findings);
    literalSpans.push([match.index, match.index + match[0].length]);
  }

  // A quoted attribute value may span lines — valid HTML, valid Vue — and the
  // single-line alternatives above are blind to it, so a class attribute
  // broken across lines would read as no class attribute at all. Only values
  // carrying a newline run here, and the spans the literal pass already
  // judged are blanked first: a `:class="cn(…)"` expression carries its own
  // quoted strings, and judging them twice would double the count of record
  // and duplicate every finding they produce.
  const CLASS_ATTRIBUTE = /\bclass(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of stripped.matchAll(CLASS_ATTRIBUTE)) {
    const content = match[1] ?? match[2] ?? "";
    if (!content.includes("\n")) continue;
    const start = match.index + match[0].length - content.length - 1;
    const end = start + content.length;
    // Blank the already-judged spans in place, keeping every other character
    // and offset so the tokens that remain are the ones the literal pass
    // could not see.
    let masked = content;
    for (const [from, to] of literalSpans) {
      const lo = Math.max(from, start) - start;
      const hi = Math.min(to, end) - start;
      if (lo >= hi) continue;
      masked = masked.slice(0, lo) + " ".repeat(hi - lo) + masked.slice(hi);
    }
    const result = judgeClassTokens(masked, start, law);
    judged += result.judged;
    raw.push(...result.findings);
  }

  // Inline motion values.
  for (const match of stripped.matchAll(MOTION_DECLARATION)) {
    const quoted = match[1] ?? match[2];
    const value = (quoted ?? match[3] ?? "").trim();
    if (value.length === 0) continue;
    judged++;
    if (TIME_LITERAL.test(value) && !ZERO_TIME.test(value)) {
      raw.push({ offset: match.index, value });
    }
  }

  // Colour literals, template positions only.
  //
  // Hex and the colour-function spellings are unambiguous — they cannot be
  // anything but a colour. A bare colour name is English until proven CSS:
  // the class bindings in this very tree carry `//` comments inside the
  // attribute expression ("punches a grey hole through the fill"), and the
  // attribute-as-string shape is why the comment stripper cannot reach them.
  // So a name is judged only inside a style attribute, where it can only be
  // a value.
  const styleRanges: [number, number][] = [];
  for (const match of stripped.matchAll(/(?<![\w-]):?style\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const content = match[1] ?? match[2] ?? "";
    const start = match.index + match[0].length - content.length - 1;
    styleRanges.push([start, start + content.length]);
  }
  const inStyleAttribute = (offset: number): boolean =>
    styleRanges.some(([start, end]) => offset > start && offset < end);
  if (templateStart !== -1) {
    for (const match of stripped.matchAll(COLOUR_LITERAL)) {
      const offset = match.index;
      if (!inTemplate(offset)) continue;
      // `hsl(var(--…))` and `rgb(var(--…))` are token references wearing a
      // function; the literal is what wraps the reference, so they pass.
      if (stripped.slice(offset + match[0].length).startsWith("var(")) continue;
      // A bare colour name needs the value position; the function and hex
      // spellings do not.
      const bareName = !match[0].startsWith("#") && !match[0].endsWith("(");
      if (bareName && !inStyleAttribute(offset)) continue;
      judged++;
      raw.push({ offset, value: match[0] });
    }
  }

  return { findings: raw.map((finding) => at(lines, finding)), judged };
}

// ---- The driver --------------------------------------------------------------

/** Every in-scope `.vue`, as repository-relative paths, in stable order. */
export function collectVueFiles(root: string): string[] {
  const files: string[] = [];
  // `requireSrc` is the library/template split: a component's sources sit in
  // its `src/`, a template's own root IS its source root.
  const walk = (dir: string, rel: string, requireSrc: boolean): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const childRel = rel.length === 0 ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(join(dir, entry.name), childRel, requireSrc);
      } else if (entry.name.endsWith(".vue") && (childRel.includes("/src/") || !requireSrc)) {
        files.push(childRel);
      }
    }
  };
  for (const tier of TIERS) {
    const tierDir = join(root, "packages", tier);
    if (existsSync(tierDir)) walk(tierDir, `packages/${tier}`, true);
  }
  const templatesDir = join(root, "templates");
  if (existsSync(templatesDir)) walk(templatesDir, "templates", false);
  return files.sort();
}

const THEME_CSS = join("packages", "theme-core", "src", "theme.css");

export interface ScanOptions {
  /** Injected law — the tests mutate one exception at a time over the real tree. */
  contract?: ParsedThemeContract;
  /** Injected token source, for the same reason. */
  css?: string;
}

/** The failure line the gate prints for one bare literal. */
export function failureFor(path: string, finding: Finding): string {
  return (
    `token-allowlist: ${path}:${String(finding.line)} — "${finding.value}" is a bare literal where the law allows ` +
    "token shapes only (var(--…), --alpha(var(…)), a declared keyword, env(…)). Reference the token — or, " +
    "if the value genuinely stands, record it in TOKEN_EXCEPTIONS (packages/core/src/theme-contract.ts) " +
    "with the reason it stands."
  );
}

/** Scan the tree and reconcile the findings against the exception register. */
export function runScan(root: string, options: ScanOptions = {}): ScanResult {
  const law = options.contract ?? readThemeContract(root);
  const tokenNames = readTokenNames(options.css ?? readFileSync(join(root, THEME_CSS), "utf8"));

  const register = new Map<string, { path: string; value: string }>();
  for (const exception of law.exceptions) {
    register.set(`${exception.path}|${exception.value}`, exception);
  }
  const used = new Set<string>();
  const failures: string[] = [];
  let judged = 0;

  const files = collectVueFiles(root);
  if (files.length === 0) {
    // The vacuous green: a scope with nothing in it has judged nothing, and a
    // gate that prints a clean line over zero files is a gate whose counts of
    // record are all zero — read as success by anyone joining the line.
    failures.push(
      `token-allowlist: the scan scope is empty — no .vue file under packages/{${TIERS.join(",")}}/**/src/ or templates/. ` +
        "An empty scope is a verdict about a misdirected walk, not a clean tree; point the scan at the tree and run it again.",
    );
  }
  for (const rel of files) {
    let scan: FileScan;
    try {
      scan = scanVueFile(readFileSync(join(root, rel), "utf8"), law);
    } catch (error) {
      // The read and the scan both fail closed, and a verdict that cannot name
      // the file it refused to judge is not a verdict.
      const why = error instanceof Error ? error.message : String(error);
      throw new Error(`${rel}: ${why}`, { cause: error });
    }
    judged += scan.judged;
    for (const finding of scan.findings) {
      const key = `${rel}|${finding.value}`;
      if (register.has(key)) {
        used.add(key);
      } else {
        failures.push(failureFor(rel, finding));
      }
    }
  }

  // Dead law: an exception nothing in the tree produces any more. The register
  // is the shrinking end of the contract, and a dead entry is noise in the
  // record — or worse, proof the register and the scan name values differently.
  for (const exception of law.exceptions) {
    if (!used.has(`${exception.path}|${exception.value}`)) {
      failures.push(
        `token-allowlist: ${exception.path} — TOKEN_EXCEPTIONS carries "${exception.value}", but no scan position produces it. ` +
          "Correct the register: an exception for a value the tree has shed is noise in the record.",
      );
    }
  }

  const exceptionPaths = new Set(
    law.exceptions
      .filter((exception) => used.has(`${exception.path}|${exception.value}`))
      .map((exception) => exception.path),
  );

  return {
    stats: {
      files: files.length,
      judged,
      tokens: tokenNames.length,
      exceptionsUsed: used.size,
      exceptionFiles: exceptionPaths.size,
    },
    failures,
  };
}

// CLI entry — run against the real repository and exit non-zero on violations.
if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  try {
    const ROOT = join(import.meta.dirname, "..");
    const { stats, failures } = runScan(ROOT);
    if (failures.length) {
      for (const f of failures) console.error(f);
      console.error(
        `\n${String(failures.length)} style-bearing literal(s) outside the law. Fix before pushing.`,
      );
      process.exit(1);
    }
    console.log(
      `Token allowlist clean: ${String(stats.files)} .vue file(s) scanned, ` +
        `${String(stats.judged)} style-bearing value(s) judged, ` +
        `${String(stats.tokens)} token(s) in the source; ` +
        `${String(stats.exceptionsUsed)} recorded exception(s) across ${String(stats.exceptionFiles)} file(s) ` +
        `shrink as tokens land.`,
    );
  } catch (error) {
    // Fail-closed: an unreadable law or token source is a non-zero exit naming
    // the file, never an empty verdict.
    console.error(`token-allowlist: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
