# NumberField

A constrained number input you can also scrub: drag horizontally anywhere on
the field and the value runs with the pointer. It is the control a row of
numeric properties is built from — coordinates, sizes, angles, durations —
where reaching for the keyboard for every small adjustment is the slow path.

The decision that shapes it is the split between reporting a value and
committing one. `update:modelValue` fires on every tick of a gesture so a host
can paint a live preview. `commit` fires once, at the gesture's boundary. One
long drag is therefore one entry in an undo stack rather than one per pixel,
and a gesture that ends where it started leaves no entry at all.

<script setup lang="ts">
import { NumberField } from "@ecoma-io/loom";
import NumberFieldDemo from "../demos/NumberFieldDemo.vue";
import numberFieldDemoSource from "../demos/NumberFieldDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { NumberField } from "@ecoma-io/loom";

const rotation = ref(45);
</script>

<template>
  <NumberField
    v-model="rotation"
    :min="-180"
    :max="180"
    unit="deg"
    aria-label="Rotation"
    @commit="checkpoint"
  />
</template>
```

## Transient and committed

Bind `v-model` for the live value and listen to `commit` for the checkpoint.
The two are not redundant: the first is what a preview reads, the second is
what a history writes.

`commit` fires on drag release, on Enter, and when focus leaves the field. It
does not fire when the value is unchanged, so tabbing through a field without
touching it is silent, and Enter followed by the blur it usually precedes is
still one commit rather than two.

A drag that is cancelled — Escape, or a browser-issued `pointercancel` —
commits nothing at all. It emits one last transient value, the one the gesture
started from, so the preview snaps back with the field.

## Bounds and step

`min` and `max` clamp every path into the value: typing, the arrow keys, the
stepper and the scrub. `step` sets the granularity of one tick, and Shift
multiplies it by ten.

Where the two constraints disagree, the bound wins. With `max` at 10 and `step`
at 3, the value stops at 10 rather than stepping past it to 12 — so a bound is
reachable even when the step does not divide the range evenly.

<Demo title="Bounds">
  <NumberField :model-value="45" :min="-180" :max="180" unit="deg" aria-label="Rotation" />
</Demo>

## Unit

`unit` is a suffix, not part of the value. It is hidden from assistive
technology, because the spinbutton already carries the number, and it clears on
hover to make room for the stepper.

<Demo title="Unit">
  <NumberField :model-value="120" unit="px" aria-label="Width" />
  <NumberField :model-value="80" aria-label="Opacity" />
</Demo>

## Keyboard

Arrow up and down step by `step`; hold Shift for ten of them. Page up and page
down step by ten, Home and End jump to the bounds, and Enter applies what has
been typed. Holding an arrow key is one gesture: the repeats tick the value and
the key release commits the total once.

Scrubbing is an addition to the keyboard, never a replacement for it. Every
value the pointer can reach, the keyboard can reach too.

<Demo title="Every state" :source="numberFieldDemoSource">
  <NumberFieldDemo />
</Demo>

## Invalid

`invalid` paints the destructive border and ring on the group and sets
`aria-invalid` on the spinbutton. Reach for it where a value breaks a rule that
`min` and `max` cannot express — two fields that contradict each other, for
instance. A value outside the bounds is not that case: it is clamped rather
than flagged.

<Demo title="Invalid">
  <NumberField :model-value="0" unit="s" invalid aria-label="Duration" />
</Demo>

## Read-only and disabled

`readonly` and `disabled` are different states, not two dials on one, and a
number is the case that makes the difference obvious. A rate, a computed total
or a coordinate locked to a parent is a value on show: it stays a Tab stop,
stays in the form's posted data, keeps its number at full strength, and takes a
fill lifted one step off an editable field's. A disabled field is unavailable —
not reachable, not posted, and drained a step further still, with the number
muted and the border slackened to match.

Three appearances, and each pair of them differs on three channels: the fill,
the text colour and the border weight. That redundancy is the point. A
distinction carried by hue alone is the one a reader with a colour deficiency
never receives, and read-only and disabled used to be exactly that — one fill,
two text colours.

All of it is colour and weight rather than opacity, and for a measured reason.
`opacity-50` on the box fades the value inside it: 14.09:1 becomes 2.99:1 at
half alpha, and a unit suffix beside it falls to 2.02:1. Drained, the number
measures 4.68:1 against its own fill and the field still plainly reads as
unavailable. The two stepper chevrons keep their fade — a glyph can be dimmed
without costing anyone a value they need to read.

Read-only closes every path into the value rather than only the obvious one:
typing, the arrow keys, Shift+Arrow, the scrub gesture, and the stepper, which
is not rendered at all. A control offering a gesture that quietly does nothing
is worse than one that offers none, so the scrub cursor goes with it.

<Demo title="Available, read-only and disabled">
  <div class="flex w-full flex-col gap-3" style="max-width: 20rem">
    <NumberField :model-value="16" unit="px" aria-label="Radius (available)" />
    <NumberField :model-value="24" readonly aria-label="Frame rate (read-only)" />
    <NumberField :model-value="50" unit="px" disabled aria-label="Width (disabled)" />
  </div>
</Demo>

The same treatment answers a [Fieldset](./fieldset) that disables its group, and
here it takes a little help. `<fieldset disabled>` makes the `<input>` and both
stepper buttons inert on its own, which closes the keyboard and the two clicks —
but the scrub is a `pointerdown` on a `<div>`, and a `<div>` is not a form
control. So the field looked available, refused every key, and still ran its
number under a drag. It now reads the enclosing fieldset's own `disabled`
attribute and resolves it into the same state its own prop feeds. That is a
_read_ of the attribute rather than a second copy of it, which is why Fieldset
still publishes nothing through the [Field](./field) context — see
[Fieldset](./fieldset#disabling-the-group).

## Inside a Field

Wrapped in a [Field](./field), NumberField wires itself: the row's id, the id of
its hint or error line, `required`, `invalid`, `disabled`, `readonly` and the
name the value is posted under all arrive from the row, so nothing is written at
the call site.

```vue
<Field label="Rotation" name="rotation" hint="Degrees, -180 to 180" required>
  <NumberField v-model="rotation" :min="-180" :max="180" unit="deg" @commit="checkpoint" />
</Field>
```

Every one of those props still wins when you set it, in both directions — which
is why `invalid`, `disabled` and `readonly` are `boolean | undefined` and
default to `undefined` rather than `false`. `<NumberField />` says nothing and
inherits the row; `<NumberField :readonly="false" />` says this one field is
editable even though its row is not, and it is obeyed.

**`name` posts the number, not the text on screen.** The spinbutton shows a
formatted value — `1,234` for 1234 — so the name goes to a hidden control
alongside it rather than onto the input itself. A form reading `width` gets
`1234`.

## Labels

Three of the things this field publishes to a screen reader are strings, and
Reka UI writes all three in English of its own accord: the two stepper buttons,
which it names `Increase` and `Decrease` with no prop to reach them by, and the
`aria-roledescription` on the spinbutton, which is the phrase announced _in
place of_ "spin button". Loom replaces each with a default of its own and lets
you replace those in turn, so a localised form does not end up with a control
naming itself in a language nobody chose.

```ts
interface NumberFieldLabels {
  increment: string; // the stepper's up button
  decrement: string; // the stepper's down button
  roleDescription: string; // announced in place of "spin button"
}
```

`roleDescription` is the one worth correcting per instance: a field holding a
rotation or a price is more use to a reader named as that than as a number
field.

```vue
<NumberField v-model="angle" unit="deg" :labels="{ roleDescription: 'Rotation, in degrees' }" />
```

Every key is optional — supply one and the other two stay as your application's
vocabulary, or Loom's English, left them. Annotate a bag of your own with
`LabelOverrides<NumberFieldLabels>` rather than with `NumberFieldLabels` itself:
the override type is partial, so a key added in a later release is one your bag
may ignore, where the bag interface is total and would stop compiling.

For a whole application set these once with `provideLoomLabels` rather than at
every call site; the `labels` prop is for the per-instance correction. See
[Localisation](/foundations/localisation).

## API

<!-- @api NumberField -->
