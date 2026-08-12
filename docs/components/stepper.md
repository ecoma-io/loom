# Stepper

The progress spine of a multi-step flow — a checkout, an onboarding sequence, a
wizard. It says how many steps there are, which one a reader is on and which are
behind them; the step's own content stays where it was, next to or under the
spine.

It is **not** a number stepper. A numeric value with an increment and a
decrement button is `NumberField`, and the word "stepper" is used for both often
enough that arriving here by mistake is the normal way to arrive. This one is
about a position in a flow; that one is about a quantity.

The other two neighbours divide along the same line. `Progress` is one bar for
one task whose extent is a percentage — reach for it when the stages have no
names worth showing. `Tabs` switches between panels that have no order at all,
which is why it draws no connector: a stepper's steps are ordered by definition,
and the connector between two of them is what says so.

<script setup lang="ts">
import { ref } from "vue";
import { Stepper } from "@ecoma-io/loom";
import StepperDemo from "../../src/primitives/Stepper/StepperDemo.vue";
import stepperDemoSource from "../../src/primitives/Stepper/StepperDemo.vue?raw";

const checkout = [
  { title: "Cart", description: "Two items" },
  { title: "Shipping", description: "Where it goes" },
  { title: "Payment", description: "How it is paid" },
  { title: "Review", description: "One last look" },
];

const onboarding = [
  { title: "Workspace", description: "Name it and pick a region" },
  { title: "Invite the team", description: "Anyone with an address" },
  { title: "Connect an agent", description: "Optional, and reversible" },
];

const publishing = [
  { title: "Draft" },
  { title: "Review" },
  { title: "Approval", description: "Owner permission required", disabled: true },
  { title: "Publish" },
];

const step = ref(2);
const guided = ref(1);
const vertical = ref(2);
const stage = ref(2);
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { Stepper, type StepperStep } from "@ecoma-io/loom";

const steps: StepperStep[] = [
  { title: "Cart", description: "Two items" },
  { title: "Shipping", description: "Where it goes" },
  { title: "Payment", description: "How it is paid" },
];

const step = ref(1);
</script>

<template>
  <Stepper v-model="step" :steps="steps" aria-label="Checkout" />
</template>
```

`modelValue` is 1-based, so `step === 1` is the first step rather than the
second. Leave it unset and the Stepper owns its own position, which is enough
for a spine that only reports where a flow already is.

The spine is a `role="group"`, and the name you give it is the name of the flow
— `aria-label="Checkout"`, not "Stepper". Without one it falls back to the
generic label Reka writes, which tells a reader nothing about which flow they
are in.

## Steps

A step is a `title`, an optional `description`, and an optional `disabled`. The
index decides the number, so there is no id to keep in sync: reordering the
array reorders the flow.

The `title` is doing two jobs at once. It is the visible label, and it is the
accessible name of that step's trigger — the description is attached to the same
trigger with `aria-describedby`, so a screen reader reads "Shipping, where it
goes" as one thing rather than as two unrelated pieces of text.

<Demo title="Steps">
  <div class="w-full">
    <Stepper v-model="step" :steps="checkout" aria-label="Checkout" />
  </div>
</Demo>

## Three states, and none of them colour alone

A step is completed, current, or still ahead, and every one of those is legible
without seeing a colour:

- **completed** carries a check glyph in place of its number, and the word
  "completed" joins the trigger's accessible name — ARIA has a value for "you
  are here" and none for "this is done";
- **current** carries `aria-current="step"` on the trigger itself, which is the
  element focus lands on;
- **ahead** shows its own number.

The colour change rides along with all three and is never the only signal, so a
reader who cannot separate the primary fill from the muted one still knows
exactly where in the flow they are.

## Orientation

`orientation="vertical"` is not a rotated horizontal spine. The connector runs
down the page, and each title block moves to sit beside its indicator rather
than under it, which is what makes a vertical stepper worth having: the
descriptions get the full width of the column instead of a slice of it.

The arrow keys follow the axis. A horizontal spine answers to Left and Right and
ignores Up and Down; a vertical one does the reverse, so a page scrolled with the
down arrow is never hijacked by the stepper it happens to contain.

<Demo title="Vertical">
  <div class="w-full max-w-sm">
    <Stepper v-model="vertical" :steps="onboarding" orientation="vertical" aria-label="Onboarding, vertical" />
  </div>
</Demo>

## Linear flows

`linear` locks the flow to its furthest point: a reader may go back to anything
already visited, or one step on, and nothing beyond that. The locked steps stay
visible and stay numbered — they are simply not selectable, by pointer or by
keyboard.

They are deliberately not greyed. A step that is merely ahead already says so by
being inactive, and marking every step past the next one unavailable makes a
four-step flow look broken on its first screen. The greyed indicator is reserved
for a step that is genuinely `disabled`.

Leave `linear` off — the default — when the Stepper is reporting progress rather
than enforcing it, which is the more common case for a spine sitting above
content the reader can already see.

<Demo title="Linear">
  <div class="w-full max-w-lg">
    <Stepper v-model="guided" :steps="onboarding" linear aria-label="Onboarding, linear" />
  </div>
</Demo>

## Disabled steps

A `disabled` step still renders. It is present but unreachable — its indicator
greys, its title mutes, and it is skipped by the arrow keys and unresponsive to a
click — which is the honest way to show that a stage exists and is currently out
of reach. Dropping it from the array instead renumbers everything after it and
tells a reader nothing.

The state is a **colour**, never an opacity. Fading the whole step is the obvious
way to draw it and it takes the title and the description down with it: the
description's `--color-muted-foreground` measures 5.76:1 against the surface it
sits on and 2.11:1 once composited at half alpha, which is a WCAG 1.4.3 failure
on the one line explaining why the step cannot be reached. Both strings stay at a
measured colour here, and the indicator's grey fill is what carries the state.

<Demo title="A disabled step">
  <div class="w-full max-w-lg">
    <Stepper v-model="stage" :steps="publishing" aria-label="Publishing" />
  </div>
</Demo>

## Keyboard and screen readers

The whole spine is **one** Tab stop, not one per step. `Tab` moves onto it —
landing on the current step, or on whichever step last held focus — and the
arrow keys move between steps from there. `Enter` or `Space` selects the focused
step, so moving along the spine and committing to a step are separate acts: a
reader can look ahead without the flow moving under them.

Reka gives every selectable trigger its own `tabindex="0"`; Loom overrides that,
because a five-step spine costing five Tab presses to walk past is the defect the
roving-tabindex pattern exists to prevent.

The root is a `role="group"` holding a polite live region that reports "Step 2 of
4" as the position changes, so an advance made by a button elsewhere on the page
is announced without moving focus.

## Motion

The connector is the one place motion earns its keep here. It fills along its own
axis at `--duration-normal` on `--ease-out` — the feedback lane, since it is a
direct response to the step advancing — and the indicator's check plays
`animate-scale-in` as it arrives. Nothing loops: a stepper that is not moving is
saying the flow is not moving either. Both collapse under
`prefers-reduced-motion`, through the global rule every Loom transition answers
to.

<Demo title="Every state" :source="stepperDemoSource">
  <StepperDemo />
</Demo>

## API

<!-- @api Stepper -->
