// The pattern pages publish each pattern's canonical record: the interface
// intent the pattern standardises, and the evidence tier it carries.
//
// The two facts are sourced the opposite ways, and the split is the point.
// The intent is a judgement — nothing in the tree derives it — so it is
// authored once, in the page's own frontmatter, and this plugin renders it
// into the page; prose in the body would be a second copy of the one claim
// the intake rule is held to. The evidence tier is the opposite case: it
// already exists as data, in the component's `a11y.json`, the same claim
// tools/check-a11y-evidence.ts enforces — and quoting it by hand would be the
// second-copy drift the `@api` and `@wcag-tags` markers exist to prevent,
// worse here because the published copy and the enforced copy would disagree
// silently. So the evidence table is expanded from the sidecar at build
// time, the tier list from the contract that defines the tiers, and the page
// carries no literal of its own.
//
// Usage, in a pattern's docs page:
//
//     ---
//     intent: "The region's arrangement, stated to survive any subject swap."
//     ---
//
//     ## Canonical record
//
//     <!-- @pattern-record PatternName -->
//
// Every failure is a build error naming the page, never a silently empty
// section — a record that only looks rendered is worse than a build that
// refuses to publish one.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { indexComponents } from "./component-api";

const CONTRACT = fileURLToPath(
  new URL("../../../packages/core/src/a11y-contract.ts", import.meta.url),
);

const MARKER = /^[ \t]*<!--[ \t]*@pattern-record[ \t]+([A-Za-z][A-Za-z0-9]*)[ \t]*-->[ \t]*$/gm;

/** The tier list, read the way the gate parses it: a flat string array, valid JSON. */
const TIERS_DECLARATION = /export const A11Y_EVIDENCE_TIERS = (?<literal>\[[^\]]*\]) as const;/;

/** One `a11y.json` evidence entry: a bare path, or a path with its scope qualification. */
interface EvidenceEntry {
  path: string;
  because?: string;
}

interface ParsedSidecar {
  evidence: Partial<Record<string, EvidenceEntry[]>>;
  exceptions: { requirement: string }[];
}

/**
 * The page's frontmatter `intent`, the record's one authored claim.
 *
 * The parser is deliberately narrower than YAML: a single-line scalar,
 * optionally quoted, with the refusals the unquoted form needs — see the
 * comment at the check. A multi-line intent would render as a run-on
 * paragraph, and this repo's docs plugins fail toward the throw, never
 * toward publishing a mangled claim.
 */
export function readIntent(markdown: string, id: string): string {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown);
  if (!frontmatter) {
    throw new Error(
      `${id}: carries a @pattern-record marker but no frontmatter block. The record's intent ` +
        `is authored as frontmatter:\n\n---\nintent: "…"\n---`,
    );
  }
  const block = frontmatter[1] ?? "";
  const matches = [...block.matchAll(/^intent:[ \t]*(.*)$/gm)];
  if (matches.length === 0) {
    throw new Error(`${id}: frontmatter carries no \`intent:\` — the record's authored claim.`);
  }
  if (matches.length > 1) {
    throw new Error(
      `${id}: frontmatter carries ${String(matches.length)} \`intent:\` keys. The record is one claim.`,
    );
  }
  let value = (matches[0]?.[1] ?? "").trim();
  const quoted = /^(["'])([\s\S]*)\1$/.exec(value);
  // The refusals below are about the UNQUOTED form only: quoting is what
  // makes a value YAML, so a quoted intent may carry any character a sentence
  // needs — colons included — while in an unquoted scalar a leading `|` or
  // `>` declares a block this renderer will not interpret, and a colon
  // followed by whitespace is the sequence that makes the site's frontmatter
  // parse fail later with an error that no longer names the intent.
  const isQuoted = quoted !== null;
  if (quoted) value = (quoted[2] ?? "").trim();
  if (!isQuoted && (/^[|>&*[{]/.test(value) || /:(?:\s|$)/.test(value))) {
    throw new Error(
      `${id}: the intent is a block scalar, a flow collection, or an unquoted value carrying ` +
        `a colon — none of which this renderer will guess at. Write one single-line (optionally ` +
        `quoted) sentence naming the arrangement.`,
    );
  }
  if (value.length === 0) {
    throw new Error(`${id}: the intent is empty — the intent is the record's authored claim.`);
  }
  return value;
}

/** The contract's tier list, parsed from its own file — the reader the gate shares. */
export function readTiers(source: string): string[] {
  const match = TIERS_DECLARATION.exec(source);
  if (match?.groups?.literal === undefined) {
    throw new Error(
      `${CONTRACT}: no "export const A11Y_EVIDENCE_TIERS = [...] as const" declaration found. ` +
        `The record's evidence table renders one row per tier the contract names, so it cannot ` +
        `be built from a file that no longer declares them.`,
    );
  }
  let declared: unknown;
  try {
    declared = JSON.parse(match.groups.literal);
  } catch {
    throw new Error(
      `${CONTRACT}: the A11Y_EVIDENCE_TIERS literal is no longer valid JSON, so the record's ` +
        `evidence table cannot be rendered. Keep the array plain JSON values.`,
    );
  }
  if (!Array.isArray(declared) || declared.length === 0) {
    throw new Error(
      `${CONTRACT}: A11Y_EVIDENCE_TIERS must be a non-empty array of strings for the record's ` +
        `evidence table to render.`,
    );
  }
  const tiers: string[] = declared.map((tier) => {
    if (typeof tier !== "string") {
      throw new Error(
        `${CONTRACT}: A11Y_EVIDENCE_TIERS must be a non-empty array of strings for the record's ` +
          `evidence table to render.`,
      );
    }
    return tier;
  });
  return tiers;
}

/** A table cell: pipes would end the cell, newlines would end the row. */
function cell(text: string): string {
  return text
    .replace(/\s*\n\s*/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}

function evidenceTable(sidecar: ParsedSidecar, tiers: string[]): string {
  const rows = tiers.map((tier) => {
    const entries = sidecar.evidence[tier] ?? [];
    const rendered = entries.map((entry) => {
      const path = `\`${cell(entry.path)}\``;
      return entry.because === undefined ? path : `${path} — _${cell(entry.because)}_`;
    });
    return `| \`${tier}\` | ${rendered.length > 0 ? rendered.join(", ") : "—"} |`;
  });
  return ["| Tier | Evidence |", "| --- | --- |", ...rows, ""].join("\n");
}

function parseSidecar(sidecarPath: string, sidecarSource: string): ParsedSidecar {
  let parsed: unknown;
  try {
    parsed = JSON.parse(sidecarSource);
  } catch (error) {
    throw new Error(`${sidecarPath}: does not parse as JSON`, { cause: error });
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${sidecarPath}: must be a JSON object`);
  }
  const record = parsed as Record<string, unknown>;
  const rawEvidence = record.evidence;
  if (
    rawEvidence !== undefined &&
    (typeof rawEvidence !== "object" || Array.isArray(rawEvidence))
  ) {
    throw new Error(`${sidecarPath}: evidence must be an object keyed by tier`);
  }
  // A tier's entries are a bare path each, or `{ path, because }` — the two
  // shapes the a11y-evidence gate accepts. Normalised here, not cast, so a
  // sidecar editing one shape to the other cannot turn the record's cells
  // into `undefined` rendered as prose.
  const evidence: ParsedSidecar["evidence"] = {};
  for (const [tier, entries] of Object.entries(rawEvidence ?? {})) {
    if (!Array.isArray(entries)) {
      throw new Error(`${sidecarPath}: evidence.${tier} must be an array`);
    }
    evidence[tier] = entries.map((entry) => {
      if (typeof entry === "string") return { path: entry };
      if (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).path === "string"
      ) {
        const shaped = entry as Record<string, unknown>;
        const because = shaped.because;
        return {
          path: shaped.path as string,
          ...(typeof because === "string" && because.trim().length > 0 ? { because } : {}),
        };
      }
      throw new Error(
        `${sidecarPath}: evidence.${tier} carries an entry that is neither a path nor { path, because }`,
      );
    });
  }
  const rawExceptions = record.exceptions;
  if (rawExceptions !== undefined && !Array.isArray(rawExceptions)) {
    throw new Error(`${sidecarPath}: exceptions must be an array`);
  }
  const exceptions = (rawExceptions ?? []).map((entry, index) => {
    const requirement =
      typeof entry === "object" && entry !== null
        ? (entry as Record<string, unknown>).requirement
        : undefined;
    if (typeof requirement !== "string" || requirement.length === 0) {
      throw new Error(
        `${sidecarPath}: exceptions[${String(index)}] carries no requirement — the gate names ` +
          `the same defect, and the page refuses to render a count it cannot name.`,
      );
    }
    return { requirement };
  });
  return { evidence, exceptions };
}

/**
 * Replace the page's `@pattern-record` marker with the record rendered from
 * the intent and the sidecar, or return `null` when the page carries no
 * marker. Split from the plugin hook so the tests can hold the expansion to
 * its own contract against synthetic inputs instead of only the tree's
 * current files.
 */
export function expandPatternRecord({
  markdown,
  id,
  tiers,
  sidecarPath,
  sidecarSource,
}: {
  markdown: string;
  id: string;
  tiers: string[];
  sidecarPath: string;
  sidecarSource: string;
}): string | null {
  // match, not test: a global pattern's lastIndex advances across both calls,
  // and the count is what the duplicate-marker decision below needs anyway.
  const markerCount = markdown.match(MARKER)?.length ?? 0;
  if (markerCount === 0) return null;
  if (markerCount > 1) {
    throw new Error(
      `${id}: carries ${String(markerCount)} @pattern-record markers. The record is one claim ` +
        `about one pattern; render it once.`,
    );
  }

  const intent = readIntent(markdown, id);
  const sidecar = parseSidecar(sidecarPath, sidecarSource);

  const unknownTier = Object.keys(sidecar.evidence).find((tier) => !tiers.includes(tier));
  if (unknownTier !== undefined) {
    throw new Error(
      `${id}: ${sidecarPath} declares evidence under "${unknownTier}" — no such tier in the ` +
        `contract (${tiers.join(", ")}). The gate names this first; the page refuses to render it.`,
    );
  }

  const exceptionLine =
    sidecar.exceptions.length > 0
      ? `The accessibility claim carries ${String(sidecar.exceptions.length)} named ` +
        `exception${sidecar.exceptions.length === 1 ? "" : "s"} ` +
        `(${sidecar.exceptions.map((e) => `\`${cell(e.requirement)}\``).join(", ")}) — the ` +
        `shrinking gap the a11y-evidence gate counts; see \`${sidecarPath}\`.`
      : "";

  const record =
    `**Intent.** ${intent}\n\n` +
    `**Evidence.**\n\n` +
    evidenceTable(sidecar, tiers) +
    (exceptionLine.length > 0 ? `${exceptionLine}\n` : "");

  return markdown.replace(MARKER, () => record);
}

/**
 * Expands `<!-- @pattern-record Name -->` markers in markdown pages before
 * VitePress renders them. `enforce: "pre"` is what puts this ahead of
 * VitePress's own markdown transform — after it, the page is already HTML and
 * the marker is an inert comment.
 */
export function patternRecord() {
  let index: Promise<Map<string, string>> | undefined;
  let tiers: Promise<string[]> | undefined;

  return {
    name: "loom:pattern-record",
    enforce: "pre" as const,
    buildStart() {
      // Rebuilt per run, so a pattern added while the dev server is up is
      // found rather than reported missing until someone restarts it.
      index = undefined;
      tiers = undefined;
    },
    async transform(this: { addWatchFile?: (id: string) => void }, markdown: string, id: string) {
      if (!id.endsWith(".md")) return null;
      MARKER.lastIndex = 0;
      // Checked here so a page without the marker costs no file read; the
      // expansion re-tests it because it owns the marker-to-record decision.
      if (!MARKER.test(markdown)) return null;

      index ??= indexComponents();
      tiers ??= readFile(CONTRACT, "utf8").then(readTiers);
      this.addWatchFile?.(CONTRACT);

      const components = await index;
      const tierList = await tiers;

      MARKER.lastIndex = 0;
      const name = MARKER.exec(markdown)?.[1];
      if (name === undefined) return null;
      const componentFile = components.get(name);
      if (componentFile === undefined) {
        throw new Error(
          `${id}: <!-- @pattern-record ${name} --> names a component that does not exist under ` +
            `packages/. Known: ${[...components.keys()].sort().join(", ")}`,
        );
      }
      // The sidecar sits at the component's package root: the one place the
      // a11y-evidence gate reads it, and the path the record cites.
      const sidecarPath = componentFile.replace(/\/src\/[^/]+\.vue$/, "/a11y.json");
      this.addWatchFile?.(sidecarPath);
      const sidecarSource = await readFile(sidecarPath, "utf8");

      return expandPatternRecord({ markdown, id, tiers: tierList, sidecarPath, sidecarSource });
    },
  };
}
