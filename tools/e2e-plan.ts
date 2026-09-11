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
 *               at `smoke`. A component without own specs runs no browser legs
 *               at PR level: semantic evidence comes from the browserless tier
 *               (docs/demos-a11y.test.ts, re-run via moon's affected closure),
 *               contrast pairs are pinned browserlessly by theme-core tests,
 *               and the rendering-dependent demo sweep is kept as a push-to-main
 *               backstop.
 *   template    templates/** — a template source change (App.vue, vite.config,
 *               moon.yml, etc.) → the template browser harness at `standard`
 *               (chromium, firefox, webkit). Classified BEFORE deps: every
 *               template PR edits the lockfile (the committed importer), so a
 *               deps-first order would swallow every template PR (#225) —
 *               measured on the PR that added templates/workspace-settings,
 *               which ran 15 deps-root legs and zero template legs. And a
 *               pw-infra diff that carries templates/** gets the template
 *               legs appended in `plan()` for the same reason. Every template
 *               is tested, not only the one that changed: a single template
 *               edit is fast enough (seconds per template) that narrowing the
 *               set adds complexity with no meaningful CI cost. The template
 *               suites carry the axe gate and the 375px scroll-container
 *               focusability check, and WebKit is the engine that witnesses
 *               the latter — Chromium auto-focuses scroll containers, so a
 *               smoke-only (chromium) leg would pass with the defect fully
 *               present.
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

/**
 * Whether this run is at pull-request level.
 *
 * PR-level events (pull_request, merge_group) treat a spec-less component change
 * as needing no browser legs: semantic evidence arrives from the browserless tier
 * (docs/demos-a11y.test.ts via moon's affected closure), contrast pairs are pinned
 * by theme-core tests, and the rendering-dependent demo sweep is kept as a push-to-main
 * backstop. Push/dispatch events still run the harness leg as that backstop.
 *
 * Absent (a local run), this conservatively defaults to PR-level behavior: the tool
 * is usually run locally to test the plan shape, and a local developer's run should
 * model the CI path that costs less.
 */
const isPrLevel = (): boolean =>
  process.env.GITHUB_EVENT_NAME !== "push" && process.env.GITHUB_EVENT_NAME !== "workflow_dispatch";

// The reverse of the harness's kebabToPascal (`?component=` → demo filename):
// a project id is `badge`, its demo is `docs/demos/BadgeDemo.vue`. The
// artifact gate guarantees every component owns a demo, so on-disk existence
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
const PACKAGE_TIERS = ["primitives", "composition", "patterns", "layouts"];

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

// A template change is anything under templates/. Templates are consumer-
// shaped Vite apps — not VitePress pages — so a template edit needs the
// template browser harness, not the root docs suite or the component harness.
const TEMPLATE_PATTERNS = [/^templates\//];

type Scenario = "pw-infra" | "theme" | "deps" | "docs" | "component" | "template" | "noop";

export function classifyFiles(files: string[]): Scenario {
  if (!files.length) return "noop";
  const matches = (patterns: RegExp[]): boolean =>
    patterns.some((p) => files.some((f) => p.test(f)));

  if (matches(PW_INFRA_PATTERNS)) return "pw-infra";
  if (matches(THEME_PATTERNS)) return "theme";
  // A template change must be classified before deps, docs and component.
  // Before deps above all: every template PR edits pnpm-lock.yaml, because
  // the template contract requires committing the importer CI installs from
  // with --frozen-lockfile, so a deps-first order sends every template PR
  // down the deps scenario and the template gates never run — measured on
  // #223, whose run produced 15 deps-root legs and zero template legs for a
  // PR that added templates/workspace-settings. The docs/component precedence
  // holds because templates have their own harness and do not need the docs
  // site or component harness.
  if (matches(TEMPLATE_PATTERNS)) return "template";
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
// harness, a `template` leg the template browser harness. The values are the
// config paths the legs run with, so the CI job can consume `matrix.config`
// without re-deriving it by label.
const CONFIG_PATHS = {
  root: "playwright.config.ts",
  harness: "playwright/harness/playwright.config.ts",
  template: "playwright/template/playwright.config.ts",
} as const;

// The harness axe gate, appended to every harness leg's specs. Playwright's
// positional args override the config's `testMatch`, so a leg that passes only
// the component dirs would silently drop the gate — it must be a positional arg
// too, or the component evidence and the accessibility evidence stop being the
// same workload.
const HARNESS_AXE_GATE = "playwright/harness/accessibility.e2e.ts";

/**
 * How the root cross-cutting suite is cut into legs, per browser: spec
 * groups, each sharded by its measured cost.
 *
 * Playwright shards a test list by walking it in declaration order and
 * slicing contiguously — measured on the full-suite bench (runs
 * 34593135967/34593707946, commit a09a516, 2026-09-11): all 177
 * accessibility tests landed in shard 1 of 5 and the 144 cheapest
 * target-size tests in shard 5, so the pole leg carried ×1.94 the tail
 * leg's test wall on chromium (10.20m vs 5.26m) and ×1.54 on firefox
 * (11.42m vs 7.43m). Shards run as parallel legs, so every idle shard
 * minute extends the job wall-clock; the pole, not the total, is the
 * pipeline's critical path.
 *
 * The split below cuts the suite by spec group instead, with each group's
 * shard count from its measured share of firefox test wall (same runs):
 * accessibility 45.4%, contrast 24.7%, target-size 14.6%, keyboard 13.0%,
 * the three small gates 2.3% combined. Re-slicing each group into its
 * pieces — the same contiguous mechanism, now within one spec — projects
 * the firefox pole at 6.36m (accessibility 1/3) against 11.42m flat,
 * −44% on the engine the pipeline waits for, with chromium's pole at
 * 5.67m. Per browser the plan is 8 legs where the flat split ran 5; the
 * three extra legs pay ~2.4m of setup each and buy ~5m of wall on every
 * run that includes the root sweep.
 *
 * Costs move with the page set. The counts above were measured at 144
 * pages; re-run the bench and re-cut the groups when documentationPages()
 * grows past ~250 pages or a new heavy gate lands — the sizing is
 * re-derived from data, not projected from a per-page constant.
 *
 * The `small` group is computed from the directory, not a literal list,
 * so a newly added gate joins a leg automatically — the property the flat
 * split got for free from the config's testMatch, and the one this table
 * must never lose. `runSelfCheck` pins it.
 */
const ROOT_SHARD_PLAN: { group: string; specs: string[]; shards: number }[] = [
  { group: "a11y", specs: ["e2e/accessibility.e2e.ts"], shards: 3 },
  { group: "contrast", specs: ["e2e/contrast.e2e.ts"], shards: 2 },
  { group: "keyboard", specs: ["e2e/keyboard.e2e.ts"], shards: 1 },
  { group: "target-size", specs: ["e2e/target-size.e2e.ts"], shards: 1 },
];

// Every root-suite spec not named in the plan — the catch-all leg a new
// gate falls into, keeping the flat split's "a new file runs" guarantee.
const smallRootGroup = (): { group: string; specs: string[]; shards: number } => ({
  group: "small",
  specs: readdirSync(join(ROOT, "e2e"))
    .filter((f) => f.endsWith(".e2e.ts"))
    .sort()
    .map((f) => `e2e/${f}`)
    .filter((s) => !ROOT_SHARD_PLAN.some((g) => g.specs.includes(s))),
  shards: 1,
});

const rootShardGroups = (): { group: string; specs: string[]; shards: number }[] => [
  ...ROOT_SHARD_PLAN,
  smallRootGroup(),
];

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
  /**
   * The `--workers` count the leg passes. The a11y rows of chromium and
   * firefox run 2 — CI-measured on those exact legs (runs
   * 34603189852/34603193137/34603196536/34603200180: wall ÷1.55–1.59 for
   * compute ×1.25–1.28, zero failures and retries); every other row stays at
   * 1 until a bench says otherwise.
   */
  workers: number;
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
    config: keyof typeof CONFIG_PATHS,
    specs: string[],
    demos: string[],
    browser: keyof typeof ENGINE_FOR_PROJECT,
    shards: number,
    shardIndex: number,
    group = "",
    workers = 1,
  ): MatrixRow => ({
    scenario,
    profile,
    config: CONFIG_PATHS[config],
    browser,
    install: ENGINE_FOR_PROJECT[browser],
    specs,
    demos,
    shardArgs: shards > 1 ? `--shard=${String(shardIndex)}/${String(shards)}` : "",
    workers,
    name: `${scenario}-${config}-${browser}${group ? `-${group}` : ""}${shards > 1 ? `-s${String(shardIndex)}` : ""}`,
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

  // The root cross-cutting suite across `profile`'s browsers, cut by the
  // measured spec-group plan: each group is its own set of legs, sharded
  // within the group's positional specs (ROOT_SHARD_PLAN holds the sizing
  // evidence and the pole arithmetic).
  // Workers are part of the measured leg shape, not a knob: the two-worker
  // a11y legs are the ones the bench priced (MatrixRow.workers), and the
  // other groups keep the suite's historic one-worker isolation until their
  // own bench exists.
  const ROOT_WORKERS: Record<string, number> = { chromium: 2, firefox: 2 };
  const rootLegs = (profile: BrowserProfile): MatrixRow[] =>
    PROFILE_PROJECTS[profile].flatMap((browser) =>
      rootShardGroups().flatMap(({ group, specs, shards }) =>
        Array.from({ length: shards }, (_, i) =>
          row(
            profile,
            "root",
            specs,
            [],
            browser,
            shards,
            i + 1,
            group,
            group === "a11y" ? (ROOT_WORKERS[browser] ?? 1) : 1,
          ),
        ),
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

  // The template suite runs whole (every template, axe + keyboard +
  // responsive), so a leg is one browser and one shard — `standard`, because
  // the focusability check speaks for WebKit. Both the `template` scenario
  // and the pw-infra append below emit exactly this.
  const templateLegs = (): MatrixRow[] =>
    PROFILE_PROJECTS.standard.flatMap((browser) =>
      Array.from({ length: 1 }, (_, i) => row("standard", "template", [], [], browser, 1, i + 1)),
    );

  switch (scenario) {
    case "pw-infra": {
      // The browsers and the harness are the thing being changed. Every
      // engine on the root suite, every component spec too. If the change
      // touches no component (an edit to the harness gate itself), the root
      // sweep still runs — but the edited gate must be *executed*, not just
      // rebuilt, so a representative demo keeps the harness legs alive even
      // with an empty affected set.
      if (!affectedDemos.length) affectedDemos.push("button");
      const rows = [...rootLegs("full"), ...harnessLegs("standard")];
      // An infra PR can carry template content: #218 rewrote
      // templates/analytics in the same commit range that touched this tool,
      // and classified pw-infra both times it ran — so the template gates
      // never executed against that rewrite. Whatever else an infra diff
      // needs, a diff that touches templates/ still owes the template suite
      // its own evidence; three cheap legs close that hole.
      if (TEMPLATE_PATTERNS.some((p) => files.some((f) => p.test(f)))) {
        rows.push(...templateLegs());
      }
      return rows;
    }
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
      // A component change follows one of three policies:
      //
      // 1. Spec-less component, no docs prose change, PR-level: zero browser legs.
      //    Semantic evidence arrives from the browserless tier (docs/demos-a11y.test.ts)
      //    via moon's affected closure (button → loom → docs). Contrast pairs are
      //    pinned browserlessly by theme-core tests (#121). The rendering-dependent
      //    demo sweep is kept as a push-to-main backstop (runs below). This drops
      //    a whole CI job (~1.5–2.2 m bootstrap-dominated) for exactly the change
      //    class that needed it least.
      //
      // 2. Spec-less component, no docs prose, push/dispatch: harness leg as the backstop.
      //    The semantic and contrast evidence still run browserlessly, but the
      //    rendering-dependent sweep must still execute on merge.
      //
      // 3. Component with specs, or docs touched: harness leg(s) as today.
      //    Behavioral/geometry evidence needs a browser; a prose change keeps the
      //    root sweep (generated tables) alongside the component legs.
      const touchedDocs = files.some((f) => /^docs\/(?!demos\/)/.test(f));
      const isSpecLessComponent = withE2E.length === 0 && !touchedDocs && affectedDemos.length > 0;

      // Case 1: spec-less component at PR level → no browser legs
      if (isSpecLessComponent && isPrLevel()) {
        return [];
      }

      // Case 2: spec-less component at push/dispatch → harness leg (backstop)
      // Case 3: has specs or docs touched → harness legs + optional root sweep
      const harness =
        withE2E.length || affectedDemos.length ? harnessLegs("smoke") : rootLegs("smoke");
      const extra = touchedDocs ? rootLegs("smoke") : [];
      return [...harness, ...extra];
    }
    case "template": {
      // A template change runs the template browser harness at `standard`.
      // Every template is tested, not just the one that changed: a single
      // template edit is fast enough (seconds per template) that narrowing the
      // set adds complexity with no meaningful CI cost. The profile is
      // `standard` and not `smoke` because the keyboard gate's focusability
      // check speaks for WebKit — Chromium auto-focuses scroll containers, so
      // a chromium-only leg would pass with the defect fully present.
      //
      // Templates are consumer-shaped Vite apps — not VitePress pages — so
      // there is no root sweep. They do not need the component harness either.
      return templateLegs();
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
  assert.equal(classifyFiles(["templates/analytics/src/App.vue"]), "template");
  assert.equal(classifyFiles(["templates/starter/moon.yml"]), "template");
  // The template + lockfile shape is not a curiosity — it is what every
  // template PR looks like (the importer is committed), and the deps-first
  // order used to swallow it (#225: 15 deps-root legs, zero template legs on
  // the PR adding a template). This is the row that keeps the order honest.
  assert.equal(
    classifyFiles(["templates/workspace-settings/src/App.vue", "pnpm-lock.yaml"]),
    "template",
  );
  assert.equal(classifyFiles([]), "noop");

  // plan — the affected-set decisions, against real demo files on disk.
  const project = (id: string, source: string, tasks: string[]): AffectedProject => ({
    id,
    source,
    tasks: Object.fromEntries(tasks.map((t) => [t, {}])),
  });

  // A badge edit (no e2e specs of its own) has different behavior at PR level
  // vs push/dispatch. At PR level, it runs zero browser legs: semantic evidence
  // arrives from the browserless tier (docs/demos-a11y.test.ts via moon's affected
  // closure), contrast pairs are pinned browserlessly by theme-core tests, and
  // the rendering-dependent demo sweep is kept as a push-to-main backstop.
  //
  // Temporarily override PR_LEVEL for testing by setting GITHUB_EVENT_NAME.
  const originalEventName = process.env.GITHUB_EVENT_NAME;
  process.env.GITHUB_EVENT_NAME = "pull_request";
  const badgeOnlyPr = plan("component", [project("badge", "packages/primitives/badge", [])]);
  assert.equal(badgeOnlyPr.length, 0, "spec-less component at PR level -> zero browser legs");

  // At push/dispatch, the same change runs the harness leg as the backstop.
  process.env.GITHUB_EVENT_NAME = "push";
  const badgeOnlyPush = plan("component", [project("badge", "packages/primitives/badge", [])]);
  const badgeLeg = badgeOnlyPush[0];
  assert.ok(badgeLeg, "spec-less component at push -> harness leg");
  assert.equal(badgeOnlyPush.length, 1, "badge-only edit at push -> one smoke leg, not a matrix");
  assert.equal(badgeLeg.config, CONFIG_PATHS.harness);
  assert.deepEqual(badgeLeg.demos, ["badge"]);
  assert.deepEqual(badgeLeg.specs, [HARNESS_AXE_GATE]);
  // Restore original environment
  process.env.GITHUB_EVENT_NAME = originalEventName;

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
  // the bar at standard, beside the root sweep: 3 browsers × the spec-group
  // plan's legs (8 per browser today), one harness leg per browser while the
  // affected set is small.
  const themed = plan("theme", [
    project("theme-core", "packages/theme-core", []),
    project("badge", "packages/primitives/badge", []),
  ]);
  const rootLegsPerBrowser = rootShardGroups().reduce((n, g) => n + g.shards, 0);
  assert.equal(
    themed.filter((r) => r.config === CONFIG_PATHS.root).length,
    PROFILE_PROJECTS.standard.length * rootLegsPerBrowser,
  );
  assert.equal(themed.filter((r) => r.config === CONFIG_PATHS.harness).length, 3);
  assert.ok(
    themed.filter((r) => r.config === CONFIG_PATHS.harness).every((r) => r.demos.includes("badge")),
  );

  // The spec-group plan's safety properties, not its literals: every spec in
  // the root suite lands in exactly one group (a newly added gate joins the
  // small leg instead of silently dropping out of CI), the heaviest group
  // carries the most shards, every sharded row's args agree with its group,
  // and the job names stay unique — `name` keys the GitHub job and the
  // report artifact, and upload-artifact rejects duplicates.
  {
    const groups = rootShardGroups();
    const directory = readdirSync(join(ROOT, "e2e"))
      .filter((f) => f.endsWith(".e2e.ts"))
      .sort()
      .map((f) => `e2e/${f}`);
    const covered = groups.flatMap((g) => g.specs).sort();
    assert.deepEqual(covered, directory, "the groups partition the root suite's specs");
    const counts = new Map<string, number>();
    for (const s of covered) counts.set(s, (counts.get(s) ?? 0) + 1);
    assert.ok(
      [...counts.values()].every((n) => n === 1),
      "no spec is named twice",
    );
    const small = groups.find((g) => g.group === "small");
    assert.ok(small, "the catch-all small group exists");
    assert.ok(
      small.specs.length > 0,
      "the small leg carries specs — an empty positional arg list would make Playwright run the whole suite on that leg",
    );
    const heaviest = groups.reduce((a, b) => (b.shards > a.shards ? b : a));
    assert.equal(heaviest.group, "a11y", "the pole group is the measured heaviest spec");
    const docsPlan = plan("docs", []);
    const rootRows = docsPlan.filter((r) => r.config === CONFIG_PATHS.root);
    for (const browser of PROFILE_PROJECTS.standard) {
      for (const g of groups) {
        const rows = rootRows.filter((r) => r.browser === browser && r.specs[0] === g.specs[0]);
        assert.equal(
          rows.length,
          g.shards,
          `the ${g.group} group runs ${String(g.shards)} legs on ${browser}`,
        );
        for (const [i, r] of rows.entries()) {
          assert.equal(
            r.shardArgs,
            g.shards > 1 ? `--shard=${String(i + 1)}/${String(g.shards)}` : "",
          );
          assert.equal(
            r.specs.every((s) => g.specs.includes(s)),
            true,
            "a leg runs only its group's specs",
          );
          assert.equal(
            r.workers,
            g.group === "a11y" && (browser === "chromium" || browser === "firefox") ? 2 : 1,
            `${r.name} carries the measured worker count`,
          );
        }
      }
    }
    const names = new Set(rootRows.map((r) => r.name));
    assert.equal(names.size, rootRows.length, "root leg names are unique");
  }

  // A no-op change runs nothing.
  assert.equal(plan("noop", []).length, 0);

  // A lockfile-only bump gets the root sweep (moon marks no project affected —
  // the site is the evidence) and nothing per-component.
  const depsOnly = plan("deps", [], ["pnpm-lock.yaml"]);
  assert.equal(depsOnly.length, PROFILE_PROJECTS.standard.length * rootLegsPerBrowser);
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
  // 1. A demo edit — the file that *is* a component's browser evidence — has
  //    different behavior at PR level vs push/dispatch. At PR level, a demo-only
  //    edit (no component specs, no docs prose) runs zero browser legs for the
  //    same reason as a spec-less component: semantic evidence arrives from the
  //    browserless tier, contrast pairs are pinned browserlessly, and the
  //    rendering-dependent sweep is kept as a push-to-main backstop.
  //
  //    Moon's affected set for a BadgeDemo.vue edit is `docs` only (empirically),
  //    so the reverse map must supply the `badge` id — and it does, via the
  //    for-loop that maps demo files to components.
  process.env.GITHUB_EVENT_NAME = "pull_request";
  const demoEditPr = plan("component", [project("docs", "docs", [])], ["docs/demos/BadgeDemo.vue"]);
  assert.equal(demoEditPr.length, 0, "demo-only edit at PR level -> zero browser legs");

  // At push/dispatch, a demo edit runs the harness leg as the backstop.
  process.env.GITHUB_EVENT_NAME = "push";
  const demoEditPush = plan(
    "component",
    [project("docs", "docs", [])],
    ["docs/demos/BadgeDemo.vue"],
  );
  assert.equal(demoEditPush.length, 1, "demo-only edit at push -> one harness leg");
  const demoEditRow = demoEditPush[0];
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

  // 6. A template change runs the template harness at `standard` — one leg per
  // standard-profile browser.
  const templatePlan = plan("template", [], ["templates/analytics/src/App.vue"]);
  assert.ok(
    templatePlan.every((r) => r.config === CONFIG_PATHS.template && r.profile === "standard"),
    "template change -> one standard leg per standard-profile browser",
  );
  assert.equal(
    templatePlan.length,
    PROFILE_PROJECTS.standard.length,
    "template change -> one leg per standard-profile browser",
  );
  assert.deepEqual(
    templatePlan.map((r) => r.browser),
    PROFILE_PROJECTS.standard,
  );
  // Chromium auto-focuses scroll containers, so the keyboard gate's 375px
  // focusability check speaks for WebKit: if a future edit drops webkit from
  // the template profile, this is where it turns red.
  assert.ok(
    templatePlan.some((r) => r.browser === "webkit"),
    "template plan must include a webkit leg",
  );

  // 7. An infra diff that also carries template content still owes the
  // template suite its legs: #218-classified changes (this tool, the
  // configs, the harness) once rewrote templates/analytics with zero
  // template legs in the plan (#225).
  const infraWithTemplate = plan(
    "pw-infra",
    [],
    ["tools/e2e-plan.ts", "templates/analytics/src/App.vue"],
  );
  assert.ok(
    infraWithTemplate.some((r) => r.config === CONFIG_PATHS.template),
    "pw-infra diff touching templates/ must append template legs",
  );
  assert.ok(
    infraWithTemplate.some((r) => r.config === CONFIG_PATHS.root),
    "pw-infra diff touching templates/ keeps the root sweep",
  );
}

if (import.meta.main) {
  runSelfCheck();
  main();
}
