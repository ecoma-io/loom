# FormActions

The submit/cancel button row at the bottom of a form. It owns the layout so
every form in the product has the same action alignment — primary action
right, cancel left, separated from the form content by a top border — without
each host page re-deriving the spacing and alignment from scratch.

<script setup lang="ts">
import { FormActions } from "@ecoma-io/loom";
import FormActionsDemo from "../demos/FormActionsDemo.vue";
import formActionsDemoSource from "../demos/FormActionsDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { FormActions, Button } from "@ecoma-io/loom";
</script>

<template>
  <FormActions>
    <template #cancel>
      <Button variant="subtle">Cancel</Button>
    </template>
    <template #default>
      <Button variant="primary">Save changes</Button>
    </template>
  </FormActions>
</template>
```

<Demo title="Between, right, and left alignment" :source="formActionsDemoSource">
  <FormActionsDemo />
</Demo>

## The block owns the geometry; the host owns the button text and behavior

FormActions is a layout decision, not a button factory. It does not render,
label, or wire up any button — it only places the slots. The host decides
what "Save" and "Cancel" say, what variant each button carries, and what
happens when they are clicked. The block's job is to guarantee that the
resulting row is always `gap-3`, always separated by a `border-t`, and always
aligned the same way every other form in the product is aligned.

## Alignment modes

- **`between`** (default): The `cancel` slot sits on the left, the default
  slot on the right. This is the arrangement most forms need — a destructive
  or dismissive action on the left, a constructive one on the right, with the
  space between them signalling that they are opposites.
- **`right`**: All actions pushed to the right edge. Use for short forms with
  a single CTA where a left-side cancel would leave half the row empty.
- **`left`**: All actions pushed to the left edge. Use for right-to-left
  locales, or when the surrounding layout calls for it.

## API

<!-- @api FormActions -->
