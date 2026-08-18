/**
 * The one discovery step behind the dynamic E2E matrix.
 *
 * CI's e2e job used to be a fixed 3-browser × 8-shard matrix that built the
 * whole VitePress site and ran the entire cross-cutting suite on every pull
 * request, whatever it touched. This tool replaces the fixed matrix with a
 * classification of *what actually changed*, and the job consumes its output
 * as `matrix.include`:
 *
 *   pw-infra    playwright/**, playwright.config*, harness/**, this tool
 *               → root cross-cutting suite (`full`, all 5 engines), plus the
 *                 affected components' specs at `standard` (a representative
 *                 demo keeps the harness legs alive when none are affected).
 *   theme       packages/theme-core/**, a token that every surface depends on
 *               → root suite at `standard`, plus the theme-sensitive
 *                 components the dependency graph marks affected.
 *   deps        pnpm-lock.yaml — the file every runtime dependency arrives
 *               through, invisible to the project graph → root suite at
 *               `standard` (the site renders every component, so the sweep is
 *               the browser evidence a dependency bump needs), plus any
 *               components the same diff touched directly.
 *   docs        docs/** and nothing in packages/ → the root suite at
 *               `standard`; no component browser jobs (a prose edit needs the
 *               axe sweep, not per-component evidence).
 *   component   packages/**, docs/demos → the affected components' own specs,
 *               at `smoke` (a component without own specs still has its demo
 *               swept by the harness axe gate, so a Badge.vue edit costs one
 *               chromium leg, not the whole-repo sweep).
 *   noop        none of the above — the matrix is empty and `e2e-run` expands
 *               to zero legs.
 *
 * Scope, deliberately: this tool CLASSIFIES policy and GROUPS workload. The
 * dependency graph and affected selection belong to moon — the affected set
 * comes from exactly one query shape, shelled at two call sites with
 * different consumers: this tool (`moon query projects --affected
 * --downstream deep`, full project objects for the plan) and the verify job's
 * affected unit-test closure (`ci.yml`, the same query reduced to bare ids for
 * `moon run`). They must share the same base and the same `--downstream deep`
 * — that is the intended coupling, not an anomaly to "simplify" by removing
 * one side (removing the verify closure would silently stop re-testing
 * dependents). The browser policy (profiles, engines) is imported from
 * `playwright/profiles.ts`, the same module both Playwright configs read.
 * Nothing here re-derives what either of those own.
 *
 * Run with `--print` to dump the computed plan as JSON (CI feeds `include`
 * into `fromJSON`); with a base that is not resolvable in the clone it
 * behaves like `noop` rather than failing the run.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  PROFILE_PROJECTS,
  ENGINE_FOR_PROJECT,
  type BrowserProfile,
} from "../playwright/profiles.ts";

// Repo root (the script lives in `tools/`).
const ROOT = new URL("..", import.meta.url).pathname;

// The reverse of the harness's kebabToPascal (`?component=` → demo filename):
// a project id is `badge`, its demo is `docs/demos/BadgeDemo.vue`. The
// five-artifacts rule guarantees every component owns one, so on-disk existence
// is the honest "is a real component" test — it separates a badge from the
// loom facade, docs, core and labels that ride along in an affected set but
// own no demo and so no browser evidence.
const kebabToPascal = (name: string): string =>
  name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const demoExists = (id: string): boolean =>
  existsSync(join(ROOT, "docs", "demos", `${kebabToPascal(id)}Demo.vue`));

// A component's project id is its package directory name (`sync-moon-deps.ts`
// is explicit that the two are the same), so the kebab candidates for the
// Pascal→kebab inversion come from the package trees, not the demo filenames —
// `ToastStackDemo.vue`'s separator is unrecoverable from the name alone, but
// `kebabToPascal("toast-stack")` recovers it exactly.
const PACKAGE_TIERS = ["primitives", "composition", "blocks", "layouts"];

const packageProjectIds = (): string[] =>
  PACKAGE_TIERS.flatMap((tier) =>
    readdirSync(join(ROOT, "packages", tier), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name),
  );

// The reverse map: a `docs/demos/BadgeDemo.vue` path → `badge`. Moon's
// affected query for a demo-only edit returns `docs` (the demo lives in the
// docs tree, not a package), so the affected set alone never names the
// component the demo belongs to — a BadgeDemo.vue edit would fall to the
// whole-repo root sweep with the badge demo never swept by the harness gate.
const demoFileToProjectId = (path: string): string | null => {
  const match = /^docs\/demos\/([A-Za-z0-9]+)Demo\.vue$/.exec(path);
  if (!match) return null;
  const pascals = match[1];
  return packageProjectIds().find((id) => kebabToPascal(id) === pascals) ?? null;
};

// ---- scenario classification -------------------------------------------------

const PW_INFRA_PATTERNS = [
  /^playwright\//,
  /^playwright\.config(?:\.|$)/,
  // Anything under `e2e/` is the root suite: the specs, the shared helpers
  // they import (`docs-pages.ts` is the page list every sweep iterates — an
  // edit to it once classified as noop and ran zero browser legs), and the
  // project's own moon.yml. The whole directory is the suite, so the whole
  // matrix must re-run.
  /^e2e\//,
  /^\.moon\/tasks\/e2e\.yml$/,
  /^tools\/e2e-plan\.ts$/,
  // Editing the CI workflow that runs the matrix is editing the matrix.
  /^\.github\/workflows\/ci\.yml$/,
];

const THEME_PATTERNS = [/^packages\/theme-core\//];

// The lockfile is the one file through which every runtime dependency arrives,
// and it belongs to no project — moon's graph cannot see what a vue or reka-ui
// bump reaches (measured: a lockfile-only diff marks zero projects affected).
const DEPS_PATTERNS = [/^pnpm-lock\.yaml$/];

// Prose and site-chrome only. A `docs/demos/*Demo.vue` is not prose — the
// harness mounts it, so a demo edit is a component change (a demo is a
// component's browser evidence, not a page about it).
const DOCS_ONLY_PATTERNS = [/^docs\/(?!demos\/)/];

// A component change is anything under packages/ that is not theme-core
// itself, plus the demos the docs mounts as harness fixtures.
const COMPONENT_PATTERNS = [/^packages\/(?!theme-core\/)/, /^docs\/demos\//];

type Scenario = "pw-infra" | "theme" | "deps" | "docs" | "component" | "noop";

export function classifyFiles(files: string[]): Scenario {
  if (!files.length) return "noop";
  const matches = (patterns: RegExp[]): boolean =>
    patterns.some((p) => files.some((f) => p.test(f)));

  if (matches(PW_INFRA_PATTERNS)) return "pw-infra";
  if (matches(THEME_PATTERNS)) return "theme";
  if (matches(DEPS_PATTERNS)) return "deps";
  // docs/ prose changed, and nothing else that an earlier scenario owns. The
  // negative check is scoped to the *component* boundary — a demo edit must
  // not ride along as prose — so a routine prose change that also touches
  // README, a workflow, anything `noop` still gets the axe sweep rather than
  // falling through to the empty `noop` case.
  const touchedComponent = files.some((file) => COMPONENT_PATTERNS.some((p) => p.test(file)));
  if (matches(DOCS_ONLY_PATTERNS) && !touchedComponent) {
    return "docs";
  }
  if (matches(COMPONENT_PATTERNS)) return "component";
  return "noop";
}

// ---- affected set ------------------------------------------------------------

export interface AffectedProject {
  id: string;
  /** Relative project path, e.g. `packages/primitives/button` (moon `source`). */
  source: string;
  /** Task-id → task, as moon emits it (a map, not a list). */
  tasks: Record<string, unknown> | string[];
}

/**
 * The projects moon marks affected against `MOON_BASE`, closed over the
 * dependency graph: `--downstream deep` turns "the projects whose own files
 * changed" into "the transitive closure of projects whose browser evidence
 * must re-run" — a button edit marks alert-dialog, pagination and editable
 * affected too (each imports button). This is the ONLY affected computation in
 * the E2E path, and it is moon's, not this tool's.
 */
export function affectedProjects(base: string): AffectedProject[] {
  const out = execFileSync(
    "pnpm",
    ["exec", "moon", "query", "projects", "--affected", "--downstream", "deep"],
    {
      cwd: ROOT,
      env: { ...process.env, MOON_BASE: base },
      encoding: "utf8",
      // `moon query projects` emits each project's full config — deps, tasks,
      // toolchains — which across ~90 projects exceeds the default 1 MiB
      // buffer several times over.
      maxBuffer: 50 * 1024 * 1024,
    },
  );
  const json = JSON.parse(out) as {
    projects?: AffectedProject[] | Record<string, AffectedProject>;
  };
  const list = json.projects ?? [];
  return Array.isArray(list) ? list : Object.values(list);
}

// ---- workload grouping --------------------------------------------------------

// A `root` leg drives the docs-site suite, a `harness` leg the component
// harness. The values are the config paths the legs run with, so the CI job
// can consume `matrix.config` without re-deriving it by label.
const CONFIG_PATHS = {
  root: "playwright.config.ts",
  harness: "playwright/harness/playwright.config.ts",
} as const;

// The harness axe gate, appended to every harness leg's specs. Playwright's
// positional args override the config's `testMatch`, so a leg that passes only
// the component dirs would silently drop the gate — it must be a positional arg
// too, or the component evidence and the accessibility evidence stop being the
// same workload.
const HARNESS_AXE_GATE = "playwright/harness/accessibility.e2e.ts";

/**
 * How many `--shard` pieces the root cross-cutting suite is cut into, per
 * browser. Sized from measurement, not habit: at `workers: 1` one browser's
 * whole suite is ~17–23 minutes, and with the docs site built once and
 * downloaded (rather than rebuilt in every leg) a shard's overhead is ~1
 * minute — so 4 shards puts a leg at ~5–7 minutes, comfortably under the
 * job timeout, where the old fixed 8 spent as long setting up as testing.
 */
const ROOT_SHARDS = 4;

/**
 * Harness legs group every affected component into one Playwright run per
 * browser, so the leg count is bounded by the profile's browser count, not by
 * the component count. Sharding kicks in only when the workload is genuinely
 * large (a theme or infra change reaching hundreds of components) and is
 * itself bounded, so 500 affected components means at most `3 × browsers`
 * legs, never 500 jobs.
 */
const harnessShardCount = (units: number): number =>
  Math.min(3, Math.max(1, Math.ceil(units / 40)));

/**
 * One matrix row = one browser workload. `profile` is a `PW_PROFILE` name the
 * Playwright configs understand; `specs` is the set of relative paths the leg
 * passes to `playwright test` — the affected components' `e2e/` directories
 * for a harness row, empty for a root-suite row (the config's own testMatch
 * scopes it).
 */
export interface MatrixRow {
  scenario: Scenario;
  /** A `PW_PROFILE` name; selects the config's project set, superset of `browser`. */
  profile: string;
  /** The Playwright config this leg runs (root suite or component harness). */
  config: string;
  /** The Playwright project id (a browser) this leg runs via `--project`. */
  browser: string;
  /** The `playwright install` engine for `browser`. */
  install: string;
  /**
   * The set of relative e2e paths a harness leg runs. The components' own
   * `e2e/` dirs plus the harness axe gate — Playwright's positional args
   * override the config's `testMatch`, so a leg that passed only the dirs
   * would silently drop the gate. Empty for a root-suite row (the config's own
   * testMatch scopes it).
   */
  specs: string[];
  /**
   * The affected components' demo names (`?component=<kebab>`), which the leg
   * exports as `HARNESS_DEMOS` for the axe gate to sweep. Empty for a
   * root-suite row.
   */
  demos: string[];
  /** Shard CLI args for this leg (`--shard=N/M`), empty when unsharded. */
  shardArgs: string;
  /** A unique, GitHub-safe job name for this leg. */
  name: string;
}

/**
 * Decide what a given scenario must run. `affected` is the moon closure; only
 * its members that own an e2e task (`tags: [e2e]`, so their moon.yml carries
 * the harness task) can run component specs.
 */
export function plan(
  scenario: Scenario,
  affected: AffectedProject[],
  files: string[] = [],
): MatrixRow[] {
  const row = (
    profile: BrowserProfile,
    config: "root" | "harness",
    specs: string[],
    demos: string[],
    browser: keyof typeof ENGINE_FOR_PROJECT,
    shards: number,
    shardIndex: number,
  ): MatrixRow => ({
    scenario,
    profile,
    config: CONFIG_PATHS[config],
    browser,
    install: ENGINE_FOR_PROJECT[browser],
    specs,
    demos,
    shardArgs: shards > 1 ? `--shard=${String(shardIndex)}/${String(shards)}` : "",
    name: `${scenario}-${config}-${browser}${shards > 1 ? `-s${String(shardIndex)}` : ""}`,
  });

  const ownsE2E = (p: AffectedProject): boolean => "e2e" in p.tasks;
  // The root `e2e` project owns the cross-cutting suite and drives the *root*
  // config (the built docs site), never the harness — so it is not a
  // component a `component`/`theme` row would run through the harness. It is
  // instead handled by the root-suite row below (`specs: []`), which is why it
  // drops out of the component list.
  const withE2E = affected
    .filter(ownsE2E)
    .filter((p) => p.id !== "e2e")
    .map((p) => `${p.source}/e2e`);
  // Every affected demo-bearing project — e2e-tagged or not — is exported as
  // `HARNESS_DEMOS` for the harness axe gate to sweep: one component's demo is
  // the component's browser evidence, whether or not it also owns focused
  // specs. `demoExists` keeps the gate to real components and off the loom /
  // docs / core / labels ride-alongs.
  const affectedDemos = affected
    .filter((p) => p.id !== "e2e")
    .filter((p) => demoExists(p.id))
    .map((p) => p.id);
  // A demo edit belongs to a component even though the file lives in docs/.
  // Moon's affected set for `docs/demos/BadgeDemo.vue` is `docs` only, so the
  // reverse map puts the edited demo's component back into the sweep set —
  // otherwise a BadgeDemo.vue edit would ride along as `docs` (or, worse,
  // `noop`) and the badge demo would never be held to WCAG_TAGS.
  for (const file of files) {
    const id = demoFileToProjectId(file);
    if (id && !affectedDemos.includes(id)) affectedDemos.push(id);
  }

  // The root cross-cutting suite across `profile`'s browsers. The axe and
  // contrast sweeps double the test count (every page in light and dark), so
  // each browser is split into ROOT_SHARDS legs (`--shard=i/N`) to stay under
  // the per-leg wall-clock ceiling — see ROOT_SHARDS for the sizing evidence.
  const rootLegs = (profile: BrowserProfile): MatrixRow[] =>
    PROFILE_PROJECTS[profile].flatMap((browser) =>
      Array.from({ length: ROOT_SHARDS }, (_, i) =>
        row(profile, "root", [], [], browser, ROOT_SHARDS, i + 1),
      ),
    );

  // A harness leg runs only the affected components' specs on one profile —
  // their dirs plus the axe gate, since positional args override testMatch —
  // and exports the same projects' demo names for the gate's `HARNESS_DEMOS`.
  // One leg per browser until the affected set is genuinely large; then a
  // bounded shard split, never a job per component.
  const harnessLegs = (profile: BrowserProfile): MatrixRow[] => {
    const shards = harnessShardCount(withE2E.length + affectedDemos.length);
    return PROFILE_PROJECTS[profile].flatMap((browser) =>
      Array.from({ length: shards }, (_, i) =>
        row(
          profile,
          "harness",
          [...withE2E, HARNESS_AXE_GATE],
          affectedDemos,
          browser,
          shards,
          i + 1,
        ),
      ),
    );
  };

  switch (scenario) {
    case "pw-infra":
      // The browsers and the harness are the thing being changed. Every
      // engine on the root suite, every component spec too. If the change
      // touches no component (an edit to the harness gate itself), the root
      // sweep still runs — but the edited gate must be *executed*, not just
      // rebuilt, so a representative demo keeps the harness legs alive even
      // with an empty affected set.
      if (!affectedDemos.length) affectedDemos.push("button");
      return [...rootLegs("full"), ...harnessLegs("standard")];
    case "theme":
      // Tokens changed: the root sweep at the default three engines, plus the
      // theme-sensitive components the graph marks affected.
      return [
        ...rootLegs("standard"),
        ...(withE2E.length || affectedDemos.length ? harnessLegs("standard") : []),
      ];
    case "deps":
      // The lockfile changed: the root sweep is the browser evidence — the
      // built site renders every component against the bumped dependencies —
      // plus the own specs of any component the same diff touched directly.
      return [
        ...rootLegs("standard"),
        ...(withE2E.length || affectedDemos.length ? harnessLegs("smoke") : []),
      ];
    case "docs":
      // Prose changed: the axe + contrast sweep over the built site, at
      // standard. No component browser evidence — nothing component-dom
      // changed.
      return rootLegs("standard");
    case "component": {
      // The affected components' own evidence, cheapest first: e2e-tagged
      // projects' specs plus the axe gate over every affected demo. A change
      // in a component with no specs (a Badge.vue edit) still sweeps the demo
      // — the harness gate in light and dark. A change set that mixes
      // component code with a docs prose/plugin page keeps BOTH: the harness
      // legs cover the component, and the root sweep (the only gate over the
      // generated token/API tables) is added back when a non-demo docs file
      // rode along — classifyFiles labels the whole change `component` and
      // would otherwise drop the prose side's sweep entirely.
      const touchedDocs = files.some((f) => /^docs\/(?!demos\/)/.test(f));
      const harness =
        withE2E.length || affectedDemos.length ? harnessLegs("smoke") : rootLegs("smoke");
      const extra = touchedDocs ? rootLegs("smoke") : [];
      return [...harness, ...extra];
    }
    default:
      return [];
  }
}

// ---- CLI ----------------------------------------------------------------------

function main(): void {
  const print = process.argv.includes("--print");
  const base = process.env.MOON_BASE;
  if (!base) {
    console.error("e2e-plan: MOON_BASE is required (the base the affected diff runs against).");
    process.exit(1);
  }

  let files: string[];
  try {
    files = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean);
  } catch {
    // Base does not exist locally (shallow clone, or a base that predates the
    // checkout depth). Treat as noop — the e2e job stays quiet rather than
    // failing the run on a missing ref.
    files = [];
  }

  const scenario = classifyFiles(files);
  // A base that is not resolvable in this clone makes moon's query fail; the
  // diff is already noop'd above, so treat the query the same way — degrade to
  // an empty matrix rather than reddening the job over a ref that is not here.
  let affected: AffectedProject[];
  try {
    affected = affectedProjects(base);
  } catch {
    affected = [];
  }
  const rows = plan(scenario, affected, files);

  const result = {
    scenario,
    changedFiles: files.length,
    affected: affected.map((p) => p.id),
    // Whether any leg drives the built docs site — the workflow builds the
    // site once (one job, one artifact) instead of once per leg when true.
    hasRoot: rows.some((r) => r.config === CONFIG_PATHS.root),
    include: rows,
  };

  if (print) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    console.log(`e2e-plan: ${scenario} — ${String(rows.length)} row(s)`);
  }
}

/**
 * The pure-logic self-check, run on every direct execution before the CLI.
 * `classifyFiles` and `plan` are the decision function behind the whole dynamic
 * matrix, so the exact regression the fixed matrix used to hide — "a component
 * change without own specs runs everything" — stays asserted here with
 * synthetic inputs and node:assert: no git, no moon, no browsers.
 */
export function runSelfCheck(): void {
  // classifyFiles — the scenario boundaries.
  assert.equal(classifyFiles(["docs/index.md"]), "docs"); // prose
  assert.equal(
    classifyFiles(["docs/demos/BadgeDemo.vue"]),
    "component", // a demo is browser evidence, not prose
  );
  assert.equal(classifyFiles(["packages/primitives/badge/src/Badge.vue"]), "component");
  assert.equal(classifyFiles(["packages/theme-core/src/theme.css"]), "theme");
  assert.equal(classifyFiles(["playwright.config.ts"]), "pw-infra");
  assert.equal(classifyFiles(["pnpm-lock.yaml"]), "deps"); // a dependency bump
  assert.equal(classifyFiles([]), "noop");

  // plan — the affected-set decisions, against real demo files on disk.
  const project = (id: string, source: string, tasks: string[]): AffectedProject => ({
    id,
    source,
    tasks: Object.fromEntries(tasks.map((t) => [t, {}])),
  });

  // A badge edit (no e2e specs of its own) yields exactly one chromium harness
  // leg — the axe gate over badge's demo — and never the root sweep. This is
  // the invariant the fixed matrix optimised away; the harness gate still
  // holds badge to WCAG_TAGS in both themes.
  const badgeOnly = plan("component", [project("badge", "packages/primitives/badge", [])]);
  const badgeLeg = badgeOnly[0];
  assert.ok(badgeLeg, "a component edit must produce a harness leg");
  assert.equal(badgeOnly.length, 1, "badge-only edit -> one smoke leg, not a matrix");
  assert.equal(badgeLeg.config, CONFIG_PATHS.harness);
  assert.deepEqual(badgeLeg.demos, ["badge"]);
  assert.deepEqual(badgeLeg.specs, [HARNESS_AXE_GATE]);

  // An e2e-tagged project's change adds its own specs to the same leg.
  const button = plan("component", [
    project("button", "packages/primitives/button", ["test", "e2e"]),
  ]);
  const buttonLeg = button[0];
  assert.ok(buttonLeg);
  assert.equal(button.length, 1);
  assert.ok(buttonLeg.specs.includes("packages/primitives/button/e2e"));
  assert.ok(buttonLeg.demos.includes("button"));

  // A theme change holds the affected demos — not just e2e-tagged ones — to
  // the bar at standard, beside the root sweep: 3 browsers × ROOT_SHARDS root
  // legs, one harness leg per browser while the affected set is small.
  const themed = plan("theme", [
    project("theme-core", "packages/theme-core", []),
    project("badge", "packages/primitives/badge", []),
  ]);
  assert.equal(themed.filter((r) => r.config === CONFIG_PATHS.root).length, 3 * ROOT_SHARDS);
  assert.equal(themed.filter((r) => r.config === CONFIG_PATHS.harness).length, 3);
  assert.ok(
    themed.filter((r) => r.config === CONFIG_PATHS.harness).every((r) => r.demos.includes("badge")),
  );

  // A no-op change runs nothing.
  assert.equal(plan("noop", []).length, 0);

  // A lockfile-only bump gets the root sweep (moon marks no project affected —
  // the site is the evidence) and nothing per-component.
  const depsOnly = plan("deps", [], ["pnpm-lock.yaml"]);
  assert.equal(depsOnly.length, 3 * ROOT_SHARDS);
  assert.ok(depsOnly.every((r) => r.config === CONFIG_PATHS.root));

  // The harness workload stays bounded however large the affected set grows:
  // grouping first, then a capped shard split — never a leg per component.
  const everyComponent = packageProjectIds().map((id) => project(id, `packages/x/${id}`, ["e2e"]));
  const wide = plan("theme", [project("theme-core", "packages/theme-core", []), ...everyComponent]);
  const wideHarness = wide.filter((r) => r.config === CONFIG_PATHS.harness);
  assert.ok(wideHarness.length <= 3 * 3, "harness legs are bounded: ≤ shard cap × browsers");
  assert.ok(
    wideHarness.every((r) => r.shardArgs.length > 0),
    "a wide sweep is sharded",
  );

  // The regression cases the fixed matrix could hide, asserted here so the
  // exact behavior this file exists to provide stays pinned:
  //
  // 1. A demo edit — the file that *is* a component's browser evidence — routes
  //    to the harness gate sweeping that component, never the root sweep.
  //    Moon's affected set for a BadgeDemo.vue edit is `docs` only
  //    (empirically), so the reverse map must supply the `badge` id.
  const demoEdit = plan("component", [project("docs", "docs", [])], ["docs/demos/BadgeDemo.vue"]);
  assert.equal(demoEdit.length, 1, "a demo edit -> one harness leg");
  const demoEditRow = demoEdit[0];
  assert.ok(demoEditRow, "the single harness leg exists");
  assert.equal(demoEditRow.config, CONFIG_PATHS.harness);
  assert.deepEqual(demoEditRow.demos, ["badge"], "the demo's component is swept");

  // 2. A docs prose edit plus an incidental lockfile bump is a `deps` change
  //    (the sweep still runs, now for two reasons); prose plus a README or
  //    workflow edit is still the docs sweep, not the empty noop.
  assert.equal(classifyFiles(["docs/index.md", "pnpm-lock.yaml"]), "deps");
  assert.equal(classifyFiles(["docs/index.md", "README.md"]), "docs");

  // 3. An edit to the root suite specs or the matrix's own workflow is an
  //    infra change, not a silent noop.
  assert.equal(classifyFiles(["e2e/accessibility.e2e.ts"]), "pw-infra");
  assert.equal(classifyFiles([".github/workflows/ci.yml"]), "pw-infra");
  assert.equal(classifyFiles(["e2e/moon.yml"]), "pw-infra");

  // 4. A mixed docs-prose + component change keeps BOTH evidence halves: the
  //    harness legs for the component AND the root sweep for the prose pages.
  //    classifyFiles labels the whole change `component` (the prose side never
  //    gets its own scenario), so the plan must add the root legs back — the
  //    site sweep is the only gate over the generated token/API tables.
  const mixed = plan(
    "component",
    [project("button", "packages/primitives/button", ["test", "e2e"])],
    ["docs/index.md", "packages/primitives/button/src/Button.vue"],
  );
  assert.ok(
    mixed.some((r) => r.config === CONFIG_PATHS.harness),
    "a mixed change keeps the component harness leg",
  );
  assert.ok(
    mixed.some((r) => r.config === CONFIG_PATHS.root),
    "a mixed change keeps the root sweep for the prose side",
  );

  // 5. An edit to the harness gate itself still executes the gate, even with
  //    an empty affected set — a representative demo keeps the harness legs
  //    alive so the changed gate runs.
  const gateEdit = plan("pw-infra", [], ["playwright/harness/accessibility.e2e.ts"]);
  assert.ok(gateEdit.some((r) => r.config === CONFIG_PATHS.harness));
  assert.ok(
    gateEdit
      .filter((r) => r.config === CONFIG_PATHS.harness)
      .every((r) => r.demos.includes("button")),
  );
}

if (import.meta.main) {
  runSelfCheck();
  main();
}
