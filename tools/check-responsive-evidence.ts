// Every component declares how its geometry answers the viewport, and this is
// what holds the claim to the law.
//
// The claim is the `responsive` key of `packages/<tier>/<name>/a11y.json` —
// the second axis of the sixth artifact, not a second file — and the law is
// `packages/core/src/responsive-contract.ts`: a closed behaviour vocabulary,
// the two evidence runtimes that can witness a viewport at all, and the
// canonical bands the evidence must name. Neither is restated here. The
// contract is PARSED, not imported, for the same two reasons
// tools/check-a11y-evidence.ts parses rather than imports: the tooling layer's
// boundary row forbids importing the library it checks, and a checker that
// executed its subject could not report on a tree that will not load. The
// parse is fail-closed — a contract this tool cannot read exits non-zero
// naming the fault, never an empty verdict.
//
// Scope: every component under composition, patterns and layouts — the M13
// registry property the issue asks for, so a new component cannot land
// without a claim. Primitives are outside this gate deliberately: their
// sizing is set by the host that composes them (an overlay's max-width is a
// fact about the overlay context, not about the button inside it), and the
// per-primitive viewport obligation is Phase 3C/3D design space, recorded
// here rather than silently implied.
//
// What is asserted per component, in the a11y gate's failure style:
//
//   1. the sidecar exists, parses as JSON, and carries a `responsive` claim
//      shaped exactly one of the law's two halves — no `none` contract with
//      behaviour keys, no behaviour claim without basis;
//   2. every behaviour word is in the vocabulary (a typo'd word would
//      otherwise read as a claim the law cannot judge);
//   3. every evidence path exists in the tree as a file AND names a viewport:
//      the file must size a viewport (`setViewportSize` / a `viewport:` or
//      `viewport =` assignment) and must contain a band literal from the law.
//      Declared-but-viewportless evidence is the fabricated kind — it reads
//      as coverage while exercising one width only;
//   4. a sweep-tier citation is answered by a TREE FACT, not prose: the gate
//      reads the root responsive leg's own `page.goto` population and checks
//      this component's page is in it — fail-closed if the leg cannot be
//      read, because an unreadable suite must never read as an empty one;
//   5. every declared behaviour is answered by an unqualified evidence entry
//      or carries a recorded exception — behaviour plus reason. Exceptions
//      are counted and named, not failed on: the contract lands truthfully
//      and shrinks as evidence grows;
//   6. no exception for a behaviour the evidence already answers — a claim
//      cannot both have and lack the same thing.
//
// Two honest limits, the a11y gate's own stance carried over:
//
//   - the gate takes an unqualified spec at its word on DEPTH. Which of a
//     component's declared behaviours a given file actually witnesses is
//     carried by the claim's `basis` in prose; per-behaviour witness mapping
//     is a future design space, and the browser runs that prove depth are
//     CI-only anyway (this repository never runs a browser locally);
//   - ecoma-io/loom#275 is open on purpose: the width a wrapped side panel
//     keeps after an intrinsic collapse is unpinned everywhere, so no spec
//     this gate reads may assert a wrapped panel's width. The gap is
//     recorded, not hidden.
//
// Run: `node --experimental-strip-types tools/check-responsive-evidence.ts`
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { TIERS } from "./architecture/graph.ts";

/** The tiers this gate enumerates — the component tiers minus the primitives. */
const SCOPED_TIERS = TIERS.filter((tier) => tier !== "primitives");

/** The root responsive leg, the one sweep runtime a viewport claim can cite. */
const SWEEP_SUITE = "e2e/layout-responsive.e2e.ts";

/** The law, parsed out of the contract module's source text. */
export interface ParsedResponsiveContract {
  behaviours: string[];
  tiers: string[];
  bands: Record<string, number>;
}

/**
 * Remove comments before parsing. The same approximation
 * tools/check-a11y-evidence.ts makes — this is a parser for a file this
 * repository owns, not a TypeScript front end — and for the same reason: the
 * contract's docblocks are documentation and must be free to mention a
 * behaviour word or a pixel value without becoming law.
 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** The `[ ... ] as const` block of one exported const, tracked by bracket depth. */
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

/**
 * The `{ ... } as const` block of one exported const, tracked by brace depth —
 * the shape RESPONSIVE_VIEWPORT_BANDS takes, which no array parser can read.
 */
function constRecord(source: string, name: string): string {
  const start = source.indexOf(`export const ${name} = {`);
  if (start === -1) {
    throw new Error(`the contract exports no \`const ${name}\` record`);
  }
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const char = source[i];
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  throw new Error(`the contract's \`const ${name}\` record never closes`);
}

/** The quoted strings inside one array literal. */
function quotedStrings(field: string): string[] {
  return [...field.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((match) => match[1] ?? "");
}

/** `name: 360` pairs inside one record literal. */
function numericPairs(record: string): [string, number][] {
  const out: [string, number][] = [];
  for (const match of record.matchAll(/([\w$]+)\s*:\s*(\d+)/g)) {
    out.push([match[1] ?? "", Number(match[2])]);
  }
  return out;
}

function unreadable(why: string): never {
  throw new Error(`packages/core/src/responsive-contract.ts is unreadable as law: ${why}`);
}

/**
 * Parse the contract module into its working sets. Every structural fault is
 * a thrown Error, which the CLI turns into exit 1: a law the gate cannot read
 * must stop the gate, not empty it.
 */
export function parseResponsiveContract(source: string): ParsedResponsiveContract {
  const text = stripComments(source);

  const behaviours = quotedStrings(constArray(text, "RESPONSIVE_BEHAVIOURS"));
  if (behaviours.length === 0) unreadable("RESPONSIVE_BEHAVIOURS is empty");
  if (new Set(behaviours).size !== behaviours.length) {
    unreadable("the behaviour vocabulary repeats a word");
  }
  if (behaviours.includes("none")) {
    unreadable('"none" is a contract value, not a behaviour — it cannot join the vocabulary');
  }

  const tiers = quotedStrings(constArray(text, "RESPONSIVE_EVIDENCE_TIERS"));
  if (tiers.length === 0) unreadable("RESPONSIVE_EVIDENCE_TIERS is empty");
  if (new Set(tiers).size !== tiers.length) unreadable("the evidence tiers repeat a member");
  // jsdom has no viewport, so a browserless tier could witness nothing here;
  // its absence is what forces the harness spec set to exist at all.
  if (tiers.includes("browserless")) {
    unreadable("browserless cannot be an evidence tier — jsdom has no viewport to witness");
  }

  const bands = numericPairs(constRecord(text, "RESPONSIVE_VIEWPORT_BANDS"));
  if (bands.length === 0) unreadable("RESPONSIVE_VIEWPORT_BANDS is empty");
  const widths = bands.map(([, width]) => width);
  if (new Set(widths).size !== widths.length) {
    unreadable("two bands claim one width — two bands at one width are one band");
  }

  return { behaviours, tiers, bands: Object.fromEntries(bands) };
}

/** The contract read from the repository this tool runs against. */
export function readResponsiveContract(root: string): ParsedResponsiveContract {
  return parseResponsiveContract(
    readFileSync(join(root, "packages", "core", "src", "responsive-contract.ts"), "utf8"),
  );
}

/**
 * The population the root responsive leg actually sweeps, read out of its own
 * `page.goto("…/<page>")` targets — a tree fact, not a sidecar's prose, and
 * the same discipline the a11y gate applies to its bespoke suite.
 */
export function readSuitePopulation(root: string, suite: string): Set<string> {
  let text: string;
  try {
    text = readFileSync(join(root, ...suite.split("/")), "utf8");
  } catch {
    throw new Error(
      `the responsive sweep ${suite} is unreadable, and its population is a tree fact the gate will not guess`,
    );
  }
  const pages = [...text.matchAll(/goto\(\s*["'`]([^"'`]+)["'`]/g)].map(
    (match) => (match[1] ?? "").split("/").pop() ?? "",
  );
  const named = pages.filter((page) => page.length > 0);
  if (named.length === 0) {
    throw new Error(`the responsive sweep ${suite} names no page.goto population`);
  }
  return new Set(named);
}

interface EvidenceEntry {
  path: string;
  because?: string;
}

interface ParsedResponsiveClaim {
  contract: "none" | "behaviour";
  behaviours: string[];
  basis: string;
  evidence: Partial<Record<string, EvidenceEntry[]>>;
  exceptions: { behaviour: string; because: string }[];
}

/** Whether a spec file sizes a viewport at all — the first half of rule 3. */
export function namesAViewport(content: string): boolean {
  return /setViewportSize\s*\(|\bviewport\s*[:=]/.test(content);
}

/**
 * Whether a spec file names one of the law's canonical band widths. Height
 * values are stripped first: the band set is a set of WIDTHS, and the
 * viewports' habitual 800-tall number must not stand in for a width the spec
 * never sizes to.
 */
export function namesABand(content: string, bands: Record<string, number>): boolean {
  const literals = [...new Set(Object.values(bands).map(String))].join("|");
  const widthTalk = content.replace(/[a-zA-Z]*[hH]eight\s*:\s*\d+/g, "");
  return new RegExp(`\\b(?:${literals})\\b`).test(widthTalk);
}

function parseClaim(
  component: string,
  relSidecar: string,
  contract: ParsedResponsiveContract,
  record: Record<string, unknown>,
  failures: string[],
): ParsedResponsiveClaim | null {
  const raw = record.responsive;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    failures.push(
      `${component}: ${relSidecar} carries no responsive claim — every component under ${SCOPED_TIERS.join("/")} declares how its geometry answers the viewport`,
    );
    return null;
  }
  const claim = raw as Record<string, unknown>;

  const knownKeys = new Set(["contract", "behaviour", "basis", "evidence", "exceptions"]);
  for (const key of Object.keys(claim)) {
    if (!knownKeys.has(key)) {
      // Fail, not skip: a typo'd key would otherwise read as an absent one and
      // the claim would quietly lose a field.
      failures.push(
        `${component}: responsive claim carries unknown key "${key}" — extend the contract and this gate together`,
      );
    }
  }

  const basis = claim.basis;
  if (typeof basis !== "string" || basis.trim().length === 0) {
    failures.push(
      `${component}: responsive claim carries no basis — the rendered fact the behaviour claim rests on is what a reviewer checks`,
    );
    return null;
  }

  // The two halves are exclusive: a none contract with a behaviour array
  // asserts and denies the same thing, and the union type cannot say which
  // half a reviewer should read.
  if (claim.contract !== undefined && claim.behaviour !== undefined) {
    failures.push(
      `${component}: responsive claim carries both contract and behaviour — a claim either declares no viewport behaviour or names the ones it exhibits`,
    );
    return null;
  }

  if (claim.contract !== undefined) {
    if (claim.contract !== "none") {
      failures.push(
        `${component}: responsive contract ${JSON.stringify(claim.contract ?? null)} — the only contract value is "none"; behaviours are named in the behaviour array`,
      );
      return null;
    }
    for (const stray of ["evidence", "exceptions"] as const) {
      if (claim[stray] !== undefined) {
        // A none contract with evidence asserts and denies the same thing:
        // there is no behaviour for the evidence to witness.
        failures.push(
          `${component}: responsive contract "none" carries ${stray} — a component with no viewport behaviour has nothing to evidence or except`,
        );
      }
    }
    return { contract: "none", behaviours: [], basis, evidence: {}, exceptions: [] };
  }

  const behaviours = claim.behaviour;
  if (!Array.isArray(behaviours) || behaviours.length === 0) {
    failures.push(
      `${component}: responsive claim names no behaviour — a claim that is not "none" must name what the component exhibits`,
    );
    return null;
  }
  // JSON hands over `any[]`; the type predicate is what turns it into the
  // string array the rest of the claim can be judged against.
  const words = behaviours.filter((b): b is string => typeof b === "string");
  if (words.length !== behaviours.length) {
    failures.push(
      `${component}: responsive claim names ${behaviours
        .filter((b) => typeof b !== "string")
        .map((b) => JSON.stringify(b))
        .join(", ")} — outside the closed vocabulary (${contract.behaviours.join(", ")})`,
    );
    return null;
  }
  const unknown = words.filter((b) => !contract.behaviours.includes(b));
  if (unknown.length > 0) {
    failures.push(
      `${component}: responsive claim names ${unknown.map((b) => JSON.stringify(b)).join(", ")} — outside the closed vocabulary (${contract.behaviours.join(", ")})`,
    );
    return null;
  }
  if (new Set(words).size !== words.length) {
    failures.push(`${component}: responsive claim repeats a behaviour word`);
    return null;
  }

  const tierNames = new Set(contract.tiers);
  const evidence: Partial<Record<string, EvidenceEntry[]>> = {};
  const rawEvidence = claim.evidence;
  if (rawEvidence !== undefined) {
    if (typeof rawEvidence !== "object" || rawEvidence === null || Array.isArray(rawEvidence)) {
      failures.push(`${component}: responsive evidence must be an object keyed by tier`);
      return null;
    }
    for (const [tier, entries] of Object.entries(rawEvidence as Record<string, unknown>)) {
      if (!tierNames.has(tier)) {
        failures.push(
          `${component}: responsive evidence under "${tier}" — no such tier (${contract.tiers.join(", ")})`,
        );
        continue;
      }
      if (!Array.isArray(entries)) {
        failures.push(`${component}: responsive evidence.${tier} must be an array`);
        continue;
      }
      const parsed: EvidenceEntry[] = [];
      for (const entry of entries) {
        if (typeof entry === "string") {
          parsed.push({ path: entry });
        } else if (
          typeof entry === "object" &&
          entry !== null &&
          !Array.isArray(entry) &&
          typeof (entry as Record<string, unknown>).path === "string"
        ) {
          const shaped = entry as Record<string, unknown>;
          const evidence: { path: string; because?: string } = { path: shaped.path as string };
          const because = shaped.because;
          // exactOptionalPropertyTypes: the key is set or absent, never undefined.
          if (typeof because === "string" && because.trim().length > 0) evidence.because = because;
          parsed.push(evidence);
        } else {
          failures.push(
            `${component}: responsive evidence.${tier} carries an entry that is neither a path nor { path, because }`,
          );
        }
      }
      evidence[tier] = parsed;
    }
  }

  const vocabulary = new Set(contract.behaviours);
  const exceptions: { behaviour: string; because: string }[] = [];
  const rawExceptions = claim.exceptions;
  if (rawExceptions !== undefined) {
    if (!Array.isArray(rawExceptions)) {
      failures.push(`${component}: responsive exceptions must be an array`);
      return null;
    }
    for (const entry of rawExceptions) {
      const shaped = (typeof entry === "object" && entry !== null ? entry : {}) as Record<
        string,
        unknown
      >;
      const behaviour = shaped.behaviour;
      const because = shaped.because;
      if (typeof behaviour !== "string" || !vocabulary.has(behaviour)) {
        failures.push(
          `${component}: responsive exception names ${JSON.stringify(behaviour ?? null)} — no such behaviour`,
        );
        continue;
      }
      if (!words.includes(behaviour)) {
        failures.push(
          `${component}: responsive exception names ${behaviour}, which the claim does not declare — an exception for an undeclared behaviour is noise in the record`,
        );
        continue;
      }
      if (typeof because !== "string" || because.trim().length === 0) {
        failures.push(
          `${component}: responsive exception for ${behaviour} carries no because — an unexplained exception is indistinguishable from a forgotten one`,
        );
        continue;
      }
      exceptions.push({ behaviour, because });
    }
  }

  return { contract: "behaviour", behaviours: words, basis, evidence, exceptions };
}

/**
 * Every responsive-claim violation the rules found, one human-readable string
 * each — `Name: what is wrong`, with repository-relative paths, in the
 * artifact gate's failure style.
 */
export function checkResponsiveEvidence(
  root: string,
  contract: ParsedResponsiveContract,
): string[] {
  const failures: string[] = [];

  // The sweep population is read up front, whether or not anything cites it —
  // the a11y gate's discipline for its bespoke suite: the leg is the one sweep
  // runtime the law names, so a leg that is missing, unreadable or names no
  // page must stop the gate, never quietly void every sweep citation.
  const population = readSuitePopulation(root, SWEEP_SUITE);

  /** A declared path is repository-root-relative, and it exists as a file. */
  function checkPath(component: string, where: string, raw: unknown): string | null {
    if (typeof raw !== "string" || raw.length === 0) {
      failures.push(`${component}: ${where} is not a non-empty repository-relative path`);
      return null;
    }
    if (isAbsolute(raw) || raw.split(/[\\/]/).includes("..")) {
      failures.push(`${component}: ${where} "${raw}" must be repository-root-relative`);
      return null;
    }
    const resolved = join(root, ...raw.split("/"));
    if (!existsSync(resolved)) {
      failures.push(`${component}: ${where} "${raw}" does not exist in the tree`);
      return null;
    }
    if (!statSync(resolved).isFile()) {
      // A directory is not evidence of anything — the sweep reads pages, the
      // harness reads specs, and neither is a directory.
      failures.push(`${component}: ${where} "${raw}" is not a file`);
      return null;
    }
    return resolved;
  }

  /**
   * Rule 3: the file exists, sizes a viewport, and names one of the law's
   * bands. Content is read once per file and cached — several components
   * cite the same root leg.
   */
  const contentCache = new Map<string, string>();
  function viewportBearing(component: string, where: string, path: string): boolean {
    const resolved = checkPath(component, where, path);
    if (resolved === null) return false;
    let content = contentCache.get(resolved);
    if (content === undefined) {
      try {
        content = readFileSync(resolved, "utf8");
      } catch {
        failures.push(`${component}: ${where} "${path}" is unreadable`);
        return false;
      }
      contentCache.set(resolved, content);
    }
    if (!namesAViewport(content) || !namesABand(content, contract.bands)) {
      failures.push(
        `${component}: ${where} "${path}" names no viewport — evidence must size the page (setViewportSize or a viewport assignment) at one of the law's bands (${Object.values(contract.bands).join(", ")})`,
      );
      return false;
    }
    return true;
  }

  for (const tier of SCOPED_TIERS) {
    const tierDir = join(root, "packages", tier);
    if (!existsSync(tierDir)) continue;
    for (const name of readdirSync(tierDir).sort()) {
      if (!statSync(join(tierDir, name)).isDirectory()) continue;
      // `Button` → the component and message name, the a11y gate's convention.
      const component = name.replace(/(^|[-_])([a-z])/g, (_m, _sep: string, c: string) =>
        c.toUpperCase(),
      );
      const relSidecar = ["packages", tier, name, "a11y.json"].join("/");
      const sidecarPath = join(root, "packages", tier, name, "a11y.json");
      if (!existsSync(sidecarPath)) {
        failures.push(`${component}: missing ${relSidecar}`);
        continue;
      }
      let json: unknown;
      try {
        json = JSON.parse(readFileSync(sidecarPath, "utf8"));
      } catch (error) {
        failures.push(
          `${component}: ${relSidecar} does not parse as JSON — ${(error as Error).message}`,
        );
        continue;
      }
      if (typeof json !== "object" || json === null || Array.isArray(json)) {
        failures.push(`${component}: ${relSidecar} must be a JSON object`);
        continue;
      }
      const claim = parseClaim(
        component,
        relSidecar,
        contract,
        json as Record<string, unknown>,
        failures,
      );
      if (!claim || claim.contract === "none") continue;

      // Rule 3 + 4, per entry: the file must be viewport-bearing, and a
      // sweep citation is answered only by this component's page sitting in
      // the leg's population.
      const validTiers: string[] = [];
      for (const [entryTier, tierEntries] of Object.entries(claim.evidence)) {
        const entries = tierEntries ?? [];
        let tierHolds = entries.length > 0;
        for (const entry of entries) {
          const where = `responsive evidence.${entryTier} entry`;
          const holds = viewportBearing(component, where, entry.path);
          if (holds && entryTier === "sweep" && !population.has(name)) {
            failures.push(
              `${component}: ${where} "${entry.path}" — the responsive sweep does not reach this component's page (${SWEEP_SUITE} never loads it)`,
            );
            tierHolds = false;
          }
          if (!holds) tierHolds = false;
        }
        if (tierHolds) validTiers.push(entryTier);
      }

      // Rule 5: an unqualified entry in a holding tier stands for the claim's
      // behaviours (the basis carries which file witnesses which, in prose);
      // a because-qualified one declares it witnesses less than that, and
      // answers nothing.
      const answered = validTiers.some((entryTier) =>
        (claim.evidence[entryTier] ?? []).some((entry) => entry.because === undefined),
      );

      if (!answered) {
        const unexcepted = claim.behaviours.filter(
          (behaviour) => !claim.exceptions.some((e) => e.behaviour === behaviour),
        );
        for (const behaviour of unexcepted) {
          failures.push(
            `${component}: behaviour ${behaviour} has no viewport-bearing evidence and no exception recorded`,
          );
        }
      }

      // Rule 6.
      if (answered) {
        for (const exception of claim.exceptions) {
          failures.push(
            `${component}: behaviour ${exception.behaviour} is answered by evidence and excepted at once — drop one or the other`,
          );
        }
      }
    }
  }

  return failures;
}

/**
 * How much of the contract is answered outright versus carried as named
 * exceptions — the number that shrinks as evidence lands, counted per
 * behaviour word so the summary says WHICH obligation is still open.
 */
export function responsiveExceptionSummary(root: string): {
  count: number;
  components: number;
  byBehaviour: Record<string, number>;
} {
  const byBehaviour: Record<string, number> = {};
  let count = 0;
  let components = 0;
  for (const tier of SCOPED_TIERS) {
    const tierDir = join(root, "packages", tier);
    if (!existsSync(tierDir)) continue;
    for (const name of readdirSync(tierDir).sort()) {
      const sidecarPath = join(tierDir, name, "a11y.json");
      if (!statSync(join(tierDir, name)).isDirectory() || !existsSync(sidecarPath)) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(readFileSync(sidecarPath, "utf8"));
      } catch {
        continue; // the verdict above already names it
      }
      const claim = (parsed as Record<string, unknown>).responsive;
      if (typeof claim !== "object" || claim === null) continue;
      const exceptions = (claim as Record<string, unknown>).exceptions;
      if (!Array.isArray(exceptions)) continue;
      count += exceptions.length;
      if (exceptions.length > 0) components++;
      for (const exception of exceptions) {
        const behaviour = (exception as Record<string, unknown>).behaviour;
        if (typeof behaviour !== "string") continue;
        byBehaviour[behaviour] = (byBehaviour[behaviour] ?? 0) + 1;
      }
    }
  }
  return { count, components, byBehaviour };
}

// CLI entry — run against the real repository and exit non-zero on violations.
if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  const ROOT = join(import.meta.dirname, "..");
  let contract: ParsedResponsiveContract;
  try {
    contract = readResponsiveContract(ROOT);
  } catch (error) {
    console.error(`responsive-evidence: ${(error as Error).message}`);
    process.exit(1);
  }
  const failures = checkResponsiveEvidence(ROOT, contract);
  if (failures.length > 0) {
    console.error(`Responsive evidence contract unmet (${String(failures.length)}):`);
    for (const failure of failures) console.error(`  • ${failure}`);
    console.error(
      `\nEvery composition, pattern and layout needs a responsive claim in its a11y.json — ` +
        `behaviours from packages/core/src/responsive-contract.ts, viewport-bearing evidence ` +
        `for each (or a recorded exception), and a basis a reviewer can check.`,
    );
    process.exit(1);
  }
  const summary = responsiveExceptionSummary(ROOT);
  const perBehaviour = Object.entries(summary.byBehaviour)
    .map(([behaviour, n]) => `${behaviour}: ${String(n)}`)
    .join(", ");
  console.log(
    `Responsive evidence contract complete; ${String(summary.count)} named exception(s) across ` +
      `${String(summary.components)} component(s)${perBehaviour.length > 0 ? ` (${perBehaviour})` : ""} shrink as evidence lands.`,
  );
}
