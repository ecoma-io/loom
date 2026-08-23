/**
 * Proof that `lattice check` fails when this repository's architecture is
 * broken — not merely that it passes when the architecture is intact.
 *
 * A boundary checker that reports nothing looks exactly like a boundary
 * nobody crossed, and `module-boundaries.config.mjs` is a file a pull request
 * can edit. A row whose `sourceTag` no project carries selects nothing, a
 * `paths` alias that stops resolving turns every internal import into an
 * external one, a project that loses its tag falls out of every row — and all
 * three read as a clean run. So each rule that table states is exercised here
 * against the real tree: the mutation is written to disk, `lattice check` is
 * run over the whole workspace, the messageId it reports is compared with the
 * one the mutation was designed to produce, and the file is restored byte for
 * byte before the next one starts.
 *
 * Two of the cases below expect Lattice to report NOTHING, and they are the
 * most valuable rows in the file. Each documents a boundary this repository
 * enforces that Lattice structurally cannot see — the reason
 * `tools/check-architecture.ts` is still wired into `pnpm lint` rather than
 * retired in favour of this. If Lattice grows the ability to see one, that row
 * turns red, which is the signal to delete it and the corresponding note in
 * `docs/architecture/contract.md`.
 *
 * Restoration is by stored bytes and a `finally`, never by `git checkout`: the
 * working tree is usually dirty while someone is working, and a mutation
 * harness that resolves a crash by discarding the developer's uncommitted work
 * would be a worse failure than the one it was reporting.
 *
 * Run: `pnpm lattice:mutations` (about forty seconds — one whole-workspace
 * check per mutation, which is the only run the cycle rule is honest in).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

/** A file this harness edits, and the text it must be restored to. */
interface Snapshot {
  path: string;
  /** `null` when the file did not exist before the mutation created it. */
  original: string | null;
}

export interface Mutation {
  /** Kebab-case id, printed in the report. */
  name: string;
  /** The attack in one line: what a contributor would be doing wrong. */
  attack: string;
  /**
   * The violation ids this mutation must produce. An empty array means the
   * mutation must leave the run clean — either because the edit is legal
   * (a control) or because it is a documented blind spot, which `note` states.
   */
  expect: string[];
  /** Why an empty `expect` is the correct answer. Required when it is empty. */
  note?: string;
  /** Files to edit, each with the text to write. */
  edits: { path: string; append?: string; replace?: [RegExp, string] }[];
}

/**
 * The attack list. Each entry names a way the layer order in
 * `module-boundaries.config.mjs` could be broken, in the spelling a
 * contributor would actually reach for.
 *
 * `badge` is the subject of most of them because it is the smallest primitive
 * with no dependencies of its own, so a mutation there adds exactly one edge
 * and the report names exactly one thing.
 */
export const MUTATIONS: Mutation[] = [
  {
    name: "control-downward-import-is-allowed",
    attack: "a primitive imports core — the direction the table permits",
    expect: [],
    note: "the control. A run that fails here is reporting the tree, not the mutation, and every verdict below it is worthless.",
    edits: [
      {
        path: "packages/primitives/badge/src/index.ts",
        append: '\nimport "@ecoma-io/loom-core";\n',
      },
    ],
  },
  {
    name: "upward-import-primitive-to-block",
    attack: "a primitive imports a block — an edge against the layer order",
    expect: ["onlyTagsConstraintViolation"],
    edits: [
      {
        path: "packages/primitives/badge/src/index.ts",
        append: '\nimport "@ecoma-io/loom-page-header";\n',
      },
    ],
  },
  {
    name: "facade-import-from-below",
    attack: "a primitive imports the public facade, inverting the publishing boundary",
    // Reported as a CYCLE rather than as a tag violation, and that is right
    // rather than a near miss. The facade re-exports every component, so
    // `loom -> badge` already exists and the new edge closes a loop; the
    // structural checks are judged before the constraint table is read, so the
    // cycle is what a site reports. In this repository the facade ban can
    // therefore never surface as `onlyTagsConstraintViolation` — every project
    // the rule protects is one the facade already depends on.
    expect: ["noCircularDependencies"],
    edits: [
      {
        path: "packages/primitives/badge/src/index.ts",
        append: `\nimport "${["@ecoma-io", "loom"].join("/")}";\n`,
      },
    ],
  },
  {
    name: "cycle-between-two-primitives",
    attack: "button imports alert-dialog, which already imports button",
    expect: ["noCircularDependencies"],
    edits: [
      {
        path: "packages/primitives/button/src/index.ts",
        append: '\nimport "@ecoma-io/loom-alert-dialog";\n',
      },
    ],
  },
  {
    name: "relative-climb-out-of-the-package",
    attack: "a primitive reaches into core by walking the filesystem instead of naming it",
    expect: ["noRelativeOrAbsoluteImportsAcrossLibraries"],
    edits: [
      {
        path: "packages/primitives/badge/src/index.ts",
        append: '\nimport "../../../core/src/cn";\n',
      },
    ],
  },
  {
    name: "barrel-reexport-upward",
    attack: "a primitive re-exports a block from its own barrel rather than importing it",
    expect: ["onlyTagsConstraintViolation"],
    edits: [
      {
        path: "packages/primitives/badge/src/index.ts",
        append: '\nexport * from "@ecoma-io/loom-page-header";\n',
      },
    ],
  },
  {
    name: "dynamic-import-upward",
    attack: "the same upward edge, deferred into a chunk with import()",
    expect: ["onlyTagsConstraintViolation"],
    edits: [
      {
        path: "packages/primitives/badge/src/index.ts",
        append: '\nexport const lazy = () => import("@ecoma-io/loom-page-header");\n',
      },
    ],
  },
  {
    name: "test-only-import-upward",
    attack: "a package's own test file reaches a layer its source may not",
    expect: ["onlyTagsConstraintViolation"],
    edits: [
      {
        path: "packages/primitives/badge/tests/Badge.test.ts",
        append: '\nimport "@ecoma-io/loom-page-header";\n',
      },
    ],
  },
  {
    name: "self-import-through-own-barrel",
    attack: "a file reaches its own package by its public name instead of a relative path",
    expect: ["noSelfCircularDependencies"],
    edits: [
      {
        path: "packages/primitives/badge/src/index.ts",
        append: '\nimport "@ecoma-io/loom-badge";\n',
      },
    ],
  },
  {
    name: "alias-bypass-straight-into-a-block",
    attack:
      "a new tsconfig path alias points past a block's entry point, and a primitive imports the alias",
    expect: ["onlyTagsConstraintViolation"],
    edits: [
      {
        path: "tsconfig.base.json",
        replace: [
          /("@ecoma-io\/loom-core": \["\.\/packages\/core\/src\/index\.ts"\],)/,
          '$1\n      "@loom-mutation/inside-a-block": ["./packages/blocks/page-header/src/index.ts"],',
        ],
      },
      {
        path: "packages/primitives/badge/src/index.ts",
        append: '\nimport "@loom-mutation/inside-a-block";\n',
      },
    ],
  },
  {
    name: "blind-spot-alias-onto-a-vue-file",
    attack: "the same alias bypass, pointed one file further in — at the block's .vue source",
    // Reported, but as the WRONG rule, and only because this repository turned
    // `banTransitiveDependencies` on. Measured, all three cases, on lattice
    // 0.11.1:
    //
    //   alias -> src/index.ts        onlyTagsConstraintViolation   (correct)
    //   alias -> src/PageHeader.vue  noTransitiveDependencies      (this row)
    //   ...with banTransitiveDependencies: false, which is the option's own
    //   default, the same edit reports "no boundary violations" and exits 0.
    //
    // The cause is that `ts.resolveModuleName` declines a `.vue` target, and a
    // non-relative specifier that fails to resolve is classified external —
    // so a cross-layer reach into a Vue component becomes "an npm package you
    // did not declare". For a Vue component library that is the difference
    // between a boundary and a lint note. Reported upstream as
    // ecoma-io/lattice#264. When it is fixed this row turns red and merges into
    // the one above.
    expect: ["noTransitiveDependencies"],
    edits: [
      {
        path: "tsconfig.base.json",
        replace: [
          /("@ecoma-io\/loom-core": \["\.\/packages\/core\/src\/index\.ts"\],)/,
          '$1\n      "@loom-mutation/inside-a-vue-file": ["./packages/blocks/page-header/src/PageHeader.vue"],',
        ],
      },
      {
        path: "packages/primitives/badge/src/index.ts",
        append: '\nimport "@loom-mutation/inside-a-vue-file";\n',
      },
    ],
  },
  {
    name: "blind-spot-javascript-import-of-theme-core",
    attack: "a primitive imports the token package, which ships CSS and is copied, never imported",
    // theme-core's `exports` names three stylesheets and nothing else, and it
    // has no `paths` alias, so the specifier resolves to nothing and is
    // classified external — the same misattribution as the row above, and the
    // same silence under the option's default. What reports it accurately is
    // tools/check-architecture.ts check 5, which knows theme-core is styles-only
    // because the repository's own registry says so.
    expect: ["noTransitiveDependencies"],
    edits: [
      {
        path: "packages/primitives/badge/src/index.ts",
        append: '\nimport "@ecoma-io/loom-theme-core";\n',
      },
    ],
  },
  {
    name: "undeclared-npm-package",
    attack: "a package imports a dependency neither its own manifest nor the root's declares",
    expect: ["noTransitiveDependencies"],
    edits: [
      {
        path: "packages/primitives/badge/src/index.ts",
        append: '\nimport "some-package-nobody-declared";\n',
      },
    ],
  },
  {
    name: "project-loses-its-layer-tag",
    attack: "a moon.yml is edited so the project matches no row in the constraint table",
    expect: ["projectWithoutTagsCannotHaveDependencies"],
    edits: [
      {
        path: "packages/primitives/badge/moon.yml",
        replace: [/^tags: \[.*\]$/m, 'tags: ["not-a-layer"]'],
      },
    ],
  },
  {
    name: "tsconfig-alias-stops-resolving",
    attack: "a paths alias is left pointing at a directory that no longer exists",
    expect: ["tsconfigDeadPathAlias"],
    edits: [
      {
        path: "tsconfig.base.json",
        replace: [
          /("@ecoma-io\/loom-core": \["\.\/packages\/core\/src\/index\.ts"\],)/,
          '$1\n      "@loom-mutation/moved-away": ["./packages/primitives/deleted-yesterday/src/index.ts"],',
        ],
      },
    ],
  },
  {
    name: "docs-reaches-past-the-published-entry-point",
    attack:
      "a demo imports a private component package again, printing a specifier no consumer can resolve",
    expect: ["onlyTagsConstraintViolation"],
    edits: [
      {
        path: "docs/demos/BadgeDemo.vue",
        replace: [
          /^<script setup lang="ts">$/m,
          '<script setup lang="ts">\nimport "@ecoma-io/loom-badge";',
        ],
      },
    ],
  },
  {
    name: "blind-spot-facade-subpath",
    attack: "a primitive imports the facade's `/theme` subpath rather than the facade itself",
    expect: [],
    note: "`@ecoma-io/loom/theme` is a path alias onto `packages/core/src/theme.ts`, so Lattice resolves the specifier to the CORE project and judges primitives->core, which the table allows. The specifier is the public surface and importing it is importing the facade — a fact about the published entry map that no resolver can recover from the file it lands on. tools/check-architecture.ts check 2 matches the specifier text and reports it; this row is why that check is not redundant.",
    edits: [
      {
        path: "packages/primitives/badge/src/index.ts",
        append: `\nimport "${["@ecoma-io", "loom"].join("/")}/theme";\n`,
      },
    ],
  },
  {
    name: "blind-spot-file-owned-by-no-project",
    attack: "a violation is planted in a tracked file that no Moon project owns",
    expect: [],
    note: "a file belonging to no project is skipped entirely: not analyzed, not reported, and not counted in the denominator `coverage-minimum` divides by — so the run still answers 100%. Reported upstream as ecoma-io/lattice#263. `playwright/` was such a directory until it was made a Moon project; the root-level configs still are.",
    edits: [
      {
        path: "playwright.config.ts",
        append: '\nimport "@ecoma-io/loom-page-header";\n',
      },
    ],
  },
];

/** The violation ids `lattice check --format json` reported for this tree. */
function runLattice(): string[] {
  const out = join(ROOT, "node_modules", ".cache", "lattice-mutation.json");
  // `--output` writes through a `.tmp` sibling and does not create the
  // directory it was pointed at, so on a tree where `node_modules/.cache` does
  // not exist yet every run exits 3 having written nothing. Locally the
  // directory is already there — eslint's cache lives beside it — which is why
  // this passed 18/18 here and failed 0/18 on a fresh CI checkout.
  mkdirSync(dirname(out), { recursive: true });
  let stderr = "";
  try {
    execFileSync(
      join(ROOT, "node_modules", ".bin", "lattice"),
      ["check", "--format", "json", "--output", out],
      { cwd: ROOT, stdio: "pipe" },
    );
  } catch (error) {
    // Exit 1 (findings) and exit 3 (no verdict) both still write the envelope;
    // a run that wrote nothing is handled by the read below, which needs this
    // stderr to say why.
    stderr = String((error as { stderr?: Buffer | null }).stderr ?? "");
  }
  if (!existsSync(out)) {
    // Not a mutation result, and reporting it as one is how this surfaced as
    // eighteen identical expectation failures rather than the single sentence
    // the CLI had already written to stderr. A harness that cannot read a
    // verdict has proved nothing about any of them.
    throw new Error(
      `lattice check produced no envelope at ${out}\n${stderr.trim() || "(no stderr)"}`,
    );
  }
  const envelope = JSON.parse(readFileSync(out, "utf8")) as {
    result?: {
      violations?: { messageId: string }[];
      tsconfigPaths?: { findings?: { messageId: string }[] };
    };
  };
  rmSync(out, { force: true });
  const ids = new Set<string>();
  for (const v of envelope.result?.violations ?? []) ids.add(v.messageId);
  for (const v of envelope.result?.tsconfigPaths?.findings ?? []) ids.add(v.messageId);
  return [...ids].sort();
}

export interface MutationResult {
  name: string;
  expected: string[];
  actual: string[];
  passed: boolean;
}

/**
 * Whatever the mutation in flight has overwritten, so a signal can put it back.
 * `finally` covers a thrown error but not a SIGINT or SIGTERM, and this harness
 * edits the working tree of the repository it is run in — observed: a run
 * stopped mid-flight left `packages/primitives/badge/src/index.ts` carrying an
 * upward import, which is a broken tree with no failure message to explain it.
 */
let inFlight: Snapshot[] = [];

function restore(snapshots: Snapshot[]): void {
  for (const snapshot of [...snapshots].reverse()) {
    if (snapshot.original !== null) writeFileSync(snapshot.path, snapshot.original);
  }
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(signal, () => {
    restore(inFlight);
    // Re-raise rather than exit(0): the caller asked for this process to die of
    // that signal, and a shell reading the exit status should see it.
    process.kill(process.pid, signal);
  });
}

/** Apply each mutation, judge it, and restore the tree before the next one. */
export function runMutations(mutations: readonly Mutation[] = MUTATIONS): MutationResult[] {
  const results: MutationResult[] = [];
  for (const mutation of mutations) {
    const snapshots: Snapshot[] = [];
    inFlight = snapshots;
    try {
      for (const edit of mutation.edits) {
        const path = join(ROOT, edit.path);
        const original = existsSync(path) ? readFileSync(path, "utf8") : null;
        snapshots.push({ path, original });
        if (original === null) throw new Error(`${mutation.name}: ${edit.path} does not exist`);
        let next = original;
        if (edit.append) next += edit.append;
        if (edit.replace) {
          const [pattern, replacement] = edit.replace;
          if (!pattern.test(next)) {
            throw new Error(`${mutation.name}: ${edit.path} does not match ${String(pattern)}`);
          }
          next = next.replace(pattern, replacement);
        }
        writeFileSync(path, next);
      }
      const actual = runLattice();
      const expected = [...mutation.expect].sort();
      // Every expected id must appear. Extra ids are not a failure on their
      // own: a mutation that trips a second rule as well is still evidence the
      // rule it was written for fires, and which ids a site can produce at once
      // is Lattice's documented ordering, not this repository's claim.
      const passed =
        expected.length === 0 ? actual.length === 0 : expected.every((id) => actual.includes(id));
      results.push({ name: mutation.name, expected, actual, passed });
    } finally {
      restore(snapshots);
      inFlight = [];
    }
  }
  return results;
}

// CLI entry — run every mutation against the real repository.
if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  const results = runMutations();
  let failed = 0;
  for (const result of results) {
    const shape = result.expected.length === 0 ? "reports nothing" : result.expected.join(", ");
    if (result.passed) {
      console.log(`  ok    ${result.name} -> ${shape}`);
    } else {
      failed++;
      console.error(
        `  FAIL  ${result.name}\n        expected ${shape}\n        actual   ${result.actual.join(", ") || "(nothing)"}`,
      );
    }
  }
  console.log(
    `\n${String(results.length - failed)}/${String(results.length)} mutations behaved as documented.`,
  );
  if (failed) {
    console.error(
      "A mutation that no longer behaves as documented means the boundary moved, the config stopped covering it, or a blind spot closed. Do not adjust the expectation without establishing which.",
    );
    process.exit(1);
  }
}
