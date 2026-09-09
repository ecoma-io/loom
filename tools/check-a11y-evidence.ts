// Every component declares its accessibility claim, and this is what holds
// the claim to the law.
//
// The claim is `packages/<tier>/<name>/a11y.json` — the sixth component
// artifact — and the law is `packages/core/src/a11y-contract.ts`: a closed
// role vocabulary, evidence tiers, and the matrix binding each role to the
// requirements it must answer. Neither is restated here. The contract is
// PARSED, not imported: the tooling layer's boundary row forbids importing the
// library it checks, and a checker that executed its subject could not report
// on a tree that will not load. The parse is fail-closed — a contract this
// tool cannot read exits non-zero naming the file, never an empty verdict.
//
// What is asserted per component, in the failure style of
// tools/check-component-artifacts.ts:
//
//   1. a sidecar exists and parses as JSON against the contract's shape;
//   2. the claimed role is in the vocabulary and carries a matrix row — both
//      halves of that sentence are the parser's guarantees, checked before a
//      single sidecar is read;
//   3. every requirement of the row is answered by evidence in the
//      requirement's tier, or carries a recorded exception — requirement id
//      plus reason. Exceptions are counted and named, not failed on: the
//      contract lands truthfully and shrinks as evidence grows. Three
//      refinements keep that honest where the tiers are not uniform:
//        - a rule family whose only judge is a named bespoke suite
//          (focus-not-obscured, three pages while the sweep runs over every
//          page) is answered by a TREE FACT, not prose: the gate reads the
//          suite's own source for its page.goto population and checks this
//          component's page is in it — fail-closed if the suite cannot be
//          read, because an unreadable suite must never read as an empty one;
//        - an evidence entry in a DEMANDED tier answers only when it is
//          unqualified. A `because` on a demanded-tier entry is a scope
//          declaration — this file witnesses less than the tier's full
//          obligation — so the requirements it leaves unwitnessed must carry
//          exceptions. Keyboard coverage depth — what a harness spec must
//          exercise to answer the family — is 3D's design space; until that
//          mechanism exists the gate takes an unqualified spec at its word;
//   4. no exception for a requirement the evidence already answers, and none
//      for a requirement the role does not owe — a claim cannot both have and
//      lack the same thing;
//   5. every evidence path exists in the tree as a file. Declared-but-absent
//      evidence is the fabricated kind, and fails outright;
//   6. evidence in a tier the role's row does not demand carries a `because`
//      — surplus without a recorded reason would let any component claim any
//      tier and reduce the matrix to decoration.
//
// Run: `node --experimental-strip-types tools/check-a11y-evidence.ts`
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { TIERS } from "./architecture/graph.ts";
import { runnableSpecText } from "./spec-source.ts";

/** The law, parsed out of the contract module's source text. */
export interface ParsedA11yContract {
  tiers: string[];
  roles: string[];
  requirements: { id: string; tier: string; answers: string[] }[];
  matrix: { role: string; requirements: string[] }[];
}

/**
 * Remove comments before parsing. The same approximation
 * tools/check-architecture.ts makes — this is a parser for a file this
 * repository owns, not a TypeScript front end — and for the same reason: the
 * contract's docblocks are documentation and must be free to mention a
 * bracket or a role without becoming law.
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

/** The quoted strings inside one array literal, e.g. a `requirements` field. */
function quotedStrings(field: string): string[] {
  return [...field.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((match) => match[1] ?? "");
}

/** One record's fields: `id: "x"` and `answers: ["a", "b"]` shapes. */
function fields(record: string): Map<string, string | string[]> {
  const out = new Map<string, string | string[]>();
  for (const match of record.matchAll(/([\w$]+)\s*:\s*(?:"((?:[^"\\]|\\.)*)"|\[([^\]]*)\])/g)) {
    const key = match[1];
    if (!key) continue;
    if (match[2] !== undefined) out.set(key, match[2]);
    else out.set(key, quotedStrings(match[3] ?? ""));
  }
  return out;
}

function unreadable(why: string): never {
  throw new Error(`packages/core/src/a11y-contract.ts is unreadable as law: ${why}`);
}

/**
 * Parse the contract module into its working sets. Every structural fault is
 * a thrown Error, which the CLI turns into exit 1: a law the gate cannot
 * read must stop the gate, not empty it.
 */
export function parseA11yContract(source: string): ParsedA11yContract {
  const text = stripComments(source);

  const tiers = quotedStrings(constArray(text, "A11Y_EVIDENCE_TIERS"));
  if (tiers.length === 0) unreadable("A11Y_EVIDENCE_TIERS is empty");
  const ariaRoles = quotedStrings(constArray(text, "ARIA_ROLES"));
  const nonRoleMembers = quotedStrings(constArray(text, "NON_ROLE_MEMBERS"));
  if (ariaRoles.length === 0) unreadable("ARIA_ROLES is empty");
  const roles = [...ariaRoles, ...nonRoleMembers];
  if (new Set(roles).size !== roles.length) unreadable("the role vocabulary repeats a member");

  const requirementRecords = records(constArray(text, "A11Y_EVIDENCE_REQUIREMENTS"));
  const requirements = requirementRecords.map((entry) => {
    const parsed = fields(entry);
    const id = parsed.get("id");
    const tier = parsed.get("tier");
    const answers = parsed.get("answers");
    if (typeof id !== "string" || typeof tier !== "string" || !Array.isArray(answers)) {
      return unreadable(
        `a requirement record is missing id, tier or answers: ${entry.slice(0, 60)}`,
      );
    }
    return { id, tier, answers };
  });
  if (requirements.length === 0) unreadable("A11Y_EVIDENCE_REQUIREMENTS is empty");
  const ids = new Set(requirements.map((r) => r.id));
  if (ids.size !== requirements.length) unreadable("A11Y_EVIDENCE_REQUIREMENTS repeats an id");
  for (const requirement of requirements) {
    if (!tiers.includes(requirement.tier)) {
      unreadable(
        `requirement ${requirement.id} demands tier "${requirement.tier}", which no tier names`,
      );
    }
  }

  const matrixRecords = records(constArray(text, "A11Y_EVIDENCE_MATRIX"));
  const matrix = matrixRecords.map((entry) => {
    const parsed = fields(entry);
    const role = parsed.get("role");
    const needed = parsed.get("requirements");
    if (typeof role !== "string" || !Array.isArray(needed)) {
      return unreadable(`a matrix record is missing role or requirements: ${entry.slice(0, 60)}`);
    }
    if (!roles.includes(role)) {
      unreadable(`the matrix judges "${role}", which the vocabulary does not carry`);
    }
    const unknown = needed.filter((id) => !ids.has(id));
    if (unknown.length > 0) {
      unreadable(`role ${role} requires ${unknown.join(", ")}, which no definition supplies`);
    }
    return { role, requirements: needed };
  });
  if (matrix.length === 0) unreadable("A11Y_EVIDENCE_MATRIX is empty");
  const matrixRoles = new Set(matrix.map((row) => row.role));
  if (matrixRoles.size !== matrix.length) unreadable("A11Y_EVIDENCE_MATRIX repeats a role");
  // Parity, both directions: a role the vocabulary carries but no row judges
  // would pass every gate while owing nothing, and a row that demands nothing
  // would make the matrix read as law while exempting its role from all of it.
  const unjudged = roles.filter((role) => !matrixRoles.has(role));
  if (unjudged.length > 0) {
    unreadable(
      `the vocabulary carries ${unjudged.map((role) => `"${role}"`).join(", ")} with no matrix row — a role that owes nothing is not in the vocabulary`,
    );
  }
  for (const row of matrix) {
    if (row.requirements.length === 0) {
      unreadable(`role ${row.role}'s row is empty — a row that demands nothing is not law`);
    }
  }

  return { tiers, roles, requirements, matrix };
}

/** The contract read from the repository this tool runs against. */
export function readA11yContract(root: string): ParsedA11yContract {
  return parseA11yContract(
    readFileSync(join(root, "packages", "core", "src", "a11y-contract.ts"), "utf8"),
  );
}

/**
 * The population a bespoke suite actually sweeps, read out of the suite's own
 * `page.goto("…/<page>")` targets — a tree fact, not a sidecar's prose. The
 * read goes through the shared spec reader, because the suite's population is
 * what the suite RUNS: a goto that lives in a comment loads no page, and a
 * goto inside a `test.fixme`/`test.skip` body belongs to a test Playwright
 * never executes. Either shape written here would answer a suite-judged
 * requirement the tree never witnesses. The failure modes are deliberately
 * loud: a suite that is missing, unreadable or names no page stops the gate,
 * because an unreadable suite must never be mistaken for an empty one.
 */
export function readSuitePopulation(root: string, suite: string): Set<string> {
  let text: string;
  try {
    text = runnableSpecText(readFileSync(join(root, ...suite.split("/")), "utf8"));
  } catch {
    throw new Error(
      `the bespoke suite ${suite} is unreadable, and its population is a tree fact the gate will not guess`,
    );
  }
  const pages = [...text.matchAll(/goto\(\s*["'`]([^"'`]+)["'`]/g)].map(
    (match) => (match[1] ?? "").split("/").pop() ?? "",
  );
  const named = pages.filter((page) => page.length > 0);
  if (named.length === 0) {
    throw new Error(`the bespoke suite ${suite} names no page.goto population`);
  }
  return new Set(named);
}

interface EvidenceEntry {
  path: string;
  because?: string;
}

interface ParsedSidecar {
  role: string;
  basis: string;
  evidence: Partial<Record<string, EvidenceEntry[]>>;
  exceptions: { requirement: string; because: string }[];
}

/** `button` → `Button`, the component and message name. */
function toPascal(name: string): string {
  return name.replace(/(^|[-_])([a-z])/g, (_match, _sep: string, char: string) =>
    char.toUpperCase(),
  );
}

function parseSidecar(
  component: string,
  relSidecar: string,
  contract: ParsedA11yContract,
  text: string,
  failures: string[],
): ParsedSidecar | null {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    failures.push(
      `${component}: ${relSidecar} does not parse as JSON — ${(error as Error).message}`,
    );
    return null;
  }
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    failures.push(`${component}: ${relSidecar} must be a JSON object`);
    return null;
  }
  const record = json as Record<string, unknown>;

  const knownKeys = new Set([
    "role",
    "basis",
    "evidence",
    "exceptions",
    "responsive",
    "interaction",
  ]);
  for (const key of Object.keys(record)) {
    if (!knownKeys.has(key)) {
      // Fail, not skip: a typo'd key would otherwise read as an absent one and
      // the claim would quietly lose a field. A further axis lands as a
      // deliberate edit here and in the law, not as a silent extra;
      // `responsive` (Phase 3B) and `interaction` (Phase 3D) are those edits
      // having landed — each shape is judged by its own gate, which owns the
      // vocabulary.
      failures.push(
        `${component}: ${relSidecar} carries unknown key "${key}" — extend the contract and this gate together`,
      );
    }
  }

  const role = record.role;
  if (typeof role !== "string" || !contract.roles.includes(role)) {
    failures.push(
      `${component}: ${relSidecar} claims role ${JSON.stringify(role ?? null)} — outside the closed vocabulary (${contract.roles.join(", ")})`,
    );
    return null;
  }
  const basis = record.basis;
  if (typeof basis !== "string" || basis.trim().length === 0) {
    failures.push(
      `${component}: ${relSidecar} carries no basis — the rendered fact the role claim rests on is what a reviewer checks`,
    );
    return null;
  }

  const tierNames = new Set(contract.tiers);
  const evidence: Partial<Record<string, EvidenceEntry[]>> = {};
  const rawEvidence = record.evidence;
  if (rawEvidence !== undefined) {
    if (typeof rawEvidence !== "object" || rawEvidence === null || Array.isArray(rawEvidence)) {
      failures.push(`${component}: ${relSidecar} evidence must be an object keyed by tier`);
      return null;
    }
    for (const [tier, entries] of Object.entries(rawEvidence as Record<string, unknown>)) {
      if (!tierNames.has(tier)) {
        failures.push(
          `${component}: ${relSidecar} declares evidence under "${tier}" — no such tier (${contract.tiers.join(", ")})`,
        );
        continue;
      }
      if (!Array.isArray(entries)) {
        failures.push(`${component}: ${relSidecar} evidence.${tier} must be an array`);
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
            `${component}: ${relSidecar} evidence.${tier} carries an entry that is neither a path nor { path, because }`,
          );
        }
      }
      evidence[tier] = parsed;
    }
  }

  const requirementIds = new Set(contract.requirements.map((r) => r.id));
  const exceptions: { requirement: string; because: string }[] = [];
  const rawExceptions = record.exceptions;
  if (rawExceptions !== undefined) {
    if (!Array.isArray(rawExceptions)) {
      failures.push(`${component}: ${relSidecar} exceptions must be an array`);
      return null;
    }
    for (const entry of rawExceptions) {
      const shaped = (typeof entry === "object" && entry !== null ? entry : {}) as Record<
        string,
        unknown
      >;
      const requirement = shaped.requirement;
      const because = shaped.because;
      if (typeof requirement !== "string" || !requirementIds.has(requirement)) {
        failures.push(
          `${component}: ${relSidecar} records an exception for ${JSON.stringify(requirement ?? null)} — no such requirement`,
        );
        continue;
      }
      if (exceptions.some((recorded) => recorded.requirement === requirement)) {
        // One requirement, one exception row — the same rule the responsive
        // and interaction claims carry on their own exception arrays: a
        // repeated row would double-count in the summary, the number the
        // shrinking gap is read off, while saying nothing the first row did
        // not.
        failures.push(
          `${component}: exceptions name ${requirement} twice — one requirement, one exception row`,
        );
        continue;
      }
      if (typeof because !== "string" || because.trim().length === 0) {
        failures.push(
          `${component}: ${relSidecar} records an exception for ${requirement} with no because — an unexplained exception is indistinguishable from a forgotten one`,
        );
        continue;
      }
      exceptions.push({ requirement, because });
    }
  }

  return { role, basis, evidence, exceptions };
}

/**
 * Every sidecar violation the rules found, one human-readable string each —
 * `Name: what is wrong`, with repository-relative paths, in the artifact
 * gate's failure style.
 */
export function checkA11yEvidence(root: string, contract: ParsedA11yContract): string[] {
  const failures: string[] = [];

  const rowByRole = new Map(contract.matrix.map((row) => [row.role, row.requirements]));
  const tierOfRequirement = new Map(contract.requirements.map((r) => [r.id, r.tier]));
  /** The suite a requirement's own answers name, when it has no axe rules. */
  const bespokeSuite = new Map(
    contract.requirements
      .map((requirement) => {
        const suites = requirement.answers.filter((answer) => answer.startsWith("e2e/"));
        return suites.length === requirement.answers.length && suites.length === 1
          ? [requirement.id, (suites[0] ?? "").split(" ")[0] ?? ""]
          : null;
      })
      .filter((pair): pair is [string, string] => pair !== null),
  );
  /** A suite's population, read once — the gate checks it, it never guesses it. */
  const populations = new Map<string, Set<string>>();
  function population(suite: string): Set<string> {
    const known = populations.get(suite);
    if (known) return known;
    const read = readSuitePopulation(root, suite);
    populations.set(suite, read);
    return read;
  }

  /** A declared path is repository-root-relative, and it exists as a file. */
  function checkPath(component: string, where: string, raw: unknown): void {
    if (typeof raw !== "string" || raw.length === 0) {
      failures.push(`${component}: ${where} is not a non-empty repository-relative path`);
      return;
    }
    if (isAbsolute(raw) || raw.split(/[\\/]/).includes("..")) {
      failures.push(`${component}: ${where} "${raw}" must be repository-root-relative`);
      return;
    }
    const resolved = join(root, ...raw.split("/"));
    if (!existsSync(resolved)) {
      failures.push(`${component}: ${where} "${raw}" does not exist in the tree`);
    } else if (!statSync(resolved).isFile()) {
      // A directory is not evidence of anything — the sweep reads pages, the
      // harness reads specs, and neither is a directory.
      failures.push(`${component}: ${where} "${raw}" is not a file`);
    }
  }

  for (const tier of TIERS) {
    const tierDir = join(root, "packages", tier);
    if (!existsSync(tierDir)) continue;
    for (const name of readdirSync(tierDir).sort()) {
      if (!statSync(join(tierDir, name)).isDirectory()) continue;
      const component = toPascal(name);
      const relSidecar = ["packages", tier, name, "a11y.json"].join("/");
      const sidecarPath = join(root, "packages", tier, name, "a11y.json");
      if (!existsSync(sidecarPath)) {
        failures.push(`${component}: missing ${relSidecar}`);
        continue;
      }
      const sidecar = parseSidecar(
        component,
        relSidecar,
        contract,
        readFileSync(sidecarPath, "utf8"),
        failures,
      );
      if (!sidecar) continue;

      const row = rowByRole.get(sidecar.role);
      // The parser's parity check makes this unreachable; the guard stays so a
      // parser edit that loses parity can never turn into a skipped sidecar.
      if (!row) continue;

      const answered = new Set(
        row.filter((id) => {
          const entries = sidecar.evidence[tierOfRequirement.get(id) ?? ""] ?? [];
          if (entries.length === 0) return false;
          const suite = bespokeSuite.get(id);
          // A suite-judged family is answered by the tree fact of this
          // component's page sitting in the suite's population — not by any
          // prose a sidecar can write about it.
          if (suite !== undefined) return population(suite).has(name);
          // An unqualified entry stands for the tier's full obligation; a
          // because-qualified one declares it witnesses less than that, and
          // answers nothing this tier owes.
          return entries.some((entry) => entry.because === undefined);
        }),
      );
      const demandedTiers = new Set(row.map((id) => tierOfRequirement.get(id) ?? ""));

      for (const requirementId of row) {
        if (answered.has(requirementId)) continue;
        const exception = sidecar.exceptions.find((e) => e.requirement === requirementId);
        if (!exception) {
          failures.push(
            `${component}: role ${sidecar.role} requires ${requirementId} (${tierOfRequirement.get(requirementId) ?? "no tier"} tier) — no evidence declared and no exception recorded`,
          );
        }
      }

      for (const exception of sidecar.exceptions) {
        if (answered.has(exception.requirement)) {
          failures.push(
            `${component}: ${exception.requirement} is answered by evidence and excepted at once — drop one or the other`,
          );
        } else if (!row.includes(exception.requirement)) {
          failures.push(
            `${component}: role ${sidecar.role} owes no ${exception.requirement} — an exception for a requirement the row does not demand is noise in the record`,
          );
        }
      }

      for (const [entryTier, entries] of Object.entries(sidecar.evidence)) {
        const demanded = demandedTiers.has(entryTier);
        for (const entry of entries ?? []) {
          const where = `evidence.${entryTier} entry`;
          checkPath(component, where, entry.path);
          if (!demanded && entry.because === undefined) {
            failures.push(
              `${component}: ${where} "${entry.path}" — role ${sidecar.role} owes nothing in the ${entryTier} tier; record a because for surplus evidence`,
            );
          }
        }
      }
    }
  }

  return failures;
}

/**
 * How much of the contract is answered outright versus carried as named
 * exceptions — the number the issue's design turns into the shrinking gap:
 * every exception is a requirement the matrix demands and nothing answers yet.
 */
export function exceptionSummary(
  root: string,
  contract: ParsedA11yContract,
): { count: number; components: number } {
  const rowByRole = new Map(contract.matrix.map((row) => [row.role, row.requirements]));
  let count = 0;
  let components = 0;
  for (const tier of TIERS) {
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
      const record = parsed as Record<string, unknown>;
      const role = record.role;
      const exceptions = record.exceptions;
      if (typeof role !== "string" || !rowByRole.has(role) || !Array.isArray(exceptions)) continue;
      // One requirement, one row: the verdict fails a repeated exception row,
      // and the summary — the number of record — must agree with the verdict
      // rather than with the raw text, so a duplicate is never tallied twice.
      const seen = new Set<string>();
      let named = 0;
      for (const exception of exceptions) {
        const requirement = (exception as Record<string, unknown>).requirement;
        if (typeof requirement !== "string" || seen.has(requirement)) continue;
        seen.add(requirement);
        named++;
      }
      count += named;
      if (named > 0) components++;
    }
  }
  return { count, components };
}

// CLI entry — run against the real repository and exit non-zero on violations.
if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  const ROOT = join(import.meta.dirname, "..");
  let contract: ParsedA11yContract;
  try {
    contract = readA11yContract(ROOT);
  } catch (error) {
    console.error(`a11y-evidence: ${(error as Error).message}`);
    process.exit(1);
  }
  const failures = checkA11yEvidence(ROOT, contract);
  if (failures.length > 0) {
    console.error(`A11y evidence contract unmet (${String(failures.length)}):`);
    for (const failure of failures) console.error(`  • ${failure}`);
    console.error(
      `\nEvery tiered component needs packages/<tier>/<name>/a11y.json claiming a role from ` +
        `packages/core/src/a11y-contract.ts, evidence for its matrix row (or a recorded exception), ` +
        `and evidence files that exist.`,
    );
    process.exit(1);
  }
  const summary = exceptionSummary(ROOT, contract);
  console.log(
    `A11y evidence contract complete; ${String(summary.count)} named exception(s) across ` +
      `${String(summary.components)} component(s) shrink as evidence lands.`,
  );
}
