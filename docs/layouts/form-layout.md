---
composition: "A page header, one width-capped form column and an action row; the cap is the layout's, the fields are the host's."
---

# FormLayout

A centered form page with constrained width for readability. Forms are narrower
than general content: a line length comfortable for reading prose is already wider
than the labels and inputs a form needs. FormLayout enforces that cap so the form
never stretches across an ultrawide monitor.

<script setup lang="ts">
import { FormLayout } from "@ecoma-io/loom";
import FormLayoutDemo from "../demos/FormLayoutDemo.vue";
import formLayoutDemoSource from "../demos/FormLayoutDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { FormLayout } from "@ecoma-io/loom";
</script>

<template>
  <FormLayout>
    <template #header>
      <!-- page title or breadcrumb -->
    </template>
    <!-- form fields -->
    <template #actions>
      <!-- submit / cancel buttons -->
    </template>
  </FormLayout>
</template>
```

<Demo title="FormLayout" :source="formLayoutDemoSource">
  <FormLayoutDemo />
</Demo>

## Max-width

The `maxWidth` prop caps the form column. Forms should be narrower than general
content because the eye should not have to travel between label and input:

| Value | Class      | Use for                        |
| ----- | ---------- | ------------------------------ |
| `sm`  | `max-w-sm` | Short forms (login, OTP)       |
| `md`  | `max-w-md` | Standard forms (default)       |
| `lg`  | `max-w-lg` | Wider forms with longer inputs |
| `xl`  | `max-w-xl` | Forms with side-by-side fields |

## Obligations

<!-- @layout-obligations FormLayout -->

## API

<!-- @api FormLayout -->
