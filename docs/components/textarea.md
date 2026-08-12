# Textarea

Multi-line text entry — a native `<textarea>`. Unlike
[TextField](./text-field) there are no `#leading`/`#trailing` adornments to
frame, so the border, focus ring and invalid state live directly on the control
itself: `class` and every other attribute you pass land on the `<textarea>`,
not on anything wrapped around it.

<script setup lang="ts">
import { ref } from "vue";
import { Textarea } from "@ecoma-io/loom";
import TextareaDemo from "../../src/primitives/Textarea/TextareaDemo.vue";
import textareaDemoSource from "../../src/primitives/Textarea/TextareaDemo.vue?raw";

const docSummary = ref("A short account of what changed and why.");
const docOverrun = ref("A short account of what changed and why, written well past the room the form allowed for it.");
const docRunning = ref("");
</script>

## Usage

```vue
<script setup lang="ts">
import { Textarea } from "@ecoma-io/loom";
</script>

<template>
  <Textarea v-model="bio" aria-label="Bio" placeholder="Introduce yourself" />
</template>
```

## Naming

Textarea is a bare primitive, named only by its host: pass `aria-label` or
`aria-labelledby`, or wrap it in [Field](./field) and let Field handle the
association.

## Inside a Field

Wrapped in a [Field](./field), Textarea wires itself: the row's id, the id of
its hint or error line, and `required`, `invalid`, `disabled`, `readonly` and
`name` all arrive from the row, so nothing is written at the call site.

```vue
<Field label="Bio" name="bio" hint="Up to 200 characters">
  <Textarea v-model="bio" />
</Field>
```

Every one of those props still wins when you set it, in both directions — which
is why `invalid`, `required`, `disabled` and `readonly` are `boolean | undefined`
and default to `undefined` rather than `false`. Setting one to `false` inside a
row that says otherwise is a decision, and it is obeyed.

## Error state

`invalid` paints the destructive border and ring and sets `aria-invalid` —
the same contract as TextField. The message itself belongs to
[InlineError](./inline-error), usually rendered through
[Field](./field).

<Demo title="Invalid">
  <Textarea aria-label="Feedback" invalid placeholder="Enter feedback…" />
</Demo>

## Required, read-only and disabled

`required` sets `aria-required` and deliberately not the native `required`
attribute, for the reason [TextField](./text-field) sets out: marking the field
mandatory to assistive technology is the accessibility fix, and enforcing it
stays your form's decision.

`readonly` and `disabled` are different states. A read-only textarea is a value
on show — still focusable, still scrollable, still submitted. A disabled one is
unavailable: no Tab stop, not submitted.

**They are told apart on three channels, not one.** The two used to share a
fill and part only on the text colour, which is a colour-only distinction for a
sighted reader. Now the fill separates them and the hairline separates them
again — a difference in shape, which survives when hue does not — and the
progression reads available → on show → unavailable:

| State     | Fill            | Text                    | Border          |
| --------- | --------------- | ----------------------- | --------------- |
| Available | `bg-background` | `text-foreground`       | `border-input`  |
| Read-only | `bg-subtle`     | `text-foreground`       | `border-input`  |
| Disabled  | `bg-muted`      | `text-muted-foreground` | `border-border` |

Measured: a read-only value sits at 13.46:1 over `subtle`, a disabled one at
12.58:1 over `muted` with its placeholder at 4.68:1. Every pairing clears AA.

Neither state is dimmed, and that is the point. The element _is_ the text, so an
opacity on it takes the words with the paint — a disabled textarea holding a
filed answer is still there to be read, and dimming took that answer to 3.06:1
and its placeholder to 2.05:1, against a 4.5:1 bar.

<Demo title="Read-only against disabled">
  <div class="flex w-full flex-col gap-3" style="max-width: 20rem">
    <Textarea aria-label="Filed summary (read-only)" name="summary" readonly :rows="2" model-value="Submitted 17 January. Locked once the return was filed." />
    <Textarea aria-label="Notes (disabled)" disabled :rows="2" placeholder="Cannot be edited" />
  </div>
</Demo>

## Rows and resize

| Prop     | Default      | Notes                                               |
| -------- | ------------ | --------------------------------------------------- |
| `rows`   | `3`          | Initial height, in text rows.                       |
| `resize` | `"vertical"` | `"none"` locks the size — use once layout is fixed. |

<Demo title="Locked size">
  <Textarea :rows="5" resize="none" aria-label="Notes" placeholder="Enter notes…" />
</Demo>

## Character count

`maxLength` gives the field a limit to report, and `showCount` overrules that in
either direction: `true` shows a running total where there is no limit, `false`
holds a limit the field reports nowhere. The keys, the wording and the
announcement are [TextField](./text-field)'s, so a form counting one of each
counts them the same way.

**The counter sits below the box, not inside it**, and that is the one place
this differs from TextField. A single-line field has a free column at its end to
hang a readout in; a textarea has none — the value fills the box and scrolls, and
the bottom-right corner belongs to the browser's own resize grabber, which an
overlaid counter would cover. Below the box, `resize` moves the field's bottom
edge and the counter travels down with it rather than floating over the words.
`resize="none"` changes nothing about where it sits.

<Demo title="Counting against a limit">
  <div class="flex w-full flex-col gap-4" style="max-width: 22rem">
    <Textarea v-model="docSummary" :max-length="80" :rows="2" aria-label="Summary" />
    <Textarea v-model="docOverrun" :max-length="80" :rows="2" aria-label="Summary, over the limit" />
    <Textarea v-model="docRunning" show-count :rows="2" aria-label="Notes with no limit" placeholder="No limit, just a total" />
  </div>
</Demo>

**The limit is reported, not enforced**, exactly as `required` is. `maxLength`
does not set the native `maxlength`, which truncates a paste silently and tells
the reader nothing about the words it dropped. Pass `maxlength` yourself as a
plain attribute where you want the browser to enforce it as well.

**Over the limit is a state, and it is not carried by colour.** The counter turns
destructive _and_ its wording changes — `81/80` becomes `81/80 over limit` — so
the state survives a monochrome display, a colour-blind reader and
forced-colours mode. It is not, on its own, an error: it sets no `aria-invalid`
and paints no destructive border, because whether an over-long value blocks the
form is the form's decision. Set `invalid` alongside it where it is one.

The counter is not focusable and is not announced as it changes. It is wired
into the textarea's `aria-describedby`, so it is read when the field takes focus
and on every return to it — after any description you set, and before a wrapping
[Field](./field)'s hint or error line. What _is_ announced are the two facts a
reader cannot see coming: the limit is close, and the limit is passed. Each is
spoken once, as the value crosses, from a `role="status"` region that is in the
page from the first render and empty until then.

With no count asked for, neither the counter nor its live region is rendered at
all.

## Labels

The five counter strings are replaceable, and every one of them is Loom's own —
a bare `<textarea>` renders no English of anybody else's.

```ts
interface TextareaLabels {
  count: (args: { count: number }) => string; // a running total, no limit
  countOfMax: (args: { count: number; max: number }) => string; // within the limit
  countOverMax: (args: { count: number; max: number; over: number }) => string; // past it
  approachingLimit: (args: { remaining: number; max: number }) => string; // spoken once
  limitExceeded: (args: { over: number; max: number }) => string; // spoken once
}
```

These are [TextField](./text-field)'s five keys, by name and by argument shape,
so a counter bag you have already written copies across unchanged. They are a
slot of their own — `textarea` rather than `textField` — because that slot also
carries `reveal`, and a textarea's translator should not be handed a password
toggle to word.

**The counters are handed the numbers, never a formatted string.** `81/80` is a
punctuation choice made in one language, and "3 characters left" has one plural
form in Vietnamese, two in English and six in Arabic — so the integers go over
the seam and `Intl.PluralRules` picks the category in your own locale.
`countOverMax` must read differently from `countOfMax` rather than only being
painted differently, or the over-limit state is carried by colour alone.

Every key is optional. Annotate a bag of your own with
`LabelOverrides<TextareaLabels>` rather than with `TextareaLabels` itself: the
override type is partial, so a key added in a later release is one your bag may
ignore. For a whole application set these once with `provideLoomLabels` rather
than at every call site; the `labels` prop is for the per-instance correction,
such as a field counting words rather than characters. See
[Localisation](/foundations/localisation).

## Motion

The border, the fill and the focus bloom transition at `duration-fast` on
`--ease-out`, below the `--duration-normal` feedback ceiling — the same lane
[TextField](./text-field) uses, so two fields in one form settle together.
Nothing loops, and nothing animates outside a CSS transition, so the global
`prefers-reduced-motion` rule covers all of it.

<Demo title="Every state" :source="textareaDemoSource">
  <TextareaDemo />
</Demo>

## API

<!-- @api Textarea -->
