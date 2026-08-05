# Field

The form-row wrapper: label, control, and one hint-or-error line, composed
the same way at every call site instead of by hand each time. It renders
nothing of its own for the control — the default slot is a text field, a
textarea, or any other bare control — which is the one decision worth
calling out: Field lays out and names, it never wraps or re-styles what you
put inside it.

<script setup lang="ts">
import { Field, TextField } from "@ecoma-io/loom";
import FieldDemo from "../../src/primitives/Field/FieldDemo.vue";
import fieldDemoSource from "../../src/primitives/Field/FieldDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Field, TextField } from "@ecoma-io/loom";
</script>

<template>
  <Field label="Email" for="email" hint="We never share this">
    <TextField id="email" aria-describedby="email-description" v-model="email" />
  </Field>
</template>
```

## Label association

<Demo title="Label, hint and required">
  <Field label="Full name" for="field-name" hint="Shown publicly" required>
    <TextField id="field-name" placeholder="Enter your name" />
  </Field>
</Demo>

`for` is the id of the control inside the slot. When both `label` and `for`
are set, Field renders a real `<label for="...">`, so clicking the label
focuses the control. When `label` is set without `for`, Field renders a
plain `<span>` instead — it stays visible, but it does not pretend to a
semantic association it cannot make. Always pass `for` alongside `label`.

## The accessibility contract, in full

A labelled, describable, validity-aware form row needs three separate
attributes to agree with each other, and Field can only reach some of them
directly:

- **The label.** Field owns this completely: pass `label` and `for`, and it
  renders the associated `<label>` itself.
- **`aria-invalid`.** Field does not touch this — it lives on the control,
  set by that control's own `invalid` prop (`TextField` and `Textarea` both
  have one). Pass `invalid` to the control and `error` to Field together;
  they are two halves of one error state, not two independent switches.
- **`aria-describedby`.** This is the one link Field cannot complete by
  itself. It cannot reach into an arbitrary slotted control to set an
  attribute on it, so instead it publishes a predictable id —
  `${for}-description` — on whichever of the hint or the error is currently
  showing. `TextField` and `Textarea` both forward an `aria-describedby`
  passed to them straight onto their native element, so the last step is one
  attribute at the call site:

```vue
<Field label="Email" for="email" error="Invalid address">
  <TextField id="email" aria-describedby="email-description" invalid />
</Field>
```

This is the part of the family a consumer most easily gets wrong by hand —
it is easy to wire the label and forget that the hint or error text is
otherwise invisible to a screen reader unless something points at it.

## Hint and error

<Demo title="Hint replaced by error">
  <Field label="Email" for="field-email" error="That address is not valid" required>
    <TextField id="field-email" invalid placeholder="you@example.com" />
  </Field>
</Demo>

`hint` shows only while there is no `error` — a row carries one message at a
time, never both stacked. Setting `error` swaps in InlineError with that
message and hides the hint until the error clears.

<Demo title="Every case" :source="fieldDemoSource">
  <FieldDemo />
</Demo>

## API

<!-- @api Field -->
