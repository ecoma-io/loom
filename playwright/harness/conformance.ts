import { createApp, defineComponent, h, type Component } from "vue";
// The four case modules, imported statically — never import.meta.glob, whose
// reaches neither architecture reader can see. Each module brings its own
// component and adapter with it (intra-package relatives, judged clean under
// its own row), so the engine is reached transitively through judged edges.
// These four relative imports are the one cross-library verdict the boundary
// table's named suppression on this file accepts: the case files live in
// their composition packages' e2e/ directories, which no specifier can name
// — exports maps and tsconfig paths both point at src/index.ts only — and
// giving test fixtures a package entry point would be restructuring the
// package to suit a spelling. A fifth such import would also be covered;
// the mutation row that fires on this verdict in every OTHER harness file
// is what keeps that residual named rather than silent.
import * as centerCases from "../../packages/composition/center/e2e/conformance.cases";
import * as frameCases from "../../packages/composition/frame/e2e/conformance.cases";
import * as inlineCases from "../../packages/composition/inline/e2e/conformance.cases";
import * as stackCases from "../../packages/composition/stack/e2e/conformance.cases";

/**
 * The conformance route: the one place engine and component meet at runtime.
 *
 * Mounted by the harness entry when the URL carries `?conformance=<name>`,
 * it renders every case of that module through the case module's own
 * component, runs the module's adapter and the engine in-page (Vite compiles
 * the TypeScript the dev server is already serving — importing the engine
 * into a Playwright spec in Node cannot work, because Playwright externalizes
 * bare imports and Node cannot execute the workspace package's exports), and
 * publishes both sides for the spec to compare: the live DOM is the oracle,
 * and one JSON block carries the engine's computed trees plus the inputs
 * they were computed from.
 *
 * The comparator itself lives in each package's e2e spec, which walks this
 * page's DOM and the published trees together, anchors on the `id: "root"`
 * node (skipping synthetic wrappers like Center's centering row), and
 * applies Yoga's two-edge integer rounding to browser reads with an epsilon
 * of at most 0.5px against engine floats.
 */

/** A fixture child, as the case modules carry it. */
interface ChildBox {
  w: number;
  h: number;
}

/** What the route needs of a case; each case module satisfies it structurally. */
interface PublishedCase {
  name: string;
  props: Record<string, unknown>;
  viewports: readonly number[];
  knownDivergence?: { reason: string; owner: string };
  engines?: readonly string[];
}

/**
 * A case module as the route consumes it. Every adapter types its props
 * parameter as its own component's props, and such a function is assignable
 * to one taking `never` (nothing is required of the argument) — so the
 * uniform shape takes `never` and each call narrows back with a cast on
 * data that came from the module itself.
 */
// The route reaches the engine ONLY through the case modules — their
// packages re-export the engine's entry point, a judged composition edge —
// so its types are inferred from those modules rather than imported: an
// engine signature change still reddens this file, without one specifier
// crossing the e2e layer's boundary.
type RunLayout = (typeof stackCases)["layout"];
type LayoutTree = Parameters<RunLayout>[0];
type ComputedTree = ReturnType<RunLayout>;

interface CaseModule {
  component: Component;
  adapter: (
    props: never,
    ctx: { viewportWidth: number; availableWidth: number },
    children: readonly ChildBox[],
  ) => LayoutTree;
  layout: RunLayout;
  cases: readonly (PublishedCase & { children: readonly ChildBox[] })[];
}

const MODULES = {
  stack: stackCases,
  inline: inlineCases,
  center: centerCases,
  frame: frameCases,
} as const;

type ModuleName = keyof typeof MODULES;

const wanted = new URLSearchParams(window.location.search).get("conformance");
if (wanted === null || !(wanted in MODULES)) {
  const known = Object.keys(MODULES).join(", ");
  document.body.textContent = `Unknown or missing ?conformance= parameter "${wanted ?? ""}". Known: ${known}`;
  throw new Error(`conformance route requires ?conformance=<${known}>`);
}

// Determinism, pinned rather than assumed. DPR 1 is Playwright's default and
// is asserted so a profile change fails loudly here instead of flaking
// everywhere downstream; the root font-size is pinned to 16px so the rem
// based scales are exact; fixtures are text-free by construction; and the
// engine's available width is the MEASURED content box of each fixture, not
// the viewport size — a classic scrollbar consumes 15-17px of layout width
// at 360px in some engines, and measuring makes the engine's input and the
// oracle's output the same quantity by construction.
if (window.devicePixelRatio !== 1) {
  throw new Error(
    `conformance route requires deviceScaleFactor 1, got ${String(window.devicePixelRatio)}`,
  );
}
document.documentElement.style.fontSize = "16px";
const viewportWidth = window.innerWidth;

const mod: CaseModule = MODULES[wanted as ModuleName];

/** Content-box width of an element: border-box rect minus padding and border. */
function contentBoxWidth(el: HTMLElement): number {
  const cs = getComputedStyle(el);
  return (
    el.getBoundingClientRect().width -
    Number.parseFloat(cs.paddingLeft) -
    Number.parseFloat(cs.paddingRight) -
    Number.parseFloat(cs.borderLeftWidth) -
    Number.parseFloat(cs.borderRightWidth)
  );
}

const app = createApp(
  defineComponent({
    setup() {
      return () =>
        h(
          "main",
          { "data-conformance": wanted },
          mod.cases.map((one) =>
            h("section", { "data-conformance-case": one.name }, [
              h(
                mod.component,
                { ...one.props, "data-conformance-role": "root" },
                {
                  default: () =>
                    one.children.map((child, i) =>
                      h("div", {
                        "data-conformance-index": String(i),
                        "data-conformance-role": "child",
                        style: { width: `${String(child.w)}px`, height: `${String(child.h)}px` },
                      }),
                    ),
                },
              ),
            ]),
          ),
        );
    },
  }),
);
app.mount("#app");

interface ReportCase extends PublishedCase {
  /** The measured content-box width the engine was fed for this case. */
  availableWidth: number;
  /** The engine's computed tree for this case, parent-relative positions. */
  tree: ComputedTree;
}

const reportCases: ReportCase[] = mod.cases.map((one) => {
  const section = document.querySelector<HTMLElement>(
    `section[data-conformance-case="${CSS.escape(one.name)}"]`,
  );
  const root = section?.querySelector<HTMLElement>('[data-conformance-role="root"]');
  if (section === null || root === null) {
    throw new Error(`conformance route: case "${one.name}" did not render`);
  }
  // The fixture container is the section; its content box is where the
  // component root lives, and its width is the availableWidth the adapter
  // is given — the same pixels the browser laid the component out in.
  const availableWidth = contentBoxWidth(section);
  const { knownDivergence, engines } = one;
  const tree: ComputedTree = mod.layout(
    mod.adapter(one.props as never, { viewportWidth, availableWidth }, one.children),
    { width: { mode: "definite", size: availableWidth }, height: { mode: "max-content" } },
  );
  return {
    name: one.name,
    props: one.props,
    viewports: one.viewports,
    ...(knownDivergence !== undefined ? { knownDivergence } : {}),
    ...(engines !== undefined ? { engines } : {}),
    availableWidth,
    tree,
  };
});

/**
 * The report the page publishes for the spec: the engine's side of the
 * comparison, plus the browser facts the determinism quintet asserts.
 */
interface ConformanceReport {
  module: string;
  viewportWidth: number;
  devicePixelRatio: number;
  rootFontSize: string;
  cases: ReportCase[];
}

/**
 * Publish the report node the specs locate. A node appended to
 * `document.body` by hand owns its own removal: the previous report is
 * removed before this one is appended — a re-executed module (Vite HMR
 * against a live harness page) would otherwise stack a second copy while
 * the spec's locator keeps reading the stale first one — and the pagehide
 * listener removes this document's node when the document goes away, so
 * the node's death is named in the scope that created it rather than left
 * to the page being closed.
 */
function publishReport(report: ConformanceReport): void {
  const stale = document.getElementById("loom-conformance-report");
  if (stale !== null) {
    document.body.removeChild(stale);
  }
  const script = document.createElement("script");
  script.type = "application/json";
  script.id = "loom-conformance-report";
  script.textContent = JSON.stringify(report);
  document.body.appendChild(script);
  window.addEventListener(
    "pagehide",
    () => {
      script.remove();
    },
    { once: true },
  );
}

publishReport({
  module: wanted,
  viewportWidth,
  devicePixelRatio: window.devicePixelRatio,
  rootFontSize: getComputedStyle(document.documentElement).fontSize,
  cases: reportCases,
});
