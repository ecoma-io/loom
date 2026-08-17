/**
 * Run the affected projects' unit and integration tests, closed over the
 * dependency graph.
 *
 * `moon run :test --affected` and `moon ci --affected` select projects whose
 * own files changed — not their dependents. That is the whole migration's
 * problem in miniature: a `button` edit runs button's tests but not
 * alert-dialog's, even though alert-dialog imports button and its tests hold
 * the button the edit touched. The browser side already closes the closure
 * (`tools/e2e-plan.ts` queries `--downstream deep`); this tool gives the
 * unit-test side the same closure, driven through the same Moon tasks so the
 * cache still applies.
 *
 * The tool prints the project ids that actually ran, one per line, so CI can
 * assert the affected claim rather than trusting it.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { affectedProjects } from "./e2e-plan.ts";

const ROOT = new URL("..", import.meta.url).pathname;

// The filter logic is a pure function of the project objects moon returns, so
// the self-check feeds it fabricated objects instead of shelling out.
const ownsTestTask = (tasks: Record<string, unknown>): boolean => "test" in tasks;

/**
 * The projects in the closure that own a `test` task. Every project inherits
 * one from `.moon/tasks/test.yml` (the shared vitest command, scoped to
 * `$projectRoot`), so `docs:test` and `e2e:test` exist and run — `docs` owns a
 * test file and `e2e` has none (so its run is `--passWithNoTests`). The filter
 * is a safety net for a project that overrides `test` away, not a
 * classification of who is "really" testable.
 */
export function projectsWithTests(
  closure: { id: string; tasks: Record<string, unknown> }[],
): string[] {
  return closure.filter((p) => ownsTestTask(p.tasks)).map((p) => p.id);
}

/** The self-check, run before the CLI on every direct execution. */
export function runSelfCheck(): void {
  const button = { id: "button", tasks: { test: {}, lint: {} } };
  const alertDialog = { id: "alert-dialog", tasks: { test: {}, e2e: {} } };
  const docs = { id: "docs", tasks: { build: {} } };
  assert.deepEqual(
    projectsWithTests([button, alertDialog, docs]),
    ["button", "alert-dialog"],
    "only test-task owners are selected",
  );
}

function main(): void {
  const base = process.env.MOON_BASE;
  if (!base) {
    console.error(
      "affected-tests: MOON_BASE is required (the base the affected diff runs against).",
    );
    process.exit(1);
  }

  // The transitive closure — direct changed + every project downstream of them
  // through the graph's deps, the same set the e2e plan computes — then the
  // subset that owns a test task.
  // A base that is not resolvable in this clone makes moon's query throw; the
  // diff is genuinely empty against an absent ref, so treat the query the same
  // way — degrade to a no-op rather than reddening the job over a ref that is
  // not here.
  let closure: { id: string; tasks: Record<string, unknown> }[];
  try {
    closure = affectedProjects(base) as { id: string; tasks: Record<string, unknown> }[];
  } catch {
    closure = [];
  }
  const ids = projectsWithTests(closure);
  if (!ids.length) {
    // A genuinely empty diff is fine (nothing changed, nothing to test) — but
    // an empty set when files DID change means the `--downstream` query broke
    // (e.g. a moon flag regression turning the closure back to direct-only),
    // and silently re-running the no-op would turn the job green on a red
    // premise. Fail loud in that case rather than trust moon's shape.
    const files = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean);
    if (files.length) {
      console.error(
        `affected-tests: ${String(files.length)} files changed but no project owns a test task — ` +
          "the affected query is broken, not the diff empty.",
      );
      process.exit(1);
    }
    console.log("affected-tests: no affected projects own a test task.");
    return;
  }

  // Drive the same Moon `test` tasks the affected model already owns, one
  // target per project, so per-project caching still applies and the only
  // thing this tool adds is the closure.
  try {
    execFileSync("pnpm", ["exec", "moon", "run", ...ids.map((id) => `${id}:test`)], {
      cwd: ROOT,
      env: { ...process.env, MOON_BASE: base },
      encoding: "utf8",
      stdio: "inherit",
    });
  } catch {
    // Exec failure is a real test failure; report the set that ran first, then
    // propagate the exit code so the job turns red.
    console.error(`affected-tests: failed — ran [${ids.join(", ")}]`);
    process.exit(1);
  }

  console.log(`affected-tests: ran [${ids.join(", ")}]`);
}

if (import.meta.main) {
  runSelfCheck();
  main();
}
