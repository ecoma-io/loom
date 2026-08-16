// The foundations pages must not hand-copy token values out of `theme.css` —
// a hand-written table is a second copy that drifts silently, exactly the
// failure `component-api.ts` was written to prevent for props tables. So a
// token table is generated the same way: at build time, from the single
// `@theme static { … }` block that is the actual source of truth.
//
// Usage, in any markdown page:
//
//     <!-- @tokens color -->
//     <!-- @tokens radius -->
//
// The name is a token group — the segment before the first `-` in the custom
// property's own name (`--color-primary` groups as `color`, `--radius-md` as
// `radius`), read straight off `theme.css` rather than a list kept in sync by
// hand. A group that matches no token is a build error listing the groups
// that do exist, the same contract `<!-- @api Name -->` gives a missing
// component.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const THEME_CSS = fileURLToPath(
  new URL("../../../packages/theme-core/src/theme.css", import.meta.url),
);

const MARKER = /^[ \t]*<!--[ \t]*@tokens[ \t]+([A-Za-z][\w-]*)[ \t]*-->[ \t]*$/gm;

interface Token {
  /** The custom property's name, without the leading `--`. */
  name: string;
  value: string;
  /** The token's own trailing or leading comment in `theme.css`, if it has one. */
  description?: string;
}

/** A cell's text, escaped for the one place it is embedded: an HTML attribute. */
function escapeAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** A cell's text, escaped for HTML body content. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cell(text: string | undefined): string {
  return text ? escapeHtml(text) : "—";
}

/** Trims, and collapses a blank result to `undefined` rather than an empty string. */
function nonEmpty(text: string | undefined): string | undefined {
  const trimmed = text?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

function code(text: string): string {
  return `<code>${escapeHtml(text)}</code>`;
}

/**
 * Every `--name: value;` declaration inside `theme.css`'s one `@theme static
 * { … }` block, with the comment that documents it where one exists.
 *
 * The block is found by brace-depth counting rather than a single regex,
 * because it is the only reliable way to find its matching close brace — but
 * nothing inside a declaration's value ever contains a brace (`calc()`,
 * `hsl()`, `cubic-bezier()` and `linear-gradient()` all use parentheses), so
 * everything past that point is a plain line-oriented scan: comment lines
 * accumulate as a pending description, a blank line clears it, and a
 * declaration consumes it. A comment made of dashes ("---- Neutrals ----")
 * is a section banner over a whole group, not one token's description, so it
 * is recognised and dropped rather than misattributed to the first token
 * beneath it.
 */
function parseTokens(css: string): Token[] {
  const startMarker = "@theme static {";
  const start = css.indexOf(startMarker);
  if (start === -1) {
    throw new Error(`${THEME_CSS}: no "@theme static {" block found.`);
  }
  const openBrace = start + startMarker.length - 1;
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
    throw new Error(`${THEME_CSS}: "@theme static {" block is never closed.`);
  }

  const declaration = /^--([\w-]+):\s*([^;]+);(?:\s*\/\*\s*(.*?)\s*\*\/)?$/;
  const tokens: Token[] = [];
  let pending: string[] | undefined;
  let pendingIsBanner = false;
  let inComment = false;

  for (const raw of css.slice(openBrace + 1, end).split("\n")) {
    const line = raw.trim();

    if (line.length === 0) {
      pending = undefined;
      pendingIsBanner = false;
      inComment = false;
      continue;
    }

    if (inComment) {
      const text = line.replace(/\*\/\s*$/, "").replace(/^\*\s?/, "");
      if (/-{3,}/.test(text)) pendingIsBanner = true;
      pending?.push(text);
      if (line.includes("*/")) inComment = false;
      continue;
    }

    if (line.startsWith("/*")) {
      const closesHere = line.includes("*/");
      const text = line
        .replace(/^\/\*\s?/, "")
        .replace(/\*\/\s*$/, "")
        .trim();
      pendingIsBanner = /-{3,}/.test(text);
      pending = [text];
      inComment = !closesHere;
      continue;
    }

    const match = declaration.exec(line);
    if (!match) {
      // A property this parser does not recognise (there is none in the
      // current file) is skipped rather than guessed at.
      pending = undefined;
      pendingIsBanner = false;
      continue;
    }
    const [, name, value, trailing] = match;
    if (name === undefined || value === undefined) continue;
    const description =
      nonEmpty(trailing) ?? (pendingIsBanner ? undefined : nonEmpty(pending?.join(" ")));
    // `exactOptionalPropertyTypes` treats `description: undefined` as distinct
    // from omitting the property, so it is only assigned when it has a value.
    const token: Token = { name, value: value.trim() };
    if (description !== undefined) token.description = description;
    tokens.push(token);
    pending = undefined;
    pendingIsBanner = false;
  }

  return tokens;
}

/** `color-primary-foreground` groups as `color`. */
function groupOf(tokenName: string): string {
  const base = tokenName.includes("--") ? tokenName.slice(0, tokenName.indexOf("--")) : tokenName;
  const hyphen = base.indexOf("-");
  return hyphen === -1 ? base : base.slice(0, hyphen);
}

// `tabindex="0"` because a table on this site is a scroll container: VitePress
// styles `.vp-doc table` as `display: block; overflow-x: auto`, so a table
// wider than its column is content a keyboard user can see the left edge of
// and never reach the rest of — WCAG 2.1.1, which `axe` reports as
// `scrollable-region-focusable`. Whether a given table is "wide" is a property
// of the viewport rather than of the table: measured on the built site, 2 of
// 92 scroll at 1280px and 62 of 92 at 375px. There is no subset to fix.
//
// VitePress already writes this attribute onto every table it renders from
// markdown, which is why only this one function needs it. These tables are
// emitted as raw HTML and go into the page as an `html_block` — markdown-it
// passes that through verbatim and its `table_open` renderer never runs, so
// the framework's own fix cannot reach them. This is the single gap in a
// guarantee the framework otherwise keeps, not a second implementation of it.
function table(head: string[], rows: string[][]): string {
  const th = head.map((h) => `<th>${h}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("\n");
  return `<table tabindex="0">\n<thead><tr>${th}</tr></thead>\n<tbody>\n${body}\n</tbody>\n</table>`;
}

const SWATCH_STYLE =
  "display:inline-block;width:1.5rem;height:1.5rem;border-radius:9999px;" +
  "border:1px solid var(--color-border);vertical-align:middle;background:";

function renderColor(tokens: Token[]): string {
  const rows = tokens.map((t) => [
    `<span style="${SWATCH_STYLE}${escapeAttr(t.value)}"></span>`,
    code(`--${t.name}`),
    code(t.value),
    cell(t.description),
  ]);
  return table(["", "Token", "Value", "Description"], rows);
}

function renderPreview(tokens: Token[], style: (value: string) => string): string {
  const rows = tokens.map((t) => [
    `<span style="display:inline-block;width:2.5rem;height:2.5rem;background:var(--color-card);${style(escapeAttr(t.value))}"></span>`,
    code(`--${t.name}`),
    code(t.value),
    cell(t.description),
  ]);
  return table(["", "Token", "Value", "Description"], rows);
}

interface TextStep {
  step: string;
  size?: string;
  lineHeight?: string;
  weight?: string;
  tracking?: string;
  description?: string;
}

/** Folds `--text-display`, `--text-display--line-height`, … into one row per named step. */
function textSteps(tokens: Token[]): TextStep[] {
  const steps = new Map<string, TextStep>();
  for (const t of tokens) {
    const sep = t.name.indexOf("--");
    const base = sep === -1 ? t.name : t.name.slice(0, sep);
    const step = base.replace(/^text-/, "");
    const entry = steps.get(base) ?? { step };
    if (sep === -1) {
      entry.size = t.value;
      if (t.description !== undefined) entry.description = t.description;
    } else {
      const modifier = t.name.slice(sep + 2);
      if (modifier === "line-height") entry.lineHeight = t.value;
      else if (modifier === "font-weight") entry.weight = t.value;
      else if (modifier === "letter-spacing") entry.tracking = t.value;
    }
    steps.set(base, entry);
  }
  return [...steps.values()];
}

function renderText(tokens: Token[]): string {
  const rows = textSteps(tokens).map((s) => {
    const previewStyle = [
      `font-size:${escapeAttr(s.size ?? "1rem")}`,
      s.lineHeight ? `line-height:${escapeAttr(s.lineHeight)}` : undefined,
      s.weight ? `font-weight:${escapeAttr(s.weight)}` : undefined,
      s.tracking ? `letter-spacing:${escapeAttr(s.tracking)}` : undefined,
    ]
      .filter(Boolean)
      .join(";");
    return [
      `<span style="${previewStyle}">Aa</span>`,
      code(`text-${s.step}`),
      s.size ? code(s.size) : "—",
      s.lineHeight ? code(s.lineHeight) : "—",
      s.weight ? code(s.weight) : "—",
      s.tracking ? code(s.tracking) : "—",
      cell(s.description),
    ];
  });
  return table(
    ["Preview", "Utility", "Size", "Line height", "Weight", "Tracking", "Description"],
    rows,
  );
}

function renderPlain(tokens: Token[]): string {
  const rows = tokens.map((t) => [code(`--${t.name}`), code(t.value), cell(t.description)]);
  return table(["Token", "Value", "Description"], rows);
}

function render(group: string, tokens: Token[]): string {
  switch (group) {
    case "color":
      return renderColor(tokens);
    case "radius":
      return renderPreview(
        tokens,
        (v) => `border:1px solid var(--color-border);border-radius:${v}`,
      );
    case "shadow":
      return renderPreview(tokens, (v) => `border-radius:var(--radius-md);box-shadow:${v}`);
    case "text":
      return renderText(tokens);
    default:
      return renderPlain(tokens);
  }
}

/**
 * Expands `<!-- @tokens group -->` markers in markdown pages before VitePress
 * renders them, reading `theme.css` fresh each run so the tables can never
 * disagree with the file they describe.
 */
export function designTokens() {
  return {
    name: "loom:design-tokens",
    enforce: "pre" as const,
    async transform(this: { addWatchFile?: (id: string) => void }, markdown: string, id: string) {
      if (!id.endsWith(".md")) return null;
      MARKER.lastIndex = 0;
      if (!MARKER.test(markdown)) return null;

      // Read fresh on every expansion rather than memoised across the run.
      // The obvious optimisation — parse once, reuse — is what makes a plugin
      // like this go stale: the cache would have to be invalidated when
      // `theme.css` changes, and the hook that would do it does not exist in
      // dev. Vite re-runs the Rollup build hooks only at server start, and
      // `watchChange` is not among the hooks it calls while serving, so an
      // edit to a token would re-run this transform and hand back the values
      // from before the edit. Only a handful of pages carry a marker at all —
      // the early return above skips every other page before touching the
      // disk — so the whole saving was one read of a small file, traded
      // against a table that can silently disagree with its source.
      this.addWatchFile?.(THEME_CSS);
      const tokens = parseTokens(await readFile(THEME_CSS, "utf8"));

      const byGroup = new Map<string, Token[]>();
      for (const token of tokens) {
        const group = groupOf(token.name);
        const list = byGroup.get(group) ?? [];
        list.push(token);
        byGroup.set(group, list);
      }
      const knownGroups = [...byGroup.keys()].sort();

      const replacements = new Map<string, string>();
      MARKER.lastIndex = 0;
      for (const match of markdown.matchAll(MARKER)) {
        const group = match[1];
        if (group === undefined || replacements.has(group)) continue;
        const groupTokens = byGroup.get(group);
        if (groupTokens === undefined) {
          throw new Error(
            `${id}: <!-- @tokens ${group} --> names a token group that does not exist in ` +
              `theme.css. Known: ${knownGroups.join(", ")}`,
          );
        }
        replacements.set(group, render(group, groupTokens));
      }

      return markdown.replace(
        MARKER,
        (fallback, group: string) => replacements.get(group) ?? fallback,
      );
    },
  };
}
