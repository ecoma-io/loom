/**
 * The behavioural viewport contract: how a component's GEOMETRY changes with
 * the space it is given, and what evidence says so.
 *
 * The a11y contract answers "does it announce and aim correctly"; this one
 * answers "does it hold together between 360 and 2000 pixels". Both are
 * declared per component in the same `a11y.json` sidecar — the sixth artifact
 * carries a second axis now — and both are read the same way.
 *
 * Three readers, one source (the same discipline as `a11y-contract.ts`):
 *
 * - `tools/check-responsive-evidence.ts`, the gate, reads this file AS DATA —
 *   parsed, never imported, because the tooling layer's boundary row forbids
 *   importing the library it checks. The parse is fail-closed: a contract this
 *   tool cannot read is a lint failure, not an empty verdict.
 * - the composition adapters (`stack`, `inline`, `center`) import
 *   `RESPONSIVE_VIEWPORT_BANDS` for the breakpoints their geometry is built
 *   on, so a band cannot move in the law without moving the code that
 *   implements it.
 * - `packages/core/tests/responsive-contract.test.ts` pins the vocabulary and
 *   the bands verbatim — editing either is law-making and must touch the pin.
 *
 * Nothing re-exports this module from the public surface yet. The a11y
 * vocabulary earned its `packages/loom/src/a11y.ts` re-export because a docs
 * page and a consumer both read it; nothing outside the gate, the pin test
 * and the adapters reads this one today, and an export nobody consumes is a
 * public promise with no reader. Add the subpath export when the first real
 * reader arrives.
 *
 * Every collection below is a flat `as const` record — the shape the gate's
 * parser and the pin test both rely on.
 */

/**
 * The closed behaviour vocabulary. Each word is a mechanism a component's own
 * source shows, not a hope:
 *
 * - `intrinsic-collapse` — children stack because the flex container wraps
 *   (flex-wrap with a min-width on the children and a grow that never quite
 *   fits), so the break is derived from CONTENT, not from a media query. The
 *   break lands wherever the content's min-widths stop fitting.
 * - `bound` — geometry is capped, never driven: a max-width (or max-height)
 *   holds the component to a ceiling while narrower viewports pass through
 *   untouched.
 * - `band-scale` — one property takes stepped values across named viewport
 *   bands (gap, gutter, padding), each step witnessed at its band.
 * - `wrap-threshold` — children wrap to a second row past a declared
 *   container width, and the threshold itself is part of the contract.
 * - `reflow-grid` — a grid's track count (or a tile's span) changes with the
 *   available space.
 * - `overflow-reel` — content stays one line and the container scrolls
 *   horizontally instead of growing.
 * - `device-media` — the change is resolved by a CSS media query or a
 *   device-relative unit: a breakpoint switch (`md:flex-row`, `2xl:block`),
 *   a pointer-coarse rule, a `vw`/`dvh`/safe-area-derived size. Declared here
 *   because a media query is the ONE responsive mechanism content alone
 *   cannot witness — the viewport the browser reports is the fact.
 *
 * `none` is deliberately NOT in this list: it is a contract value — "the
 * component declares no viewport behaviour" — not a behaviour a component can
 * exhibit.
 */
export const RESPONSIVE_BEHAVIOURS = [
  "intrinsic-collapse",
  "bound",
  "band-scale",
  "wrap-threshold",
  "reflow-grid",
  "overflow-reel",
  "device-media",
] as const;

/**
 * The two evidence runtimes a viewport claim can cite. The browserless tier
 * is absent on purpose: jsdom has no viewport, so it cannot witness a single
 * behaviour in this vocabulary — that gap is why the harness spec set grew in
 * Phase 3B. `harness` mounts the component's own demo via Vite;
 * `sweep` is the root leg over the built site.
 */
export const RESPONSIVE_EVIDENCE_TIERS = ["harness", "sweep"] as const;

/**
 * The canonical viewport bands, in one place so a claim, its evidence and the
 * code under test cannot drift apart:
 *
 * - `narrow` (360) — below Tailwind's `sm`; the smallest phone this library
 *   owes a working layout. The conformance route's lower sample.
 * - `sm` (640) — Tailwind's own `sm` breakpoint, where the gap and gutter
 *   steps and the layout `sm:` switches land.
 * - `mid` (800) — the conformance route's middle sample, comfortably above
 *   `sm`, below every large-screen switch.
 * - `wide` (1920) — theme's `--breakpoint-3xl`, the last gap/gutter step.
 * - `ultrawide` (2000) — the conformance route's upper sample, past the 2xl
 *   gates some components keep (`dashboard`'s aside).
 */
export const RESPONSIVE_VIEWPORT_BANDS = {
  narrow: 360,
  sm: 640,
  mid: 800,
  wide: 1920,
  ultrawide: 2000,
} as const;

/** A behaviour word from the closed vocabulary. */
export type ResponsiveBehaviour = (typeof RESPONSIVE_BEHAVIOURS)[number];

/** One evidence runtime that can witness a viewport behaviour. */
export type ResponsiveEvidenceTier = (typeof RESPONSIVE_EVIDENCE_TIERS)[number];

/** A canonical band name from {@link RESPONSIVE_VIEWPORT_BANDS}. */
export type ResponsiveViewportBand = keyof typeof RESPONSIVE_VIEWPORT_BANDS;

/**
 * One declared piece of viewport evidence. A plain string is a
 * repository-root-relative path the gate verifies exists and holds to the
 * viewport rule; an object is the same path plus the `because` that narrows
 * what the file witnesses — and a qualified entry answers no behaviour.
 */
export type ResponsiveEvidenceEntry = string | { path: string; because?: string };

/**
 * The two halves of the claim, separated so each can be an interface: a
 * component either declares no viewport behaviour or it names the ones it
 * exhibits — the union is the law the gate judges the sidecar against.
 */

/** The claim of a component whose geometry is viewport-independent. */
export interface ResponsiveNoneClaim {
  /** The component declares no viewport behaviour of its own. */
  contract: "none";
  /** Why nothing here is viewport-driven — what a reviewer checks. */
  basis: string;
}

/** The claim of a component that exhibits viewport behaviour. */
export interface ResponsiveBehaviourClaim {
  /** The behaviours the component exhibits, from {@link RESPONSIVE_BEHAVIOURS}. */
  behaviour: readonly ResponsiveBehaviour[];
  /** The rendered facts the claim rests on — what a reviewer checks. */
  basis: string;
  /** Evidence that exists today, by tier. Paths are repository-root-relative. */
  evidence: Partial<Record<ResponsiveEvidenceTier, readonly ResponsiveEvidenceEntry[]>>;
  /** Declared behaviours nothing answers yet, each with its reason. */
  exceptions?: readonly { behaviour: ResponsiveBehaviour; because: string }[];
}

/**
 * The `responsive` claim `packages/<tier>/<name>/a11y.json` carries beside its
 * `role` claim — the second axis in the same sidecar, not a second file.
 *
 * THE CLAIM IS DECLARED, NOT DERIVED: Tailwind's own utility classes are
 * generated per-utility and read nothing like their source form at runtime,
 * so no reader can derive a component's behaviour from its rendered CSS with
 * confidence. The sidecar names the behaviours, cites the evidence that
 * exists today, and records an `exceptions` entry — behaviour plus reason —
 * for every declared behaviour nothing answers yet. The gate counts and names
 * those exceptions instead of failing the repository, so the contract lands
 * truthfully and the exception list shrinks as evidence grows.
 *
 * One deliberate gap, recorded rather than hidden: the wrapped side panels of
 * a collapsed flex layout (Sidebar, SplitLayout, MasterDetail, Dashboard)
 * KEEP their declared width instead of filling the row after the wrap —
 * ecoma-io/loom#275 is open on purpose, and Phase 3B pins NO width assertion
 * on any wrapped panel. The `intrinsic-collapse` claims below assert
 * stacking order and the wrap itself, never the wrapped panel's width.
 */
export type ResponsiveContract = ResponsiveNoneClaim | ResponsiveBehaviourClaim;
