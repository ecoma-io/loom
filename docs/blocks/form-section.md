# FormSection

A labeled group of form fields with an optional description — the
convenience wrapper around Fieldset + Stack that a form page reaches for
repeatedly. Every form page builds this same arrangement (a fieldset with
vertical spacing between its fields), and the spacing between sections is
a layout decision the block can own once.

<script setup lang="ts">
import { FormSection } from "@ecoma-io/loom";
import FormSectionDemo from "../../src/blocks/FormSection/FormSectionDemo.vue";
import formSectionDemoSource from "../../src/blocks/FormSection/FormSectionDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { FormSection } from "@ecoma-io/loom";
</script>

<template>
  <FormSection legend="Shipping address" description="Where the order will be delivered.">
    <Field label="Street"><TextField /></Field>
    <Field label="City"><TextField /></Field>
    <Field label="Postal code"><TextField /></Field>
  </FormSection>
</template>
```

<Demo title="Form sections with fields" :source="formSectionDemoSource">
  <FormSectionDemo />
</Demo>

## FormSection vs Fieldset

FormSection is a thin convenience over Fieldset — when it does not offer
what a group needs, Fieldset is still the right primitive.

The key distinction is `description` vs `hint`:

- **`description`** sits between the legend and the fields. It orients the
  person filling the form ("Where should we ship your order?"). This prop
  belongs to FormSection and is not forwarded to Fieldset.
- **`hint`** sits below the fields. It supplements the controls themselves
  ("Street address, P.O. box, or military address"). This prop is forwarded
  directly to Fieldset.

They serve different readers at different points in the form, and both can
be present at once.

The other addition is `gap`, which applies Stack's responsive gap scale
between the fields — tighter below the `sm` breakpoint where stacked items
have no room to waste on air.

## API

<!-- @api FormSection -->
