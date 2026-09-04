import type { Page } from "@playwright/test";

/**
 * Wait until the mounted app has stopped changing.
 *
 * A template may render a loading state first — saas-shell holds its skeleton
 * until a timer swaps in the dashboard — and loom's DataGrid assigns the
 * scroll region's `tabindex` from a ResizeObserver callback after mount. A
 * gate that ran against the pre-swap markup would either pass while never
 * seeing the real content (axe scanning the skeleton) or fail while the page
 * is healthy (census before the observer lands). Sampling `#app`'s innerHTML
 * across a 100ms tick covers both: each of those mutations is a markup
 * change, so the sample only equalises once they have landed.
 *
 * The tick cap exists so a template whose render genuinely never settles —
 * a polling dashboard, say — fails loudly here instead of silently scanning
 * whatever happened to be mounted at the moment the gate ran.
 */
export async function waitForAppSettled(page: Page): Promise<void> {
  await page.evaluate(() => {
    const app = document.querySelector("#app");
    if (!app) throw new Error("#app never mounted");
    let previous = app.innerHTML;
    return new Promise<void>((resolve, reject) => {
      let changes = 0;
      const timer = setInterval(() => {
        const current = app.innerHTML;
        if (current === previous) {
          clearInterval(timer);
          resolve();
          return;
        }
        previous = current;
        changes += 1;
        if (changes > 30) {
          clearInterval(timer);
          reject(new Error("#app markup never settled"));
        }
      }, 100);
    });
  });
}
