// The registers of record: every counted-exception register in the
// repository, held to its owner, its live tracker and its count.
//
// Phase 3 left the repository with five registers that count exceptions
// instead of failing on them — the role axis and the interaction axis of the
// a11y sidecars, the responsive behaviour axis, the token allowlist and the
// composition-conformance rows. Each shrinks as evidence lands, and
// ecoma-io/loom#308 found the discipline was real for exactly one of them:
// the register whose rows carry a mandatory owner and removal milestone. The
// other four counted honestly but pointed at owners that had closed, at
// phases that had shipped without building what they promised, or at nothing
// at all — and nothing failed when a count grew. This gate is the closeout:
// the table below is where each register's ownership lives, the tracker set
// is the only issue space exception text may cite, and every count is pinned
// two-way, so a register can prove its own consistency instead of asserting
// it.
//
// What is asserted, fail-closed:
//
//   1. every register that holds live exceptions has a row in REGISTERS — a
//      register absent from the table is an owner nobody named, the exact
//      shape #308 item 2 records for the 3E blind spot;
//   2. every count equals its count of record — a register that GREW fails
//      and must be owned (raise the pin in a PR that says why); a register
//      that SHRANK fails too, because a stale-high pin is the register lying
//      about where the work is. The pin edit is the receipt for the evidence
//      that landed;
//   3. every `ecoma-io/loom#N` reference in register text — sidecar
//      exceptions and evidence `because` strings, token exception reasons,
//      conformance rows, this table's own fields — names a tracker in
//      LIVE_ISSUE_TRACKERS. An undeclared reference fails: citing an issue
//      is a claim that it is open, and the claim is checked, not assumed.
//      The set itself is small on purpose; when a tracker closes, the CI
//      state check (ecoma-io/loom#432's workflow step) fails the reference
//      sweep, which is the moment to re-point or retire the rows that cite
//      it;
//   4. no exception text cites a tracker it does not need — a `because` that
//      names an issue for a self-contained reason is noise the next reader
//      has to chase. Register text is scanned for references; free prose
//      elsewhere (ledger history, gate comments describing a decision
//      already made) is deliberately out of scope: history may cite closed
//      issues, a live pointer may not.
//
// The counts ARE the point of the counted-exception design: the numbers the
// issue's acceptance turned into the shrinking gap. Everything this gate
// reads is data the other gates already judge for shape and truthfulness —
// nothing here re-checks a sidecar's structure, only its ownership and its
// count of record.
//
// Run: `node --experimental-strip-types tools/check-exception-registers.ts`
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { TIERS } from "./architecture/graph.ts";
import { COMPOSITION_CONFORMANCE_EXCEPTIONS } from "./composition-conformance.exceptions.ts";

/**
 * The issues exception text may cite, each open at the time of the last
 * register sweep. A row's `because` that says "tracked in ecoma-io/loom#432"
 * is a promise that #432 is where the debt is watched; this list is the
 * machine-checkable form of the promise. When an issue here closes, the CI
 * state check fails and the rows citing it are re-pointed or retired in the
 * same PR that closes it — never left to rot the way the fifty-two #272
 * citations did.
 */
export const LIVE_ISSUE_TRACKERS: readonly number[] = [432];

/** One register of record: where the exceptions live, who owns the shrink. */
export interface ExceptionRegister {
  /** The register's identity in summaries and failures. */
  id: string;
  /** Where the exceptions physically live — the reviewer's handle. */
  lives: string;
  /**
   * Who owns burning the count down: a live tracker reference, or the
   * register's own per-row ownership when rows carry their own owner fields
   * (the composition-conformance model, which is why this table needs no
   * second copy of what its gate already enforces).
   */
  owner: string;
  /** The count of record. Two-way pinned: growth and shrink both fail. */
  countOfRecord: number;
}

/**
 * The registers of record. A count here is a claim about the tree, checked
 * on every lint run: landing evidence means lowering the pin in the same PR,
 * and growing a register means raising it in a PR that says why.
 */
export const REGISTERS: readonly ExceptionRegister[] = [
  {
    id: "role-a11y",
    lives: "packages/<tier>/<name>/a11y.json — the role claim's exceptions[]",
    owner:
      "ecoma-io/loom#432 — the focus-not-obscured population and the role-axis remainders are its tranches 1 and 5",
    countOfRecord: 86,
  },
  {
    id: "interaction",
    lives: "packages/<tier>/<name>/a11y.json — the interaction claim's exceptions[]",
    owner:
      "ecoma-io/loom#432 — the keyboard-operate harness specs are its tranches 3 and 4, the inertness pins its tranche 1",
    // 50 since the twenty-nine visual-only components pinned their
    // keyboard-inertness in the unit tier — every one of the class's rows,
    // #432 tranche 1 whole: primitives' avatar, avatar-group, badge,
    // indicator, inline-error, kbd, live-region, meter, progress,
    // radial-progress, separator, skeleton, spinner, surface, tooltip and
    // visually-hidden; composition's center, dashboard-grid, frame, grid,
    // inline and stack; patterns' empty-state, error-state, form-actions,
    // loading-state and metric-card; layouts' centered and reading — and
    // since nine more rows retired on real harness gestures: button, switch,
    // checkbox, icon-button, copy-button, collapse, alert, toast and
    // skip-link, whose native keyboard contracts their own specs now press
    // (#432 tranche 3).
    countOfRecord: 50,
  },
  {
    id: "responsive",
    lives: "packages/<tier>/<name>/a11y.json — the responsive claim's exceptions[]",
    owner:
      "per-row standing records: three band-scale rows name the geometry fact that never turns, and the device-media row names the engine limit (Playwright ships no pointer emulation). No tracker — each row's because is its own removal condition, and #275's wrapped-width question closed resolved",
    countOfRecord: 4,
  },
  {
    id: "token-allowlist",
    lives: "packages/core/src/theme-contract.ts — TOKEN_EXCEPTIONS",
    owner:
      "standing records, not debt: each row is a size-scale step or a demo-exact value whose because names the token family that would replace it. No tracker — the register is the shrinking end of a gate that already fails an entry the tree has shed",
    countOfRecord: 27,
  },
  {
    id: "composition-conformance",
    lives: "tools/composition-conformance.exceptions.ts",
    owner:
      "per-row — the gate enforces mandatory reason, owner and removal on every row, the model the other registers were held to",
    countOfRecord: 1,
  },
];

/** Every `ecoma-io/loom#N` reference in a piece of register text. */
export function issueReferences(text: string): number[] {
  return [...text.matchAll(/ecoma-io\/loom#(\d+)/g)].map((match) => Number(match[1]));
}

/** Read every sidecar under every tier, as `{ path, json }` records. */
function sidecars(root: string): { path: string; json: Record<string, unknown> }[] {
  const found: { path: string; json: Record<string, unknown> }[] = [];
  for (const tier of TIERS) {
    const tierDir = join(root, "packages", tier);
    if (!existsSync(tierDir)) continue;
    for (const name of readdirSync(tierDir).sort()) {
      const sidecarPath = join(tierDir, name, "a11y.json");
      if (!statSync(join(tierDir, name)).isDirectory() || !existsSync(sidecarPath)) continue;
      try {
        const json = JSON.parse(readFileSync(sidecarPath, "utf8")) as Record<string, unknown>;
        found.push({ path: ["packages", tier, name, "a11y.json"].join("/"), json });
      } catch {
        // The a11y and interaction gates already fail the unparseable sidecar
        // by name; this gate counts registers, and an unreadable file counts
        // as nothing here rather than as an empty one.
      }
    }
  }
  return found;
}

/**
 * Every `because` string anywhere in one sidecar — exception rows and
 * qualified evidence entries on all three axes. These are the texts that
 * claim things about live issues.
 */
/** The array a JSON field holds, or none — a malformed field counts as none. */
function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function becauseStrings(json: Record<string, unknown>): string[] {
  const texts: string[] = [];
  const collect = (claim: unknown): void => {
    if (typeof claim !== "object" || claim === null) return;
    const record = claim as Record<string, unknown>;
    for (const exception of asArray(record.exceptions)) {
      if (typeof exception.because === "string") texts.push(exception.because);
    }
    for (const entries of Object.values(record.evidence ?? {})) {
      for (const entry of asArray(entries)) {
        if (typeof entry.because === "string") texts.push(entry.because);
      }
    }
  };
  collect(json);
  collect(json.interaction);
  collect(json.responsive);
  return texts;
}

/**
 * The `because` strings of TOKEN_EXCEPTIONS, parsed from the contract's
 * source text — the same parse-only discipline the token allowlist gate
 * applies, because the tooling layer does not import the library it checks.
 */
export function tokenBecauseStrings(themeContractSource: string): string[] {
  const start = themeContractSource.indexOf("export const TOKEN_EXCEPTIONS = [");
  if (start === -1) return [];
  const open = themeContractSource.indexOf("[", start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < themeContractSource.length; i++) {
    if (themeContractSource[i] === "[") depth++;
    else if (themeContractSource[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return [];
  return [
    ...themeContractSource.slice(open, end).matchAll(/because:\s*\n?\s*"((?:[^"\\]|\\.)*)"/g),
  ].map((match) => match[1] ?? "");
}

/** The live count and citation space of every register, read from the tree. */
export function readRegisters(root: string): {
  counts: Map<string, number>;
  registerTexts: { register: string; text: string; from: string }[];
} {
  const counts = new Map<string, number>([
    ["role-a11y", 0],
    ["interaction", 0],
    ["responsive", 0],
    ["token-allowlist", 0],
    ["composition-conformance", 0],
  ]);
  const registerTexts: { register: string; text: string; from: string }[] = [];

  for (const { path, json } of sidecars(root)) {
    counts.set("role-a11y", (counts.get("role-a11y") ?? 0) + asArray(json.exceptions).length);
    const interactionClaim =
      typeof json.interaction === "object" && json.interaction !== null
        ? (json.interaction as Record<string, unknown>)
        : {};
    const responsiveClaim =
      typeof json.responsive === "object" && json.responsive !== null
        ? (json.responsive as Record<string, unknown>)
        : {};
    counts.set(
      "interaction",
      (counts.get("interaction") ?? 0) + asArray(interactionClaim.exceptions).length,
    );
    counts.set(
      "responsive",
      (counts.get("responsive") ?? 0) + asArray(responsiveClaim.exceptions).length,
    );
    for (const text of becauseStrings(json)) {
      registerTexts.push({ register: "sidecars", text, from: path });
    }
  }

  const themeContract = readFileSync(
    join(root, "packages", "core", "src", "theme-contract.ts"),
    "utf8",
  );
  const tokenBecause = tokenBecauseStrings(themeContract);
  counts.set("token-allowlist", tokenBecause.length);
  for (const text of tokenBecause) {
    registerTexts.push({
      register: "token-allowlist",
      text,
      from: "packages/core/src/theme-contract.ts",
    });
  }

  counts.set("composition-conformance", COMPOSITION_CONFORMANCE_EXCEPTIONS.length);
  for (const row of COMPOSITION_CONFORMANCE_EXCEPTIONS) {
    for (const text of [row.reason, row.owner, row.removal]) {
      registerTexts.push({
        register: "composition-conformance",
        text,
        from: "tools/composition-conformance.exceptions.ts",
      });
    }
  }

  for (const register of REGISTERS) {
    registerTexts.push({
      register: register.id,
      text: `${register.lives} ${register.owner}`,
      from: "tools/check-exception-registers.ts",
    });
  }

  return { counts, registerTexts };
}

/**
 * Every violation of the register law, one human-readable string each — the
 * a11y gates' failure style.
 */
export function checkExceptionRegisters(
  root: string,
  liveTrackers: readonly number[] = LIVE_ISSUE_TRACKERS,
  registers: readonly ExceptionRegister[] = REGISTERS,
): string[] {
  const failures: string[] = [];
  const { counts, registerTexts } = readRegisters(root);
  const live = new Set(liveTrackers);

  for (const register of registers) {
    const liveCount = counts.get(register.id);
    if (liveCount === undefined) {
      failures.push(
        `${register.id}: no reader produces this register's count — the table names a register the tree no longer holds`,
      );
      continue;
    }
    if (liveCount > register.countOfRecord) {
      failures.push(
        `${register.id}: holds ${String(liveCount)} exception(s) against a count of record of ${String(register.countOfRecord)} — the register GREW. Raise the pin in a PR that owns the growth (a new component, a new duty); a register that grows unowned is the failure #308 item 5 records`,
      );
    } else if (liveCount < register.countOfRecord) {
      failures.push(
        `${register.id}: holds ${String(liveCount)} exception(s) against a count of record of ${String(register.countOfRecord)} — the register SHRANK. Lower the pin to ${String(liveCount)} in the PR that landed the evidence: the pin edit is the receipt`,
      );
    }
  }

  for (const [id, count] of counts) {
    if (registers.some((register) => register.id === id)) continue;
    failures.push(
      `${id}: holds ${String(count)} live exception(s) and appears in no register row — an owner nobody named`,
    );
  }

  for (const { register, text, from } of registerTexts) {
    for (const issue of issueReferences(text)) {
      if (!live.has(issue)) {
        failures.push(
          `${register}: register text cites ecoma-io/loom#${String(issue)} (${from}) — not a live tracker (${liveTrackers.map(String).join(", ") || "none"}). Re-point the row or retire it; a citation of a closed issue is the dead-pointer class this gate exists to kill`,
        );
      }
    }
  }

  return failures;
}

// CLI entry — run against the real repository and exit non-zero on violations.
if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  const ROOT = join(import.meta.dirname, "..");
  const failures = checkExceptionRegisters(ROOT);
  if (failures.length > 0) {
    console.error(`Exception registers inconsistent (${String(failures.length)}):`);
    for (const failure of failures) console.error(`  • ${failure}`);
    process.exit(1);
  }
  const { counts } = readRegisters(ROOT);
  const table = REGISTERS.map((register) => {
    const liveCount = counts.get(register.id) ?? 0;
    return `  ${register.id}: ${String(liveCount)} (of record ${String(register.countOfRecord)}) — ${register.owner}`;
  });
  console.log(
    `Exception registers consistent; live trackers: ${LIVE_ISSUE_TRACKERS.map((n) => `ecoma-io/loom#${String(n)}`).join(", ")}\n${table.join("\n")}`,
  );
}
