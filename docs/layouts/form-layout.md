# FormLayout

A centered form page with constrained width for readability. Forms are narrower
than general content: a line length comfortable for reading prose is already wider
than the labels and inputs a form needs. FormLayout enforces that cap so the form
never stretches across an ultrawide monitor.

<script setup lang="ts">
import { FormLayout } from "@ecoma-io/loom";
import FormLayoutDemo from "../../src/layouts/FormLayout/FormLayoutDemo.vue";
import formLayoutDemoSource from "../../src/layouts/FormLayout/FormLayoutDemo.vue?raw";
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

## Responsive behavior

- **Mobile:** single column, full-width — the constrained max-width is wider
  than the viewport so the form fills the screen naturally
- **Tablet:** mixed columns possible within the capped width
- **Desktop:** form centres within the viewport at the chosen max-width
- **Wide / Ultrawide:** gutters widen (`3xl`), extra viewport goes to
  intentional whitespace rather than stretching the form

## API

<!-- @api FormLayout -->
