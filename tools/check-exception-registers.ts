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
    // 82 since four keyboard rows retired on the role axis: button, switch,
    // copy-button and collapse, whose own harness specs now press their
    // native activation keys (#432, un-qualified in the first role-axis PR);
    // 77 since five more followed: text-field, textarea, drawer, file-upload
    // and stepper, whose harness specs now press their real keyboard
    // contracts (typing through the counter, the reveal toggle's Space,
    // Escape's focus return, the file chooser and the spine's arrows)
    // (#432 tranche 4) — the list and link roles carry no keyboard row, so
    // those two could not shrink further; and 70 since seven components
    // joined the focus-not-obscured suite's literal docs population in
    // e2e/focus-not-obscured.e2e.ts: checkbox, copy-button, icon-button,
    // switch, text-field, textarea and number-field each now carry
    // component-specific cases that witness their own focused control
    // clearing the fixed docs header (#432, the batch that also gave the
    // suite its real-header measurement helper); and 69 since context-menu's
    // keyboard row retired with its own harness spec, which witnesses the
    // whole contract at the role's tier — the trigger's keys, the seat, the
    // arrow walk, typeahead, activation and the Escape return.
    countOfRecord: 69,
  },
  {
    id: "interaction",
    lives: "packages/<tier>/<name>/a11y.json — the interaction claim's exceptions[]",
    owner:
      "ecoma-io/loom#432 — the keyboard-operate harness specs are its tranches 3 and 4, the inertness pins its tranche 1",
    // 39 since the twenty-nine visual-only components pinned their
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
    // (#432 tranche 3) — and since eleven more rows retired on real harness
    // Tab chains: composition's sidebar and split, whose specs now walk the
    // pane boundary wrapped and side by side; layouts' app-shell, dashboard,
    // desktop-app-shell, form-layout and settings, whose specs now walk the
    // hosted landmarks' operable content in document order; and patterns'
    // app-header, form-section, page-header and toast-stack, whose specs now
    // walk the bar's cluster, the group's fields, the actions slot, and Tab
    // into the shared viewport to Space-dismiss a card (#432 tranche 4) — and
    // since eight more rows retired on real keyboard contracts: primitives'
    // drawer, file-upload, list, link, stepper, text-field, textarea and
    // timeline, whose own specs now press the composite's arrow keys and
    // Escape, the native file chooser, and type through the counter, and walk
    // the Tab chain of their interactive surfaces (#432 tranche 4) — and
    // since composition's scroll-reel followed: its spec seats Tab on the
    // named region, steps the strip between snap children with the arrow
    // keys, and jumps the strip's poles with Home and End (#432 tranche 4) —
    // and since the native-passage trio followed: primitives' breadcrumb,
    // whose spec walks Tab across the trail's links in document order and
    // proves the aria-current page is never a seat; patterns' error-summary,
    // whose spec presses Enter through a failed submit to the focused summary
    // box and Enter on an entry link back to the invalid field; and patterns'
    // row-actions, whose spec watches the hosted action group come up under
    // group-focus-within as Tab enters the row and park again as it leaves —
    // and since the wrapped-Reka open/close/traverse batch followed: four
    // composites whose own specs now press their real contracts in a browser —
    // primitives' accordion, whose spec seats Tab on the first trigger and
    // toggles panels with Enter across single and multiple mode; popover,
    // whose spec opens onto the panel's first control, operates the panel's
    // controls with Tab and Space, and closes through Escape back onto the
    // trigger;
    // navigation-menu, whose spec is the first real-key witness its contract
    // has had — Enter opens the panel through the trigger button's own
    // activation, ArrowDown walks into the panel's first link, and Escape
    // returns to the trigger; and command, whose spec drives Loom's own
    // activedescendant handlers — the arrows and Home/End move the highlight
    // while focus stays in the searchbox, Enter runs the highlighted command,
    // and Escape clears the query before it closes the list — and since the
    // picker-and-field batch followed, six rows more: primitives' calendar,
    // whose spec seats Tab through the month buttons onto today's cell, walks
    // day and week steps with the arrows, chooses and clears with Enter, and
    // stops at the min/max fence; date-time-range-picker, whose spec walks
    // one Tab stop across both halves' segments, types digits that fill and
    // advance, and opens the calendar trigger onto the day grid where Enter
    // lays the range down, the completion itself closing the panel back onto
    // the trigger; otp-input, whose
    // spec seats the first empty cell on Tab, fills with auto-advance,
    // completes the code once, backtracks with Backspace clearing the cell
    // before it, and walks the row with the arrows; tags-input, whose spec
    // commits on Enter and on the comma delimiter, lifts the last token with
    // Backspace for re-edit, and fires the remove control on Enter back onto
    // the input; time-picker, whose spec seats the hour on the field's single
    // Tab stop, walks and steps the segments with the arrows and typed digits
    // into the bound model, and flips the period with its key; and chip,
    // whose spec operates the toggle's pressed state with Space and Enter,
    // fires the remove button on Enter from the natural tab order, and proves
    // the disabled chip drops out of the order. Two of those rows described
    // keys their sources never had, and the retirement says so: chip's row
    // named "remove-on-Backspace" and chip has no keydown handler at all —
    // removal is the labelled button's own activation; tags-input's row named
    // "chip-row navigation keys" and the component deliberately stops the
    // wrapped primitive's virtual selection, replacing it with the Backspace
    // lift the spec witnesses; and since the passage-rows batch followed, ten
    // rows more: primitives' field and fieldset, whose specs seat the wired
    // controls with Tab, land typing in the bound models, resolve each row's
    // message id off the seated control, and prove the disabled group's
    // controls drop out of the tab order; hover-card, whose spec witnesses
    // trigger focus opening the card, Escape dismissing it without moving
    // focus, Tab crossing the open card without entering or trapping, and the
    // open card holding nothing tabbable; pagination, whose spec walks the
    // row in its own DOM order, steps pages with Enter across the shared
    // model, and witnesses the fence hand-off that rescues focus onto the
    // current page; scroll-area, whose spec seats each viewport on Tab and
    // scrolls it with the arrows while the scrollbar takes no stop;
    // window-controls, whose spec walks both clusters' three controls in
    // order and flips maximize to Restore and back with Enter; patterns'
    // sidebar-nav, whose spec walks the nav's six links in document order
    // before and after the host folds the rail, each still seating by name;
    // patterns' title-bar, whose spec crosses the hosted clusters — menu
    // triggers, then window buttons — and fires the menu's choose and the
    // maximize flip through the bar; and layouts' master-detail and
    // split-layout, whose specs prove the panes add no stop and trap nothing,
    // wide and wrapped; and context-menu, whose spec seats the panel on Tab,
    // opens it with Shift+F10, Space and Enter, lands on the first enabled
    // command, walks the rows past the separator with the arrows, reaches
    // Paste with typeahead, runs the row focus is on with Enter, and hands
    // focus back to the panel on Escape — a row retired by a fix, not by a
    // spec alone, because its keyboard path did not exist to witness: the
    // wrapper now owns both the trigger's keys and the mount focus Reka
    // spends on an element a browser refuses to focus. Five rows stay, each on
    // the defect named below.
    // Editable: the Enter commit fires the submit event and the value lands
    // in the model, but the editor stays open instead of returning to rest —
    // observed in the harness; the mechanism is not pinned, because the
    // pinned dist's own submit() clears its editing flag, so what keeps the
    // editor open lives above it, and the unit tier cannot see the defect
    // because its Enter test asserts the emitted events and never asks
    // whether the editor closed; its slimmed spec witnesses the open/abandon
    // half and the row holds. Number-field: the steppers are unreachable and
    // inert to the keyboard — reka renders them tabindex="-1" and its
    // pressed-hold handler listens to pointerdown only, so the click a key
    // synthesizes has nothing to land on and a focused stepper does nothing
    // under Enter or Space; the spec pins the non-response beside the pointer
    // contrast that proves the button is alive. Color-picker: an arrow step
    // on either thumb moves the value but not only the value — the preset
    // listbox is bound to the shared model, and reka's listbox re-highlights
    // on any change made outside itself by focusing the selected swatch, so
    // the walk ends on a swatch after one press; the spec witnesses the steps
    // and the row holds the focus half. Dropdown-menu and
    // speed-dial: opening never moves focus into the menu, so no row or pill
    // is reachable by keyboard — the pinned reka-ui focuses its own content
    // element on mount and in the engine that focus never lands, leaving every
    // arrow and Enter press on the still-focused trigger (their slimmed specs
    // witness the open/close half and the speed-dial's horizontal
    // aria-orientation correction; reka-ui issue 1873 names the symptom class
    // upstream). #432 holds all five rows until those open defects land.
    countOfRecord: 6,
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
