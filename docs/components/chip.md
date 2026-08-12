# Chip

An interactive token: a filter that switches on, an entity that can be
dismissed, a recipient sitting in a picker. A chip is small and pill-shaped and
carries a word or two, and every one of them is something a reader can act on.

**Badge is a static status label a reader only looks at; Chip is a control a
reader acts on.** That is the whole boundary, and it is worth stating plainly
because the two look almost identical on the page. A Badge that gained a click
handler would be a Chip. A Chip that can neither be toggled nor dismissed is a
Badge wearing a button's clothes — it takes a Tab stop and announces itself as
pressable while doing nothing, which is worse than the plain label it should
have been.

Two further neighbours. Reach for [Button](./button.md) when the token _is_ the
action rather than a standing state — "Export" is a button, "Exported" is a
chip. Reach for [SegmentedControl](./segmented-control.md) when exactly one of a
small set must be chosen and one always is; a row of chips is many-of-many, and
none-of-them is a valid answer.

<script setup lang="ts">
import { ref } from "vue";
import { Chip } from "@ecoma-io/loom";
import ChipDemo from "../../src/primitives/Chip/ChipDemo.vue";
import chipDemoSource from "../../src/primitives/Chip/ChipDemo.vue?raw";

const overdue = ref(true);
const unassigned = ref(false);
const facet = ref(true);
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { Chip } from "@ecoma-io/loom";

const overdue = ref(false);
</script>

<template>
  <Chip v-model:selected="overdue">Overdue</Chip>
</template>
```

## Selection

Binding `selected` is what makes a chip a toggle. The label becomes a
`<button>` carrying `aria-pressed`, a press emits `update:selected` with the
flipped value, and the chip waits for the host to write it back — it does not
switch itself on. A filter chip stands for a query, and one that lit up locally
would keep claiming a result set nobody fetched.

Leave `selected` unset and the chip is not a toggle at all: the label renders as
inert text and only a dismiss control, if you asked for one, is reachable. That
is the shape a recipient or an attachment wants, and it is why `selected` has no
`false` default — a default would give every dismissable chip a second Tab stop
that does nothing.

Selection never rides on colour alone. The fill deepens, a border in the same
hue appears, a check glyph grows in beside the label, and `aria-pressed` says so
out loud.

<Demo title="Selection">
  <div class="flex flex-wrap gap-2">
    <Chip v-model:selected="overdue" variant="destructive">Overdue</Chip>
    <Chip v-model:selected="unassigned">Unassigned</Chip>
  </div>
</Demo>

## Dismissal

`removable` renders a dismiss control and emits `remove` when it is activated.
Taking the chip out of the list is the host's job — the chip reports the intent
and nothing else, so an undo, a confirmation or an optimistic removal are all
still yours to choose.

The dismiss control is a **sibling** of the toggle, inside a non-interactive
container. It is never nested inside it. Nested buttons are invalid HTML: the
parser reparents them, and assistive technology then disagrees about which
control focus is on and what activating it means. This is the detail that
decides the component's markup, which is why the coloured pill is a `<span>` and
everything pressable hangs off it.

`removeLabel` is that control's accessible name and defaults to `"Remove"`.
Qualify it whenever more than one chip is on screen — "Remove Ana Duarte" is
what a screen-reader user needs when a list holds eight identical buttons.

<Demo title="Dismissal">
  <div class="flex flex-wrap gap-2">
    <Chip variant="outline" removable remove-label="Remove Ana Duarte">Ana Duarte</Chip>
    <Chip v-model:selected="facet" variant="primary" removable remove-label="Remove the region facet">Region: EU</Chip>
  </div>
</Demo>

## Variants

The eight names are Badge's, deliberately, and they mean the same thing here:
`neutral`, `outline`, `primary`, `success`, `warning`, `info`, `destructive` and
`ai`. A chip and a badge sitting in the same row are one object in two moods, so
`success` has to be the same green in both — a second vocabulary for one palette
is how they drift apart.

Selecting a chip deepens the colour it already has rather than replacing it: a
reader picked the destructive chip _because_ it is the destructive one. The two
hueless variants are the exception — `neutral` and `outline` take the warp wash
when selected, the same fill a chosen row in a [Select](./select.md) wears, so a
chosen filter reads as a human decision.

`ai` wears the agent weft, and it is reserved for chips that filter or stand for
agent-produced work. It is not a decorative accent.

## Size

`sm` and `md` come off the shared control scale, the same two heights a text
input takes, so a row of chips above a field lines up with it. There is no
`lg`: a chip is a token, and one big enough to need the tallest step is a
Button.

## Keyboard and screen readers

A toggleable chip is a native `<button>` with `aria-pressed`, so Space and Enter
both activate it and a screen reader announces the label followed by its pressed
state. A removable chip's dismiss control is a second native button, named by
`removeLabel`.

A chip that both toggles and dismisses is therefore **two Tab stops**, not one.
That is deliberate: they are two different actions on one object rather than N
instances of one control, and a reader who has tabbed to the chip must be able
to reach "remove" without guessing at an arrow key. Roving focus belongs to a
group of like controls — a segmented control, a radio group — not to a pair of
unlike ones.

A disabled chip disables both of its controls, so neither takes focus and
neither responds to a press.

It is drawn in a **colour and a weight** rather than behind an opacity: the pill
drains to the neutral well, the label moves to `--color-muted-foreground` —
4.67:1 against that fill — and the hairline the coloured variants hide comes out
at `--color-border`, the same slackened rim every other unavailable control in
the library takes. Fading the pill instead would fade the label with it, and a
half-alpha label measures 2.78:1 against its own chip, which is a WCAG 1.4.3
failure on the token's only name. A chip that is switched on keeps its selected
wash while disabled: being on is information, and the muted label clears the bar
over that fill too.

A chip has no read-only state. It is a control a reader acts on, and a token
they may only look at is a [Badge](./badge) — so `disabled` is the whole of the
unavailable story here, and the lifted fill that marks a value on show never
appears on a chip.

## Motion

The press rides `--ease-spring` at `--duration-fast`, exactly as Button's does:
a chip is pressed the same way everything else in Loom is pressed, and the
spring is what makes it feel released rather than merely stopped. Colour changes
stay on `--ease-out` — the "springy transform, steady colour" split.

The check glyph collapses its own width instead of unmounting, so the pill grows
into it rather than snapping to a new size. Every one of those is a CSS
transition, so the global `prefers-reduced-motion` rule flattens all of them
without the component needing a path of its own.

<Demo title="Every state" :source="chipDemoSource">
  <ChipDemo />
</Demo>

## API

<!-- @api Chip -->
