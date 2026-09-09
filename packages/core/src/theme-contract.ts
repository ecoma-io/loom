/**
 * The token contract: what a component may write where a visual value goes.
 *
 * `theme.css`'s own docblock states the law — "everything a consumer can theme
 * lives here and nowhere else: no colour, duration, easing, radius or shadow
 * is written literally in a component" — and the interface contract makes it a
 * new-artifact duty. This file is that law as data, the way
 * `a11y-contract.ts` is the accessibility law as data: the value shapes a
 * component's style-bearing positions may take without naming a token, and
 * the register of recorded exceptions to them.
 *
 * The allowlist of token NAMES is deliberately not here. It is derived at gate
 * time from `theme.css`'s `@theme static` block — the same parse
 * `theme.contrast.test.ts` and the docs' `design-tokens.ts` plugin already
 * perform — because a second copy of the vocabulary would be exactly the
 * drift the law exists to prevent.
 *
 * It lives here rather than in theme-core because theme-core is CSS-only by
 * contract: its `exports` name three stylesheets and nothing else, its source
 * ships into the published package by verbatim copy rather than a build, and
 * `check-architecture.ts` check 5 fails any JS import of it. A JavaScript law
 * module cannot live in a package nothing may import — the same reasoning
 * that put `a11y-contract.ts` here in 3A.
 *
 * Three readers, one source:
 *
 * - `tools/check-token-allowlist.ts`, the gate, reads this file AS DATA —
 *   parsed, never imported. The tooling layer's boundary row forbids
 *   importing the library it checks, and the parse is fail-closed: a contract
 *   this tool cannot read is a lint failure, not an empty verdict.
 * - `packages/core/tests/theme-contract.test.ts` pins the law's internal
 *   consistency: every exception names a path that exists in the tree and
 *   sits inside the gate's scan scope, no path+value registers twice, and the
 *   value shapes are non-empty.
 * - Review reads the register: every literal a component carries is visible
 *   in one diff, each with the reason it stands — the central-table shape
 *   `tools/check-archkeep-mutations.ts` uses, not per-component prose.
 *
 * The gate's one stated limit, recorded here where the law lives: a value a
 * component COMPUTES — concatenation, a template literal, a variable — is
 * invisible to a scan of string literals, so the dynamic half of script-side
 * styling stays review-held. That is the semgrep precedent the leak rules
 * already accept (`interface-contract.md` records it): a parse-only reader
 * judges what a literal read can see, and never pretends to have executed the
 * module it reads.
 *
 * Every collection below is a flat `as const` array of brace-free records —
 * the shape the gate's parser and the pin test both rely on.
 */

/**
 * One shape a style-bearing value may take without naming a token. `shape` is
 * written the way a component writes it; `because` is why the shape is not a
 * second home for a visual decision. The gate interprets exactly three kinds
 * — token references (`var(…`, `--alpha(…`), bare platform keywords
 * (`currentColor`, `transparent`, `none`, `inherit`) and `env(…)` host
 * geometry — and throws on a shape it cannot interpret: a new shape is a
 * deliberate edit to this array AND to the gate, never a string it silently
 * allows.
 */
export const TOKEN_VALUE_SHAPES = [
  {
    shape: "var(--<name>)",
    because:
      "the reference is the vocabulary: the value follows whatever the theme — light or dark, host-overridden — resolves it to. A `var()` fallback is part of the reference, so `var(--switch-travel-x, 1rem)` rides the mechanism too.",
  },
  {
    shape: "--alpha(var(--<name>) / <n>)",
    because:
      "a derived translucency of a token — the one composition that keeps the hue owned by theme.css while the weight is local (Skeleton's shimmer band, Button's sheen).",
  },
  {
    shape: "currentColor",
    because: "the element's own resolved colour — a derived value, not a decision.",
  },
  {
    shape: "transparent",
    because: "the absence of a fill; the platform's zero, which no token should duplicate.",
  },
  {
    shape: "none",
    because:
      "removal of the property's effect — a border, an outline, a shadow — not a step on a visual ladder.",
  },
  {
    shape: "inherit",
    because: "delegation to the parent's resolved value.",
  },
  {
    shape: "env(<safe-area-inset-…>)",
    because:
      "host-supplied viewport geometry a component cannot know; theme.css's own safe-area tokens are these values given Loom's opinion.",
  },
] as const;

/**
 * One recorded exception: a literal a component carries, with the reason it
 * stands rather than a token. `path` is repository-root-relative and must sit
 * inside the gate's scan scope (an exception outside scope is dead law — the
 * gate never scans the file, so the entry could never fire); `value` is the
 * exact string the gate reports, so the register and the failure lines name
 * the same thing.
 *
 * The register is the shrinking end of the law: dropping an entry whose value
 * still sits in the tree fails the gate, and an entry whose value no longer
 * sits anywhere fails it too — an exception for a value the tree has shed is
 * noise in the record, the same way an accessibility exception for an
 * answered requirement is.
 */
export interface TokenException {
  /** Repository-relative path of the file carrying the value. */
  path: string;
  /** The offending value exactly as the gate reports it. */
  value: string;
  /** Why the literal stands rather than a token. */
  because: string;
}

export const TOKEN_EXCEPTIONS = [
  // ---- The overlay size scales -------------------------------------------
  // A panel's extent is the primitive's decision, not a class its caller
  // passes — that is what a `size` prop IS (DialogSize, DrawerSize). Each step
  // is viewport-capped by hand: a centred surface earns more of the screen
  // than an edge-anchored one, a sheet answers its own ×1.5 height ladder, and
  // no `--width-*`/`--height-*` theme namespace exists for overlays to share
  // because the whole point of a size prop is that the ladder differs per
  // surface. Until a token family is wanted, the steps are recorded here
  // rather than waved through.
  {
    path: "packages/primitives/dialog/src/Dialog.vue",
    value: "w-[min(90vw,20rem)]",
    because:
      "Dialog's `sm` step — the minimal prompt width, capped at 90vw for a phone; one of the four steps of the primitive's own size scale.",
  },
  {
    path: "packages/primitives/dialog/src/Dialog.vue",
    value: "w-[min(92vw,32rem)]",
    because:
      "Dialog's `md` step — the confirm/short-form width; one of the four steps of the primitive's own size scale.",
  },
  {
    path: "packages/primitives/dialog/src/Dialog.vue",
    value: "w-[min(92vw,44rem)]",
    because:
      "Dialog's `lg` step — the multi-section form width; one of the four steps of the primitive's own size scale.",
  },
  {
    path: "packages/primitives/dialog/src/Dialog.vue",
    value: "w-[min(94vw,64rem)]",
    because:
      "Dialog's `xl` step — the authoring-surface width, shared byte-for-byte with Drawer's `xl` so a host can size-match the two; one of the four steps of the primitive's own size scale.",
  },
  {
    path: "packages/primitives/drawer/src/Drawer.vue",
    value: "w-[min(90vw,20rem)]",
    because:
      "Drawer's `sm` width step — the filter-rail/navigation-sheet extent; an edge-anchored panel deliberately earns less of the axis than Dialog's centred `sm`, which is why the ladders are not one token family.",
  },
  {
    path: "packages/primitives/drawer/src/Drawer.vue",
    value: "w-[min(92vw,26rem)]",
    because:
      "Drawer's `md` width step — the record-detail extent; deliberately shallower than Dialog's `md` so the page stays visible beside the panel.",
  },
  {
    path: "packages/primitives/drawer/src/Drawer.vue",
    value: "w-[min(94vw,40rem)]",
    because:
      "Drawer's `lg` width step — the working-surface extent (a table, a multi-section form beside the page).",
  },
  {
    path: "packages/primitives/drawer/src/Drawer.vue",
    value: "w-[min(94vw,64rem)]",
    because:
      "Drawer's `xl` width step — Dialog's own top-end pair, adopted rather than reinvented so a host can size-match the two surfaces.",
  },
  {
    path: "packages/primitives/drawer/src/Drawer.vue",
    value: "h-[min(90vh,16rem)]",
    because:
      "Drawer's `sm` height step — the sheet extent; the heights answer their own ×1.5 ladder (16 → 24 → 36) rather than borrowing a width number.",
  },
  {
    path: "packages/primitives/drawer/src/Drawer.vue",
    value: "h-[min(92vh,24rem)]",
    because:
      "Drawer's `md` height step — the sheet extent; the heights answer their own ×1.5 ladder rather than borrowing a width number.",
  },
  {
    path: "packages/primitives/drawer/src/Drawer.vue",
    value: "h-[min(94vh,36rem)]",
    because:
      "Drawer's `lg` height step — the sheet extent; the heights answer their own ×1.5 ladder rather than borrowing a width number.",
  },
  {
    path: "packages/primitives/drawer/src/Drawer.vue",
    value: "h-[min(94vh,54rem)]",
    because:
      "Drawer's `xl` height step — continues the ×1.5 ladder (36 → 54) instead of the width axis's numbers; no shared height vocabulary exists to reach for.",
  },
  {
    path: "packages/primitives/toast/src/Toast.vue",
    value: "w-[min(92vw,24rem)]",
    because:
      "the viewport-capped width a transient card is held to — wide enough for a title and a line, never the screen; a toast is the one surface whose width is a reading constraint, not a layout region.",
  },
  {
    path: "packages/patterns/toast-stack/src/ToastStack.vue",
    value: "w-[min(92vw,24rem)]",
    because:
      "the viewport-capped width of the stack's column — deliberately byte-identical to Toast's own card width so a stack and a lone toast are one shape; a token would be the second name for one number.",
  },
  {
    path: "packages/primitives/alert-dialog/src/AlertDialog.vue",
    value: "w-[min(92vw,32rem)]",
    because:
      "the one width a decision surface is held to, deliberately not a size prop — a decision has one shape, and the wider steps exist on Dialog because an authoring surface needs them and an alert does not.",
  },
  // ---- Menu and popover bodies -------------------------------------------
  // A menu body's width is a floor under its items, per surface: a context
  // menu wraps at a different floor than a navigation panel, and the values
  // are deliberate per component rather than steps of a shared ladder no one
  // has asked for.
  {
    path: "packages/primitives/popover/src/Popover.vue",
    value: "min-w-[12rem]",
    because:
      "the floor under a popover body — below it a popover stops being a panel and becomes a tooltip; component-local, shared with no other surface.",
  },
  {
    path: "packages/primitives/popover/src/Popover.vue",
    value: "max-w-[min(90vw,22rem)]",
    because:
      "the ceiling over a popover body, capped at 90vw so a popover never overflows the phone it is anchored on; component-local, shared with no other surface.",
  },
  {
    path: "packages/primitives/tooltip/src/Tooltip.vue",
    value: "max-w-[16rem]",
    because:
      "the wrap width that keeps a tooltip a caption rather than a paragraph; component-local, deliberately tighter than the popover's ceiling.",
  },
  {
    path: "packages/primitives/context-menu/src/ContextMenu.vue",
    value: "min-w-[12rem]",
    because:
      "the floor under a pointer-anchored menu body; component-local sizing, and no menu-width token family exists to reach for.",
  },
  {
    path: "packages/primitives/dropdown-menu/src/DropdownMenu.vue",
    value: "min-w-[12rem]",
    because:
      "the floor under a trigger-anchored menu body — the same deliberate 12rem the context menu carries, kept per component until a shared menu ladder is actually wanted.",
  },
  {
    path: "packages/primitives/menubar/src/Menubar.vue",
    value: "min-w-[13rem]",
    because:
      "the floor under a top-level application menu body — one step above the context/dropdown floor because app menus carry longer verbs; component-local sizing.",
  },
  {
    path: "packages/primitives/navigation-menu/src/NavigationMenu.vue",
    value: "min-w-[16rem]",
    because:
      "the floor under a navigation panel body — the widest menu floor, because a navigation panel carries structured content; component-local sizing.",
  },
  {
    path: "packages/primitives/command/src/Command.vue",
    value: "max-h-[300px]",
    because:
      "the list scroll height before the input and footer crowd a laptop viewport; component-local geometry that scales with nothing in the theme.",
  },
  // ---- Component-local constants with a stated referent -------------------
  {
    path: "packages/patterns/title-bar/src/TitleBar.vue",
    value: "pl-[4.5rem]",
    because:
      "macOS traffic-light clearance: three 12px buttons plus their margins, measured against what the operating system draws at the default window scale — a chrome alignment constant tied to the host platform, not a themable value.",
  },
  {
    path: "packages/patterns/title-bar/src/TitleBar.vue",
    value: "rounded-[5px]",
    because:
      "the brand tile's corner, matched to the macOS window chrome it sits beside so the tile reads level with the traffic lights at 16px; a chrome alignment constant, not a step of the radius ladder.",
  },
  {
    path: "packages/primitives/switch/src/Switch.vue",
    value: "scale-x-[1.15]",
    because:
      "the thumb's press stretch along the travel axis — half of an anisotropic squash (`--scale-press` is the whole-element weight and cannot express a pair); a per-control geometry Switch alone uses.",
  },
  {
    path: "packages/primitives/switch/src/Switch.vue",
    value: "scale-y-[0.85]",
    because:
      "the thumb's press squash across the travel axis — the other half of the anisotropic pair the whole-element `--scale-press` cannot express; a per-control geometry Switch alone uses.",
  },
] as const;
