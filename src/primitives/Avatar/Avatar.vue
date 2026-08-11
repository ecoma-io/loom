<script lang="ts">
import { cva } from "class-variance-authority";

/** Control height, and the text size the initials fallback prints at. */
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

/** A circle, or a rounded square tile. */
export type AvatarShape = "circle" | "square";

/**
 * Which of Loom's two forces the subject belongs to — the warp a person
 * authors on, or the weft an agent carries across it. `ai` is deliberately
 * Badge's own name for that second force rather than a second word for one
 * idea, and it means here exactly what it means there: an agent, never
 * decoration.
 */
export type AvatarForce = "human" | "ai";

export const avatarVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden select-none",
  {
    // `satisfies` keeps the two halves honest: the unions above are the names a
    // consumer imports and the documentation prints, the maps below are the
    // classes. Adding a member to one and not the other stops compiling — which
    // is what the three inline `size === '…' &&` conditionals this replaced
    // could not do, and the reason five sizes could not stay written that way.
    variants: {
      size: {
        // `text-xs` twice, deliberately. It is the smallest step Tailwind's own
        // scale has, and the step below it — Loom's `text-micro` — is a name
        // tailwind-merge classifies as a text *colour* rather than a size, so
        // `cn()` drops it the moment the force map adds `text-muted-foreground`
        // after it. Two initials at 12px still fit inside 24px.
        xs: "h-6 w-6 text-xs",
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-12 w-12 text-base",
        xl: "h-16 w-16 text-lg",
      } satisfies Record<AvatarSize, string>,
      force: {
        human: "bg-muted text-muted-foreground",
        // The weft, worn as a rim. Two signals, not one: the rim's *presence*
        // is what a reader who cannot resolve the hue still sees — a human
        // avatar has no edge at all — and the hidden `agentLabel` is what a
        // reader who sees no avatar hears. The corner is left alone on
        // purpose, because the corner is Indicator's: a presence dot pinned
        // there would land on top of anything this component drew.
        ai: "border-2 border-agent bg-agent-muted text-agent",
      } satisfies Record<AvatarForce, string>,
    },
    defaultVariants: { size: "md", force: "human" },
  },
);

/**
 * A square avatar's corner radius, one value per size rather than the control
 * radius throughout. `rounded-md` is calibrated against a ~36px control; on a
 * 24px tile it is a third of the side, where a milled fillet stops reading as
 * a corner and starts reading as a blob, and on a 64px one it has almost
 * disappeared. Stepping it holds the corner between a sixth and a quarter of
 * the side at every size — the band the control radius already sits in — which
 * is the nesting law applied to a tile whose "padding" is its own edge.
 */
const SQUARE_RADIUS = {
  xs: "rounded-sm",
  sm: "rounded-md",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
} satisfies Record<AvatarSize, string>;

/**
 * The rounding for one size and shape. A circle is one value at every size; a
 * square is not, which is why the radius cannot live in the `cva` map beside
 * the heights. Kept off the public surface deliberately: a consumer wanting an
 * avatar-shaped tile should render an `Avatar`, not reassemble one.
 */
function avatarRadius(size: AvatarSize, shape: AvatarShape): string {
  return shape === "circle" ? "rounded-full" : SQUARE_RADIUS[size];
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { AvatarRoot, AvatarImage, AvatarFallback } from "reka-ui";
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";

/**
 * Avatar — a user or agent's picture, with a graceful initials fallback for
 * no `src`, a broken URL, or a still-loading image. Built on Reka UI's
 * Avatar: the image only paints once it has actually finished loading, so
 * the fallback stays visible the whole time until then — first paint is
 * either the real photo or the initials, never a broken-image icon.
 *
 * Two neighbours are worth naming. Several faces standing for one thing — the
 * people on a task, the agents on a run — are an `AvatarGroup`, which owns the
 * overlap, the stacking order and the "+3" so a row of them is one object to a
 * screen reader rather than N unrelated images. Anything pinned onto the
 * avatar's corner — a presence dot, an unread count — is an `Indicator`
 * wrapped around it; this component deliberately draws nothing there.
 */
const props = withDefaults(
  defineProps<{
    /** Image URL. Omit it to render the fallback outright. */
    src?: string;
    /** Accessible name for the photo — required on `AvatarImage` so a screen reader announces who it is, not just that an image loaded. */
    alt?: string;
    /** Initials to show while there is no image, or once one has failed — computed by the caller, never derived from `alt` here. */
    fallback?: string;
    /** Control height. */
    size?: AvatarSize;
    /** A circle, or a rounded square tile. Square suits a subject a circle would misdescribe — an organisation, a project, a repository — and takes a radius that steps with the size rather than one fixed value. */
    shape?: AvatarShape;
    /** Which force the subject belongs to. `ai` wears the agent weft as a rim, and adds `agentLabel` for a screen reader, so the distinction never rests on the hue alone. */
    force?: AvatarForce;
    /** What a screen reader announces after the name of an `ai` avatar. Localise it. Set it empty when something outside already says so — `AvatarGroup` does, because each row item composes its own name — and nothing is added for a `human` avatar either way. */
    agentLabel?: string;
  }>(),
  {
    alt: "",
    size: "md",
    shape: "circle",
    force: "human",
    agentLabel: "AI agent",
  },
);

// One rendered node, and it is the right home for every fallthrough attribute
// — but `class` still goes the long way round, through `cn()`. Vue's own merge
// only concatenates, so the `bg-subtle` an AvatarGroup paints its overflow tile
// with would win or lose against this root's `bg-muted` depending on the order
// Tailwind happened to emit the two rules in, rather than on intent.
defineOptions({ inheritAttrs: false });
const { attrs, rest } = useSplitAttrs();

const radius = computed(() => avatarRadius(props.size, props.shape));
</script>

<template>
  <AvatarRoot
    v-bind="rest"
    :data-force="force"
    :class="cn(avatarVariants({ size, force }), radius, attrs.class as string)"
  >
    <!-- Reka paints AvatarImage only once the photo has loaded, so scale-in
         plays exactly on that swap-in — a gentle settle over the fallback. -->
    <AvatarImage
      v-if="src"
      :src="src"
      :alt="alt"
      class="h-full w-full animate-scale-in object-cover"
    />
    <AvatarFallback class="font-medium">{{ fallback }}</AvatarFallback>
    <!-- The half of the agent signal a rim cannot carry. It sits after the
         image so it is announced as a qualifier on the name rather than in
         place of it, and it is dropped entirely for an empty `agentLabel`: a
         wrapper that has already worked the qualifier into its own name would
         otherwise leave a second copy of it in the tree. -->
    <span v-if="force === 'ai' && agentLabel" class="sr-only">{{ agentLabel }}</span>
  </AvatarRoot>
</template>
