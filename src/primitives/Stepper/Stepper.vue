<script lang="ts">
/** One step in the spine. Its `title` is also the accessible name of that step's trigger. */
export interface StepperStep {
  /** The step's label, shown next to its indicator and read out as the trigger's name. */
  title: string;
  /** A line under the title saying what the step asks for. Omit it for a bare spine. */
  description?: string;
  /** Present but unreachable: the indicator greys and the title mutes, and neither pointer nor keyboard can select it. */
  disabled?: boolean;
}

/** The axis the spine runs along, which also decides which arrow keys move between steps. */
export type StepperOrientation = "horizontal" | "vertical";
</script>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperRoot,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "reka-ui";
import { Check } from "@lucide/vue";
import { cn } from "../../lib/cn";
import { optional } from "../../lib/props";
import { useSplitAttrs } from "../../lib/attrs";

/**
 * Stepper — the progress spine of a multi-step flow: a checkout, an
 * onboarding sequence, a wizard. It says how many steps there are, which one
 * a reader is on, and which are behind them; the step's own content is the
 * host's, rendered next to or under the spine.
 *
 * It is **not** a number stepper. A numeric value with increment and
 * decrement buttons is NumberField. The word is genuinely ambiguous and both
 * controls answer to it, so the two are worth naming together: this one is
 * about position in a flow, that one is about a quantity.
 *
 * Progress shows one bar for one task whose extent is a percentage — reach
 * for it when the stages have no names worth showing. Tabs switches between
 * panels that have no order at all; a stepper's steps are ordered by
 * definition, which is why it carries a connector and Tabs carries none.
 *
 * Built on Reka UI's Stepper, which supplies the item state machine
 * (completed / active / inactive), the `linear` reachability rule, arrow-key
 * navigation along the orientation's axis, and a polite live region on the
 * root announcing "Step N of M" as the flow advances.
 *
 * Two things are added on top of it.
 *
 * The first is the roving tab stop. Reka gives *every* focusable trigger
 * `tabindex="0"`, so a five-step spine would be five Tab stops — the defect
 * the accessibility bar names outright. The `tabindex` bound below overrides
 * Reka's, leaving exactly one trigger tabbable at a time (the one last
 * focused, else the current step); Reka's own arrow-key handler still moves
 * real focus between them, which `tabindex="-1"` does not prevent.
 *
 * The second is where `aria-current` sits. Reka puts `aria-current="true"` on
 * the item wrapper, a `div` with no role that a reader never lands on, so the
 * marking is not conveyed at the moment it matters. It is moved here onto the
 * trigger — the element that takes focus — and given the value the WAI-ARIA
 * pattern asks for on a step in a process.
 */
const props = withDefaults(
  defineProps<{
    /** The current step, 1-based. Omit it and Stepper owns its own position. */
    modelValue?: number;
    /** The ordered steps. Their index decides their number; there is no id to keep. */
    steps: StepperStep[];
    /** The axis the spine runs along; vertical moves the titles beside the indicators. */
    orientation?: StepperOrientation;
    /** Locks the flow to its furthest point: a reader may go back, or one step on, never jump ahead. */
    linear?: boolean;
  }>(),
  { orientation: "horizontal", linear: false },
);

const emit = defineEmits<{
  /** The step chosen, 1-based. Fires for a trigger click and for Enter/Space on one. */
  "update:modelValue": [value: number];
}>();

// The root renders a real element and it is the one every fallthrough
// attribute belongs on: it is the `role="group"` the whole spine lives in, so
// an `aria-label` naming the flow lands there and overrides the literal
// "progress" Reka hardcodes. `class` is pulled out of that spread and merged
// through `cn()` instead, so a caller's layout utility resolves against the
// root's own rather than merely being concatenated after it.
defineOptions({ inheritAttrs: false });
const { attrs, rest: rootAttrs } = useSplitAttrs();

/**
 * The two layouts, side by side rather than as template branches that drift
 * apart. `satisfies` is what stops an orientation being added to the type and
 * forgotten here.
 *
 * Horizontal hangs the connector off the item box (`relative`) rather than
 * off the rail: `left-1/2 w-full` then spans exactly the distance between two
 * indicator centres, since the items are equal-width flex children. It is
 * drawn behind them — the trigger is `relative`, so it and every later item's
 * trigger paint over a line that runs under the circles.
 */
const LAYOUTS = {
  horizontal: {
    root: "flex w-full items-start",
    item: "relative flex flex-1 flex-col items-center gap-2 text-center",
    rail: "",
    separator: "absolute left-1/2 top-4 h-0.5 w-full -translate-y-1/2",
    fill: "origin-left scale-x-0",
    filled: "scale-x-100",
    text: "flex flex-col gap-0.5",
  },
  vertical: {
    root: "flex flex-col",
    item: "flex gap-3",
    rail: "flex flex-col items-center self-stretch",
    // `order-1` rather than a second template branch: the connector has to be
    // declared before the trigger so the trigger paints over it, and has to sit
    // below the trigger once the rail is a column.
    separator: "order-1 my-1 w-0.5 flex-1",
    fill: "origin-top scale-y-0",
    filled: "scale-y-100",
    text: "flex flex-col gap-0.5",
  },
} satisfies Record<StepperOrientation, Record<string, string>>;

const layout = computed(() => LAYOUTS[props.orientation]);

/** The step that last held focus, and so owns the spine's single tab stop. */
const focused = ref<number | null>(null);

/**
 * Reka's own focusability rule, mirrored: a linear stepper refuses focus to
 * anything past one step ahead of where the reader is. It has to be repeated
 * rather than read off the DOM, because the tab stop is decided while the
 * `tabindex` attributes are still being rendered — and a tab stop parked on a
 * step Reka will not focus leaves the whole spine unreachable by Tab.
 */
function focusable(step: number, current: number): boolean {
  if (props.steps[step - 1]?.disabled) return false;
  return props.linear ? step <= current + 1 : true;
}

/**
 * The one step whose trigger is tabbable. Everything else is `tabindex="-1"`.
 *
 * Reka types the value it hands its own slot as possibly absent even though
 * `StepperRoot` defaults it to 1, so the fallback here is that declaration
 * being honoured rather than a state this can reach.
 */
function tabStop(current: number | undefined): number {
  const at = current ?? 1;
  if (focused.value !== null && focusable(focused.value, at)) return focused.value;
  if (focusable(at, at)) return at;
  return props.steps.findIndex((_, index) => focusable(index + 1, at)) + 1;
}

/**
 * Reka points every trigger's `aria-describedby` at a description id whether
 * or not that description was rendered, and a reference resolving to nothing
 * is worse than no reference: it claims a description exists. Binding the key
 * as `undefined` is what takes it back off, since an attribute set to
 * `undefined` is removed rather than merged.
 */
function describedBy(step: StepperStep): Record<string, undefined> {
  return step.description === undefined ? { "aria-describedby": undefined } : {};
}

/** Reka reports its position as possibly absent; this component's model is a step number or nothing at all. */
function onUpdate(value: number | undefined): void {
  if (value !== undefined) emit("update:modelValue", value);
}
</script>

<template>
  <StepperRoot
    v-slot="{ modelValue: current }"
    v-bind="{ ...rootAttrs, ...optional({ modelValue }) }"
    :orientation="orientation"
    :linear="linear"
    :class="cn(layout.root, attrs.class as string)"
    @update:model-value="onUpdate"
  >
    <StepperItem
      v-for="(step, index) in steps"
      :key="index"
      v-slot="{ state }"
      :step="index + 1"
      :disabled="step.disabled ?? false"
      :aria-current="undefined"
      :class="layout.item"
    >
      <div :class="layout.rail">
        <!-- Declared before the trigger so the trigger paints over it: the
             connector runs from this indicator's centre to the next one's. -->
        <StepperSeparator
          v-if="index < steps.length - 1"
          :class="cn('overflow-hidden rounded-full bg-border', layout.separator)"
        >
          <span
            :class="
              cn(
                'block h-full w-full bg-primary transition-transform ease-out',
                layout.fill,
                state === 'completed' && layout.filled,
              )
            "
          />
        </StepperSeparator>

        <StepperTrigger
          v-bind="describedBy(step)"
          :tabindex="tabStop(current) === index + 1 ? 0 : -1"
          :aria-current="state === 'active' ? 'step' : undefined"
          :class="
            cn(
              'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
              'transition-colors ease-out',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo',
              // Unavailable is a *colour*, and the whole distinction lives on
              // the indicator. It used to be `opacity-50` on the item, which
              // took the title and the description down with it:
              // `--color-muted-foreground` is 5.76:1 on white and 2.11:1 once
              // composited at half alpha, so the one thing that had to stay
              // readable was the one thing the fade broke. A grey-filled disc
              // against the inactive step's white one says the same thing and
              // costs nothing, and every string below is a measured pair.
              //
              // Keyed off the prop and NOT off `data-[disabled]:`, because in
              // a linear flow Reka marks every step past the next one disabled
              // — painting all of them unavailable reads as broken rather than
              // as later, and a step that is merely ahead already says so by
              // being inactive. The branch also keeps the two apart in the
              // cascade: the inactive rules carry an attribute selector, so a
              // plain `bg-muted` alongside them would lose.
              step.disabled
                ? 'border-border-strong bg-muted text-muted-foreground'
                : [
                    'data-[state=inactive]:border-input data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground',
                    'data-[state=inactive]:enabled:hover:bg-subtle',
                  ],
              'data-[state=active]:border-primary data-[state=active]:bg-primary-muted data-[state=active]:text-primary',
              'data-[state=completed]:border-primary data-[state=completed]:bg-primary data-[state=completed]:text-primary-foreground',
              'disabled:cursor-not-allowed',
            )
          "
          @focus="focused = index + 1"
        >
          <StepperIndicator class="flex items-center justify-center">
            <!-- Three states, none of them colour alone: the check is a shape
                 change, the number is text, and the current step carries
                 `aria-current` above. -->
            <Check v-if="state === 'completed'" class="h-4 w-4 animate-scale-in" />
            <template v-else>{{ index + 1 }}</template>
          </StepperIndicator>
        </StepperTrigger>
      </div>

      <div
        :class="cn(layout.text, orientation === 'vertical' && index < steps.length - 1 && 'pb-6')"
      >
        <!-- `as="span"`, not Reka's default `h4`: a step label is not a
             section heading, and a component cannot know what heading level
             the page it lands in has room for. -->
        <!-- The title mutes rather than fades: `--color-muted-foreground` is a
             measured 5.76:1 on the card it sits on, two steps back from
             `--color-foreground` and still comfortably readable. The
             description below is already that colour and stays there — an
             unreachable step's description is the one line a reader most needs
             in order to find out why it is unreachable. -->
        <StepperTitle
          as="span"
          :class="
            cn('text-sm font-medium', step.disabled ? 'text-muted-foreground' : 'text-foreground')
          "
        >
          {{ step.title }}
          <!-- ARIA has a value for "you are here" and none for "done", and the
               check glyph is invisible to a screen reader. The title is what
               `aria-labelledby` names the trigger with, so the word joins the
               trigger's accessible name from inside it. -->
          <span v-if="state === 'completed'" class="sr-only">(completed)</span>
        </StepperTitle>
        <StepperDescription v-if="step.description" class="text-xs text-muted-foreground">
          {{ step.description }}
        </StepperDescription>
      </div>
    </StepperItem>
  </StepperRoot>
</template>
