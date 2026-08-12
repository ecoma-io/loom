<script lang="ts">
/**
 * The one thing this component says on its own account. The title, the
 * description, the body and the footer are all the host's; the drag handle is
 * `aria-hidden` and unfocusable by Reka's own design, so it says nothing at
 * all.
 *
 * The close control's glyph is `aria-hidden`, which makes this name the only
 * thing a screen reader has to go on — and unlike Dialog's, this control is
 * unconditional, so a drawer always publishes it.
 */
export interface DrawerLabels {
  /** The corner control that dismisses the panel. */
  readonly close: string;
}

/**
 * Loom's English, co-located with the component so it tree-shakes with it, and
 * exported so a host can build a partial vocabulary against the real thing.
 */
export const DRAWER_LABELS: DrawerLabels = {
  close: "Close",
};

/**
 * Which edge of the viewport the panel is anchored to. `right` is the default
 * because a drawer is most often opened *from* a row or a toolbar to show more
 * about what is already on screen, and left-to-right readers expect that
 * detail to arrive on the trailing edge. `left` is where navigation lives,
 * `bottom` is the sheet a narrow screen gets, and `top` is the rare one — a
 * command surface dropping in over the header.
 */
export type DrawerSide = "left" | "right" | "top" | "bottom";

/**
 * How far the panel reaches along its own axis — width for a `left`/`right`
 * drawer, height for a `top`/`bottom` one. Like Dialog's width, this is the
 * primitive's decision rather than a class a caller passes, so two drawers
 * opened from two screens cannot be two different sizes: `sm` for a filter rail
 * or a navigation sheet, `md` for a record's detail, `lg` for a working surface
 * with a table or a multi-section form in it.
 */
export type DrawerSize = "sm" | "md" | "lg";

/**
 * One row per edge, because `side` is not one decision but four made together —
 * which edge the panel is pinned to, which way it slides in from, which
 * dimension `size` then means, and which pair of corners is rounded — plus the
 * direction a dismissing swipe has to travel. Split across a `cva` map and
 * three lookups they drift, and the drift is invisible: a panel pinned to the
 * left that slides in from the right still renders, still passes its own tests,
 * and looks like a rendering bug nobody can name. `satisfies` is the other half
 * — adding a member to `DrawerSide` and not to this table stops compiling.
 *
 * `slide` and `exit` are the same motion in two directions and deliberately not
 * the same mechanism, which is worth reading before either is "unified".
 *
 * `slide` is a `starting:` variant rather than a keyframe, and it is a
 * transform rather than an inset or a width. A full-height panel animated on
 * `width`/`right` relayouts the document on every frame; `translate` runs on
 * the compositor. `@starting-style` supplies the before-value for the entry
 * transition at the moment Reka's `Presence` inserts the node, which is the one
 * thing a plain class cannot do. It also composes with the live swipe below:
 * the gesture writes `transform` while the entry owns `translate`, and a
 * keyframe on `transform` would overwrite a drag mid-finger.
 *
 * `exit` has to be a keyframe, for the opposite reason. `Presence` decides how
 * long to keep a closing panel mounted by reading `animation-name` and waiting
 * for `animationend` — it never observes `transitionend`. So a closed panel
 * carrying only a transition is removed from the DOM in the same frame and the
 * transition never runs, which is exactly what a drawer did until these tokens
 * existed: a 320ms slide in, answered by a hard cut. The keyframes animate
 * `translate` rather than `transform` for the same composition reason the entry
 * does, so a panel released mid-swipe leaves from where the finger left it.
 *
 * `handle` positions the grab affordance on the panel's *inner* edge, running
 * along it: a vertical pill on a side drawer, a horizontal one on a sheet.
 */
const SIDES = {
  left: {
    edge: "inset-y-0 left-0 border-r",
    corners: "rounded-r-lg",
    slide: "starting:-translate-x-full",
    exit: "data-[state=closed]:animate-slide-out-to-left",
    extent: "width",
    swipe: "left",
    handle: "right-1.5 top-1/2 h-10 w-1.5 -translate-y-1/2",
  },
  right: {
    edge: "inset-y-0 right-0 border-l",
    corners: "rounded-l-lg",
    slide: "starting:translate-x-full",
    exit: "data-[state=closed]:animate-slide-out-to-right",
    extent: "width",
    swipe: "right",
    handle: "left-1.5 top-1/2 h-10 w-1.5 -translate-y-1/2",
  },
  top: {
    edge: "inset-x-0 top-0 border-b",
    corners: "rounded-b-lg",
    slide: "starting:-translate-y-full",
    exit: "data-[state=closed]:animate-slide-out-to-top",
    extent: "height",
    swipe: "up",
    handle: "bottom-1.5 left-1/2 h-1.5 w-10 -translate-x-1/2",
  },
  bottom: {
    edge: "inset-x-0 bottom-0 border-t",
    corners: "rounded-t-lg",
    slide: "starting:translate-y-full",
    exit: "data-[state=closed]:animate-slide-out-to-bottom",
    extent: "height",
    swipe: "down",
    handle: "top-1.5 left-1/2 h-1.5 w-10 -translate-x-1/2",
  },
} satisfies Record<
  DrawerSide,
  {
    edge: string;
    corners: string;
    slide: string;
    exit: string;
    extent: "width" | "height";
    swipe: "left" | "right" | "up" | "down";
    handle: string;
  }
>;

/**
 * The size scale, indexed by the dimension the anchored edge turned it into.
 * Two maps rather than twelve rows on `SIDES`, because `left` and `right` want
 * the same widths and `top` and `bottom` the same heights — duplicating them
 * per edge is four places for a size to be adjusted in three of.
 *
 * Each is capped against the viewport, so a `lg` drawer on a laptop still
 * leaves the page it is anchored over visible behind it. That gap is the whole
 * difference between a drawer and a full-screen takeover.
 */
const EXTENT = {
  width: {
    sm: "w-[min(90vw,20rem)]",
    md: "w-[min(92vw,26rem)]",
    lg: "w-[min(94vw,40rem)]",
  },
  height: {
    sm: "h-[min(90vh,16rem)]",
    md: "h-[min(92vh,24rem)]",
    lg: "h-[min(94vh,36rem)]",
  },
} satisfies Record<"width" | "height", Record<DrawerSize, string>>;
</script>

<script setup lang="ts">
import { computed } from "vue";
import {
  DrawerRoot,
  DrawerTrigger,
  DrawerPortal,
  DrawerOverlay,
  DrawerContent,
  DrawerHandle,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "reka-ui";
import { X } from "@lucide/vue";
import { cn } from "../../lib/cn";
import { optional } from "../../lib/props";
import { useSplitAttrs } from "../../lib/attrs";
import { useLabels, type LabelOverrides } from "../../lib/labels";

/**
 * Drawer — a panel anchored to an edge of the viewport that slides in over the
 * page: a filter rail tuned while a table stays visible behind it, a record's
 * detail opened from a row, a navigation sheet on a narrow screen.
 *
 * **Drawer against Dialog**, because this is the pair most often picked wrongly.
 * `Dialog` is a centred task surface for a decision or a short form: it
 * interrupts, it sits in the middle of the screen, and the page behind it is
 * context rather than something to look at. A Drawer is edge-anchored and
 * deliberately leaves the page visible along its open side, because the work
 * happens *alongside* that content — you tune a filter and watch the rows
 * change. If the user cannot proceed until they answer, that is a Dialog. If
 * they are reading or adjusting something about what is already on screen, it
 * is a Drawer.
 *
 * **It is still modal**, and that is a deliberate choice rather than an
 * oversight: focus is trapped in the panel, Tab never reaches the page behind,
 * everything outside is hidden from assistive technology, and the page does not
 * scroll. Visible is not the same as reachable — a panel you can Tab out of
 * silently strands a keyboard user behind a scrim they cannot see past. One
 * consequence to know about is in `docs/components/drawer.md`: locking the body
 * removes the scrollbar, and Reka compensates with a `padding-right` that
 * viewport-pinned furniture does not inherit.
 *
 * **The way out is never a gesture alone.** Esc closes, the close control in the
 * corner closes, and either one returns focus to whatever opened it. The drag
 * handle is a pointer affordance sitting on top of those, never instead of
 * them — it does not exist for a keyboard, and on a desktop pointer it is a
 * hint rather than a route.
 *
 * `title` is required for the same reason it is on `Dialog`: it is the panel's
 * accessible name, and a drawer without one announces itself as a dialog that
 * says nothing about what it holds.
 *
 * Reach for `Dialog` when the answer must come before anything else happens,
 * `Popover` when the content is small, non-blocking and belongs next to its
 * trigger, and a transient notification when the user need not act at all.
 */
const props = withDefaults(
  defineProps<{
    /** Drive the drawer from the host with `v-model:open`; omit it and the drawer owns its own state. */
    open?: boolean | undefined;
    /** The accessible name, and the panel's heading. Name what is in it ("Filters", "Scene 12"), not the verb that opened it. */
    title: string;
    /** Wired as the drawer's accessible description — one line on what the panel is for, announced with the title. */
    description?: string;
    /** Which edge the panel is anchored to. `right` for detail, `left` for navigation, `bottom` for a sheet. */
    side?: DrawerSide;
    /** How far the panel reaches along its own axis — width on a side drawer, height on a sheet. */
    size?: DrawerSize;
    /** Whether a press outside the panel dismisses it, and whether the drag handle is offered. Esc and the close control work either way. */
    dismissible?: boolean;
    /**
     * The name on the close control, as any subset of `DrawerLabels` — what it
     * leaves out stays as the host's `provideLoomLabels` vocabulary left it,
     * and then as Loom's English.
     *
     * A whole application's language belongs in that vocabulary rather than
     * here. This is the per-instance correction, for the drawer whose close
     * means something more specific than "Close" — "Close filters", say, on a
     * page carrying two of them.
     */
    labels?: LabelOverrides<DrawerLabels>;
  }>(),
  // `open: undefined` is load-bearing, not a redundant default — it is what
  // keeps the uncontrolled third state reachable past Vue's absent-Boolean
  // casting. `optional()` in the template is the other half; its docblock
  // carries the reasoning for both. `description` needs no such entry: a
  // string prop is already `undefined` when absent.
  { open: undefined, side: "right", size: "md", dismissible: true },
);

defineEmits<{
  /** The drawer opened or closed, for `v-model:open`. The host stays the source of truth — the drawer reports the request and waits. */
  "update:open": [value: boolean];
}>();

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves, and a template reading the raw prop would be reading the overrides
// rather than the answer.
const text = useLabels("drawer", DRAWER_LABELS, () => props.labels);

const anchor = computed(() => SIDES[props.side]);

// `DrawerRoot` renders no DOM node at all, so fallthrough attributes would be
// dropped on the floor rather than landing anywhere. They go to the panel,
// which is the element they actually describe — a `data-testid` or an
// `aria-*` on `<Drawer>` reads as being about the drawer, not about the button
// that happens to open it.
//
// `class` is pulled out of that spread and merged through `cn()` instead:
// spreading it alongside the panel's own `:class` only concatenates the two
// lists — Vue's merge is generic, not Tailwind-aware — so a caller's
// `w-[30rem]` would lose to the size scale's own width depending on which
// utility Tailwind happened to emit last.
defineOptions({ inheritAttrs: false });
const { attrs, rest: panelAttrs } = useSplitAttrs();

/**
 * The `dismissible: false` half. Reka reads a prevented `interactOutside` as
 * "this layer declines to be dismissed", which covers the pointer press and the
 * focus that follows it in one place. Esc is deliberately untouched: a panel
 * with no keyboard exit is a trap, and "do not close this by accident" is a
 * different request from "do not let this be closed".
 */
function guardOutsidePress(event: Event): void {
  if (!props.dismissible) event.preventDefault();
}
</script>

<template>
  <DrawerRoot
    v-bind="optional({ open })"
    :swipe-direction="anchor.swipe"
    @update:open="$emit('update:open', $event)"
  >
    <!-- @slot The control that opens the drawer. Optional — omit it and drive
         the drawer entirely from the host with `v-model:open`. -->
    <DrawerTrigger v-if="$slots.trigger" as-child>
      <slot name="trigger" />
    </DrawerTrigger>

    <DrawerPortal>
      <!-- `scrim-light` rather than Dialog's `scrim`, and the token now carries
           the reason: a drawer's page is still the thing being worked on. It
           fades rather than moves, so nothing behind the panel appears to
           shift.

           Both states are scoped, never unconditional. Reka's Presence keeps
           closed content mounted until an animationend arrives, and a
           mount-only animation never fires a second one — which here would
           strand a full-screen, input-blocking scrim over a page with no drawer
           on it. The paired exit is what makes the close a timed fade instead
           of a cut, and it keeps that guarantee: `fade-out` ends, so Presence
           unmounts on its own animationend rather than on the absence of one. -->
      <DrawerOverlay
        class="fixed inset-0 z-50 bg-foreground/scrim-light data-[state=open]:animate-fade data-[state=closed]:animate-fade-out"
      />

      <DrawerContent
        v-bind="panelAttrs"
        :class="
          cn(
            'fixed z-50 flex flex-col border-border bg-popover text-popover-foreground shadow-lg outline-none',
            anchor.edge,
            anchor.corners,
            EXTENT[anchor.extent][size],
            // `slow`, and this is the one place this component reaches past the
            // `--duration-normal` feedback ceiling. The motion foundations page
            // names a panel taking over the screen as exactly what the
            // unhurried lane is for, and a full-height panel crossing the
            // viewport at 200ms reads as a flinch rather than a slide.
            'transition-transform duration-slow ease-out',
            anchor.slide,
            // The other half of the same gesture. `SIDES` carries why the two
            // directions are a transition and a keyframe rather than one
            // mechanism run both ways; the short version is that Presence
            // watches `animationend` and nothing else, so a transition on the
            // way out never gets a frame to run in.
            anchor.exit,
            // Reka's swipe-to-dismiss writes the live drag onto the panel as
            // CSS custom properties and leaves the rendering to us. Applying
            // them as `transform` keeps them off `translate`, which the slide
            // above owns — the two properties compose instead of overwriting
            // each other, so a half-finished swipe is not fighting the entry
            // transition. The `0px` fallbacks cover the browsers where
            // `CSS.registerProperty` is unavailable and the vars have no
            // registered initial value.
            '[transform:translate(var(--drawer-swipe-movement-x,0px),var(--drawer-swipe-movement-y,0px))]',
            // While a finger is down the panel must track it exactly; a 320ms
            // ease on every pointermove is a panel lagging behind the hand.
            'data-[swiping]:transition-none',
            attrs.class as string,
          )
        "
        @interact-outside="guardOutsidePress"
      >
        <!-- Reka renders the handle `aria-hidden` and unfocusable, which is
             correct and is why it can never become the only exit: it is not on
             the keyboard's path at all. It is drawn only where it means
             something — with `dismissible` off there is nothing to drag towards. -->
        <DrawerHandle
          v-if="dismissible"
          :class="cn('absolute rounded-full bg-border-strong', anchor.handle)"
        />

        <!-- The header is `shrink-0` and lives outside the scrolling region on
             purpose: a drawer taller than its content's needs scrolls its body
             while the title — the panel's accessible name and the only thing
             saying what is on screen — stays put. `pr-12` keeps a long title
             clear of the close control. -->
        <div class="shrink-0 px-6 pb-4 pr-12 pt-6">
          <DrawerTitle class="text-base font-semibold">{{ title }}</DrawerTitle>
          <DrawerDescription v-if="description" class="mt-1 text-sm text-muted-foreground">
            {{ description }}
          </DrawerDescription>
        </div>

        <!-- `min-h-0` is what makes `flex-1` able to shrink below its content's
             height; without it a flex item's automatic minimum size wins and the
             body grows the panel past the viewport instead of scrolling.
             `overscroll-contain` stops a scroll that reaches the end of this
             region from chaining out to the locked page behind. -->
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6">
          <!-- @slot The drawer body. -->
          <slot />
        </div>

        <!-- @slot The action row, aligned to the trailing edge. Pinned below the
             scrolling body so its actions stay reachable in a long panel. -->
        <div
          v-if="$slots.footer"
          class="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4"
        >
          <slot name="footer" />
        </div>

        <!-- Unconditional, unlike Dialog's `closable`. A dialog can drop its
             corner button because the footer already carries an explicit
             decision; a drawer often has no footer at all, and one of its two
             keyboard-independent exits must always be visible. -->
        <DrawerClose
          :aria-label="text.close"
          class="absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X class="h-4 w-4" />
        </DrawerClose>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>
