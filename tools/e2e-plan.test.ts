// @vitest-environment node
//
// Node rather than the project-wide jsdom, for the same reason
// check-architecture.test.ts opts out: these read the repository's own files
// (the e2e directory, the two workflow YAMLs) and exercise the plan against
// real on-disk state. No git, no moon, no browsers — the affected set is
// synthetic, exactly as `runSelfCheck` builds it.

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  classifyFiles,
  plan,
  rootShardGroups,
  runSelfCheck,
  type AffectedProject,
  type MatrixRow,
} from "./e2e-plan.ts";
import { PROFILE_PROJECTS } from "../playwright/profiles.ts";

const ROOT = join(import.meta.dirname, "..");

/** A synthetic affected project — the same shape `runSelfCheck` builds. */
const project = (id: string, source: string, tasks: string[]): AffectedProject => ({
  id,
  source,
  tasks: Object.fromEntries(tasks.map((t) => [t, {}])),
});

/**
 * Pin `GITHUB_EVENT_NAME` for the duration of `fn`. `isPrLevel()` reads the
 * process env, and a leaked value would flip the component scenario's
 * PR-vs-push behavior for every later assertion in the same worker.
 */
const withEventName = (name: string, fn: () => void): void => {
  const original = process.env.GITHUB_EVENT_NAME;
  process.env.GITHUB_EVENT_NAME = name;
  try {
    fn();
  } finally {
    if (original === undefined) delete process.env.GITHUB_EVENT_NAME;
    else process.env.GITHUB_EVENT_NAME = original;
  }
};

/**
 * The row at `index`, or a thrown error naming the empty plan — narrowing
 * without the non-null assertions this repository's lint bars.
 */
const leg = (rows: MatrixRow[], index = 0): MatrixRow => {
  const row = rows[index];
  if (row === undefined) throw new Error(`expected a leg at index ${String(index)}`);
  return row;
};

/** A root group by name, or a thrown error naming the miss. */
const group = (name: string): { group: string; specs: string[]; shards: number } => {
  const found = rootShardGroups().find((g) => g.group === name);
  if (found === undefined) throw new Error(`expected a root group named ${name}`);
  return found;
};

const ROOT_CONFIG = "playwright.config.ts";
const HARNESS_CONFIG = "playwright/harness/playwright.config.ts";
const TEMPLATE_CONFIG = "playwright/template/playwright.config.ts";
const HARNESS_AXE_GATE = "playwright/harness/accessibility.e2e.ts";
const ACCESSIBILITY = "accessibility";
const GROUPS = rootShardGroups();
const ROOT_LEGS_PER_BROWSER = GROUPS.reduce((n, g) => n + g.shards, 0);

describe("e2e-plan: spec-group partition", () => {
  // The property the flat split got for free from the config's testMatch: a
  // newly added gate joins a leg automatically, no spec runs twice, and the
  // catch-all never runs empty (an empty positional list would make
  // Playwright run the whole suite on that leg).
  it("the groups partition the root suite's on-disk specs exactly once", () => {
    const directory = readdirSync(join(ROOT, "e2e"))
      .filter((f) => f.endsWith(".e2e.ts"))
      .sort()
      .map((f) => `e2e/${f}`);
    const covered = GROUPS.flatMap((g) => g.specs).sort();
    expect(covered).toEqual(directory);
  });

  it("no spec appears in two groups", () => {
    const specs = GROUPS.flatMap((g) => g.specs);
    expect(new Set(specs).size).toBe(specs.length);
  });

  it("the small catch-all group exists and is non-empty", () => {
    expect(group("small").specs.length).toBeGreaterThan(0);
  });

  it("the small group carries exactly the specs the named groups do not", () => {
    const named = GROUPS.filter((g) => g.group !== "small").flatMap((g) => g.specs);
    const smallSpecs = group("small").specs;
    for (const spec of smallSpecs) {
      expect(named.includes(spec)).toBe(false);
    }
    const onDisk = readdirSync(join(ROOT, "e2e"))
      .filter((f) => f.endsWith(".e2e.ts"))
      .map((f) => `e2e/${f}`);
    for (const spec of onDisk) {
      expect(named.includes(spec) || smallSpecs.includes(spec)).toBe(true);
    }
  });

  it("a11y carries the most shards — the measured heaviest spec is the pole", () => {
    const heaviest = GROUPS.reduce((a, b) => (b.shards > a.shards ? b : a));
    expect(heaviest.group).toBe("a11y");
  });
});

describe("e2e-plan: emitted leg properties", () => {
  const docsPlan = plan("docs", []);
  const rootRows = docsPlan.filter((r) => r.config === ROOT_CONFIG);

  it("every browser gets one leg per group shard, with agreeing shardArgs", () => {
    expect(rootRows.length).toBe(PROFILE_PROJECTS.standard.length * ROOT_LEGS_PER_BROWSER);
    for (const browser of PROFILE_PROJECTS.standard) {
      for (const g of GROUPS) {
        const legs = rootRows.filter((r) => r.browser === browser && r.specs[0] === g.specs[0]);
        expect(legs.length).toBe(g.shards);
        for (const [i, r] of legs.entries()) {
          expect(r.shardArgs).toBe(
            g.shards > 1 ? `--shard=${String(i + 1)}/${String(g.shards)}` : "",
          );
        }
      }
    }
  });

  it("a leg runs only its own group's specs", () => {
    for (const r of rootRows) {
      const own = GROUPS.find((g) => r.name.includes(`-${g.group}`));
      expect(own).toBeDefined();
      if (own === undefined) throw new Error("unreachable after the narrowing expect");
      for (const spec of r.specs) {
        expect(own.specs.includes(spec)).toBe(true);
      }
    }
  });

  it("leg names are unique within a plan", () => {
    for (const rows of [docsPlan, plan("deps", [], ["pnpm-lock.yaml"]), plan("template", [])]) {
      const names = rows.map((r) => r.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe("e2e-plan: workers assignment", () => {
  const docsPlan = plan("docs", []);
  const isTwoWorkerBrowser = (browser: string): boolean =>
    browser === "chromium" || browser === "firefox";

  it("a11y chromium and firefox rows run 2 workers — the measured pole", () => {
    const a11y = docsPlan.filter((r) => r.specs.some((s) => s.includes(ACCESSIBILITY)));
    for (const r of a11y) {
      expect(r.workers).toBe(isTwoWorkerBrowser(r.browser) ? 2 : 1);
    }
  });

  it("every non-a11y row runs 1 worker", () => {
    const nonA11y = docsPlan.filter((r) => !r.specs.some((s) => s.includes(ACCESSIBILITY)));
    for (const r of nonA11y) {
      expect(r.workers).toBe(1);
    }
  });

  it("webkit and the mobile projects stay at 1 worker even on a11y", () => {
    const infra = plan("pw-infra", [], ["playwright.config.ts"]);
    const a11y = infra.filter(
      (r) => r.config === ROOT_CONFIG && r.specs.some((s) => s.includes(ACCESSIBILITY)),
    );
    for (const r of a11y) {
      expect(r.workers).toBe(isTwoWorkerBrowser(r.browser) ? 2 : 1);
    }
  });
});

describe("e2e-plan: scenario leg-count arithmetic", () => {
  it("docs emits 24 root legs (3 browsers × 8 group legs)", () => {
    const docsPlan = plan("docs", []);
    expect(docsPlan.length).toBe(PROFILE_PROJECTS.standard.length * ROOT_LEGS_PER_BROWSER);
    expect(docsPlan.every((r) => r.config === ROOT_CONFIG)).toBe(true);
  });

  it("deps lockfile-only emits 24 root legs and no harness legs", () => {
    const depsPlan = plan("deps", [], ["pnpm-lock.yaml"]);
    expect(depsPlan.length).toBe(PROFILE_PROJECTS.standard.length * ROOT_LEGS_PER_BROWSER);
    expect(depsPlan.every((r) => r.config === ROOT_CONFIG)).toBe(true);
  });

  it("theme emits the root sweep plus one harness leg per standard browser", () => {
    const themePlan = plan("theme", [
      project("theme-core", "packages/theme-core", []),
      project("badge", "packages/primitives/badge", []),
    ]);
    expect(themePlan.filter((r) => r.config === ROOT_CONFIG).length).toBe(
      PROFILE_PROJECTS.standard.length * ROOT_LEGS_PER_BROWSER,
    );
    expect(themePlan.filter((r) => r.config === HARNESS_CONFIG).length).toBe(
      PROFILE_PROJECTS.standard.length,
    );
  });

  it("pw-infra emits 40 root + 3 harness = 43 legs without templates", () => {
    const infraPlan = plan("pw-infra", [], ["playwright.config.ts"]);
    expect(infraPlan.filter((r) => r.config === ROOT_CONFIG).length).toBe(
      PROFILE_PROJECTS.full.length * ROOT_LEGS_PER_BROWSER,
    );
    expect(infraPlan.filter((r) => r.config === HARNESS_CONFIG).length).toBe(
      PROFILE_PROJECTS.standard.length,
    );
    expect(infraPlan.filter((r) => r.config === TEMPLATE_CONFIG).length).toBe(0);
  });

  it("pw-infra with template content appends 3 template legs (43 → 46)", () => {
    const infraWithTemplates = plan(
      "pw-infra",
      [],
      ["tools/e2e-plan.ts", "templates/analytics/src/App.vue"],
    );
    expect(infraWithTemplates.filter((r) => r.config === ROOT_CONFIG).length).toBe(
      PROFILE_PROJECTS.full.length * ROOT_LEGS_PER_BROWSER,
    );
    expect(infraWithTemplates.filter((r) => r.config === HARNESS_CONFIG).length).toBe(
      PROFILE_PROJECTS.standard.length,
    );
    expect(infraWithTemplates.filter((r) => r.config === TEMPLATE_CONFIG).length).toBe(
      PROFILE_PROJECTS.standard.length,
    );
  });

  it("noop emits zero legs", () => {
    expect(plan("noop", [])).toEqual([]);
  });
});

describe("e2e-plan: component scenario PR-vs-push", () => {
  it("a spec-less component at PR level runs zero browser legs", () => {
    withEventName("pull_request", () => {
      expect(plan("component", [project("badge", "packages/primitives/badge", [])])).toEqual([]);
    });
  });

  it("a spec-less component at push runs the harness leg as the backstop", () => {
    withEventName("push", () => {
      const result = plan("component", [project("badge", "packages/primitives/badge", [])]);
      const backstop = leg(result);
      expect(result.length).toBe(1);
      expect(backstop.config).toBe(HARNESS_CONFIG);
      expect(backstop.browser).toBe("chromium");
      expect(backstop.demos).toEqual(["badge"]);
      expect(backstop.specs).toContain(HARNESS_AXE_GATE);
    });
  });

  it("a component with specs runs its own specs at either event level", () => {
    withEventName("pull_request", () => {
      const result = plan("component", [
        project("button", "packages/primitives/button", ["test", "e2e"]),
      ]);
      const only = leg(result);
      expect(result.length).toBe(1);
      expect(only.config).toBe(HARNESS_CONFIG);
      expect(only.specs).toContain("packages/primitives/button/e2e");
      expect(only.demos).toContain("button");
    });
  });

  it("a mixed docs + component change keeps both evidence halves", () => {
    withEventName("pull_request", () => {
      const result = plan(
        "component",
        [project("button", "packages/primitives/button", ["test", "e2e"])],
        ["docs/index.md", "packages/primitives/button/src/Button.vue"],
      );
      expect(result.some((r) => r.config === HARNESS_CONFIG)).toBe(true);
      expect(result.filter((r) => r.config === ROOT_CONFIG).length).toBe(ROOT_LEGS_PER_BROWSER);
    });
  });

  it("the empty-affectedDemos fallback emits the root sweep at smoke, not zero legs", () => {
    // A change to a project with no demo (`labels` has no LabelsDemo.vue) and
    // no e2e task leaves `affectedDemos` and `withE2E` both empty, so the
    // component scenario falls through to `rootLegs("smoke")` — the full sweep
    // on chromium, not the zero-leg path. Pinned as documented behavior:
    // conservative for infrastructure changes whose blast radius is the whole
    // surface, and the one component case that does NOT drop to zero legs at
    // PR level.
    withEventName("pull_request", () => {
      const result = plan("component", [project("labels", "packages/labels", [])]);
      expect(result.length).toBe(ROOT_LEGS_PER_BROWSER);
      expect(result.every((r) => r.config === ROOT_CONFIG)).toBe(true);
      expect(result.every((r) => r.browser === "chromium")).toBe(true);
    });
  });

  it("a demo-only edit maps back to its component at push", () => {
    withEventName("push", () => {
      const result = plan("component", [project("docs", "docs", [])], ["docs/demos/BadgeDemo.vue"]);
      const backstop = leg(result);
      expect(result.length).toBe(1);
      expect(backstop.config).toBe(HARNESS_CONFIG);
      expect(backstop.demos).toEqual(["badge"]);
    });
  });
});

describe("e2e-plan: pw-infra representative-demo fallback", () => {
  it("keeps the harness legs alive with an empty affected set", () => {
    const infraPlan = plan("pw-infra", [], ["playwright/harness/accessibility.e2e.ts"]);
    const harnessLegs = infraPlan.filter((r) => r.config === HARNESS_CONFIG);
    expect(harnessLegs.length).toBe(PROFILE_PROJECTS.standard.length);
    for (const legRow of harnessLegs) {
      expect(legRow.demos).toContain("button");
    }
  });
});

describe("e2e-plan: bench workflow ↔ plan consistency", () => {
  // No yaml parser is a devDependency, and adding one for these assertions is
  // not worth the lockfile cost — the expressions this test reads are single
  // lines of fixed shape, so a targeted extraction is enough. If the
  // extraction misses, the first expectation fails and points here.
  const BENCH_YML = readFileSync(join(ROOT, ".github", "workflows", "e2e-bench.yml"), "utf8");
  // Each expression lives on its own `env:` line; scope the per-group regex to
  // that line so a GROUP_SHARDS arm (which comes first) cannot satisfy a
  // GROUP_SPECS extraction or the reverse.
  const specsLine = BENCH_YML.split("\n").find((l) => l.includes("GROUP_SPECS:")) ?? "";
  const shardsLine = BENCH_YML.split("\n").find((l) => l.includes("GROUP_SHARDS:")) ?? "";

  const benchSpecsFor = (name: string): string[] => {
    const match = new RegExp(`inputs\\.group == '${name}' && '([^']+)'`).exec(specsLine);
    const captured = match?.[1];
    if (captured === undefined) throw new Error(`no GROUP_SPECS arm for ${name} in e2e-bench.yml`);
    return captured.split(/\s+/);
  };

  const benchShardsFor = (name: string): number => {
    const match = new RegExp(`inputs\\.group == '${name}' && '(\\d+)'`).exec(shardsLine);
    if (match === null) throw new Error(`no GROUP_SHARDS arm for ${name} in e2e-bench.yml`);
    return Number(match[1]);
  };

  it("the bench's GROUP_SPECS maps every group to the plan's specs", () => {
    for (const g of GROUPS) {
      expect(benchSpecsFor(g.group).sort()).toEqual([...g.specs].sort());
    }
  });

  it("the bench's GROUP_SHARDS matches the plan for the sharded groups", () => {
    for (const g of GROUPS) {
      if (g.shards === 1) continue;
      expect(benchShardsFor(g.group)).toBe(g.shards);
    }
  });

  it("the empty-group fallback still runs the legacy flat 5-shard split", () => {
    // The GROUP_SHARDS ternary ends in `|| '5'` for the empty group; pin it so
    // a re-cut cannot silently drop the comparison instrument the §9 numbers
    // were measured against.
    expect(BENCH_YML).toMatch(/\|\|\s*'5'\s*\}\}/);
  });

  it("the bench's dispatch options enumerate the plan's groups", () => {
    // A group the plan knows about but the bench cannot dispatch is a group
    // the bench can never time — the dispatch input is the bench's only entry
    // into the group topology. The `group` input is the last in the dispatch
    // block, so slice from its key to `permissions:` rather than matching the
    // first `options:` list in the file (the `project` input's).
    const groupInput = BENCH_YML.slice(
      BENCH_YML.indexOf("  group:"),
      BENCH_YML.indexOf("permissions:"),
    );
    const optionsBlock = /options:\n((?:\s+- .+\n)+)/.exec(groupInput)?.[1] ?? "";
    for (const g of GROUPS) {
      expect(optionsBlock.includes(`- ${g.group}`)).toBe(true);
    }
  });
});

describe("e2e-plan: ci.yml plumbing", () => {
  const CI_YML = readFileSync(join(ROOT, ".github", "workflows", "ci.yml"), "utf8");

  it("the e2e-run step passes --workers from the matrix row to Playwright", () => {
    expect(CI_YML.includes("--workers ${{ matrix.workers }}")).toBe(true);
  });

  it("the e2e-discover step invokes the plan tool", () => {
    expect(CI_YML.includes("node --experimental-strip-types tools/e2e-plan.ts --print")).toBe(true);
  });
});

describe("e2e-plan: runSelfCheck", () => {
  it("passes against the repository this file runs in", () => {
    // The CI e2e-discover job runs this same function before the CLI; the
    // vitest tier stays honest about what that job asserts.
    expect(() => {
      runSelfCheck();
    }).not.toThrow();
  });

  it("leaves GITHUB_EVENT_NAME exactly as it found it, set or unset", () => {
    // runSelfCheck drives isPrLevel() through the process env; a leaked "push"
    // in CI's e2e-discover job would make a pull_request run emit the
    // push-level backstop legs the component policy does not run. Both
    // directions are pinned: the CI case (set) and the local run (unset —
    // where a naive `= original` restore would write the literal string
    // "undefined").
    for (const initial of [undefined, "pull_request"]) {
      if (initial === undefined) delete process.env.GITHUB_EVENT_NAME;
      else process.env.GITHUB_EVENT_NAME = initial;
      runSelfCheck();
      expect(process.env.GITHUB_EVENT_NAME).toBe(initial);
    }
  });
});

describe("e2e-plan: classifyFiles precedence", () => {
  it("ranks template above deps so the committed importer is not swallowed", () => {
    expect(classifyFiles(["templates/starter/src/App.vue", "pnpm-lock.yaml"])).toBe("template");
  });

  it("keeps a demo edit out of the docs scenario", () => {
    expect(classifyFiles(["docs/demos/BadgeDemo.vue"])).toBe("component");
  });

  it("classifies the plan tool itself as pw-infra", () => {
    expect(classifyFiles(["tools/e2e-plan.ts"])).toBe("pw-infra");
  });
});
