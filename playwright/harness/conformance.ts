import { createApp, defineComponent, h } from "vue";
import {
  buildConformanceRegistry,
  caseOwnerOrThrow,
  type CaseModule,
  type LayoutConstraint,
  type PublishedCase,
} from "./conformance-registry";

// The registry is derived from the tree, not enumerated here: one glob loads
// every composition's e2e/conformance.cases.ts. The literal is the route's
// own spelling of the pattern `./conformance-registry` exports as
// CONFORMANCE_CASES_GLOB — `import.meta.glob` accepts only a literal, and
// conformance-registry.test.ts fails if the two spellings drift apart. The
// reaches this glob draws are invisible to both architecture readers, which
// is why playwright/moon.yml declares them as `# preserved` deps and why the
// fixture that checks the derivation exists at all.
const matched = import.meta.glob("../../packages/composition/*/e2e/conformance.cases.ts", {
  eager: true,
});

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
 * they were computed from. The comparator itself lives in each package's e2e
 * spec, which walks this page's DOM and the published trees together,
 * anchors on the `id: "root"` node, and applies the policy below.
 *
 * ## The tolerance policy
 *
 * The comparison's law, stated once in the code that enforces its page-side
 * half. Each spec pins `EPSILON = 0.5` and compares engine floats to DOM
 * reads at that bound; this is what the bound means and what must hold for
 * it to be the right one.
 *
 * - **The epsilon is the read's rounding bound, not slack.** The DOM read
 *   rounds each edge to the integer grid and takes differences (the two-edge
 *   technique Yoga uses), so a rounded edge sits within half a pixel of the
 *   fractional position CSS computed. Comparing the rounded read to the
 *   engine's float at exactly half a pixel tolerates precisely that rounding
 *   and nothing else — anything past it is the engine and the browser
 *   disagreeing about geometry, which no rounding can explain.
 * - **Rounding and subpixel accumulation.** `getBoundingClientRect` returns
 *   fractional px, and a page can place an edge on any fraction. The
 *   fixtures' arithmetic is what keeps the accumulation inside the bound —
 *   fixed-px child boxes, px gutters, rem scales resolved at the pinned 16px
 *   root — so box origins land whole and each read errs by at most one
 *   rounding step. A fixture family whose arithmetic accumulated past that
 *   bound would be a finding about the fixture, never a reason to widen the
 *   epsilon.
 * - **DPR and font raster are held out, not modeled.** The comparison runs
 *   at deviceScaleFactor 1, asserted below and thrown on otherwise, because
 *   pixel-snap decisions are engine facts a geometry comparison must not
 *   depend on — the webkit project carries Desktop Safari's 2, so the specs
 *   declare 1 per navigation rather than inherit it from the profile. Fonts
 *   are held out by construction: the fixtures are text-free fixed boxes, so
 *   no font metric ever enters a compared box and font readiness cannot race
 *   a measurement that needs no text. Both exclusions are why the engine can
 *   answer at all — it has neither text metrics nor a raster.
 * - **Nesting: the compared tree is the flat leaf tree.** The compared
 *   geometry is the component root (the element carrying
 *   `data-conformance-role="root"`, matched to the engine node `id: "root"`)
 *   and its descendants, walked positionally in document order. Synthetic
 *   wrappers the adapter does not model — Center's centering row — are
 *   descended through, never compared. The case section is the fixture
 *   container whose content box is the width the engine was offered; it is
 *   the frame of the comparison, not part of the compared tree.
 * - **Viewport bands.** A case declares the widths it is meaningful at (the
 *   responsive contract's narrow/mid/ultrawide bands), its spec navigates
 *   the route once per band, and each spec asserts its own band list equals
 *   the union the report publishes — a band a case file gains reddens in the
 *   spec instead of silently running nowhere. The viewport height is fixed
 *   in the specs (900px) so no case stacks past the fold and pulls in a
 *   scrollbar; the measured-container discipline below would keep the
 *   engine's input honest even then, and the fixture discipline is not to
 *   conjure one at all.
 *
 * ## The determinism quintet (design D5)
 *
 * The eight layout-conformance specs cite "design D5"; this is its
 * definition, derived from the preconditions they actually assert. Nothing
 * here is assumed: the page-side facts are published in the report and
 * asserted from outside, and a violated one throws on this page rather than
 * flaking a comparison downstream.
 *
 * 1. **Chromium is the normative engine.** Every pull request gates on the
 *    browser the component ships under. Other engines compare too, and a
 *    case known to diverge on one is skipped through its `engines` field —
 *    an annotated skip that names the engine, never a silent narrowing of
 *    the case set.
 * 2. **The comparison runs at DPR 1**, declared per navigation and
 *    re-asserted by the page: a profile change fails here, loudly, instead
 *    of shifting every read by a scale nobody compared.
 * 3. **The root font-size is pinned to 16px**, set by the page and asserted
 *    from the published report: the rem-based gap and space scales become
 *    exact px arithmetic, which the tolerance bound above presumes.
 * 4. **The fixtures are text-free fixed boxes** — children are fixed-px
 *    `div`s. The engine has no text metrics, and CSS's content-based
 *    automatic minimum size needs them; text-free construction is what keeps
 *    that divergence out of every comparison rather than modeling it.
 * 5. **The engine's input width is measured, not assumed.** Each case's
 *    `availableWidth` is the measured content box of its rendered fixture
 *    container, not `window.innerWidth` — a classic scrollbar consumes
 *    15-17px of layout width at 360px in some engines, and measuring makes
 *    the engine's input and the oracle's output the same quantity by
 *    construction.
 *
 * ## Route totality
 *
 * An adapter is total at this route's edge, refusal is prop-level, and a
 * comparison a case declines is a `knownDivergence` — declining to compare
 * is not failing to compute. That law is stated once, with its measured
 * motivation, in `packages/layout-engine/src/modelled-subset.ts`; this route
 * is where it bites and that record is its home, so nothing here restates it.
 *
 * ## The registry
 *
 * The modules are not enumerated by hand. The glob above loads every
 * composition's cases module, and `./conformance-registry` derives the
 * composition names, refuses a case name declared by two modules, and
 * refuses a name no module declared. `conformance-registry.test.ts` holds
 * that derivation against the tree — the literal, what it would load, and
 * the refusals — because the failure no other gate covers is a cases file
 * the harness never picks up (`tools/check-composition-conformance.ts`
 * already fails a missing one). The declared graph that makes an engine or
 * case-file change re-run this project's gates stays hand-kept in
 * `playwright/moon.yml`'s `# preserved` deps: the glob's reaches are the one
 * reach neither architecture reader can see, the trade this registry
 * accepted on purpose (ecoma-io/loom#322), and the fixture is what keeps it
 * honest.
 */

/** Determinism, pinned rather than assumed — see the quintet in the module docblock. */
if (window.devicePixelRatio !== 1) {
  throw new Error(
    `conformance route requires deviceScaleFactor 1, got ${String(window.devicePixelRatio)}`,
  );
}
document.documentElement.style.fontSize = "16px";
const viewportWidth = window.innerWidth;

const registry = buildConformanceRegistry(matched);
const known = Object.keys(registry.modules);

const wanted = new URLSearchParams(window.location.search).get("conformance");
if (wanted === null || !(wanted in registry.modules)) {
  document.body.textContent = `Unknown or missing ?conformance= parameter "${wanted ?? ""}". Known: ${known.join(", ")}`;
  throw new Error(`conformance route requires ?conformance=<${known.join(", ")}>`);
}

// The `in` guard above guarantees the key exists; the undefined check is the
// type-level residue of that guarantee, not a second validation — the same
// shape the harness entry's demo allow-list uses.
const mod: CaseModule | undefined = registry.modules[wanted];
if (mod === undefined) {
  throw new Error(`conformance route requires ?conformance=<${known.join(", ")}>`);
}

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
  tree: unknown;
}

const reportCases: ReportCase[] = mod.cases.map((one) => {
  // The comparator anchors every read on the case's own section, so the case
  // being reported must be one this mounted module owns — a name that
  // resolved to another module's section would compare the wrong geometry.
  const owner = caseOwnerOrThrow(registry, one.name);
  if (owner !== wanted) {
    throw new Error(
      `conformance registry: case "${one.name}" is owned by ${owner} but mounted by ${wanted}`,
    );
  }
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
  const constraint: LayoutConstraint = {
    width: { mode: "definite", size: availableWidth },
    height: { mode: "max-content" },
  };
  // The `never` casts narrow back what the module itself carries: the props
  // are the module's own case's props, the tree is what its own adapter
  // returned, and neither can be wrong by construction (see CaseModule).
  const tree = mod.layout(
    mod.adapter(one.props as never, { viewportWidth, availableWidth }, one.children) as never,
    constraint,
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
