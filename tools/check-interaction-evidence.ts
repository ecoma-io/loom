// Every component declares the class of interaction it owns, and this is what
// holds that claim to the law.
//
// The claim is the `interaction` key of `packages/<tier>/<name>/a11y.json` —
// the third axis of the sixth artifact, not a second file, the reservation the
// contract's own docblock kept — and the law is the interaction half of
// `packages/core/src/a11y-contract.ts`: a closed four-class vocabulary
// (interactive / composite / container / visual-only), the two runtimes that
// can witness an interaction duty, and the matrix binding each class to the
// duties it owes. Neither is restated here. The contract is PARSED, not
// imported, for the same two reasons tools/check-a11y-evidence.ts parses
// rather than imports: the tooling layer's boundary row forbids importing the
// library it checks, and a checker that executed its subject could not report
// on a tree that will not load. The parse is fail-closed — a contract this
// tool cannot read exits non-zero naming the fault, never an empty verdict.
//
// Scope: every component in every tier, because every tier owns an interaction
// contract or owns the deliberate absence of one — a layout wrapper's
// visual-only claim is a claim, and `check-a11y-evidence.ts` already reads all
// four tiers for the same reason.
//
// What is asserted per component, in the a11y gate's failure style:
//
//   1. the sidecar exists, parses as JSON, and carries an `interaction` claim
//      shaped exactly as the law's interface — class, basis, evidence,
//      exceptions;
//   2. the claimed class is in the vocabulary and carries a matrix row — both
//      halves of that sentence are the parser's guarantees, checked before a
//      single sidecar is read;
//   3. every duty of the class's row is answered by an unqualified evidence
//      entry in the duty's tier, or carries a recorded exception — duty id
//      plus reason. Exceptions are counted and named, not failed on: the
//      contract lands truthfully and shrinks as the harness-spec tranche
//      lands. Three refinements keep that honest:
//        - keyboard-operate is answered by a TREE FACT, not prose: the gate
//          reads the cited harness spec (comment-blind, line-aware — a
//          trailing `// retired:` keypress is as inert as a whole-line one)
//          for a keyboard gesture, because a spec that never presses a key
//          cannot witness operability. This is the one lie about interaction
//          evidence a file's own text can catch, and it is why
//          button.e2e.ts — click and disabled evidence, no keypress —
//          answers the duty for no component, however interactively it
//          clicks;
//        - an unqualified browserless entry answers the duty its tier owes
//          taken at its word (a unit test pinning disabled states, a pin of
//          inertness); a because-qualified one declares it witnesses less
//          than that, and answers nothing — so a claim cannot borrow a
//          narrower file as full coverage. DEPTH inside a file — which keys a
//          spec presses, which states a test pins — stays the claim's
//          `basis` in prose, the same honest limit the responsive gate
//          records;
//        - a malformed exception (an unknown duty, a blank or non-string
//          `because`, the same duty twice) fails closed, because silently
//          upgrading it would empty the record in the one direction a lie
//          wants to go;
//   4. no exception for a duty the evidence already answers, and none for a
//      duty the class does not owe — a claim cannot both have and lack the
//      same thing;
//   5. every evidence path exists in the tree as a file, and lives where its
//      tier's evidence lives — harness citations under the component's own
//      `e2e/`, browserless citations under its own `tests/`. The tier is the
//      JSON key, never the file location; the placement rule also closes the
//      string-literal hole for the harness tier, since a `tests/` file can no
//      longer be cited there whatever its text contains. Declared-but-absent
//      evidence is the fabricated kind, and fails outright;
//   6. evidence in a tier the class's row does not demand carries a
//      `because` — surplus without a recorded reason would let any component
//      claim any tier and reduce the matrix to decoration.
//
// Run: `node --experimental-strip-types tools/check-interaction-evidence.ts`
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { TIERS } from "./architecture/graph.ts";

/** The law, parsed out of the contract module's source text. */
export interface ParsedInteractionContract {
  classes: string[];
  tiers: string[];
  requirements: { id: string; tier: string; answers: string[] }[];
  matrix: { class: string; requirements: string[] }[];
}

/**
 * Remove comments before parsing. The same approximation
 * tools/check-a11y-evidence.ts makes — this is a parser for a file this
 * repository owns, not a TypeScript front end — and for the same reason: the
 * contract's docblocks are documentation and must be free to mention a class
 * word or a duty id without becoming law.
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

/** One record's fields: `class: "x"` and `requirements: ["a", "b"]` shapes. */
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
  throw new Error(
    `the interaction half of packages/core/src/a11y-contract.ts is unreadable as law: ${why}`,
  );
}

/**
 * Parse the contract's interaction half into its working sets. Every
 * structural fault is a thrown Error, which the CLI turns into exit 1: a law
 * the gate cannot read must stop the gate, not empty it.
 */
export function parseInteractionContract(source: string): ParsedInteractionContract {
  const text = stripComments(source);

  const classes = quotedStrings(constArray(text, "INTERACTION_CLASSES"));
  if (classes.length === 0) unreadable("INTERACTION_CLASSES is empty");
  if (new Set(classes).size !== classes.length) {
    unreadable("the class vocabulary repeats a member");
  }

  const tiers = quotedStrings(constArray(text, "INTERACTION_EVIDENCE_TIERS"));
  if (tiers.length === 0) unreadable("INTERACTION_EVIDENCE_TIERS is empty");
  if (new Set(tiers).size !== tiers.length) unreadable("the evidence tiers repeat a member");
  // The sweep is page-geometry evidence and answers no interaction duty; if a
  // duty ever needs it, that is a law edit with its own reason, not a tier
  // that quietly reappears.
  if (tiers.includes("sweep")) {
    unreadable("sweep cannot be an interaction tier — no duty it can witness is defined");
  }

  const requirementRecords = records(constArray(text, "INTERACTION_REQUIREMENTS"));
  const requirements = requirementRecords.map((entry) => {
    const parsed = fields(entry);
    const id = parsed.get("id");
    const tier = parsed.get("tier");
    const answers = parsed.get("answers");
    if (typeof id !== "string" || typeof tier !== "string" || !Array.isArray(answers)) {
      return unreadable(`a duty record is missing id, tier or answers: ${entry.slice(0, 60)}`);
    }
    return { id, tier, answers };
  });
  if (requirements.length === 0) unreadable("INTERACTION_REQUIREMENTS is empty");
  const ids = new Set(requirements.map((r) => r.id));
  if (ids.size !== requirements.length) unreadable("INTERACTION_REQUIREMENTS repeats an id");
  for (const requirement of requirements) {
    if (!tiers.includes(requirement.tier)) {
      unreadable(`duty ${requirement.id} demands tier "${requirement.tier}", which no tier names`);
    }
    if (requirement.answers.length === 0) {
      unreadable(
        `duty ${requirement.id} answers nothing — a duty nothing names cannot be argued with`,
      );
    }
  }

  const matrixRecords = records(constArray(text, "INTERACTION_MATRIX"));
  const matrix = matrixRecords.map((entry) => {
    const parsed = fields(entry);
    const cls = parsed.get("class");
    const owed = parsed.get("requirements");
    if (typeof cls !== "string" || !Array.isArray(owed)) {
      return unreadable(`a matrix record is missing class or requirements: ${entry.slice(0, 60)}`);
    }
    if (!classes.includes(cls)) {
      unreadable(`the matrix judges "${cls}", which the vocabulary does not carry`);
    }
    const unknown = owed.filter((id) => !ids.has(id));
    if (unknown.length > 0) {
      unreadable(`class ${cls} requires ${unknown.join(", ")}, which no definition supplies`);
    }
    if (owed.length === 0) {
      unreadable(
        `class ${cls}'s row is empty — a class that owes nothing is not in the vocabulary`,
      );
    }
    return { class: cls, requirements: owed };
  });
  if (matrix.length === 0) unreadable("INTERACTION_MATRIX is empty");
  const matrixClasses = new Set(matrix.map((row) => row.class));
  if (matrixClasses.size !== matrix.length) unreadable("INTERACTION_MATRIX repeats a class");
  // Parity, both directions — the a11y gate's own discipline: a class the
  // vocabulary carries but no row judges would pass every gate while owing
  // nothing, which is how a class quietly exits the law.
  const unjudged = classes.filter((cls) => !matrixClasses.has(cls));
  if (unjudged.length > 0) {
    unreadable(
      `the vocabulary carries ${unjudged.map((cls) => `"${cls}"`).join(", ")} with no matrix row — a class that owes nothing is not in the vocabulary`,
    );
  }

  return { classes, tiers, requirements, matrix };
}

/** The contract read from the repository this tool runs against. */
export function readInteractionContract(root: string): ParsedInteractionContract {
  return parseInteractionContract(
    readFileSync(join(root, "packages", "core", "src", "a11y-contract.ts"), "utf8"),
  );
}

/**
 * Whether a spec file performs a keyboard gesture at all — the tree fact a
 * keyboard-operate answer rests on. Comment-blind, like every reader here: a
 * remarked keypress is not one the spec performs, so coverage must not be
 * writable as a comment — and that holds for a trailing remark exactly as for
 * a whole-line one, which is why the strip below is line-aware rather than
 * line-anchored. `.press(` is Playwright's keyboard action on a locator as
 * well as on `page.keyboard`; `keyboard.down/up/type/insertText` cover the
 * held-key and typing forms.
 */
export function namesAKeyboardGesture(content: string): boolean {
  return /\bkeyboard\s*\.\s*(press|down|up|type|insertText)\b|\.press\s*\(/.test(
    stripLineAwareComments(content),
  );
}

/**
 * Remove `//` comments wherever they sit on a line and `/* … *&#47;` blocks,
 * quote-aware: the whole-line-only strip this used let
 * `click(); // retired: await page.keyboard.press("Enter")` count as a
 * gesture — a retired keypress is as inert as a remarked one, and the
 * trailing shape is where retired code actually lives. Quoted spans pass
 * through byte for byte, so a URL's `//` can neither start nor swallow a
 * comment; the scanner's residuals (a regex literal masquerading as a
 * comment) fail toward finding no gesture, never toward finding one.
 */
function stripLineAwareComments(text: string): string {
  let out = "";
  let quote: string | null = null;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === undefined) break;
    if (quote !== null) {
      out += ch;
      // An escaped quote is data, not the end of the literal.
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
      // The newline itself survives, so code on the following line is still
      // read on its own line.
      const end = text.indexOf("\n", i);
      i = end === -1 ? text.length : end;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

interface EvidenceEntry {
  path: string;
  because?: string;
}

interface ParsedInteractionClaim {
  class: string;
  basis: string;
  evidence: Partial<Record<string, EvidenceEntry[]>>;
  exceptions: { requirement: string; because: string }[];
}

/** `button` → `Button`, the component and message name — the a11y gate's convention. */
function toPascal(name: string): string {
  return name.replace(/(^|[-_])([a-z])/g, (_match, _sep: string, char: string) =>
    char.toUpperCase(),
  );
}

function parseClaim(
  component: string,
  relSidecar: string,
  contract: ParsedInteractionContract,
  record: Record<string, unknown>,
  failures: string[],
): ParsedInteractionClaim | null {
  const raw = record.interaction;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    failures.push(
      `${component}: ${relSidecar} carries no interaction claim — every component declares the class of interaction it owns, or owns its absence`,
    );
    return null;
  }
  const claim = raw as Record<string, unknown>;

  const knownKeys = new Set(["class", "basis", "evidence", "exceptions"]);
  for (const key of Object.keys(claim)) {
    if (!knownKeys.has(key)) {
      // Fail, not skip: a typo'd key would otherwise read as an absent one and
      // the claim would quietly lose a field.
      failures.push(
        `${component}: interaction claim carries unknown key "${key}" — extend the contract and this gate together`,
      );
    }
  }

  const cls = claim.class;
  if (typeof cls !== "string" || !contract.classes.includes(cls)) {
    failures.push(
      `${component}: interaction claim asserts class ${JSON.stringify(cls ?? null)} — outside the closed vocabulary (${contract.classes.join(", ")})`,
    );
    return null;
  }
  const basis = claim.basis;
  if (typeof basis !== "string" || basis.trim().length === 0) {
    failures.push(
      `${component}: interaction claim carries no basis — the fact that puts the component in its class is what a reviewer checks`,
    );
    return null;
  }

  const tierNames = new Set(contract.tiers);
  const evidence: Partial<Record<string, EvidenceEntry[]>> = {};
  const rawEvidence = claim.evidence;
  if (rawEvidence !== undefined) {
    if (typeof rawEvidence !== "object" || rawEvidence === null || Array.isArray(rawEvidence)) {
      failures.push(`${component}: interaction evidence must be an object keyed by tier`);
      return null;
    }
    for (const [tier, entries] of Object.entries(rawEvidence as Record<string, unknown>)) {
      if (!tierNames.has(tier)) {
        failures.push(
          `${component}: interaction evidence under "${tier}" — no such tier (${contract.tiers.join(", ")})`,
        );
        continue;
      }
      if (!Array.isArray(entries)) {
        failures.push(`${component}: interaction evidence.${tier} must be an array`);
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
          // The claim level rejects unknown keys; an entry is the same
          // surface one level down, and `{ path, becaus: "…" }` must fail the
          // same way — a typo'd because would otherwise read as an absent
          // one and the citation would quietly lose its qualification.
          const entryKeys = new Set(["path", "because"]);
          for (const key of Object.keys(shaped)) {
            if (!entryKeys.has(key)) {
              failures.push(
                `${component}: interaction evidence.${tier} entry "${shaped.path as string}" carries unknown key "${key}" — extend the contract and this gate together`,
              );
            }
          }
          const because = shaped.because;
          // exactOptionalPropertyTypes: the key is set or absent, never
          // undefined — and a non-string or blank because fails closed, where
          // dropping the key would silently upgrade the entry to unqualified,
          // the one direction a lie wants to go.
          if (because === undefined) {
            parsed.push({ path: shaped.path as string });
          } else if (typeof because === "string" && because.trim().length > 0) {
            parsed.push({ path: shaped.path as string, because });
          } else {
            failures.push(
              `${component}: interaction evidence.${tier} entry "${shaped.path as string}" carries a because that is not a non-empty string — narrow it or drop the key`,
            );
          }
        } else {
          failures.push(
            `${component}: interaction evidence.${tier} carries an entry that is neither a path nor { path, because }`,
          );
        }
      }
      evidence[tier] = parsed;
    }
  }

  const dutyIds = new Set(contract.requirements.map((r) => r.id));
  const exceptions: { requirement: string; because: string }[] = [];
  const rawExceptions = claim.exceptions;
  if (rawExceptions !== undefined) {
    if (!Array.isArray(rawExceptions)) {
      failures.push(`${component}: interaction exceptions must be an array`);
      return null;
    }
    for (const entry of rawExceptions) {
      const shaped = (typeof entry === "object" && entry !== null ? entry : {}) as Record<
        string,
        unknown
      >;
      const requirement = shaped.requirement;
      const because = shaped.because;
      if (typeof requirement !== "string" || !dutyIds.has(requirement)) {
        failures.push(
          `${component}: interaction claim records an exception for ${JSON.stringify(requirement ?? null)} — no such duty`,
        );
        continue;
      }
      if (exceptions.some((recorded) => recorded.requirement === requirement)) {
        // One duty, one exception row: a repeated row would double-count in
        // the summary — the number the work list is read off — while saying
        // nothing the first row did not.
        failures.push(
          `${component}: interaction exceptions name ${requirement} twice — one duty, one exception row`,
        );
        continue;
      }
      if (typeof because !== "string" || because.trim().length === 0) {
        failures.push(
          `${component}: interaction exception for ${requirement} carries no because — an unexplained exception is indistinguishable from a forgotten one`,
        );
        continue;
      }
      exceptions.push({ requirement, because });
    }
  }

  return { class: cls, basis, evidence, exceptions };
}

/**
 * Every interaction-claim violation the rules found, one human-readable string
 * each — `Name: what is wrong`, with repository-relative paths, in the a11y
 * gate's failure style.
 */
export function checkInteractionEvidence(
  root: string,
  contract: ParsedInteractionContract,
): string[] {
  const failures: string[] = [];

  const rowByClass = new Map(contract.matrix.map((row) => [row.class, row.requirements]));
  const tierOfDuty = new Map(contract.requirements.map((r) => [r.id, r.tier]));

  /**
   * Where each evidence tier's files live: the tier is the JSON key, never
   * the file location. Harness duties are browser facts and their citations
   * are the component's own Playwright specs; browserless duties are unit
   * facts and their citations are its own tests. The tree already conformed
   * 100% when the rule landed — the check pins the convention, it does not
   * move files.
   */
  const TIER_DIRECTORIES: Record<string, "e2e" | "tests"> = {
    harness: "e2e",
    browserless: "tests",
  };

  /** A declared path is repository-root-relative, and it exists as a file. */
  function checkPath(
    component: string,
    where: string,
    raw: unknown,
    expectedPrefix: string | null,
    tierKey: string,
  ): string | null {
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
      // A directory is not evidence of anything — the harness reads specs, the
      // browserless tier reads tests, and neither is a directory.
      failures.push(`${component}: ${where} "${raw}" is not a file`);
      return null;
    }
    if (expectedPrefix === null) {
      // Fail closed on a tier the map does not know: a future tier with no
      // directory convention would otherwise be an unjudged place to cite
      // from until someone teaches this gate where its evidence lives.
      failures.push(
        `${component}: ${where} — the "${tierKey}" tier has no directory convention; teach this gate where its evidence lives`,
      );
      return null;
    }
    // Placement is checked against the citing component's own directory: a
    // browserless unit test can no longer answer a harness duty by carrying
    // the words `page.keyboard.press` in a string literal — the only file
    // that can is one the harness would actually run. (A literal inside an
    // e2e spec stays review-held: text matching is a floor, not a reader.)
    if (!raw.startsWith(expectedPrefix)) {
      failures.push(
        `${component}: ${where} "${raw}" must live under ${expectedPrefix} — ` +
          `the evidence tier is the JSON key, never the file location`,
      );
      return null;
    }
    return resolved;
  }

  /**
   * Cited file contents, read once — several components cite the same unit
   * tier, and a spec is read for its keyboard fact only once.
   */
  const contentCache = new Map<string, string>();
  function contentOf(component: string, where: string, resolved: string): string | null {
    const known = contentCache.get(resolved);
    if (known !== undefined) return known;
    try {
      const read = readFileSync(resolved, "utf8");
      contentCache.set(resolved, read);
      return read;
    } catch {
      // An unreadable spec must never read as an empty one: the duty stays
      // unanswered and the verdict names the file.
      failures.push(`${component}: ${where} is unreadable`);
      return null;
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
      if (!claim) continue;

      const row = rowByClass.get(claim.class);
      // The parser's parity check makes this unreachable; the guard stays so a
      // parser edit that loses parity can never turn into a skipped sidecar.
      if (!row) continue;

      // Entries paired with the paths their citations resolved to, so an
      // answer can be traced to a file that actually exists. An entry whose
      // path failed the tree check pairs with null and can answer nothing.
      const entriesByTier = new Map<string, { entry: EvidenceEntry; resolved: string | null }[]>();
      for (const [entryTier, entries] of Object.entries(claim.evidence)) {
        const dir = TIER_DIRECTORIES[entryTier];
        const expectedPrefix =
          dir === undefined ? null : ["packages", tier, name, dir, ""].join("/");
        entriesByTier.set(
          entryTier,
          (entries ?? []).map((entry) => ({
            entry,
            resolved: checkPath(
              component,
              `interaction evidence.${entryTier} entry`,
              entry.path,
              expectedPrefix,
              entryTier,
            ),
          })),
        );
      }

      // A duty is answered by unqualified entries in its own tier — and for
      // keyboard-operate, only when one of those files performs a keyboard
      // gesture. A because-qualified entry witnesses less than the tier's
      // obligation and answers nothing, whichever tier it sits in.
      const answered = new Set(
        row.filter((id) => {
          const tier = tierOfDuty.get(id) ?? "";
          // A pair whose path failed any check (dangling, misplaced, a
          // directory) resolves to null and answers nothing — for every
          // duty, not only keyboard-operate: the gesture check used to be
          // the one consumer of `resolved`, which let a failed browserless
          // citation answer state-report at the very moment the gate
          // reported the citation broken.
          const unqualified = (entriesByTier.get(tier) ?? []).filter(
            (pair) => pair.entry.because === undefined && pair.resolved !== null,
          );
          if (unqualified.length === 0) return false;
          if (id !== "keyboard-operate") return true;
          return unqualified.some((pair) => {
            if (pair.resolved === null) return false;
            const content = contentOf(
              component,
              `interaction evidence.${tier} entry "${pair.entry.path}"`,
              pair.resolved,
            );
            return content !== null && namesAKeyboardGesture(content);
          });
        }),
      );

      for (const dutyId of row) {
        if (answered.has(dutyId)) continue;
        const exception = claim.exceptions.find((e) => e.requirement === dutyId);
        if (!exception) {
          failures.push(
            `${component}: class ${claim.class} requires ${dutyId} (${tierOfDuty.get(dutyId) ?? "no tier"} tier) — no evidence declared and no exception recorded`,
          );
        }
      }

      for (const exception of claim.exceptions) {
        if (answered.has(exception.requirement)) {
          failures.push(
            `${component}: ${exception.requirement} is answered by evidence and excepted at once — drop one or the other`,
          );
        } else if (!row.includes(exception.requirement)) {
          failures.push(
            `${component}: class ${claim.class} owes no ${exception.requirement} — an exception for a duty the row does not demand is noise in the record`,
          );
        }
      }

      const demandedTiers = new Set(row.map((id) => tierOfDuty.get(id) ?? ""));
      for (const [entryTier, entries] of Object.entries(claim.evidence)) {
        const demanded = demandedTiers.has(entryTier);
        for (const entry of entries ?? []) {
          if (!demanded && entry.because === undefined) {
            failures.push(
              `${component}: interaction evidence.${entryTier} entry "${entry.path}" — class ${claim.class} owes nothing in the ${entryTier} tier; record a because for surplus evidence`,
            );
          }
        }
      }
    }
  }

  return failures;
}

/**
 * How much of the interaction contract is answered outright versus carried as
 * named exceptions — the number the issue's design turns into the shrinking
 * gap: every exception is a duty the class's row demands and nothing answers
 * yet, counted per duty so the summary says WHICH obligation is still open.
 */
export function interactionExceptionSummary(root: string): {
  count: number;
  components: number;
  byDuty: Record<string, number>;
} {
  const byDuty: Record<string, number> = {};
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
      const claim = (parsed as Record<string, unknown>).interaction;
      if (typeof claim !== "object" || claim === null) continue;
      const exceptions = (claim as Record<string, unknown>).exceptions;
      if (!Array.isArray(exceptions)) continue;
      // One duty, one row: the verdict fails a repeated exception row, and the
      // summary — the number of record — must agree with the verdict rather
      // than with the raw text, so a duplicate is never tallied twice.
      const seen = new Set<string>();
      let named = 0;
      for (const exception of exceptions) {
        const duty = (exception as Record<string, unknown>).requirement;
        if (typeof duty !== "string" || seen.has(duty)) continue;
        seen.add(duty);
        named++;
        byDuty[duty] = (byDuty[duty] ?? 0) + 1;
      }
      count += named;
      if (named > 0) components++;
    }
  }
  return { count, components, byDuty };
}

// CLI entry — run against the real repository and exit non-zero on violations.
if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  const ROOT = join(import.meta.dirname, "..");
  let contract: ParsedInteractionContract;
  try {
    contract = readInteractionContract(ROOT);
  } catch (error) {
    console.error(`interaction-evidence: ${(error as Error).message}`);
    process.exit(1);
  }
  const failures = checkInteractionEvidence(ROOT, contract);
  if (failures.length > 0) {
    console.error(`Interaction evidence contract unmet (${String(failures.length)}):`);
    for (const failure of failures) console.error(`  • ${failure}`);
    console.error(
      `\nEvery tiered component needs an interaction claim in its a11y.json — a class from ` +
        `packages/core/src/a11y-contract.ts, evidence for its matrix row (or a recorded exception), ` +
        `and evidence files that exist.`,
    );
    process.exit(1);
  }
  const summary = interactionExceptionSummary(ROOT);
  const perDuty = Object.entries(summary.byDuty)
    .map(([duty, n]) => `${duty}: ${String(n)}`)
    .join(", ");
  console.log(
    `Interaction evidence contract complete; ${String(summary.count)} named exception(s) across ` +
      `${String(summary.components)} component(s)${perDuty.length > 0 ? ` (${perDuty})` : ""} shrink as evidence lands.`,
  );
}
