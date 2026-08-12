<script lang="ts">
import { cva } from "class-variance-authority";

/**
 * The same eight names Badge carries, deliberately — a chip and a badge sitting
 * in one row are the same object in two moods, so `success` has to mean the
 * same green in both. A ninth name here would be a second vocabulary for one
 * palette.
 */
export type ChipVariant =
  "neutral" | "outline" | "primary" | "success" | "warning" | "info" | "destructive" | "ai";

/**
 * Two heights off the shared control scale (the text input's `sm` and `md`), so
 * a row of chips above a field lines up with it. There is no `lg`: a chip is a
 * token, and one big enough to need the 44px step is a Button.
 */
export type ChipSize = "sm" | "md";

/**
 * The container. It is the coloured pill, and it is deliberately not the
 * interactive node — see the docblock below for why that separation is the
 * whole component.
 *
 * Selection is a state the fill *deepens*; it is never the fill alone that
 * says so. Every selected chip also carries `aria-pressed="true"` and a check
 * glyph, which is what keeps the signal legible to a reader who cannot resolve
 * a 12% wash from a 20% one.
 */
export const chipVariants = cva(
  [
    "group inline-flex max-w-full items-center rounded-full border align-middle font-medium",
    "transition-[background-color,border-color,color] duration-fast ease-out",
    // No `opacity` here, and that is the point. `data-[disabled]:opacity-50`
    // dimmed the pill *and* its label together, taking a 5.01:1 label down to
    // 2.78:1 against its own fill — halving the alpha more than halves the
    // contrast. Unavailability is painted in measured colours instead: the
    // fill and border below, and `disabledText` on the label and the glyph
    // beside it.
    "data-[disabled]:cursor-not-allowed",
  ],
  {
    // `satisfies` keeps the two halves honest: the union above is the name a
    // consumer imports and the documentation prints, the map below is the
    // classes. Adding a member to one and not the other stops compiling.
    variants: {
      variant: {
        // The two hueless variants take the warp wash when selected —
        // `--color-primary-muted` is the repository's selected/active fill, the
        // one Select's checked row already uses, so a chosen filter reads as a
        // human decision rather than as a new colour invented here.
        neutral:
          "border-transparent bg-subtle text-subtle-foreground data-[selected]:border-primary/40 data-[selected]:bg-primary-muted data-[selected]:text-primary",
        outline:
          "border-border bg-transparent text-muted-foreground data-[selected]:border-primary/40 data-[selected]:bg-primary-muted data-[selected]:text-primary",
        // The hue-carrying variants deepen their own hue instead of jumping to
        // the warp: a reader picked this chip *because* it is the destructive
        // one, and swapping its colour on selection would throw that away.
        primary:
          "border-transparent bg-primary/12 text-primary data-[selected]:border-primary/45 data-[selected]:bg-primary/20",
        success:
          "border-transparent bg-success/12 text-success data-[selected]:border-success/45 data-[selected]:bg-success/20",
        warning:
          "border-transparent bg-warning/12 text-warning data-[selected]:border-warning/45 data-[selected]:bg-warning/20",
        info: "border-transparent bg-info/12 text-info data-[selected]:border-info/45 data-[selected]:bg-info/20",
        destructive:
          "border-transparent bg-destructive/12 text-destructive data-[selected]:border-destructive/45 data-[selected]:bg-destructive/20",
        ai: "border-agent/40 bg-agent-muted text-agent data-[selected]:border-agent/70 data-[selected]:bg-agent/20",
      } satisfies Record<ChipVariant, string>,
      size: {
        sm: "h-8 text-xs",
        md: "h-9 text-sm",
      } satisfies Record<ChipSize, string>,
    },
    defaultVariants: { variant: "neutral", size: "md" },
  },
);
</script>

<script setup lang="ts">
import { computed } from "vue";
import { Check, X } from "@lucide/vue";
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";

/**
 * Chip — an interactive token: a filter that switches on, an entity that can be
 * dismissed, a recipient sitting in a picker.
 *
 * The line against Badge is the one worth knowing, because the two look almost
 * identical: **Badge is a status label a reader only looks at; Chip is a
 * control a reader acts on.** A Badge that gained a click handler would be a
 * Chip, and a Chip nobody can toggle or dismiss is a Badge wearing a button's
 * clothes — it takes a Tab stop and announces itself as pressable while doing
 * nothing. Reach for Button when the token *is* the action rather than a
 * standing state, and for SegmentedControl when exactly one of a small set must
 * be chosen; a row of chips is many-of-many, and none-of-them is a valid answer.
 *
 * The structure is the component. A chip that both toggles and dismisses has
 * two controls, and they are **siblings inside a non-interactive container** —
 * never a dismiss `<button>` nested inside a toggle `<button>`. Nested buttons
 * are invalid HTML: the parser reparents them, and screen readers disagree
 * about which one they are on and what a press means. So the pill is a `<span>`
 * that paints, and everything pressable is a child of it.
 *
 * Both controls stay on the natural Tab order rather than roving. They are two
 * different actions on one object, not N instances of one control, and a reader
 * who tabbed to the chip has to be able to reach "remove" without guessing an
 * arrow key.
 */
const props = withDefaults(
  defineProps<{
    /** Whether the chip is switched on. Binding it is what makes the chip a toggle — leave it unset for a chip that is only dismissable, and the label renders as inert text instead of a press target. */
    selected?: boolean | undefined;
    /** Renders a dismiss control beside the label, as a sibling of the toggle rather than inside it. */
    removable?: boolean;
    /** The accessible name of the dismiss control. Localise it, or qualify it — "Remove Ana Duarte" reads far better in a list of recipients. */
    removeLabel?: string;
    /** Unavailable: drains the pill to a neutral fill, mutes the label, and makes both controls inert to pointer and keyboard. */
    disabled?: boolean;
    /** Which status or meta the token carries. The names and colours are Badge's, so a chip and a badge never disagree. */
    variant?: ChipVariant;
    /** Chip height, off the shared control scale so a row of chips lines up with the field above it. */
    size?: ChipSize;
  }>(),
  {
    // Not `false`. `undefined` is the signal that this chip is not a toggle at
    // all, and Vue casts an absent Boolean prop to `false` unless a default
    // says otherwise — without this line every chip would claim to be a toggle
    // that is switched off, and a dismiss-only chip would grow a dead Tab stop.
    selected: undefined,
    removable: false,
    removeLabel: "Remove",
    disabled: false,
    variant: "neutral",
    size: "md",
  },
);

const emit = defineEmits<{
  /** The flipped selection. The chip does not update itself: a filter chip's state is the query it stands for, and a chip that switched on locally would keep claiming a result set the host never fetched. */
  "update:selected": [value: boolean];
  /** The dismiss control was activated. Removing the chip from the list is the host's to do. */
  remove: [];
}>();

const toggleable = computed(() => props.selected !== undefined);

// The label's horizontal padding, shared by both branches below so the pill is
// the same width whether or not it is pressable. The dismiss control supplies
// its own trailing room, so the label gives its right side back when one is
// present.
const labelPad = computed(() =>
  cn(props.size === "sm" ? "px-2.5" : "px-3", props.removable && "pr-1"),
);

// Springy transform, steady colour — the same split Button and Checkbox use, so
// a chip press feels like every other press in the library.
const pressStyle =
  "transition: transform var(--duration-fast) var(--ease-spring), background-color var(--duration-fast) var(--ease-out);";

// The unavailable label colour, and it belongs on the label rather than on the
// pill around it. A colour set on the container is only *inherited* here, and
// the container already carries `data-[selected]:text-primary` — an attribute
// selector no plain class on the same element outranks. On the label itself it
// is a declaration rather than an inheritance, so it wins whatever the pill
// resolved to: 4.67:1 over the drained `--color-muted` fill, 4.77:1 over the
// warp wash a selected chip keeps.
const disabledText = "group-data-[disabled]:text-muted-foreground";

// Both inner controls are surfaces *inside* a 32px pill, so the standard
// outward `outline-offset-2` would draw the toggle's ring straight through the
// dismiss control sitting 4px to its right, and vice versa. Inset instead —
// the ring lands just inside the pill's own border, which is where the eye
// already is. WindowControls takes the same offset for the same reason.
const focusRing =
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo";

// Everything a host passes lands on the container: it is the node with an
// identity (a data-testid, a key in a list), while the two controls inside it
// are named by their own content and by `removeLabel`. `class` is pulled out of
// that spread and merged through `cn()` instead — Vue's own class merge only
// concatenates, so a caller's `max-w-32` would win or lose against the pill's
// own utilities depending on Tailwind's emission order rather than on intent.
defineOptions({ inheritAttrs: false });
const { attrs, rest: containerAttrs } = useSplitAttrs();
</script>

<template>
  <span
    v-bind="containerAttrs"
    :data-selected="selected || undefined"
    :data-disabled="disabled || undefined"
    :class="
      cn(
        chipVariants({ variant, size }),
        // Drained to the neutral well, with the hairline the coloured variants
        // hide: an unavailable chip gives up its hue rather than its legibility.
        // A *selected* one keeps the warp wash — `data-[selected]:bg-primary-muted`
        // outranks a plain class — which is right: switched-on is information,
        // and the label is muted over either fill.
        disabled && 'border-border-strong bg-muted',
        removable && 'pr-1',
        attrs.class as string,
      )
    "
  >
    <button
      v-if="toggleable"
      type="button"
      :aria-pressed="selected"
      :disabled="disabled"
      :style="pressStyle"
      :class="
        cn(
          'inline-flex h-full min-w-0 select-none items-center gap-1 rounded-full',
          labelPad,
          // A neutral darkening rather than a token fill: the pill underneath
          // can be any of eight colours, and a hover state is not an action
          // colour.
          'hover:bg-foreground/5 active:scale-press',
          focusRing,
          'disabled:pointer-events-none',
        )
      "
      @click="emit('update:selected', !selected)"
    >
      <!-- The check is the half of the selected signal that survives a reader
           who cannot tell a 12% wash from a 20% one; `aria-pressed` is the
           other half. It collapses its own width rather than unmounting, so
           the pill grows into the glyph instead of snapping. -->
      <span
        aria-hidden="true"
        class="inline-flex w-0 shrink-0 items-center overflow-hidden opacity-0 transition-[width,opacity] duration-fast ease-spring group-data-[selected]:w-4 group-data-[selected]:opacity-100"
      >
        <Check class="h-3.5 w-3.5 shrink-0" />
      </span>
      <span :class="cn('truncate', disabledText)">
        <!-- @slot The chip's label. Keep it to a word or two — a token that needs a sentence is a row, not a chip. -->
        <slot />
      </span>
    </button>
    <span v-else :class="cn('inline-flex min-w-0 items-center', labelPad)">
      <span :class="cn('truncate', disabledText)"><slot /></span>
    </span>

    <!-- A sibling of the toggle, never a child of it. 24px square is the floor
         WCAG 2.2 SC 2.5.8 sets for a target, which is what decides the size
         here rather than the glyph's own 14px. -->
    <button
      v-if="removable"
      type="button"
      :aria-label="removeLabel"
      :disabled="disabled"
      :style="pressStyle"
      :class="
        cn(
          'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
          // Not `hover:bg-subtle`, the usual neutral well: it is opaque, and
          // over a coloured pill it punches a grey hole through the fill
          // instead of darkening it.
          'hover:bg-foreground/10 active:scale-90',
          focusRing,
          disabledText,
          'disabled:pointer-events-none',
        )
      "
      @click="emit('remove')"
    >
      <X class="h-3.5 w-3.5" />
    </button>
  </span>
</template>
