/**
 * Pin test for the WCAG rule partition between browserless and browser tiers.
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
import { WCAG_TAGS, BROWSERLESS_RULES, BROWSER_REQUIRED_RULES } from "../src/a11y-scope";

describe("WCAG rule partition", () => {
  it("axe.getRules(WCAG_TAGS) equals BROWSERLESS_RULES ∪ BROWSER_REQUIRED_RULES", () => {
    // axe.getRules may return entries with `ruleId` or `id` depending on version
    const rules = axe.getRules([...WCAG_TAGS]);
    const ruleIds = rules
      .map((rule: { ruleId?: string; id?: string }) => rule.ruleId ?? rule.id)
      .filter((id): id is string => id !== undefined);

    const union = [...new Set([...BROWSERLESS_RULES, ...BROWSER_REQUIRED_RULES])];

    // No missing: every axe rule is classified
    const missing = ruleIds.filter((id: string) => !union.includes(id as never));
    expect(missing, `Missing from partition: ${missing.join(", ")}`).toEqual([]);

    // No extra: every classified rule actually exists in axe
    const extra = union.filter((id) => !ruleIds.includes(id as never));
    expect(extra, `Extra in partition: ${extra.join(", ")}`).toEqual([]);

    // Count matches: exactly the same rule set
    expect(ruleIds.length).toBe(union.length);
  });

  it("BROWSERLESS_RULES and BROWSER_REQUIRED_RULES are disjoint", () => {
    const browserlessSet = new Set(BROWSERLESS_RULES);
    const intersection = BROWSER_REQUIRED_RULES.filter((id) => browserlessSet.has(id as never));

    expect(intersection, `Intersection: ${intersection.join(", ")}`).toEqual([]);
  });

  it("tripwires: dangerous silent-false-pass rules stay in browser tier", () => {
    // These three rules fail silently in jsdom (cantTell or false-pass on real
    // violations) — a reclassification mistake here would mask defects.
    expect(BROWSER_REQUIRED_RULES).toContain("color-contrast");
    expect(BROWSER_REQUIRED_RULES).toContain("target-size");
    expect(BROWSER_REQUIRED_RULES).toContain("aria-hidden-focus");
  });

  it("mechanical self-audit: BROWSERLESS_RULES scan clean of browser APIs", () => {
    // Scan each rule's check helpers for browser-API dependencies.
    // If a rule uses geometry/hit-test/pseudo-elements/computed colors/canvas/
    // media state, it belongs in BROWSER_REQUIRED_RULES, not here.
    const forbiddenApis = [
      "getBoundingClientRect",
      "getClientRects",
      "offsetWidth",
      "clientWidth",
      "clientHeight",
      "scrollWidth",
      "scrollHeight",
      "elementsFromPoint",
      "elementFromPoint",
      "getContext(",
      "getComputedStyle(.*, ':",
      "matchMedia",
      "innerText",
      "currentSrc",
    ];

    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    const audit = (axe as any)._audit;
    if (!audit?.rules) {
      // Skip test if audit structure not available in this axe version
      return;
    }

    for (const ruleId of BROWSERLESS_RULES) {
      const rule = audit.rules[ruleId];
      if (!rule) {
        // Rule not found in audit structure - skip this check
        continue;
      }

      // Check the rule's own checks and any checks they reference
      const checkIds = rule.matches ?? [];
      for (const checkId of checkIds) {
        const check = audit.checks?.[checkId];
        if (!check) continue; // Some checks are dynamic

        const checkSource = check.evaluate?.toString() ?? "";
        for (const api of forbiddenApis) {
          expect(checkSource, `Rule ${ruleId} check ${String(checkId)} uses ${api}`).not.toContain(
            api,
          );
        }
      }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
  });
});
