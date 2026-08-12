# Rating

A score on a small, fixed, ordinal scale, drawn as a row of stars. Reach for it
where the scale itself is a vocabulary the reader already has — how good was
this, how confident are you, how would you rate it — and where the answer is
worth showing back as a shape rather than as a figure.

Three neighbours are worth naming. A value on a continuous range whose ends are
the information — a volume, a ratio — is a [Slider](./slider.md). A choice
between named options that happen to be ordered ("poor", "fair", "good") is a
[SegmentedControl](./segmented-control.md) or a [RadioGroup](./radio-group.md),
because those names carry meaning that stars cannot. A number with no meaningful
ceiling is a [NumberField](./number-field.md) — a rating has a maximum by
definition, and it is the maximum that gives a star its meaning.

<script setup lang="ts">
import { Rating } from "@ecoma-io/loom";
import RatingDemo from "../../src/primitives/Rating/RatingDemo.vue";
import ratingDemoSource from "../../src/primitives/Rating/RatingDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { Rating } from "@ecoma-io/loom";

const quality = ref(4);
</script>

<template>
  <Rating v-model="quality" hoverable aria-label="Overall quality" />
</template>
```

## Whole stars and halves

`length` is how many stars the scale has — five by default, and the number a
reader is scored out of. `step` is how finely the scale can be aimed at: whole
stars, or halves.

Halves are a real half, not two glyphs stacked. The left half of a star is its
own target, sitting above the whole-star one, and the fill is a window clipped
over a full star — so the shape stays a star at any size, and changing `size`
moves the window and the glyph together.

Reka UI's rating also offers quarter and tenth steps. Neither is exposed here.
A quarter of a 20px star is a 5px-wide pointer target and a tenth is 2px, and at
that size the difference between 4.3 and 4.4 stars cannot be seen in the
rendering either — so the value could be neither aimed at nor read back. An
option nobody can use correctly is not an option, which is why the surface is
narrower here than the one underneath it.

<Demo title="Whole stars and halves">
  <div class="flex flex-col gap-3">
    <Rating :model-value="3" aria-label="Quality, whole stars" />
    <Rating :model-value="3.5" :step="0.5" aria-label="Quality, half stars" />
    <Rating :model-value="7" :length="10" aria-label="Confidence, out of ten" />
  </div>
</Demo>

## Read-only is not disabled

These are two different controls, and confusing them is the standard defect in
this one.

A product's average score on a card is **`readonly`**. It is a picture of a
number: it renders as a single `role="img"` node carrying the score in its
accessible name, it is not a Tab stop, there is nothing inside it to focus, and
it is **not** dimmed — nothing about it is unavailable, because it was never an
input. It also ignores `step` and paints the exact value it was given, since
`step` governs what a reader can aim at and nobody aims at a picture: an average
of 4.2 shows 4.2.

A rating inside a form the reader may not edit yet is **`disabled`**. It stays a
radio group, it dims, and it refuses both the pointer and the keyboard.

Rendering the first as the second reads as "broken" to a sighted reader and as
"unavailable input" to a screen reader, and neither is true.

<Demo title="Read-only and disabled">
  <div class="flex flex-col gap-3">
    <Rating :model-value="4.2" readonly />
    <Rating :model-value="2" disabled aria-label="Quality, not yet editable" />
  </div>
</Demo>

The same treatment answers a [Fieldset](./fieldset) that disables its group, and
here it takes a little help. Each step is a real `<button>`, so a `<fieldset
disabled>` already made the score unsettable — but Reka's roving focus is driven
by the row's own `disabled`, which the fieldset never reaches, so the row
rendered exactly as a settable one and Tab still stopped on it. It now reads the
enclosing fieldset's own `disabled` attribute and resolves it into the same
state its own prop feeds. That is a _read_ of the attribute rather than a second
copy of it, which is why Fieldset still publishes nothing through the
[Field](./field) context — see [Fieldset](./fieldset#disabling-the-group).

## Inside a Field

A [Field](./field.md) publishes what the row knows, and the rating takes it: the
row's description, `name`, `required` and `invalid` land on the radio group, and
the `name` mints the hidden input a real `<form>` submits.

```vue
<Fieldset legend="Overall quality">
  <Rating v-model="quality" hoverable name="quality" />
</Fieldset>
```

**A row's label does not name this control.** `<label for>` names a labelable
element and both branches render a `div`, so a Field's label resolves to it and
announces nobody. Name the group with a [Fieldset](./fieldset.md)'s real
`<legend>`, or with an `aria-label` of its own. A read-only rating already names
itself, from its score.

A row's **`readonly` is this control's own `readonly`**, not a second dial
beside it: the row goes read-only and the score becomes the picture described
above — `role="img"`, not a Tab stop, and not dimmed. That is the one place in
this family where read-only does not mean "the native control with the native
attribute set", and it is because there is no native element to set it on: each
step is a `<button role="radio">`, and `readonly` is as inert on a radio as it
is on a checkbox. "Still focusable, still submitted" is unreachable here, so the
picture is what is left that is honest.

`readonly` and `disabled` both still win wherever you set them, in both
directions, which is why each is `boolean | undefined` and defaults to
`undefined` rather than `false`. `<Rating :readonly="false" />` inside a
read-only row says this one score is still the reader's to give, and is obeyed.

## Clearing and previewing

`clearable` lets a reader take the score back: choosing the star that is already
chosen emits `0`. Without it there is no way back to "unrated" once the first
star is picked, which matters for an optional question.

`hoverable` previews the score under the pointer before anything is committed,
so the reader sees the answer they are about to give. It is pointer-only
sugar — the keyboard path never needs it, because arrow keys move the score
itself.

<Demo title="Clearing and previewing">
  <div class="flex flex-col gap-3">
    <Rating :model-value="4" clearable aria-label="Quality, clearable" />
    <Rating :model-value="2" hoverable aria-label="Quality, previewing on hover" />
  </div>
</Demo>

## Size

`size` follows the icon scale — 16, 20 and 24px — rather than the control-height
scale that the text input, Select and Button share. A rating is a row of glyphs,
not a box a form row aligns against, so there is no uneven row to protect
against here.

One thing to weigh when picking it: with `step` 0.5 the target is half a star
wide, so an `sm` rating offers an 8px-wide pointer target. Reserve `sm` for
read-only scores in dense chrome, and give an interactive half-star rating `md`
or `lg`.

<Demo title="Size">
  <div class="flex flex-col gap-3">
    <Rating :model-value="4" size="sm" readonly />
    <Rating :model-value="4" size="md" readonly />
    <Rating :model-value="4" size="lg" readonly />
  </div>
</Demo>

## Keyboard and screen readers

An editable rating is a radio group, so the whole row is **one Tab stop**, not
one per star. Tab enters it and lands on the star that is currently chosen.

- **Left and right arrows** move by `step` and set the score as they go — half a
  star at a time when `step` is 0.5.
- **Home and End** move focus to the lowest and highest step. They move focus
  only; the score follows when the reader confirms with **Space**.
- **Space** chooses the focused star. Enter is deliberately inert, so a rating
  inside a form cannot submit it by accident.
- Arrowing past either end wraps, the way a radio group does.

Each star is a `role="radio"` named with the score it sets _and_ the maximum —
"4 of 5 stars" — because five spans wearing a star glyph announce nothing at
all. The group itself has no text of its own, so name it: `aria-label` or
`aria-labelledby` lands on the radio group along with every other attribute you
pass.

A `readonly` rating names itself, from its own score. It is a single
`role="img"` announced as "4.2 of 5 stars", and a caller's `aria-label` does not
replace that — a picture of a number that does not say the number is a picture
of nothing. Put the context in the text beside it instead.

## Motion

Two lanes, both short, neither looping.

The hover preview rides `--duration-instant`: it is the fastest lane in the
system, because a preview that lags the pointer stops reading as a preview and
starts reading as a fault.

The star that is actually chosen settles in on `animate-scale-in`, which is the
spring — a press being released rather than merely stopping. Only that one star
animates; the ones it dragged along behind it simply fill, so the motion says
"this is the one you picked" instead of rippling across the whole row. The
animation is scoped to the chosen state rather than declared outright, which is
what lets it replay on the next choice instead of running once at mount and
never again.

Both collapse under `prefers-reduced-motion`, through the global rule.

<Demo title="Every state" :source="ratingDemoSource">
  <RatingDemo />
</Demo>

## Labels

A row of star glyphs announces nothing at all, so one string carries the whole
control: it names the read-only picture, and it names every radio in the
interactive branch — which is what turns a bare "4" into "4 of 5 stars" at the
moment a reader arrives on it.

```ts
interface RatingLabels {
  score: (args: { score: number; length: number }) => string;
}
```

One key rather than a score, a joiner and a noun. "4 of 5 stars" is three
language decisions in one sentence: where the qualifier sits relative to the
numbers, how the digits are written, and which plural form the noun takes at 1,
at 4 and at 0.5 — a category English does not distinguish and Russian does. Both
numbers therefore arrive raw, so `Intl.PluralRules` and `Intl.NumberFormat` are
yours to reach for.

```ts
const plural = new Intl.PluralRules("ru-RU");
const forms = { one: "звезда", few: "звезды", many: "звёзд" };

score: ({ score, length }) =>
  `${new Intl.NumberFormat("ru-RU").format(score)} из ${length} ${forms[plural.select(score)]}`;
```

The per-instance case is a scale whose glyphs are not stars in the reader's
terms — five chillies for heat, five bars for confidence — where the noun has to
say so however well the application is translated.

```vue
<Rating
  v-model="heat"
  :labels="{ score: ({ score, length }) => `${score} of ${length} chillies` }"
/>
```

Annotate a bag of your own with `LabelOverrides<RatingLabels>` rather than with
`RatingLabels` itself: the override type is partial, so a key added in a later
release is one your bag may ignore, where the bag interface is total and would
stop compiling.

For a whole application set this once with `provideLoomLabels` rather than at
every call site. See [Localisation](/foundations/localisation).

## API

<!-- @api Rating -->
