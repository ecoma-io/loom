// @vitest-environment node
//
// Node rather than the project-wide jsdom, for the same reason
// e2e-plan.test.ts opts out: the drift pin reads the repository's own source
// (packages/core/src/a11y-scope.ts) as text, and everything else here
// exercises the probe's pure logic — CLI parsing, the fail-closed runner, the
// tally, the class gates, the report contract. No browser, no network: the
// runner invocations feed it synthetic cases whose page is never touched.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  AXE_PROBE_RULES,
  CASE_CATALOG,
  CASCADE_LAYOUT_RULES,
  CLASS_B_GATE,
  DOM_HIT_TEST_RULES,
  FULL_BROWSER_RULES,
  buildReport,
  exitCodeFor,
  hostedClasses,
  parseCli,
  parseColor,
  runCase,
  runSelfTest,
  sameColor,
  tally,
  validateReport,
  verdictText,
  type CaseContext,
  type CasePage,
  type CaseResult,
  type CaseRun,
  type CaseVerdict,
} from "./browser-capability-probe.ts";

const ROOT = join(import.meta.dirname, "..");

/** A synthetic case result — only the id's verdict matters to the gates. */
const verdict = (id: string, v: CaseVerdict): CaseResult => ({
  id,
  capability: "dom",
  verdict: v,
  detail: id,
});

/** A CaseContext over a page that is never touched: an empty object stands in
 * for one, and the discard counter is what the runner's contract is read
 * through. */
const countingCtx = (): { ctx: CaseContext; discarded: () => number } => {
  const unusedPage = {} as CasePage;
  let count = 0;
  return {
    ctx: {
      openPage: () => Promise.resolve(unusedPage),
      discardPage: (_page: CasePage) => {
        count += 1;
        return Promise.resolve();
      },
    },
    discarded: () => count,
  };
};

describe("probe CLI", () => {
  it("recognizes --help and --self-test before any option validation", () => {
    expect(parseCli(["--help"]).kind).toBe("help");
    expect(parseCli(["--self-test"]).kind).toBe("self-test");
  });

  it("applies every default — including the preview port and site base path", () => {
    const parsed = parseCli([]);
    expect(parsed.kind).toBe("options");
    if (parsed.kind !== "options") throw new Error("unreachable after the narrowing expect");
    expect(parsed.options.cdp).toBe("ws://127.0.0.1:9222");
    expect(parsed.options.base).toBe("http://localhost:4173/docs/contribute/design-system/");
    expect(parsed.options.engine).toBe("unlabeled");
    expect(parsed.options.reportOnly).toBe(false);
    expect(parsed.options.out).toBeUndefined();
    expect(parsed.options.timeoutMs).toBe(60_000);
  });

  it("reads every flag it documents", () => {
    const parsed = parseCli([
      "--engine",
      "lightpanda-1.0.0-nightly.9356",
      "--cdp",
      "ws://example.test:1234",
      "--base",
      "http://example.test/site/",
      "--out",
      "perf/last-probe.json",
      "--report-only",
      "--timeout-ms",
      "5000",
    ]);
    expect(parsed.kind).toBe("options");
    if (parsed.kind !== "options") throw new Error("unreachable after the narrowing expect");
    expect(parsed.options.engine).toBe("lightpanda-1.0.0-nightly.9356");
    expect(parsed.options.cdp).toBe("ws://example.test:1234");
    expect(parsed.options.base).toBe("http://example.test/site/");
    expect(parsed.options.out).toBe("perf/last-probe.json");
    expect(parsed.options.reportOnly).toBe(true);
    expect(parsed.options.timeoutMs).toBe(5000);
  });

  it("refuses what it cannot honor, naming the flag", () => {
    for (const argv of [
      ["--base", "not a url"],
      ["--base", "ftp://example.test/"],
      ["--wat"],
      ["positional"],
      ["--timeout-ms", "0"],
      ["--timeout-ms", "-5"],
      ["--timeout-ms", "soon"],
    ]) {
      const parsed = parseCli(argv);
      expect(parsed.kind, argv.join(" ")).toBe("error");
    }
  });
});

describe("probe tally", () => {
  it("counts every verdict class and the total", () => {
    expect(
      tally([
        verdict("a", "PASS"),
        verdict("b", "DEGRADED"),
        verdict("c", "FAIL"),
        verdict("d", "ERROR"),
      ]),
    ).toEqual({ pass: 1, degraded: 1, fail: 1, error: 1, total: 4 });
  });

  it("the catalog has eleven unique cases", () => {
    expect(CASE_CATALOG).toHaveLength(11);
    expect(new Set(CASE_CATALOG.map((c) => c.id)).size).toBe(CASE_CATALOG.length);
  });
});

describe("probe capability gates", () => {
  const allPass = CASE_CATALOG.map(({ id }) => verdict(id, "PASS"));
  const without = (id: string, v: CaseVerdict): CaseResult[] =>
    CASE_CATALOG.map((c) => verdict(c.id, c.id === id ? v : "PASS"));

  it("an all-PASS run hosts every class the probe can grant", () => {
    const classes = hostedClasses(allPass);
    expect(classes.some((c) => c === "dom")).toBe(true);
    expect(classes.some((c) => c.startsWith("dom+hit-testing"))).toBe(true);
    expect(
      classes.some(
        (c) => c === `cascade+layout (class B: ${String(CASCADE_LAYOUT_RULES.length)} rules)`,
      ),
    ).toBe(true);
    expect(classes).toContain("axe");
  });

  it("class B is conjunctive over exactly the eight cascade cases", () => {
    expect(CLASS_B_GATE).toHaveLength(8);
    expect(CLASS_B_GATE.every((id) => CASE_CATALOG.some((c) => c.id === id))).toBe(true);
    for (const id of CLASS_B_GATE) {
      expect(
        hostedClasses(without(id, "FAIL")).some((c) => c.includes("cascade+layout")),
        `${id} failed`,
      ).toBe(false);
    }
  });

  it("DEGRADED and ERROR never grant a class — partial capability hosts nothing", () => {
    expect(hostedClasses([verdict("dom-mount", "DEGRADED")])).toEqual([]);
    expect(hostedClasses([verdict("dom-mount", "ERROR")])).toEqual([]);
    expect(
      hostedClasses(without("hit-testing", "DEGRADED")).some((c) =>
        c.startsWith("dom+hit-testing"),
      ),
    ).toBe(false);
  });

  it("focus is informational — it grants no class in any state", () => {
    expect(hostedClasses(without("focus", "ERROR"))).toEqual(
      hostedClasses(CASE_CATALOG.map((c) => verdict(c.id, "PASS"))),
    );
  });

  it("an empty class list reads as hosting nothing", () => {
    expect(verdictText([])).toContain("no capability verified");
    expect(verdictText(["axe"])).toContain(FULL_BROWSER_RULES.join(", "));
  });
});

describe("probe fail-closed runner", () => {
  it("passes a measured verdict through with its detail, discarding the page", async () => {
    const { ctx, discarded } = countingCtx();
    const result = await runCase(
      { id: "ok", capability: "dom", run: () => Promise.resolve({ verdict: "PASS", detail: "d" }) },
      ctx,
      1000,
    );
    expect(result).toMatchObject({ id: "ok", verdict: "PASS", detail: "d" });
    expect(discarded()).toBe(1);
  });

  it("a throwing case becomes ERROR carrying the message — never a probe crash", async () => {
    const { ctx, discarded } = countingCtx();
    const result = await runCase(
      {
        id: "boom",
        capability: "axe",
        run: () => Promise.reject(new Error("Target closed")),
      },
      ctx,
      1000,
    );
    expect(result.verdict).toBe("ERROR");
    expect(result.detail).toContain("Target closed");
    expect(discarded()).toBe(1);
  });

  it("a stalled case hits the watchdog and becomes ERROR", async () => {
    const { ctx, discarded } = countingCtx();
    // An executor that never settles — the promise has nothing to do.
    const result = await runCase(
      {
        id: "stall",
        capability: "dom",
        run: () => new Promise<CaseRun>(() => undefined),
      },
      ctx,
      20,
    );
    expect(result.verdict).toBe("ERROR");
    expect(result.detail).toContain("no answer within");
    expect(discarded()).toBe(1);
  });
});

describe("probe report contract", () => {
  const report = buildReport(
    "engine-x",
    "http://base/",
    "2026-09-11T00:00:00Z",
    CASE_CATALOG.map(({ id }) => verdict(id, "PASS")),
  );

  it("validates its own output clean", () => {
    expect(validateReport(report)).toEqual([]);
    expect(report.summary).toEqual({
      pass: 11,
      degraded: 0,
      fail: 0,
      error: 0,
      total: 11,
    });
    expect(report.verdict).not.toContain("no capability verified");
  });

  it("rejects tampering with any load-bearing field", () => {
    expect(validateReport({ ...report, engine: "" }).length).toBeGreaterThan(0);
    expect(validateReport({ ...report, verdict: 42 }).length).toBeGreaterThan(0);
    expect(
      validateReport({ ...report, summary: { ...report.summary, pass: 999 } }).length,
    ).toBeGreaterThan(0);
    expect(validateReport({ ...report, cases: report.cases.slice(0, -1) }).length).toBeGreaterThan(
      0,
    );
    expect(
      validateReport({
        ...report,
        cases: [{ id: "x", capability: "dom", verdict: "MAYBE" }],
      }).length,
    ).toBeGreaterThan(0);
    expect(validateReport({ ...report, hostedClasses: [42] }).length).toBeGreaterThan(0);
    expect(validateReport("nope").length).toBeGreaterThan(0);
  });

  it("exits 0 only when every case PASSED — DEGRADED fails closed too", () => {
    expect(exitCodeFor(report, false)).toBe(0);
    for (const v of ["FAIL", "DEGRADED", "ERROR"] as const) {
      const broken = buildReport("engine-x", "http://base/", "t", [
        ...report.cases.slice(0, -1),
        verdict("axe-injection", v),
      ]);
      expect(exitCodeFor(broken, false), v).toBe(1);
    }
    expect(exitCodeFor(report, true)).toBe(0);
  });
});

describe("probe color comparisons", () => {
  // The cascade case compares through these, so the claim is the COLOR, never
  // the serialization — pin both directions on the shipped token values.
  it("reads the token serialization and the computed rgb as the same color", () => {
    const authored = parseColor("hsl(213 25% 96%)");
    expect(authored).not.toBeNull();
    expect(sameColor("rgb(242, 245, 247)", "hsl(213 25% 96%)")).toBe(true);
    expect(sameColor("rgb(242,245,247)", "rgb(242, 245, 247)")).toBe(true);
  });

  it("refuses a different color and a non-color", () => {
    expect(sameColor("rgb(242, 245, 247)", "rgb(10, 10, 10)")).toBe(false);
    expect(parseColor("not a color")).toBeNull();
    expect(parseColor("")).toBeNull();
  });
});

describe("probe axe rule partition drift pin", () => {
  // The probe hardcodes the 17 browser-required rules because the tooling
  // layer's boundary row forbids importing packages/core. This is the pin that
  // makes the restatement honest: the list is extracted from a11y-scope.ts's
  // SOURCE TEXT — the same PARSED-not-imported pattern
  // tools/check-a11y-evidence.ts uses for the contract — and an upstream edit
  // fails here instead of silently diverging.
  const source = readFileSync(join(ROOT, "packages/core/src/a11y-scope.ts"), "utf8");

  /** The string literals of one `export const NAME = [...]` block. A comment
   * carrying a double quote would corrupt the extraction — and that failure is
   * the point: this file must be re-read before the pin is trusted. */
  const constArray = (name: string): string[] => {
    const start = source.indexOf(`export const ${name}`);
    if (start < 0) throw new Error(`no export const ${name} in a11y-scope.ts`);
    const open = source.indexOf("[", start);
    const close = source.indexOf("] as const", open);
    if (close < 0) throw new Error(`no closing bracket for ${name}`);
    // Group 1 always participates when the regex matches; `?? ""` exists for
    // the type system (noUncheckedIndexedAccess on match groups), not for
    // any input this file can produce.
    return [...source.slice(open, close).matchAll(/"([^"]+)"/gu)].map((m) => m[1] ?? "");
  };

  const browserRequired = constArray("BROWSER_REQUIRED_RULES");

  it("the probe's axe list equals the source of truth — same rules, order aside", () => {
    // Order is not part of the contract: a11y-scope.ts groups its list
    // alphabetically, the probe groups it by the sub-partition. Membership is
    // what drifts, so that is what is compared.
    expect(AXE_PROBE_RULES).toHaveLength(17);
    expect([...AXE_PROBE_RULES].sort()).toEqual([...browserRequired].sort());
  });

  it("the sub-partitions compose that list exactly once", () => {
    const union = [...CASCADE_LAYOUT_RULES, ...DOM_HIT_TEST_RULES, ...FULL_BROWSER_RULES];
    expect(union).toHaveLength(browserRequired.length);
    expect(new Set(union).size).toBe(union.length);
    expect(union.sort()).toEqual([...browserRequired].sort());
  });
});

describe("probe self-test", () => {
  it("passes — the same function `--self-test` runs, held by the vitest tier", async () => {
    await expect(runSelfTest()).resolves.toBeUndefined();
  });
});
