// The layout pages publish each layout's four obligations: the regions it
// hosts, the responsive behaviour it declares, the accessibility duties its
// role and interaction class owe, and the composition model it offers.
//
// The four are sourced three different ways, and the split is the point.
// The regions are a tree fact — the component's own template declares its
// slots — so they are read from the same single-file parse the `@api` table
// renders, and a region added to a template appears here without a page
// edit. The responsive and accessibility obligations already exist as
// enforced data — the `responsive` and `interaction` claims of the
// component's `a11y.json`, the same claims tools/check-responsive-evidence.ts
// and tools/check-interaction-evidence.ts judge, with the duties the role and
// interaction matrices demand read out of `a11y-contract.ts` — and quoting
// them by hand would be the second-copy drift the `@pattern-record` marker
// exists to prevent, worse here because the published copy and the gates'
// copy would disagree silently. The composition model is the opposite case:
// it is a judgement — nothing in the tree derives what a layout accepts or
// why — so it is authored once, in the page's own frontmatter, and this
// plugin renders it into the page; prose in the body would be a second copy
// of the one claim the intake rule is held to.
//
// Usage, in a layout's docs page:
//
//     ---
//     composition: "One shell owning a rail, a header band and a filling content area."
//     ---
//
//     ## Obligations
//
//     <!-- @layout-obligations AppShell -->
//
// Every failure is a build error naming the page, never a silently empty
// section — an obligation that only looks rendered is worse than a build
// that refuses to publish one.
import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "vue-docgen-api";

import { indexComponents } from "./component-api";

// The rendered obligations cite each source by its repo-relative path —
// derived from the resolved constants, never written beside them, so a
// relocation edits one line and the citations follow.
const REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

function repoPath(file: string): string {
  return relative(REPO_ROOT, file);
}

const A11Y_CONTRACT = fileURLToPath(
  new URL("../../../packages/core/src/a11y-contract.ts", import.meta.url),
);
const RESPONSIVE_CONTRACT = fileURLToPath(
  new URL("../../../packages/core/src/responsive-contract.ts", import.meta.url),
);
// The component tier order, read as data: the composition model states where
// a layout sits, and the tiers' order is the graph's answer, not this file's.
const TIER_GRAPH = fileURLToPath(new URL("../../../tools/architecture/graph.ts", import.meta.url));

const MARKER = /^[ \t]*<!--[ \t]*@layout-obligations[ \t]+([A-Za-z][A-Za-z0-9]*)[ \t]*-->[ \t]*$/gm;

/** Flat string-array literals, read the way the gates parse them: valid JSON. */
function flatLiteral(source: string, name: string, file: string): string[] {
  const declaration = new RegExp(`export const ${name} = (?<literal>\\[[^\\]]*\\]) as const;`);
  const match = declaration.exec(source);
  if (match?.groups?.literal === undefined) {
    throw new Error(
      `${file}: no "export const ${name} = [...] as const" declaration found. The obligations ` +
        `render from that constant, so they cannot be built from a file that no longer declares it.`,
    );
  }
  let declared: unknown;
  try {
    // toParseable, not JSON.parse alone: prettier owns the contract files'
    // formatting, and a multi-line literal carries its trailing comma past
    // what JSON accepts.
    declared = JSON.parse(toParseable(match.groups.literal));
  } catch {
    throw new Error(
      `${file}: the ${name} literal is no longer valid JSON, so the obligations cannot be ` +
        `rendered. Keep the array plain JSON values.`,
    );
  }
  if (!Array.isArray(declared) || declared.length === 0) {
    throw new Error(
      `${file}: ${name} must be a non-empty array of strings for the obligations to render.`,
    );
  }
  return declared.map((entry) => {
    if (typeof entry !== "string") {
      throw new Error(
        `${file}: ${name} must be a non-empty array of strings for the obligations to render.`,
      );
    }
    return entry;
  });
}

/** One `a11y.json` evidence entry: a bare path, or a path with its scope qualification. */
interface EvidenceEntry {
  path: string;
  because?: string;
}

interface ParsedSidecar {
  role: string;
  basis: string;
  responsive: {
    behaviour: string[];
    basis: string;
    evidence: Partial<Record<string, EvidenceEntry[]>>;
  };
  evidence: Partial<Record<string, EvidenceEntry[]>>;
  interaction: {
    class: string;
    basis?: string;
    exceptions: { requirement: string; because?: string }[];
  };
}

/**
 * The sidecar shape the obligations read — wider than the pattern record's,
 * because two axes of the claim are rendered here, and every field the
 * render touches is validated rather than cast: a sidecar editing a field's
 * shape cannot turn the page's cells into `undefined` rendered as prose.
 */
export function parseSidecar(sidecarPath: string, sidecarSource: string): ParsedSidecar {
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
  const role = record.role;
  const basis = record.basis;
  if (typeof role !== "string" || role.length === 0) {
    throw new Error(
      `${sidecarPath}: must carry a non-empty "role" — the matrix row it is judged against`,
    );
  }
  if (typeof basis !== "string" || basis.length === 0) {
    throw new Error(`${sidecarPath}: must carry a non-empty "basis" — why the role is what it is`);
  }

  const rawResponsive = record.responsive;
  if (typeof rawResponsive !== "object" || rawResponsive === null || Array.isArray(rawResponsive)) {
    throw new Error(
      `${sidecarPath}: must carry a "responsive" claim — the viewport axis of the contract`,
    );
  }
  const responsiveRecord = rawResponsive as Record<string, unknown>;
  const rawBehaviour = responsiveRecord.behaviour;
  if (!Array.isArray(rawBehaviour) || rawBehaviour.length === 0) {
    throw new Error(
      `${sidecarPath}: responsive.behaviour must be a non-empty array — a layout with no ` +
        `viewport behaviour names it through the vocabulary, not through silence`,
    );
  }
  const behaviour: string[] = rawBehaviour.map((word) => {
    if (typeof word !== "string" || word.length === 0) {
      throw new Error(`${sidecarPath}: responsive.behaviour must be an array of vocabulary words`);
    }
    return word;
  });
  const responsiveBasis = responsiveRecord.basis;
  if (typeof responsiveBasis !== "string" || responsiveBasis.length === 0) {
    throw new Error(
      `${sidecarPath}: responsive.basis must say why the behaviours are what they are`,
    );
  }
  const responsiveEvidence = readEvidence(
    sidecarPath,
    "responsive.evidence",
    responsiveRecord.evidence,
  );

  const evidence = readEvidence(sidecarPath, "evidence", record.evidence);

  const rawInteraction = record.interaction;
  if (
    typeof rawInteraction !== "object" ||
    rawInteraction === null ||
    Array.isArray(rawInteraction)
  ) {
    throw new Error(
      `${sidecarPath}: must carry an "interaction" claim — the second axis of the contract`,
    );
  }
  const interactionRecord = rawInteraction as Record<string, unknown>;
  const interactionClass = interactionRecord.class;
  if (typeof interactionClass !== "string" || interactionClass.length === 0) {
    throw new Error(
      `${sidecarPath}: interaction.class must name a class from the closed vocabulary`,
    );
  }
  const rawExceptions = interactionRecord.exceptions;
  if (rawExceptions !== undefined && !Array.isArray(rawExceptions)) {
    throw new Error(`${sidecarPath}: interaction.exceptions must be an array`);
  }
  const exceptions = (rawExceptions ?? []).map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`${sidecarPath}: interaction.exceptions[${String(index)}] must be an object`);
    }
    const exception = entry as Record<string, unknown>;
    const requirement = exception.requirement;
    if (typeof requirement !== "string" || requirement.length === 0) {
      throw new Error(
        `${sidecarPath}: interaction.exceptions[${String(index)}] carries no requirement — the gate ` +
          `names the same defect, and the page refuses to render a duty it cannot name.`,
      );
    }
    const because = exception.because;
    return {
      requirement,
      ...(typeof because === "string" && because.trim().length > 0 ? { because } : {}),
    };
  });
  const interactionBasis = interactionRecord.basis;
  return {
    role,
    basis,
    responsive: { behaviour, basis: responsiveBasis, evidence: responsiveEvidence },
    evidence,
    interaction: {
      class: interactionClass,
      ...(typeof interactionBasis === "string" && interactionBasis.trim().length > 0
        ? { basis: interactionBasis }
        : {}),
      exceptions,
    },
  };
}

function readEvidence(sidecarPath: string, field: string, raw: unknown): ParsedSidecar["evidence"] {
  if (raw === undefined) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${sidecarPath}: ${field} must be an object keyed by tier`);
  }
  const evidence: ParsedSidecar["evidence"] = {};
  for (const [tier, entries] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(entries)) {
      throw new Error(`${sidecarPath}: ${field}.${tier} must be an array`);
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
        `${sidecarPath}: ${field}.${tier} carries an entry that is neither a path nor { path, because }`,
      );
    });
  }
  return evidence;
}

/**
 * The page's frontmatter `composition`, the record's one authored claim.
 *
 * The parser is deliberately narrower than YAML — the same narrow shape the
 * pattern record's intent is read with, refused the same ways — because a
 * multi-line claim would render as a run-on paragraph and a block scalar
 * would declare a syntax this renderer will not interpret.
 */
export function readComposition(markdown: string, id: string): string {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown);
  if (!frontmatter) {
    throw new Error(
      `${id}: carries a @layout-obligations marker but no frontmatter block. The composition ` +
        `model is authored as frontmatter:\n\n---\ncomposition: "…"\n---`,
    );
  }
  const block = frontmatter[1] ?? "";
  const matches = [...block.matchAll(/^composition:[ \t]*(.*)$/gm)];
  if (matches.length === 0) {
    throw new Error(
      `${id}: frontmatter carries no \`composition:\` — the obligations' one authored claim.`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `${id}: frontmatter carries ${String(matches.length)} \`composition:\` keys. The composition model is one claim.`,
    );
  }
  let value = (matches[0]?.[1] ?? "").trim();
  const quoted = /^(["'])([\s\S]*)\1$/.exec(value);
  // The refusals below are about the UNQUOTED form only: quoting is what
  // makes a value YAML, so a quoted claim may carry any character a sentence
  // needs — colons included — while in an unquoted scalar a leading `|` or
  // `>` declares a block this renderer will not interpret, and a colon
  // followed by whitespace is the sequence that makes the site's frontmatter
  // parse fail later with an error that no longer names the claim.
  const isQuoted = quoted !== null;
  if (quoted) value = (quoted[2] ?? "").trim();
  if (!isQuoted && (/^[|>&*[{]/.test(value) || /:(?:\s|$)/.test(value))) {
    throw new Error(
      `${id}: the composition model is a block scalar, a flow collection, or an unquoted value ` +
        `carrying a colon — none of which this renderer will guess at. Write one single-line ` +
        `(optionally quoted) sentence naming what the layout accepts.`,
    );
  }
  if (value.length === 0) {
    throw new Error(
      `${id}: the composition model is empty — it is the obligations' authored claim.`,
    );
  }
  return value;
}

/** The two matrices, as the class-or-role → duties rows the gates judge against. */
export interface MatrixRow {
  key: string;
  requirements: string[];
}

/**
 * A matrix literal from `a11y-contract.ts`, parsed the way
 * interaction-classes parses its literals: the declaration is nested (an
 * array of objects of arrays) and prettier owns the file's formatting, so
 * the extraction is a depth-counting scan over comment-stripped source
 * rather than a flat-array regex — a row wrapped across lines must still be
 * found, and a residual that only looks like the law must throw.
 */
export function readMatrix(source: string, name: string, key: string, file: string): MatrixRow[] {
  const haystack = stripComments(source);
  const declaration = `export const ${name} = `;
  const start = haystack.indexOf(declaration);
  if (start === -1) {
    throw new Error(
      `${file}: no "${declaration}[...] as const" declaration found. The obligations render the ` +
        `duties from that matrix, so they cannot be built from a file that no longer declares it.`,
    );
  }
  const open = haystack.indexOf("[", start);
  if (open === -1) {
    throw new Error(`${file}: the ${name} declaration carries no array literal.`);
  }
  let depth = 0;
  let quote: string | null = null;
  let literal: string | undefined;
  for (let i = open; i < haystack.length; i += 1) {
    const ch = haystack[i];
    if (ch === undefined) break;
    if (quote !== null) {
      // An escaped quote is data, not the end of the literal.
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "[") depth += 1;
    if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        literal = haystack.slice(open, i + 1);
        break;
      }
    }
  }
  if (literal === undefined) {
    throw new Error(
      `${file}: the ${name} array literal is never closed, so the obligations cannot render.`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(toParseable(literal));
  } catch {
    throw new Error(
      `${file}: the ${name} literal is no longer plain arrays of plain objects, so the obligations ` +
        `cannot be rendered from it.`,
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${file}: ${name} must be an array for the obligations to render.`);
  }
  return parsed.map((row) => {
    if (typeof row !== "object" || row === null) {
      throw new Error(
        `${file}: the ${name} entries no longer carry the fields the obligations render.`,
      );
    }
    const record = row as Record<string, unknown>;
    const keyValue = record[key];
    const requirements = record.requirements;
    if (typeof keyValue !== "string" || !Array.isArray(requirements)) {
      throw new Error(
        `${file}: the ${name} entries no longer carry "${key}" and "requirements", so the obligations ` +
          `cannot name a row's duties.`,
      );
    }
    return {
      key: keyValue,
      requirements: requirements.map((requirement) => {
        if (typeof requirement !== "string") {
          throw new Error(`${file}: the ${name} entries carry a non-string duty name.`);
        }
        return requirement;
      }),
    };
  });
}

/** One matrix row's duties, or a failure naming the key no row carries. */
export function dutiesFor(rows: MatrixRow[], key: string, name: string, file: string): string[] {
  const row = rows.find((candidate) => candidate.key === key);
  if (row === undefined) {
    throw new Error(
      `${file}: no ${name} row carries "${key}" — a claim judged against a row the matrix does not ` +
        `define cannot be rendered. The gate names this first; the page refuses to render it.`,
    );
  }
  return row.requirements;
}

/** A table cell, and prose quoted into one: pipes end cells, markup must stay markup. */
const MARKUP_ESCAPES: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  _: "\\_",
  "*": "\\*",
  "[": "\\[",
  "]": "\\]",
  "`": "\\`",
};

function cell(text: string): string {
  return text
    .replace(/\s*\n\s*/g, " ")
    .replace(/[<>&_*[\]`|]/g, (ch) => MARKUP_ESCAPES[ch] ?? `\\${ch}`)
    .trim();
}

function evidenceTable(
  sidecar: ParsedSidecar,
  field: "evidence" | "responsive",
  tiers: string[],
): string {
  const claim = field === "responsive" ? sidecar.responsive.evidence : sidecar.evidence;
  const rows = tiers.map((tier) => {
    const entries = claim[tier] ?? [];
    const rendered = entries.map((entry) => {
      const path = `\`${entry.path}\``;
      return entry.because === undefined ? path : `${path} — _${cell(entry.because)}_`;
    });
    return `| \`${tier}\` | ${rendered.length > 0 ? rendered.join(", ") : "—"} |`;
  });
  return ["| Tier | Evidence |", "| --- | --- |", ...rows, ""].join("\n");
}

export function regionsParagraph(slots: { name: string }[], componentFile: string): string {
  if (slots.length === 0) {
    throw new Error(
      `${componentFile}: exposes no slots, so the layout hosts no region for its page to name. ` +
        `A layout that accepts nothing is not a layout — resolve the defect in the component.`,
    );
  }
  const named = slots.filter((slot) => slot.name !== "default").map((slot) => `\`#${slot.name}\``);
  const list =
    named.length === 0 ? "the default region" : [...named, "and the default region"].join(", ");
  return `**Regions.** The layout hosts ${String(slots.length)} region${slots.length === 1 ? "" : "s"}, read from its own slots: ${list}.\n`;
}

/**
 * Replace the page's `@layout-obligations` marker with the four obligations
 * rendered from the tree, the sidecar and the contracts — or return `null`
 * when the page carries no marker. Split from the plugin hook so the tests
 * can hold the expansion to its own contract against synthetic inputs
 * instead of only the tree's current files.
 */
export async function expandLayoutObligations({
  markdown,
  id,
  componentFile,
  sidecarPath,
  sidecarSource,
  a11yContractSource,
  responsiveContractSource,
  tierGraphSource,
}: {
  markdown: string;
  id: string;
  componentFile: string;
  sidecarPath: string;
  sidecarSource: string;
  a11yContractSource: string;
  responsiveContractSource: string;
  tierGraphSource: string;
}): Promise<string | null> {
  // match, not test: a global pattern's lastIndex advances across both calls,
  // and the count is what the duplicate-marker decision below needs anyway.
  const markerCount = markdown.match(MARKER)?.length ?? 0;
  if (markerCount === 0) return null;
  if (markerCount > 1) {
    throw new Error(
      `${id}: carries ${String(markerCount)} @layout-obligations markers. The four obligations are ` +
        `one claim about one layout; render them once.`,
    );
  }

  const composition = readComposition(markdown, id);
  const sidecar = parseSidecar(sidecarPath, sidecarSource);

  // The duty lists come from the contracts the gates judge against, the
  // behaviour words from the vocabulary the responsive gate holds claims to —
  // none of them quoted, so a row edit upstream moves every page with it.
  const roleMatrix = readMatrix(a11yContractSource, "A11Y_EVIDENCE_MATRIX", "role", A11Y_CONTRACT);
  const interactionMatrix = readMatrix(
    a11yContractSource,
    "INTERACTION_MATRIX",
    "class",
    A11Y_CONTRACT,
  );
  const behavioursVocabulary = flatLiteral(
    responsiveContractSource,
    "RESPONSIVE_BEHAVIOURS",
    RESPONSIVE_CONTRACT,
  );
  const responsiveTiers = flatLiteral(
    responsiveContractSource,
    "RESPONSIVE_EVIDENCE_TIERS",
    RESPONSIVE_CONTRACT,
  );
  const a11yTiers = flatLiteral(a11yContractSource, "A11Y_EVIDENCE_TIERS", A11Y_CONTRACT);
  const tiers = flatLiteral(tierGraphSource, "TIERS", TIER_GRAPH);

  const unknownBehaviour = sidecar.responsive.behaviour.find(
    (word) => !behavioursVocabulary.includes(word),
  );
  if (unknownBehaviour !== undefined) {
    throw new Error(
      `${id}: ${sidecarPath} declares the behaviour "${unknownBehaviour}" — no such word in the ` +
        `closed vocabulary (${behavioursVocabulary.join(", ")}). The responsive gate names this ` +
        `first; the page refuses to render it.`,
    );
  }

  const roleDuties = dutiesFor(roleMatrix, sidecar.role, "A11Y_EVIDENCE_MATRIX", A11Y_CONTRACT);
  const interactionDuties = dutiesFor(
    interactionMatrix,
    sidecar.interaction.class,
    "INTERACTION_MATRIX",
    A11Y_CONTRACT,
  );

  // The regions are the component's own slots, read from the same
  // single-file parse the @api table renders — one reader, because a second
  // could disagree about what the template declares.
  const slots = await slotsOf(componentFile);
  const tierPosition = tiers.indexOf("layouts");
  if (tierPosition === -1) {
    throw new Error(
      `${TIER_GRAPH}: TIERS no longer names a "layouts" tier, so the obligations cannot state ` +
        `where a layout sits. The graph is the tier order's one home.`,
    );
  }
  const below = tiers.slice(0, tierPosition);
  const above = tiers.slice(tierPosition + 1);
  const position =
    (above.length === 0
      ? "`layouts` is the outermost component tier"
      : `\`layouts\` sits below ${above.map((tier) => `\`${tier}\``).join(", ")} in the component tiers`) +
    (below.length > 0
      ? ` — above ${below.map((tier) => `\`${tier}\``).join(", ")} — and only the public facade sits above a layout`
      : "") +
    ` (the tier order is the graph's, \`${repoPath(TIER_GRAPH)}\`).`;

  const exceptionLine =
    sidecar.interaction.exceptions.length > 0
      ? ` Named exceptions — the shrinking gap the a11y-evidence gate counts: ` +
        sidecar.interaction.exceptions
          .map((exception) => {
            const requirement = `\`${exception.requirement}\``;
            return exception.because === undefined
              ? requirement
              : `${requirement} — _${cell(exception.because)}_`;
          })
          .join("; ") +
        "."
      : "";

  const interactionBasis =
    sidecar.interaction.basis === undefined ? "" : ` — _${cell(sidecar.interaction.basis)}_`;

  const obligations =
    regionsParagraph(slots, componentFile) +
    `\n**Responsive behaviour.** Declared ${sidecar.responsive.behaviour.map((word) => `\`${word}\``).join(", ")} ` +
    `— words of the closed vocabulary in \`${repoPath(RESPONSIVE_CONTRACT)}\`. The claim's basis: _${cell(sidecar.responsive.basis)}_\n\n` +
    evidenceTable(sidecar, "responsive", responsiveTiers) +
    `\n**Accessibility obligations.** Role \`${sidecar.role}\` — _${cell(sidecar.basis)}_ ` +
    `The role's matrix row owes ${roleDuties.map((duty) => `\`${duty}\``).join(", ")}. ` +
    `The interaction claim declares \`${sidecar.interaction.class}\`${interactionBasis}; its matrix row owes ` +
    `${interactionDuties.map((duty) => `\`${duty}\``).join(", ")}.${exceptionLine}\n\n` +
    evidenceTable(sidecar, "evidence", a11yTiers) +
    `\n**Composition model.** ${composition} ${position}\n`;

  return markdown.replace(MARKER, () => obligations);
}

async function slotsOf(componentFile: string): Promise<{ name: string }[]> {
  const doc = await parse(componentFile);
  return (doc.slots ?? []).map((slot) => ({ name: slot.name }));
}

/**
 * Expands `<!-- @layout-obligations Name -->` markers in markdown pages
 * before VitePress renders them. `enforce: "pre"` is what puts this ahead of
 * VitePress's own markdown transform — after it, the page is already HTML and
 * the marker is an inert comment.
 */
export function layoutObligations() {
  let index: Promise<Map<string, string>> | undefined;
  let a11yContract: Promise<string> | undefined;
  let responsiveContract: Promise<string> | undefined;
  let tierGraph: Promise<string> | undefined;

  return {
    name: "loom:layout-obligations",
    enforce: "pre" as const,
    buildStart() {
      // Rebuilt per run, so a layout added while the dev server is up is
      // found rather than reported missing until someone restarts it.
      index = undefined;
      a11yContract = undefined;
      responsiveContract = undefined;
      tierGraph = undefined;
    },
    async transform(this: { addWatchFile?: (id: string) => void }, markdown: string, id: string) {
      if (!id.endsWith(".md")) return null;
      MARKER.lastIndex = 0;
      // Checked here so a page without the marker costs no file read; the
      // expansion re-tests it because it owns the marker-to-render decision.
      if (!MARKER.test(markdown)) return null;

      index ??= indexComponents();
      a11yContract ??= readFile(A11Y_CONTRACT, "utf8");
      responsiveContract ??= readFile(RESPONSIVE_CONTRACT, "utf8");
      tierGraph ??= readFile(TIER_GRAPH, "utf8");
      this.addWatchFile?.(A11Y_CONTRACT);
      this.addWatchFile?.(RESPONSIVE_CONTRACT);
      this.addWatchFile?.(TIER_GRAPH);

      const components = await index;
      MARKER.lastIndex = 0;
      const name = MARKER.exec(markdown)?.[1];
      if (name === undefined) return null;
      const componentFile = components.get(name);
      if (componentFile === undefined) {
        throw new Error(
          `${id}: <!-- @layout-obligations ${name} --> names a component that does not exist under ` +
            `packages/. Known: ${[...components.keys()].sort().join(", ")}`,
        );
      }
      // The sidecar sits at the component's package root: the one place the
      // a11y-evidence and responsive-evidence gates read it, and the path the
      // obligations cite.
      const sidecarPath = componentFile.replace(/\/src\/[^/]+\.vue$/, "/a11y.json");
      this.addWatchFile?.(sidecarPath);
      this.addWatchFile?.(componentFile);
      const sidecarSource = await readFile(sidecarPath, "utf8");

      return expandLayoutObligations({
        markdown,
        id,
        componentFile,
        sidecarPath,
        sidecarSource,
        a11yContractSource: await a11yContract,
        responsiveContractSource: await responsiveContract,
        tierGraphSource: await tierGraph,
      });
    },
  };
}

/** The scanner interaction-classes carries, replicated for the same reason. */
function stripComments(text: string): string {
  let out = "";
  let quote: string | null = null;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === undefined) break;
    if (quote !== null) {
      out += ch;
      if (ch === "\\") {
        out += text[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") {
      // The newline itself survives, so a declaration on the following line
      // is still matched on its own line.
      const end = text.indexOf("\n", i);
      i = end === -1 ? text.length : end;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** One extracted TypeScript literal rewritten into JSON, quote-aware. */
function toParseable(literal: string): string {
  let out = "";
  let i = 0;
  let quote: string | null = null;
  let expectKey = false;
  while (i < literal.length) {
    const ch = literal[i];
    if (ch === undefined) break;
    if (quote !== null) {
      out += ch;
      if (ch === "\\") {
        out += literal[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === ":") {
      // A value follows: a bare `true` or number out here is data, not a key.
      expectKey = false;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "," || ch === "{") {
      // A comma that closes its element (prettier's trailing comma) writes
      // nothing; a separating comma opens key position like `{` does.
      if (!(ch === "," && /^\s*[\]}]/.test(literal.slice(i + 1)))) out += ch;
      expectKey = true;
      i += 1;
      continue;
    }
    if (expectKey && /[A-Za-z0-9_$]/.test(ch)) {
      let j = i;
      let ident = "";
      for (;;) {
        const c = literal[j];
        if (c === undefined || !/[A-Za-z0-9_$]/.test(c)) break;
        ident += c;
        j += 1;
      }
      out += `"${ident}"`;
      i = j;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}
