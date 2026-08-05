# TextField

Single-line text entry — text, email, password, search, url, tel. The
border, focus ring and invalid state live on the wrapper rather than the
input, which is the decision that makes adornments possible: a leading
search icon or a trailing unit sits _inside_ the field and shares its focus
bloom, instead of every caller re-inventing an icon-inside-input layout by
hand. It also puts adornments unmistakably inside the field's boundary
rather than beside it — a `#trailing` clear button reads as part of the
input it clears, not as a second control next to it.

<script setup lang="ts">
import { TextField } from "@ecoma-io/loom";
import TextFieldDemo from "../../src/primitives/TextField/TextFieldDemo.vue";
import textFieldDemoSource from "../../src/primitives/TextField/TextFieldDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { TextField } from "@ecoma-io/loom";
</script>

<template>
  <TextField v-model="email" type="email" aria-label="Email" placeholder="you@example.com" />
</template>
```

## Naming

TextField is a bare primitive — it is named only by its host. Pass
`aria-label` (a string) or `aria-labelledby` (the id of a visible label).
Wrapped in [Field](./field), Field handles the association for you.

<Demo title="Named by aria-labelledby">
  <div class="flex flex-col gap-2" style="max-width: 20rem">
    <span id="tf-doc-name" class="text-xs text-muted-foreground">Full name</span>
    <TextField aria-labelledby="tf-doc-name" placeholder="Enter your name" />
  </div>
</Demo>

## Adornments

`#leading`/`#trailing` take an icon or short text — a unit, a clear button.
They sit inside the field's own border and focus treatment because the
wrapper, not the input, owns both: a plain input can only draw a focus ring
around itself, so an icon placed next to it would sit outside that ring and
read as a separate element. Wrapping the whole group lets the ring, the
border and the invalid color apply once, to everything inside.

<Demo title="Leading icon">
  <TextField aria-label="Search" type="search" placeholder="Search assets, scenes…">
    <template #leading>🔍</template>
  </TextField>
</Demo>

## Error state

`invalid` paints the destructive border and ring and sets `aria-invalid` on
the input — the error reaches both a sighted reader and a screen reader,
never color alone. The message itself belongs to
[InlineError](./inline-error), usually rendered through
[Field](./field).

<Demo title="Invalid">
  <TextField aria-label="Email" type="email" invalid placeholder="you@example.com" />
</Demo>

## Sizes

| Size | Height        | Use for                          |
| ---- | ------------- | -------------------------------- |
| `sm` | 32px (`h-8`)  | toolbars, dense rows, inline use |
| `md` | 36px (`h-9`)  | the default                      |
| `lg` | 44px (`h-11`) | spacious forms, onboarding       |

<Demo title="Every type, size and state" :source="textFieldDemoSource">
  <TextFieldDemo />
</Demo>

## API

<!-- @api TextField -->
