/**
 * CI benchmark evidence, collected where the run already logs it.
 *
 * This repository decided its CI architecture on *measurement*, and the three
 * reports moon already writes to `.moon/cache/` are the measurement: a full
 * run leaves `ciReport.json` (per-action duration, status, and the cache
 * estimate) and per-task reports leave `runReport.json`. Nothing here runs
 * anything — it reads the reports a `moon` invocation just produced and, when
 * a `GITHUB_STEP_SUMMARY` path is set, appends a formatted timing block for
 * the Actions UI.
 *
 * Why this exists rather than a tool that times commands: every phase in
 * `ci.yml` already has GitHub's own per-step duration, and moon already has
 * per-action durations and cache hits. A wrapper that re-times them would be a
 * second clock claiming to be more authoritative than both. The gap it fills
 * is *reading* what is there — turning a 263 KiB report into one table a
 * reviewer can read without opening a JSON file.
 *
 * Run `node tools/ci-benchmark.ts` after a `moon ci` (or any moon task run) to
 * print the digest; CI wires it into the verify job's final step, appending to
 * `GITHUB_STEP_SUMMARY`. No flag and no argument: it reads
 * `.moon/cache/ciReport.json` (preferring it when new) and the statuses moon
 * stores, and is a no-op when no report exists.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

interface Duration {
  secs: number;
  nanos: number;
}

const secs = (d?: Duration): number => (d ? d.secs + d.nanos / 1e9 : 0);

interface ReportAction {
  label?: string;
  status?: string;
  duration?: Duration;
  operations?: { id: string; status: string; duration: Duration }[];
}

interface CiReport {
  actions?: ReportAction[];
  comparisonEstimate?: {
    percent: number;
    gain: Duration;
    duration: Duration;
    tasks?: Record<string, { count: number; total: Duration }>;
  };
  duration?: Duration;
}

function readReport(name: string): CiReport | null {
  try {
    return JSON.parse(readFileSync(join(ROOT, ".moon", "cache", name), "utf8")) as CiReport;
  } catch {
    return null;
  }
}

/** The task-selection profile: how many lint/test/build ran, and how many cached. */
function taskSummary(actions: ReportAction[]): {
  byTask: Record<string, { ran: number; cached: number; total: number }>;
} {
  const byTask: Record<string, { ran: number; cached: number; total: number }> = {};
  for (const a of actions) {
    if (!a.label?.startsWith("RunTask(")) continue;
    const id = a.label.slice("RunTask(".length, a.label.length - 1);
    const dot = id.lastIndexOf(":");
    if (dot === -1) continue;
    const task = id.slice(dot + 1);
    const entry = (byTask[task] ??= { ran: 0, cached: 0, total: 0 });
    entry.ran += 1;
    if (a.status === "cached") entry.cached += 1;
    entry.total += secs(a.duration);
  }
  return { byTask };
}

/** The actions moon treats as the "real work": run-task and setup phases. */
function workDuration(actions: ReportAction[]): { ran: number; cached: number; total: number } {
  let ran = 0;
  let cached = 0;
  let total = 0;
  for (const a of actions) {
    if (!a.label?.startsWith("RunTask(")) continue;
    ran += 1;
    if (a.status === "cached") cached += 1;
    total += secs(a.duration);
  }
  return { ran, cached, total };
}

function printReport(): void {
  const report = readReport("ciReport.json") ?? readReport("runReport.json");
  if (!report) {
    console.log(
      "ci-benchmark: no `.moon/cache/ciReport.json` (no moon run yet) — nothing to report.",
    );
    return;
  }

  const actions = report.actions ?? [];
  const work = workDuration(actions);
  const { byTask } = taskSummary(actions);
  const estimate = report.comparisonEstimate;

  const lines: string[] = [];
  lines.push("### CI benchmark · moon run");
  lines.push("");
  lines.push(`| metric | value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| run-task actions | ${String(work.ran)} (${String(work.cached)} cached) |`);
  lines.push(`| sum of run-task durations | ${work.total.toFixed(1)}s |`);
  if (estimate) {
    lines.push(
      `| moon cache savings estimate | ${estimate.percent.toFixed(1)}% (${secs(estimate.gain).toFixed(0)}s) |`,
    );
  }
  lines.push("");
  lines.push(`| task | ran | cached | total (s) |`);
  lines.push(`| --- | ---: | ---: | ---: |`);
  for (const [task, e] of Object.entries(byTask).sort((a, b) => b[1].total - a[1].total)) {
    lines.push(`| ${task} | ${String(e.ran)} | ${String(e.cached)} | ${e.total.toFixed(1)} |`);
  }

  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    // Write to the step summary so the block lands in the Actions UI; the
    // stdout line keeps the digest greppable in the log too.
    writeFileSync(summary, lines.join("\n") + "\n", "utf8");
  }
  console.log(
    `ci-benchmark: ${String(work.ran)} run-task actions, ${String(work.cached)} cached, ${work.total.toFixed(1)}s of run-task time.`,
  );
}

printReport();
