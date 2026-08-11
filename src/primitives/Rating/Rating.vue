<script lang="ts">
import { cva } from "class-variance-authority";

/**
 * Star size. Deliberately *not* the control-height scale the text input,
 * Select and Button share: a rating is a row of glyphs rather than a box a
 * form row aligns against, so it sizes by the icon. It follows the icon scale
 * instead — 16 / 20 / 24px — which is the same ladder Spinner uses.
 */
export type RatingSize = "sm" | "md" | "lg";

/**
 * One star's box, and it is applied to three nodes at once: the item, the
 * empty glyph and the filled glyph.
 *
 * The half-star is a clip, and a clip needs a box to be a fraction *of*. The
 * filled glyph inside a 50%-wide window has to keep the width of a whole star
 * or it renders as a squashed whole star rather than as half of one — so its
 * size comes from this map rather than from the icon's own intrinsic width,
 * and changing `size` moves the window and the glyph together.
 */
const starVariants = cva("block shrink-0", {
  variants: {
    size: { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" } satisfies Record<RatingSize, string>,
  },
  defaultVariants: { size: "md" },
});

/** The row itself: the gap grows with the stars so the rhythm holds at every size. */
const rowVariants = cva("inline-flex items-center", {
  variants: {
    size: { sm: "gap-0.5", md: "gap-1", lg: "gap-1.5" } satisfies Record<RatingSize, string>,
  },
  defaultVariants: { size: "md" },
});
</script>

<script setup lang="ts">
import { computed } from "vue";
import { RatingRoot, RatingItem, RatingItemIndicator } from "reka-ui";
import { Star } from "@lucide/vue";
import { cn } from "../../lib/cn";
import { optional } from "../../lib/props";
import { useSplitAttrs } from "../../lib/attrs";

/**
 * Rating — a score on a small, fixed, ordinal scale, drawn as a row of stars.
 * Reach for it where the scale itself is the vocabulary a reader already
 * knows: how good was this, how confident are you, how would you rate it.
 *
 * Its neighbours: a value on a continuous range whose ends are the
 * information — a volume, a ratio — is a Slider; a choice between named
 * options that happen to be ordered ("poor", "fair", "good") is a
 * SegmentedControl or a RadioGroup, because the names carry meaning stars
 * cannot; and a number with no meaningful ceiling is a NumberField.
 *
 * **`readonly` and `disabled` are different controls, not two dials on one.**
 * A product's average score on a card is `readonly`: it is a picture of a
 * number, so it renders as `role="img"` with the score in its accessible
 * name, is not a Tab stop, is not in the radio group at all, and is *not*
 * dimmed — nothing about it is unavailable, it was never an input. A rating
 * inside a form the reader may not edit yet is `disabled`: it stays a radio
 * group, dims, and refuses the pointer and the keyboard. Conflating the two
 * is the standard defect in this control — a read-only average rendered as a
 * disabled input reads as "broken" to a sighted reader and as "unavailable
 * input" to a screen reader, and neither is true.
 *
 * Built on Reka UI's Rating, which is a RadioGroup underneath: the row is one
 * Tab stop with roving focus, arrow keys move between steps and select as
 * they go, Home and End reach the ends.
 *
 * **`step` is narrowed on purpose.** Reka's `RatingRoot` also accepts `0.25`
 * and `0.1`. A quarter of a 20px star is a 5px-wide pointer target and a
 * tenth is 2px, and at that size the difference between 4.3 and 4.4 stars is
 * not perceptible in the rendering either — so the value could be neither
 * aimed at nor read back. An option that cannot be used correctly is not an
 * option, so the two are dropped here rather than forwarded.
 *
 * `step` governs what can be *aimed at*, which is a question only the
 * interactive control asks. A `readonly` rating therefore ignores it and
 * paints the exact value it was given: an average of 4.2 shows and announces
 * 4.2, not the nearest half.
 */
const props = withDefaults(
  defineProps<{
    /** The score, in stars. Leave it unset to let the rating manage its own. */
    modelValue?: number;
    /** How many stars the scale has — the maximum, and what a reader is scored out of. */
    length?: number;
    /** Granularity of one arrow-key step and of the pointer: whole stars, or halves. */
    step?: 1 | 0.5;
    /** Renders the score as a picture of a number rather than an input: no Tab stop, no dimming, and the exact value regardless of `step`. */
    readonly?: boolean;
    /** Lets a reader clear the score by choosing the star that is already chosen, which emits `0`. */
    clearable?: boolean;
    /** Previews the score under the pointer while hovering, before anything is chosen. */
    hoverable?: boolean;
    /** Unavailable: dims the row and refuses both the pointer and the keyboard. For a score that was never editable, use `readonly`. */
    disabled?: boolean;
    /** Star size. It follows the icon scale, not the control-height scale. */
    size?: RatingSize;
  }>(),
  {
    length: 5,
    step: 1,
    readonly: false,
    clearable: false,
    hoverable: false,
    disabled: false,
    size: "md",
  },
);

defineEmits<{
  /** The newly chosen score in stars, or `0` when a `clearable` rating is cleared. */
  "update:modelValue": [value: number];
}>();

// Two roots, one branch each, so `class` needs a Tailwind-aware merge on
// whichever one renders — Vue's own fallthrough merge only concatenates, and a
// caller's `gap-2` would then win or lose depending on which utility Tailwind
// happened to emit last. Every other attribute (`aria-label` naming the group,
// a test hook) rides `rest` onto the same node.
defineOptions({ inheritAttrs: false });
const { attrs, rest } = useSplitAttrs();

/**
 * The score as it is drawn and announced, clamped into the range the stars can
 * actually show. Without the clamp a value of 9 on a 5-star scale paints five
 * stars and announces "9 of 5", which is a number no reader can reconcile with
 * the picture beside it.
 */
const score = computed(() => Math.min(Math.max(props.modelValue ?? 0, 0), props.length));

const stars = computed(() => Array.from({ length: props.length }, (_, index) => index + 1));

/**
 * What a screen reader is given for a score — the text the stars are not.
 *
 * Five spans wearing a star glyph announce nothing at all, so the maximum
 * rides in every one of these strings: on the read-only picture's own name,
 * and on each radio's, where it turns "4" into "4 of 5 stars" at the moment
 * the reader is on it. `toFixed` then `Number` drops the trailing zero a half
 * step leaves behind, so 4 reads "4" rather than "4.0".
 */
function starsLabel(value: number): string {
  return `${String(Number(value.toFixed(2)))} of ${String(props.length)} stars`;
}

/**
 * How much of star `n` is painted, as a percentage — the read-only clip
 * window. Rounded, because binary floating point turns a score of 4.2 into a
 * width of `20.000000000000018%`: correct to the pixel and unreadable in a
 * DOM inspector or a test failure.
 */
function fillOf(star: number): string {
  const filled = Math.min(Math.max(score.value - (star - 1), 0), 1);
  return `${String(Number((filled * 100).toFixed(2)))}%`;
}
</script>

<template>
  <!-- The read-only branch renders no radio group, because there is no choice
       to offer: one `role="img"` node carrying the score as its name, and
       nothing inside it that a Tab reaches. -->
  <div
    v-if="readonly"
    v-bind="rest"
    role="img"
    :aria-label="starsLabel(score)"
    :class="cn(rowVariants({ size }), attrs.class as string)"
  >
    <span v-for="star in stars" :key="star" :class="cn(starVariants({ size }), 'relative')">
      <!-- The empty stars are what say how many there were to earn, so they
           are a graphical object carrying information and are held to 1.4.11's
           3:1 rather than painted as a faint hairline — hence the foreground
           neutral and not a border token. -->
      <Star
        aria-hidden="true"
        :class="cn(starVariants({ size }), 'absolute inset-0 text-muted-foreground')"
      />
      <!-- The fill is a window over a whole star, not a second glyph: a
           fraction of a star drawn by clipping is the only version that stays
           a star at any width. -->
      <span class="absolute inset-y-0 left-0 overflow-hidden" :style="{ width: fillOf(star) }">
        <Star aria-hidden="true" :class="cn(starVariants({ size }), 'fill-primary text-primary')" />
      </span>
    </span>
  </div>

  <RatingRoot
    v-else
    v-slot="{ items }"
    v-bind="{ ...rest, ...optional({ modelValue }) }"
    :length="length"
    :step="step"
    :clearable="clearable"
    :hoverable="hoverable"
    :disabled="disabled"
    :class="
      cn(
        rowVariants({ size }),
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        attrs.class as string,
      )
    "
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- `as="span"`: Reka renders the item as a `<label>` by default, and a
         label with no text of its own names nothing while still claiming to.
         The names live on the radios below, one per step. -->
    <RatingItem
      v-for="item in items"
      :key="item"
      v-slot="{ steps }"
      as="span"
      :item="item"
      :class="cn(starVariants({ size }), 'relative')"
    >
      <Star
        aria-hidden="true"
        :class="cn(starVariants({ size }), 'absolute inset-0 text-muted-foreground')"
      />
      <!-- One radio per step, stacked over the empty star and clipped to the
           fraction it stands for: with `step` 0.5 the left half of the glyph
           is a 50%-wide button sitting above the whole-star one, so the
           pointer lands on the half a reader aimed at. All three custom
           properties come from Reka — the width of this step, whether a half
           step is currently worth showing, and the stacking order that keeps
           the narrower button reachable. -->
      <RatingItemIndicator
        v-for="stepValue in steps"
        :key="stepValue"
        :step="stepValue"
        :aria-label="starsLabel(stepValue)"
        class="group/step absolute inset-y-0 left-0 cursor-pointer overflow-hidden rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo disabled:cursor-not-allowed"
        style="
          width: var(--reka-rating-item-step-width);
          opacity: var(--reka-rating-item-step-opacity);
          z-index: var(--reka-rating-item-step-z-index);
        "
      >
        <!-- Two of the button's own states, read one level down. `data-state`
             is `active` on every step at or below the score — or below the
             pointer, while hovering — and that one only fades: a preview that
             lags the pointer feels broken, so it rides --duration-instant.
             `aria-checked` is true on the single step that *is* the score, so
             the star a reader just chose settles on the spring while the ones
             it dragged along behind it merely fill.
             Both are scoped to the state rather than declared bare, which is
             what lets the animation replay on each new choice instead of
             running once at mount and never again. -->
        <Star
          aria-hidden="true"
          :class="
            cn(
              starVariants({ size }),
              'fill-primary text-primary opacity-0 transition-opacity duration-instant ease-out',
              'group-data-[state=active]/step:opacity-100',
              'group-aria-checked/step:animate-scale-in',
            )
          "
        />
      </RatingItemIndicator>
    </RatingItem>
  </RatingRoot>
</template>
