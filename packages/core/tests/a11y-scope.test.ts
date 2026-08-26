/**
 * Pin test for the WCAG rule partition between browserless, browser, and disabled tiers.
 *
 * This test fails closed on axe-core upgrades: if a new or renamed rule matches
 * WCAG_TAGS, the set assertion reddens until a human classifies it into the
 * correct tier. This is the same doctrine as tools/check-archkeep-mutations.ts —
 * the partition is not left to drift, but is proven correct on every run.
 *
 * The mechanical self-audit (scan each rule's check sources for browser-API
 * dependencies) guards against hand-classification errors and re-proves the
 * split on every run. The tripwires catch the dangerous mistake: silent false-
 * passes in jsdom (color-contrast, target-size, aria-hidden-focus) must stay
 * in the browser tier.
 */
import { describe, it, expect } from "vitest";
import axe from "axe-core";
import {
  WCAG_TAGS,
  BROWSERLESS_RULES,
  BROWSER_REQUIRED_RULES,
  TAGGED_BUT_DISABLED_RULES,
} from "../src/a11y-scope";

describe("WCAG rule partition", () => {
  it("axe.getRules(WCAG_TAGS) equals BROWSERLESS ∪ BROWSER_REQUIRED ∪ TAGGED_BUT_DISABLED", () => {
    // axe.getRules may return entries with `ruleId` or `id` depending on version
    const rules = axe.getRules([...WCAG_TAGS]);
    const ruleIds = rules
      .map((rule: { ruleId?: string; id?: string }) => rule.ruleId ?? rule.id)
      .filter((id): id is string => id !== undefined);

    const union = [
      ...new Set([...BROWSERLESS_RULES, ...BROWSER_REQUIRED_RULES, ...TAGGED_BUT_DISABLED_RULES]),
    ];

    // No missing: every axe rule is classified
    const missing = ruleIds.filter((id: string) => !union.includes(id as never));
    expect(missing, `Missing from partition: ${missing.join(", ")}`).toEqual([]);

    // No extra: every classified rule actually exists in axe
    const extra = union.filter((id) => !ruleIds.includes(id as never));
    expect(extra, `Extra in partition: ${extra.join(", ")}`).toEqual([]);

    // Count matches: exactly the same rule set
    expect(ruleIds.length).toBe(union.length);
  });

  it("BROWSERLESS, BROWSER_REQUIRED, and TAGGED_BUT_DISABLED are disjoint", () => {
    const browserlessSet = new Set(BROWSERLESS_RULES);
    const browserRequiredSet = new Set(BROWSER_REQUIRED_RULES);

    const intersection1 = BROWSER_REQUIRED_RULES.filter((id) => browserlessSet.has(id as never));
    expect(
      intersection1,
      `BROWSERLESS ∩ BROWSER_REQUIRED intersection: ${intersection1.join(", ")}`,
    ).toEqual([]);

    const intersection2 = TAGGED_BUT_DISABLED_RULES.filter((id) => browserlessSet.has(id as never));
    expect(
      intersection2,
      `BROWSERLESS ∩ TAGGED_BUT_DISABLED intersection: ${intersection2.join(", ")}`,
    ).toEqual([]);

    const intersection3 = TAGGED_BUT_DISABLED_RULES.filter((id) =>
      browserRequiredSet.has(id as never),
    );
    expect(
      intersection3,
      `BROWSER_REQUIRED ∩ TAGGED_BUT_DISABLED intersection: ${intersection3.join(", ")}`,
    ).toEqual([]);
  });

  it("tripwires: dangerous silent-false-pass rules stay in browser tier", () => {
    // Each of these was MEASURED (2026-08-26) to answer wrongly or not at all
    // in jsdom on a real violation — a reclassification mistake here would mask
    // defects. The first two are also caught by the source scan below (direct
    // `boundingClientRect` reads); the next three reach geometry only through
    // bundled commons helpers the scan cannot see, so THIS list is their guard.
    expect(BROWSER_REQUIRED_RULES).toContain("color-contrast"); // cantTell on every node
    expect(BROWSER_REQUIRED_RULES).toContain("target-size"); // zero rects read compliant
    expect(BROWSER_REQUIRED_RULES).toContain("aria-hidden-focus"); // cantTell via modal-open
    expect(BROWSER_REQUIRED_RULES).toContain("bypass"); // cantTell via modal-open
    expect(BROWSER_REQUIRED_RULES).toContain("scrollable-region-focusable"); // never matches
    // Adopted 2026-08-26 with their own measured jsdom failure modes:
    expect(BROWSER_REQUIRED_RULES).toContain("label-content-name-mismatch"); // jsdom answered incomplete where Chromium reported 12 real violations on the stepper demo
    expect(BROWSER_REQUIRED_RULES).toContain("p-as-heading"); // the jsdom demo tier mounts demos with no stylesheet, so class-styled emphasis is invisible to it
    expect(BROWSER_REQUIRED_RULES).toContain("td-has-header"); // 3x3 border-only table: violates in Chromium, never matches in jsdom
    expect(BROWSER_REQUIRED_RULES).toContain("table-fake-caption"); // border-only table with a colspanned first-row cell: violates in Chromium, never matches in jsdom
  });

  it("TAGGED_BUT_DISABLED rules are all enabled === false in axe-core 4.12.1", () => {
    // Only the two OUT-OF-REACH rules remain (audio-caption, 1.2.1; css-
    // orientation-lock, 1.3.4 — reasons in a11y-scope.ts). The other five
    // disabled rules were adopted into the runtime tiers 2026-08-26, so this
    // pin no longer covers them; their tier placement is pinned by the
    // tripwire and self-audit tests.
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
    const rules = axe.getRules([...WCAG_TAGS]);
    for (const ruleId of TAGGED_BUT_DISABLED_RULES) {
      const rule = rules.find((r: any) => (r.ruleId ?? r.id) === ruleId);
      expect(rule, `Rule ${ruleId} not found in WCAG_TAGS`).toBeDefined();
      const enabled = rule?.enabled;
      expect(enabled, `Rule ${ruleId} should be disabled but has enabled=${String(enabled)}`).toBe(
        false,
      );
    }
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
  });

  it("mechanical self-audit: no BROWSERLESS rule's checks read a browser-only API directly", () => {
    // This audit scans each rule's CHECK SOURCES for direct references to
    // browser-only APIs (layout geometry, hit-testing, pseudo-element computed
    // styles, canvas, media state) and fails the moment one appears in a rule
    // classified BROWSERLESS. Its reach is deliberately stated: DIRECT
    // references only — it would catch target-size or color-contrast being
    // moved here (both read `boundingClientRect` inline), but it cannot see
    // dependencies hidden behind bundled commons helpers (aria-hidden-focus's
    // modal-open chain); those rules are pinned by the tripwire test above and
    // were classified from measured jsdom/browser divergence, not from this scan.
    const forbiddenApis = [
      "getBoundingClientRect",
      "getClientRects",
      "boundingClientRect",
      "offsetWidth",
      "clientWidth",
      "clientHeight",
      "scrollWidth",
      "scrollHeight",
      "elementsFromPoint",
      "elementFromPoint",
      "getContext(",
      "':before'",
      "':after'",
      "matchMedia",
      "innerText",
      "currentSrc",
    ];

    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    const audit = (axe as any)._audit;
    // Fail-closed on shape, never skip: an axe upgrade that moves or renames
    // `_audit` must redden this test, not silently retire it — a skipped audit
    // reads as a verified one in every report that follows.
    expect(
      audit,
      "axe._audit is unreachable — update this audit for the new axe build",
    ).toBeTruthy();
    // `_audit.rules` is an ARRAY of rule objects (axe-core 4.12); `_audit.checks`
    // is a map keyed by check id. Anything else is a shape change, not a skip.
    expect(Array.isArray(audit.rules), "axe._audit.rules is no longer an array").toBe(true);
    const checksIsMap =
      audit.checks && !Array.isArray(audit.checks) && typeof audit.checks === "object";
    expect(checksIsMap, "axe._audit.checks is no longer an id-keyed map").toBe(true);

    for (const ruleId of BROWSERLESS_RULES) {
      const rule = (audit.rules as any[]).find((r) => r.id === ruleId);
      expect(rule, `Rule ${ruleId} missing from axe._audit.rules`).toBeTruthy();

      // Check references live in any/all/none; each entry is a check id string
      // or an options object carrying the id.
      const refs = [
        ...((rule.any ?? []) as (string | { id?: string })[]),
        ...((rule.all ?? []) as (string | { id?: string })[]),
        ...((rule.none ?? []) as (string | { id?: string })[]),
      ].map((ref) => (typeof ref === "string" ? ref : ref.id));
      expect(
        refs.length,
        `Rule ${ruleId} exposes no checks — the audit has nothing to scan`,
      ).toBeGreaterThan(0);

      for (const ref of refs) {
        const check = (audit.checks as Record<string, any>)[String(ref)];
        expect(
          check,
          `Check ${String(ref)} of ${ruleId} missing from axe._audit.checks`,
        ).toBeTruthy();
        const checkSource = String(check.evaluate);
        for (const api of forbiddenApis) {
          expect(
            checkSource,
            `${ruleId}'s check ${String(ref)} reads ${api} directly — it belongs in BROWSER_REQUIRED_RULES`,
          ).not.toContain(api);
        }
      }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  });
});
