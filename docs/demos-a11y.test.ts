/**
 * Browserless accessibility sweep over all component demos.
 *
 * This tier runs in jsdom (Vitest) and proves the semantic half of the WCAG
 * contract — the 51 rules that read only DOM, attributes, and cascade, without
 * requiring layout geometry, hit-testing, pseudo-element styles, computed colors,
 * canvas, or media state. The rendering-dependent half (17 rules) runs in the
 * browser gates (playwright/harness/accessibility.e2e.ts and e2e/accessibility.e2e.ts).
 *
 * The split is pinned by packages/core/tests/a11y-scope.test.ts, which asserts
 * that BROWSERLESS_RULES ∪ BROWSER_REQUIRED_RULES ∪ TAGGED_BUT_DISABLED_RULES
 * equals exactly the rule set WCAG_TAGS selects in axe-core 4.12.1. This gate
 * proves the semantic 51 only; it must never be quoted as "WCAG 2.2 AA passed" —
 * the full claim requires both tiers, and the browser gates still carry
 * color-contrast.
 *
 * Measured runtime: ~52s for all 94 demos × light+dark at maxWorkers 1 (jsdom is
 * slower than Chromium per-scan but avoids browser bootstrap; 6.6× faster than
 * the browser harness for the same 188 demo scans: 51.9s vs 341s).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { mount } from "@vue/test-utils";
import type { Component } from "vue";
import axe from "axe-core";
import { BROWSERLESS_RULES } from "@ecoma-io/loom/a11y";

// Stub browser APIs jsdom lacks — inert, never functional fakes.
// Measured: with these present, all 94 demos mount with zero errors.
beforeAll(() => {
  // ResizeObserver and IntersectionObserver: layout observers used by some components
  // Empty methods are intentional — these are inert stubs, not functional mocks.
  global.ResizeObserver = class ResizeObserver {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    observe() {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    unobserve() {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    disconnect() {}
  };
  global.IntersectionObserver = class IntersectionObserver {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    observe() {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    unobserve() {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = "";
    thresholds = [];
  };

  // matchMedia: media query API (theme-aware components)
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      addListener() {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      removeListener() {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      addEventListener() {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      removeEventListener() {},
      dispatchEvent: () => true,
    }),
  });

  // scrollTo: smooth-scroll API (link components)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  window.scrollTo = () => {};

  // Document shell: mirror playwright/harness/index.html
  // Without these, document-title and html-has-lang (both in the allowlist) false-fire.
  document.documentElement.lang = "en";
  document.title = "Loom component demos";
});

// Load all demos dynamically (lazy import, eager: false)
// The glob pattern matches files like docs/demos/ButtonDemo.vue
const demoModules = import.meta.glob("./demos/*Demo.vue", { eager: false });

describe("browserless accessibility sweep — semantic WCAG rules (jsdom tier)", () => {
  for (const [path, mod] of Object.entries(demoModules)) {
    const demoName = path.replace("./demos/", "").replace(".vue", "");

    describe(`${demoName} demo`, () => {
      for (const theme of ["light", "dark"] as const) {
        it(`${theme} theme has no violations against the browserless semantic rule set`, async () => {
          // Lazy import the demo component
          const demoMod = await (mod as () => Promise<{ default: Component }>)();

          // Mount the demo with the theme attribute
          document.documentElement.setAttribute("data-theme", theme);
          const wrapper = mount(demoMod.default, {
            attachTo: document.body,
          });

          // Wait for the component to settle (microtasks, async setup)
          // Measured: 30ms is sufficient for all 94 demos; shorter delays cause intermittent failures.
          await new Promise((resolve) => setTimeout(resolve, 30));

          // Run axe against the full document with the browserless allowlist
          /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-argument */
          const axeResult = await (axe as any).run(document, {
            runOnly: { type: "rule", values: [...BROWSERLESS_RULES] },
          });
          const violations = axeResult.violations;

          // Build a detailed failure message per violation
          const report = violations
            .map((violation: any) => {
              const targets = violation.nodes.map((node: any) => node.target.join(" ")).join(", ");
              return `[${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help} (${targets})`;
            })
            .join("\n");

          // Assert no violations
          expect(violations, report).toEqual([]);
          /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-argument */

          // Clean up: unmount the wrapper and clear the document body
          // (teleported content outlives the Vue wrapper if not cleared)
          wrapper.unmount();
          document.body.innerHTML = "";
        });
      }
    });
  }
});
