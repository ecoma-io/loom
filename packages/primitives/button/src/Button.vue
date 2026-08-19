<script lang="ts">
import { cva } from "class-variance-authority";

/**
 * The six weights, and the choice between them is about emphasis rather than
 * colour: `primary` is the one action a screen is asking for, `destructive` is
 * the one it is warning about, and the four between them step down.
 */
export type ButtonVariant =
  "primary" | "secondary" | "subtle" | "outline" | "ghost" | "destructive";

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

/**
 * One row per rest-state variant, naming the fill and the label token the
 * variant paints. Kept separate from the `cva` call because it is also the
 * contract `Button.contrast.test.ts` reads: that file derives every variant's
 * pairing from here, so a variant added to the map is measured on arrival
 * rather than when someone remembers to add a row to a test. The two halves
 * — this map and the `cva` call consuming it — cannot drift apart, because
 * `cva` is handed this very object.
 *
 * `satisfies` is what keeps this map and the union honest. The union above is
 * the name a consumer imports and the documentation prints; the map below is
 * the classes. Adding a member to one and not the other stops compiling, so
 * neither can be the stale copy of the other.
 */
export const buttonVariantClasses = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
  subtle: "bg-transparent text-foreground hover:bg-subtle",
  outline: "border border-input bg-transparent text-foreground hover:bg-subtle",
  ghost: "bg-transparent text-muted-foreground hover:bg-subtle hover:text-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
} satisfies Record<ButtonVariant, string>;

/**
 * Button — the workhorse, and the primitive that encodes Loom's press
 * language:
 *
 *   • hover lifts by fill, not by shadow
 *   • active presses down (scale 0.97) — physical, causal feedback
 *   • focus blooms the primary ring
 *   • loading plays a kinetic swap under a shimmer sweep: the label rolls up
 *     and out, a progress arc springs in, the loading text rises last — and
 *     both layers share one grid cell, so the width never jumps mid-film
 *
 * Unavailable is painted in colours rather than dimmed, and it is keyed off the
 * `disabled` prop rather than off the DOM disabled state — a loading button is
 * also DOM-disabled yet has to read as "working", not "unavailable". See the
 * drained treatment on the root element for the measurements that removed the
 * dim.
 */
export const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "rounded-md text-sm font-medium",
    "[transition:transform_var(--duration-fast)_var(--ease-spring),background-color_var(--duration-fast)_var(--ease-out),color_var(--duration-fast)_var(--ease-out),box-shadow_var(--duration-fast)_var(--ease-out)]",
    "active:scale-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo",
    "disabled:pointer-events-none",
  ],
  {
    variants: {
      variant: buttonVariantClasses,
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9 p-0",
        // A square icon button for dense rows, matching `sm`'s height so a row
        // action lines up with that row's text controls. Still 32px — well
        // over the 24px minimum target size (WCAG 2.2 SC 2.5.8) — so density
        // here costs no reachability. It exists because consumers were
        // reaching for `size="icon"` and then hand-overriding `class="h-8 w-8"`,
        // which silently re-litigates the target-size question at every call
        // site.
        "icon-sm": "h-8 w-8 p-0",
      } satisfies Record<ButtonSize, string>,
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
</script>

<script setup lang="ts">
import { cn } from "@ecoma-io/loom-core";

withDefaults(
  defineProps<{
    /** How much emphasis the action carries. */
    variant?: ButtonVariant;
    /** Control height. `icon` and `icon-sm` are square, for a glyph alone. */
    size?: ButtonSize;
    /** Locks the button and plays the kinetic swap (label → arc + loadingText). */
    loading?: boolean;
    /** Text shown beside the progress arc while loading, e.g. "Saving…". */
    loadingText?: string;
    /** Unavailable rather than busy — drains the button to the neutral well and blocks pointer events. */
    disabled?: boolean;
    /** The native button type. Defaults to `button`, never an accidental submit. */
    type?: "button" | "submit" | "reset";
  }>(),
  { variant: "primary", size: "md", loading: false, disabled: false, type: "button" },
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :data-loading="loading || undefined"
    :aria-busy="loading || undefined"
    :class="
      cn(
        buttonVariants({ variant, size }),
        'group',
        // Drained, not dimmed. `opacity-50` here was the library's most visible
        // instance of the mistake, because a button is nothing but a label on a
        // fill and the dim took both together: measured on the built site, a
        // disabled `primary` label came out at 1.62:1 against its own faded fill
        // and a disabled `outline` at 3.14:1 on the page ground. Neither is
        // reachable by recolouring the label, since the fade multiplied whatever
        // colour it was given.
        //
        // One neutral treatment for all six variants rather than six drained
        // pairs: the fill is what carries a variant's emphasis, and an
        // unavailable button has no emphasis to carry. It is the same well Chip
        // and Stepper drain to, so an unavailable control looks the same
        // wherever it appears. Every variant still changes visibly on the way
        // in — the two filled ones give up their hue, the three transparent ones
        // gain a fill — and the native `disabled` attribute carries the fact to
        // assistive tech, so none of it rests on colour alone.
        //
        // `border-border` and not the strong weight, which is what `outline`
        // used to take here. `theme.css` reserves the strong hairline for a
        // block that must *assert* its edge, and an unavailable control is the
        // one thing that must not; slackening from `input` to the lighter
        // `border` is also the same step every other unavailable control in the
        // library now makes, so a disabled Button beside a disabled TextField
        // wears the same rim rather than a heavier one.
        disabled && 'border-border bg-muted text-muted-foreground shadow-none',
      )
    "
  >
    <!-- The shimmer sweep, while loading. -->
    <span
      v-if="loading"
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 rounded-md bg-[linear-gradient(110deg,transparent_35%,--alpha(var(--color-primary)/25%)_50%,transparent_65%)] bg-[length:220%_100%] animate-shimmer"
    />
    <!-- The kinetic swap. Both layers live in the same grid cell, so the
         button keeps the width of the wider one and nothing jumps mid-swap.
         Only the layer for the current state is exposed to assistive
         technology; the other is aria-hidden, because opacity alone does not
         hide anything from a screen reader. -->
    <span class="inline-grid place-items-center">
      <!-- Beat 1 — the label rolls up and out. -->
      <span
        :aria-hidden="loading || undefined"
        class="[grid-area:1/1] inline-flex items-center gap-2 transition-[opacity,transform] duration-fast ease-out group-data-[loading]:-translate-y-1 group-data-[loading]:opacity-0"
      >
        <slot />
      </span>
      <span
        :aria-hidden="!loading || undefined"
        class="pointer-events-none [grid-area:1/1] inline-flex items-center gap-2"
      >
        <!-- Beat 2 — the progress arc springs in from below. The spinning svg
             sits inside a wrapper because `animate-spin` owns `transform`: the
             entry scale and translate have to live on a separate element, or
             the spin keyframe would overwrite them. It is the same arc the
             standalone Spinner draws, inlined and aria-hidden — Spinner's
             role="status" contract is wrong inside an aria-busy button, where
             it would announce the state twice. -->
        <span
          class="transition-[opacity,transform] duration-fast ease-spring opacity-0 scale-50 translate-y-1 group-data-[loading]:translate-y-0 group-data-[loading]:scale-100 group-data-[loading]:opacity-100"
        >
          <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle class="stroke-current opacity-25" cx="12" cy="12" r="10" stroke-width="4" />
            <path
              class="fill-current opacity-75"
              d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </span>
        <!-- Beat 3 — the loading text rises last. The stagger delay applies on
             entry only (exit keeps delay 0, so the film cuts out clean), and
             it is cancelled under reduced motion so the instant swap is not
             lagged by a delay nobody asked for. -->
        <span
          v-if="loadingText"
          class="transition-[opacity,transform] duration-100 ease-out opacity-0 translate-y-1 group-data-[loading]:translate-y-0 group-data-[loading]:opacity-100 group-data-[loading]:delay-75 motion-reduce:group-data-[loading]:delay-0"
        >
          {{ loadingText }}
        </span>
      </span>
    </span>
  </button>
</template>

// Benchmark scenario A: component-only change.
