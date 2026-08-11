<script lang="ts">
import { cva } from "class-variance-authority";

/** A presence dot, or a number. */
export type IndicatorVariant = "dot" | "count";

/** The four presence states a dot can report. */
export type IndicatorStatus = "online" | "offline" | "busy" | "away";

/** Which corner of the marked element the marker straddles. */
export type IndicatorPlacement = "top-right" | "top-left" | "bottom-right" | "bottom-left";

/**
 * The colour vocabulary, deliberately Badge's own names rather than a second
 * set — `ai` included, and it means here exactly what it means there: work an
 * agent produced or is running, never decoration.
 */
export type IndicatorTone =
  "neutral" | "primary" | "success" | "warning" | "info" | "destructive" | "ai";

/** The surface the marked element sits on, which the separating ring matches. */
export type IndicatorSurface = "background" | "card" | "sunken" | "popover";

export const indicatorVariants = cva(
  // `pointer-events-none` is load-bearing rather than tidy: the marker
  // overhangs the corner of whatever it marks, so without it the top-right
  // few pixels of a bell button stop being clickable.
  "pointer-events-none absolute z-10 flex items-center justify-center select-none ring-2",
  {
    variants: {
      variant: {
        // 12px leaves room for the status glyphs below to read as shapes
        // rather than as noise.
        dot: "h-3 w-3 rounded-full",
        // `min-w-5` and the padding together are what make one digit a circle
        // and three a pill, with no branch: "1" is narrower than the minimum
        // and lands on it, "99+" outgrows it and the radius turns the ends.
        count: "h-5 min-w-5 rounded-full px-1.5 text-micro font-medium tabular",
      } satisfies Record<IndicatorVariant, string>,
      placement: {
        "top-right": "top-0 right-0 -translate-y-1/2 translate-x-1/2",
        "top-left": "top-0 left-0 -translate-y-1/2 -translate-x-1/2",
        "bottom-right": "right-0 bottom-0 translate-x-1/2 translate-y-1/2",
        "bottom-left": "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
      } satisfies Record<IndicatorPlacement, string>,
      // The ring is what separates the marker from the photo, avatar or icon
      // underneath, the way a presence dot is punched out of a portrait. It
      // has to be the colour of what surrounds the pair, which only the caller
      // knows — hence a prop rather than a guess.
      surface: {
        background: "ring-background",
        card: "ring-card",
        sunken: "ring-sunken",
        popover: "ring-popover",
      } satisfies Record<IndicatorSurface, string>,
    },
    defaultVariants: { variant: "dot", placement: "top-right", surface: "background" },
  },
);

/**
 * The fill, keyed by Badge's colour names so a success dot and a success badge
 * are the same green. These are the solid tokens where Badge uses a 12% wash:
 * a wash reads fine across a chip and carries no signal at all across 12px.
 *
 * The paired `text-*` is what the count prints in and what the status glyph is
 * punched out in, so one entry drives both layers.
 */
export const indicatorToneVariants = cva("", {
  variants: {
    tone: {
      neutral: "bg-muted-foreground text-background",
      primary: "bg-primary text-primary-foreground",
      success: "bg-success text-success-foreground",
      warning: "bg-warning text-warning-foreground",
      info: "bg-info text-info-foreground",
      destructive: "bg-destructive text-destructive-foreground",
      ai: "bg-agent text-agent-foreground",
    } satisfies Record<IndicatorTone, string>,
  },
  defaultVariants: { tone: "primary" },
});

/** Which colour each presence state means, so `status` alone is enough. */
const STATUS_TONES = {
  online: "success",
  offline: "neutral",
  busy: "destructive",
  away: "warning",
} satisfies Record<IndicatorStatus, IndicatorTone>;

/** What a screen reader is told when the caller passes no `label`. */
const STATUS_LABELS = {
  online: "Online",
  offline: "Offline",
  busy: "Busy",
  away: "Away",
} satisfies Record<IndicatorStatus, string>;

/**
 * The shape layer, and it exists for the sighted reader the `sr-only` string
 * below cannot help. Three of the four states are saturated — green, amber,
 * red — which is the exact triple a red/green deficiency collapses, so `busy`
 * wears a bar and `away` a hole and no two of them differ by hue alone.
 * `offline` needs none: grey against any of the three is a saturation
 * difference, not a hue one.
 */
const STATUS_GLYPHS = {
  online: "",
  offline: "",
  busy: "h-0.5 w-1.5 rounded-full bg-current",
  away: "h-1 w-1 rounded-full bg-current",
} satisfies Record<IndicatorStatus, string>;
</script>

<script setup lang="ts">
import { computed, useId } from "vue";
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";

/**
 * Indicator — the small marker pinned onto the corner of something else: a
 * presence dot on an avatar, an unread count on a bell, a "needs attention"
 * dot on a tab. The default slot is the thing being marked, and the marker
 * positions itself over that child's corner.
 *
 * The boundary with Badge is the whole of the decision between them: **Badge
 * sits in the flow beside content; Indicator is pinned onto content.** A count
 * chip in a table cell is a Badge. The same count floating over a bell icon is
 * an Indicator. Reach for Badge whenever the marker would take up room of its
 * own, and for this whenever it would overhang something.
 *
 * What this component is by default is a bare colour, which is the one thing
 * Loom's accessibility bar forbids outright. A green dot says nothing to a
 * reader who cannot see it. So every marker that renders carries a visually
 * hidden string — `label`, or a default derived from `status` or `count` — and
 * a blank `label` falls back to that default rather than replacing it, which
 * is what makes an unnamed indicator unreachable rather than merely
 * discouraged. The shape layer in `STATUS_GLYPHS` covers the sighted reader
 * the hidden string cannot.
 *
 * There is deliberately **no `aria-live` region here**, and the reason is that
 * this component cannot know whether a change is news. An unread counter is
 * usually fed by a poll, so a live region announces every tick over whatever
 * the reader was doing; the same count is commonly pinned in two places at
 * once, so it announces twice; and a polite region speaks on first render in
 * several screen reader and browser pairs, which turns every page load into a
 * recitation of the inbox. The marker is therefore static text a reader
 * reaches on demand, and announcing a *change* stays with the consumer, who
 * knows whether it followed something the reader just did.
 *
 * One consequence to design around: when the marked child is interactive, its
 * accessible name is computed from the child, and this marker's text sits
 * outside it — a bell button announces "Notifications, button" on focus and
 * never mentions the three unread. The default slot exposes `labelId` for
 * exactly that: bind it to the control's `aria-describedby` and the count is
 * announced straight after the name, once, without being duplicated into it.
 */
const props = withDefaults(
  defineProps<{
    /** A presence dot, or a number in a pill. */
    variant?: IndicatorVariant;
    /** The number the pill prints, when `variant` is `count`. Zero hides the marker unless `showZero` is set. */
    count?: number;
    /** The highest number printed in full; anything above it prints as `<max>+`. The accessible text still carries the real figure. */
    max?: number;
    /** Presence, for a dot: it picks the colour and the shape, and names the dot for a screen reader. Omit it for a plain "something changed" dot. */
    status?: IndicatorStatus;
    /** The marker's colour, in Badge's own vocabulary. Defaults to whatever `status` implies, or to `primary` when there is no status. */
    tone?: IndicatorTone;
    /** Which corner of the marked element the marker straddles. */
    placement?: IndicatorPlacement;
    /** What a screen reader announces for the marker. Leave it unset for the derived default — "Online", "3 unread" — and set it whenever the count is not of unread things. Blank or whitespace falls back to the default rather than clearing it. */
    label?: string;
    /** Render the pill when the count is zero. Off by default, because a count of nothing is not news. */
    showZero?: boolean;
    /** The surface the marked element sits on, so the ring separating the marker from it matches what surrounds them. */
    surface?: IndicatorSurface;
  }>(),
  {
    variant: "dot",
    count: 0,
    max: 99,
    placement: "top-right",
    showZero: false,
    surface: "background",
  },
);

// One rendered node, and every fallthrough attribute belongs on it — but
// `class` still has to go the long way round. A consumer replacing the root's
// `inline-flex` with `block` cannot win by concatenation, because the winner
// there is decided by the order of the two rules in the stylesheet rather than
// by the order of the two names in the attribute; `cn()` is what resolves it.
defineOptions({ inheritAttrs: false });
const { attrs, rest } = useSplitAttrs();

// Bound to the hidden label so an interactive child can point its
// `aria-describedby` at it through the slot prop.
const labelId = useId();

/**
 * The count as a whole, non-negative number. A negative count is a defect in
 * the caller's data, and a pill reading "-1 unread" reports that defect to the
 * reader rather than to the caller — falling back to "nothing to report" is
 * the honest rendering of it.
 */
const total = computed(() => Math.max(0, Math.trunc(props.count)));

const visible = computed(() => props.variant === "dot" || total.value > 0 || props.showZero);

/** What the pill prints — the real figure up to `max`, then `<max>+`. */
const printed = computed(() =>
  total.value > props.max ? `${String(props.max)}+` : String(total.value),
);

const tone = computed<IndicatorTone>(
  () => props.tone ?? (props.status ? STATUS_TONES[props.status] : "primary"),
);

const glyph = computed(() => (props.status ? STATUS_GLYPHS[props.status] : ""));

/**
 * The accessible name, and it is never empty by construction. The count case
 * reports `total` rather than `printed`: clamping at `max` is a decision about
 * how wide the pill is allowed to get, and a reader who cannot see the pill
 * has no reason to inherit it — "132 unread" is the fact, "99+" is the layout.
 */
const name = computed(() => {
  const given = props.label?.trim();
  if (given) return given;
  if (props.variant === "count") return `${String(total.value)} unread`;
  return props.status ? STATUS_LABELS[props.status] : "Needs attention";
});
</script>

<template>
  <span v-bind="rest" :class="cn('relative inline-flex align-middle', attrs.class as string)">
    <!-- A multi-line `@slot` comment comes back from vue-docgen with no description at all, so this one stays on one line. -->
    <!-- @slot The element being marked. `labelId` is the id of the marker's own hidden text — bind it to an interactive child's `aria-describedby` so the count is announced after that control's name. -->
    <slot :label-id="labelId" />

    <!-- Keyed on what is printed rather than on the count, so `animate-scale-in`
         replays when a number a reader can see actually changes and stays put
         when 100 becomes 132 behind the same "99+". A dot's key never moves, so
         a dot never animates: presence settles into place on load, it does not
         arrive as news, and it must not pulse. -->
    <span
      v-if="visible"
      :key="printed"
      :data-placement="placement"
      :class="
        cn(
          indicatorVariants({ variant, placement, surface }),
          indicatorToneVariants({ tone }),
          variant === 'count' && 'animate-scale-in',
        )
      "
    >
      <!-- Hidden from assistive tech because the label below carries the real
           figure; left visible the pair would read as "99+ 132 unread". -->
      <span v-if="variant === 'count'" aria-hidden="true">{{ printed }}</span>
      <span v-else-if="glyph" :class="glyph" />

      <span :id="labelId" class="sr-only">{{ name }}</span>
    </span>
  </span>
</template>
