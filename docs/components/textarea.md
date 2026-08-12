# Textarea

Multi-line text entry — a native `<textarea>`. Unlike
[TextField](./text-field) it renders as a single element with no wrapper,
because there are no `#leading`/`#trailing` adornments to frame; the border,
focus ring and invalid state live directly on it instead.

<script setup lang="ts">
import { Textarea } from "@ecoma-io/loom";
import TextareaDemo from "../../src/primitives/Textarea/TextareaDemo.vue";
import textareaDemoSource from "../../src/primitives/Textarea/TextareaDemo.vue?raw";
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

Neither is dimmed. The element _is_ the text, and an opacity on it takes the
words with the paint — a disabled textarea holding a filed answer is still there
to be read, and dimming took that answer to 3.06:1, and its placeholder to
2.05:1, against a 4.5:1 bar. Both
states take the same filled surface and part on the text: a read-only value
stays at full strength and keeps its focus ring, where a disabled one moves to
the muted colour and takes the not-allowed cursor. It is the same treatment
[Select](./select) wears, so a disabled form row is one colour rather than
three.

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

<Demo title="Every state" :source="textareaDemoSource">
  <TextareaDemo />
</Demo>

## API

<!-- @api Textarea -->
