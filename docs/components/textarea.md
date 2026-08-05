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

## Error state

`invalid` paints the destructive border and ring and sets `aria-invalid` —
the same contract as TextField. The message itself belongs to
[InlineError](./inline-error), usually rendered through
[Field](./field).

<Demo title="Invalid">
  <Textarea aria-label="Feedback" invalid placeholder="Enter feedback…" />
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
