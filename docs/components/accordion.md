# Accordion

Vertically stacked, expandable sections: each trigger reveals its panel and
collapses the rest (single mode) or lets several panels stay open at once
(multiple mode).

<script setup lang="ts">
import { Accordion, type AccordionItem } from "@ecoma-io/loom";
import AccordionDemo from "../demos/AccordionDemo.vue";
import accordionDemoSource from "../demos/AccordionDemo.vue?raw";

const quickItems: AccordionItem[] = [
  { value: "overview", label: "Overview" },
  { value: "features", label: "Features" },
  { value: "pricing", label: "Pricing" },
];
</script>

<Demo title="Accordion">
  <Accordion :items="quickItems">
    <template #default="{ item }">
      {{ item.label }} panel content.
    </template>
  </Accordion>
</Demo>

## Usage

```vue
<script setup lang="ts">
import { Accordion, type AccordionItem } from "@ecoma-io/loom";

const items: AccordionItem[] = [
  { value: "overview", label: "Overview" },
  { value: "features", label: "Features" },
  { value: "pricing", label: "Pricing", disabled: true },
];
</script>

<template>
  <Accordion :items="items">
    <template #default="{ item }">
      <p>Content for {{ item.label }}</p>
    </template>
  </Accordion>
</template>
```

Items are data rather than markup. Each `AccordionItem` has a `value` (the
unique key), a `label` (the trigger's visible text), and an optional `disabled`
flag. A scoped default slot receives `{ item, index }` so the host can render
arbitrary content inside each panel — the primitive owns the open/close
mechanics and the trigger chrome, not what is inside the panel.

## Single and multiple

`type` controls how many items can be open at once:

- **`"single"`** (default) — one panel open at a time. Clicking a different
  trigger closes the current panel and opens the new one.
- **`"multiple"`** — several panels can be open at the same time. Each trigger
  toggles its own panel independently.

`collapsible` only matters in single mode: it governs whether the one open
item can be closed again. A non-collapsible single accordion always has exactly
one panel open. In multiple mode the prop is ignored — every item can close
independently.

<Demo title="Single, multiple, gap sizes, and a disabled item" :source="accordionDemoSource">
  <AccordionDemo />
</Demo>

## Gap

The `gap` prop sets the vertical spacing between items, tightening below the
`sm` breakpoint where the accordion is more likely inside a narrow panel:

| Gap | Classes          |
| --- | ---------------- |
| sm  | `gap-1 sm:gap-2` |
| md  | `gap-2 sm:gap-3` |
| lg  | `gap-3 sm:gap-4` |

## Controlled state

`v-model` drives the open state from the host; omit it and the accordion owns
its own state. In single mode the model value is a `string` (the open item's
value); in multiple mode it is a `string[]` (the values of all open items).

## Escape contract

- **Keyboard navigation:** arrow keys move focus between triggers; Enter and
  Space toggle the focused trigger.
- **A disabled item** is reachable by arrow key but inert: it is marked
  `aria-disabled` and toggling it does nothing.

## API

<!-- @api Accordion -->
