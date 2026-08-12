<script lang="ts">
import type { Component } from "vue";

/**
 * One action in the fan.
 *
 * `label` is required and it is not a tooltip: it is rendered as real text
 * beside the glyph. A column of unlabelled circles is the failure mode of this
 * pattern — it reads only to whoever already knows the icons — and a `title`
 * attribute does not fix it, because it is not an accessible name and never
 * appears for a touch or keyboard user at all.
 */
export interface SpeedDialAction {
  /** The visible text on the action, and its accessible name. Required. */
  label: string;
  /** A glyph shown before the label. Decorative — the label carries the meaning. */
  icon?: Component;
  /** Visible but inert: announced as disabled, and choosing it emits nothing. */
  disabled?: boolean;
}

/** Which side of the trigger the fan opens onto. */
export type SpeedDialDirection = "up" | "down" | "left" | "right";

/**
 * The three things a direction decides — which side the popper puts the fan
 * on, which axis it stacks along, and which axis the arrow keys walk — are one
 * decision, so they are one table rather than a `cva` map plus two lookups.
 * Split across three structures they drift, and a fan laid out on one axis and
 * navigated on another is exactly the defect that is invisible until someone
 * reaches for the keyboard.
 *
 * `flex-col` for `up` and not `flex-col-reverse`: reversing the visual order
 * would put `actions[0]` nearest the trigger, which is the convention, at the
 * price of making Arrow Down move the highlight *up* the screen and making a
 * screen reader read the fan bottom-to-top. So the rule is one line instead —
 * the actions always render in array order along the fan's own reading
 * direction — and the arrow keys, the reading order and the eye all agree.
 */
const FANS = {
  up: { side: "top", stack: "flex-col", axis: "vertical" },
  down: { side: "bottom", stack: "flex-col", axis: "vertical" },
  left: { side: "left", stack: "flex-row", axis: "horizontal" },
  right: { side: "right", stack: "flex-row", axis: "horizontal" },
} satisfies Record<
  SpeedDialDirection,
  { side: "top" | "bottom" | "left" | "right"; stack: string; axis: "vertical" | "horizontal" }
>;

/**
 * Button's press language, mirrored rather than imported. A FAB is circular,
 * elevated and sized off its own scale, so `Button`'s height variants would
 * fight it — but the *feel* of a press is not per-component, so the transform
 * spring, the 0.97 press and the focus treatment are the same strings Button
 * carries.
 */
const PRESS = [
  "[transition:transform_var(--duration-fast)_var(--ease-spring),background-color_var(--duration-fast)_var(--ease-out),box-shadow_var(--duration-fast)_var(--ease-out)]",
  "active:scale-press",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo",
].join(" ");

/**
 * Reka's menu is a *vertical* roving-focus group: `MenuContentImpl` hard-codes
 * `arrowKeyOptions: "vertical"`, so Arrow Left and Arrow Right do nothing in
 * it. In a `left` or `right` fan that leaves the keys that move the highlight
 * running across the axis the reader can see.
 *
 * Re-issuing the press as the key Reka already listens for keeps one
 * implementation of the navigation — the typeahead, the highlight bookkeeping
 * and the skipping of disabled items all still come from Reka — instead of a
 * second, hand-rolled one running beside it and disagreeing with it.
 */
const MIRRORED_ARROWS: Record<string, string | undefined> = {
  ArrowRight: "ArrowDown",
  ArrowLeft: "ArrowUp",
};
</script>

<script setup lang="ts">
import { computed } from "vue";
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from "reka-ui";
import { Plus, X } from "@lucide/vue";
import { cn } from "../../lib/cn";
import { listStaggerDelay } from "../../lib/motion";
import { optional } from "../../lib/props";
import { useSplitAttrs } from "../../lib/attrs";

/**
 * SpeedDial — one prominent circular button that expands into a short fan of
 * related actions. The floating-action-button pattern: the single most likely
 * thing to do on a screen, with its three or four near neighbours a press
 * away.
 *
 * Built on Reka UI's DropdownMenu parts, and that is the load-bearing decision
 * here. Strip the circle and the fan away and what is left is a menu button:
 * `aria-haspopup="menu"`, `aria-expanded` tracking the state, one Tab stop with
 * roving focus across the actions, typeahead, Esc closing and returning focus
 * to the trigger. Reka supplies every one of those, tested, and `DropdownMenu`
 * in this same directory already proves the wiring. Hand-rolling it would mean
 * re-solving focus management — the part of this pattern that is actually hard
 * and the part that silently rots — in order to change nothing a reader could
 * name. What is different about a SpeedDial is its *shape*: a circular trigger,
 * a fan of labelled pills instead of a panel of rows, and a direction. That is
 * layout, and layout is all this component adds.
 *
 * It is deliberately not modal, unlike `DropdownMenu`. Reka's modal path locks
 * the body and compensates for the vanished scrollbar with padding — which
 * widens the viewport and slides a viewport-pinned trigger sideways the moment
 * it opens. A control whose whole job is to sit in a corner cannot jump out of
 * it on press.
 *
 * **Positioning is the caller's.** This renders as an ordinary inline-level
 * element and pins itself to nothing; a `class` of `fixed bottom-6 right-6`
 * lands on the trigger. A library that nailed itself to a viewport corner could
 * never be placed in a panel.
 *
 * Reach for `DropdownMenu` when the trigger belongs in a toolbar or a row and
 * the commands are a list rather than a fan, and for `Button` when there is one
 * action and no menu at all.
 */
const props = withDefaults(
  defineProps<{
    /** The actions, in the order they read along the fan. Three or four; this is a shortcut, not a menu. */
    actions: SpeedDialAction[];
    /** The trigger's accessible name, e.g. "Create". Required — a lone glyph names nothing. */
    label: string;
    /** Drive the fan from the host with `v-model:open`; omit it and the component owns its own state. */
    open?: boolean | undefined;
    /** Which side of the trigger the fan opens onto. */
    direction?: SpeedDialDirection;
  }>(),
  // `open: undefined` is load-bearing rather than a redundant default — it is
  // what keeps the uncontrolled third state reachable past Vue's absent-Boolean
  // casting. `optional()` in the template is the other half; its docblock
  // carries the reasoning for both.
  { open: undefined, direction: "up" },
);

const emit = defineEmits<{
  /** The chosen action, and its index in `actions` — the index is the stable identity, since a label is display text and gets translated. */
  select: [action: SpeedDialAction, index: number];
  /** The fan opened or closed, for `v-model:open`. */
  "update:open": [value: boolean];
}>();

const fan = computed(() => FANS[props.direction]);

// `DropdownMenuRoot` renders no DOM node at all, so fallthrough attributes
// would be dropped on the floor rather than landing anywhere. They go to the
// trigger, which is both the interactive element they describe and the element
// a caller positions.
//
// `class` is pulled out of that spread and merged through `cn()` instead:
// spreading it alongside the trigger's own `:class` only concatenates the two
// lists — Vue's merge is generic, not Tailwind-aware — so a caller's `h-12`
// would lose to the trigger's own `h-14` depending on which utility Tailwind
// happened to emit last.
defineOptions({ inheritAttrs: false });
const { attrs, rest: triggerAttrs } = useSplitAttrs();

/**
 * A disabled action selects nothing. Reka already blocks the pointer path on
 * the disabled row; this is the second half, for a keyboard press that reaches
 * it anyway.
 */
function choose(action: SpeedDialAction, index: number): void {
  if (action.disabled) return;
  emit("select", action, index);
}

/** See `MIRRORED_ARROWS`. Vertical fans are left alone — Reka already owns them. */
function mirrorArrows(event: KeyboardEvent): void {
  if (fan.value.axis !== "horizontal") return;
  const mapped = MIRRORED_ARROWS[event.key];
  if (mapped === undefined) return;
  event.preventDefault();
  (event.currentTarget as HTMLElement | null)?.dispatchEvent(
    new KeyboardEvent("keydown", { key: mapped, bubbles: true, cancelable: true }),
  );
}
</script>

<template>
  <DropdownMenuRoot
    v-bind="optional({ open })"
    :modal="false"
    @update:open="$emit('update:open', $event)"
  >
    <DropdownMenuTrigger
      v-bind="triggerAttrs"
      type="button"
      :aria-label="label"
      :class="
        cn(
          // `shadow-lg`, which `theme.css` reserves for true overlays and which
          // would be wrong on an ordinary control: this one genuinely floats
          // over the page rather than sitting in it, so the largest elevation is
          // depth reported honestly rather than a glow on something flush.
          'group inline-flex h-14 w-14 shrink-0 select-none items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg',
          'hover:bg-primary/90',
          PRESS,
          attrs.class as string,
        )
      "
    >
      <!-- Both glyphs are hidden from assistive technology: the button's name
           is `label`, and a second reading of "plus" would only compete with
           it. The open glyph cross-fades rather than the trigger simply
           rotating 45° into a cross, because the slot lets a caller supply a
           domain glyph — a pencil rotated 45° is a tilted pencil, not a
           dismissal. -->
      <span aria-hidden="true" class="inline-grid place-items-center">
        <span
          class="[grid-area:1/1] transition-[opacity,transform] duration-fast ease-out group-data-[state=open]:rotate-45 group-data-[state=open]:opacity-0"
        >
          <!-- @slot The trigger's resting glyph. Defaults to a plus. -->
          <slot><Plus class="h-6 w-6" /></slot>
        </span>
        <span
          class="[grid-area:1/1] -rotate-45 opacity-0 transition-[opacity,transform] duration-fast ease-out group-data-[state=open]:rotate-0 group-data-[state=open]:opacity-100"
        >
          <X class="h-6 w-6" />
        </span>
      </span>
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <!-- `as-child` for one reason: `aria-orientation`. Reka hard-codes it to
           "vertical" as a *prop*, which a fallthrough attribute cannot beat —
           and announcing a `left` or `right` fan as a vertical menu tells a
           screen-reader user the opposite of what the arrow keys now do. The
           slot's own props win the merge, so the element below is where the
           correction can land. -->
      <DropdownMenuContent
        as-child
        :side="fan.side"
        :side-offset="12"
        align="center"
        @keydown="mirrorArrows"
      >
        <div
          :aria-orientation="fan.axis"
          :class="
            cn(
              // No popover surface of its own. The fan is a set of floating
              // pills over the page, not a panel holding them, so the elevation
              // belongs to each action and there is no box drawn around them.
              'z-50 flex items-center gap-3 outline-none',
              fan.stack,
            )
          "
        >
          <DropdownMenuItem
            v-for="(action, index) in actions"
            :key="index"
            :disabled="action.disabled ?? false"
            :class="
              cn(
                'inline-flex h-9 shrink-0 cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-full border border-border bg-popover px-3 text-sm text-popover-foreground shadow-md outline-none',
                PRESS,
                'data-[highlighted]:bg-subtle',
                'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                // The actions fan out one after another, which is what makes
                // this read as a fan opening rather than a block appearing. The
                // delay is the shared stagger vocabulary, capped there so a
                // fifth action does not trail in noticeably later than the
                // second.
                //
                // Entry only, and it stays that way for free: the content
                // declares no animation of its own, so on close Reka's Presence
                // sees `animation-name: none`, unmounts the whole fan in one
                // frame, and there is no interval left for the stagger to play
                // backwards in. Collapsing is instant by construction, not by a
                // second set of reversed delays.
                'animate-scale-in',
              )
            "
            :style="{ animationDelay: listStaggerDelay(index) }"
            @select="choose(action, index)"
          >
            <component :is="action.icon" v-if="action.icon" class="h-4 w-4" aria-hidden="true" />
            <span>{{ action.label }}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
