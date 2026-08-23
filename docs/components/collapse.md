# Collapse

One disclosure: a trigger that shows and hides a single region of content.
The generic primitive under Accordion's row group — use Accordion when
several disclosures form one coordinated set, and Collapse when a region
stands on its own.

<script setup lang="ts">
import { Collapse } from "@ecoma-io/loom";
import CollapseDemo from "../demos/CollapseDemo.vue";
import collapseDemoSource from "../demos/CollapseDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Collapse } from "@ecoma-io/loom";
</script>

<template>
  <Collapse>
    <template #trigger>What ships in the box?</template>
    <p>The component, its evidence and its documentation.</p>
  </Collapse>
</template>
```

## Anatomy and motion

The state machinery is Reka's Collapsible: the trigger is a real `<button>`
carrying `aria-expanded`/`aria-controls`, the region keeps its id resolvable
even while closed (concealed with `hidden` rather than removed), and
controlled/uncontrolled use follow the same split as Dialog. Expansion plays
the shared height pair — `--animate-expand` in, faster `--animate-collapse`
out — keyed to Reka's measured content height; padding lives inside the
animated box so neither end of the film pops. Under
`prefers-reduced-motion` both directions collapse to an instant toggle.

<Demo title="States, control modes and nesting" :source="collapseDemoSource">
  <CollapseDemo />
</Demo>

## Difference from Accordion

Accordion coordinates a _set_ of disclosures with shared keyboard semantics
and one-open-or-many rules. Collapse is one pair, alone or nested arbitrarily.
If you are about to stack three Collapses and reach for a shared
open-at-most-one rule, that is Accordion's job.

## API

<!-- @api Collapse -->
