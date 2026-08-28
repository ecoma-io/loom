# ErrorSummary

The GOV.UK Design System error-summary pattern: on submit-failure, focus
moves to a summary that lists every field error, and each entry is a link
that moves focus back to the invalid field. Where InlineError annotates one
field, ErrorSummary orients the reader across the whole form — it is the
first thing a screen reader user meets after a failed submit, because
without it there is silence.

<script setup lang="ts">
import { ErrorSummary } from "@ecoma-io/loom";
import ErrorSummaryDemo from "../demos/ErrorSummaryDemo.vue";
import errorSummaryDemoSource from "../demos/ErrorSummaryDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { ErrorSummary } from "@ecoma-io/loom";

const errors = ref([]);
</script>

<template>
  <ErrorSummary :errors="errors" />
  <!-- …the form. Each entry's id points at the field's control. -->
</template>
```

Each entry is `{ id, message, fieldLabel? }`. The `id` is the element the
entry links to — the invalid field's control — and it must be focusable:
give it `tabindex="-1"` (or use a natively focusable control), or focus
cannot land and the pattern is decoration. `fieldLabel` prefixes the
message in the link text, so the entry names the field before it says what
is wrong with it.

## Focus and announcement

The container takes `tabindex="-1"` and is focused whenever the errors
first render or change while the form stays invalid — focus moving is the
pattern; a summary the reader must hunt for is not one.

The announcement happens once. `role="alert"` exists only between the
summary's appearance and the focus the component immediately gives it, and
then it is gone: a region that stayed alert would re-announce the whole
list on every later change, turning one useful announcement into a stream
of interruptions. Returning after the errors have been cleared is a new
appearance, and announces again.

Mount it with `v-if`-style rendering driven by the `errors` array — an
empty array renders nothing, exactly like InlineError's contract with
`v-show`.

## ErrorSummary vs InlineError

InlineError annotates one field and persists until its cause resolves.
ErrorSummary orients the reader across the whole form at submit-failure and
moves them to the fields. A form usually has both: the summary at the top,
InlineErrors at the fields.

<Demo title="Focus jumps to the problem, then back to the field" :source="errorSummaryDemoSource">
  <ErrorSummaryDemo />
</Demo>

## API

<!-- @api ErrorSummary -->
