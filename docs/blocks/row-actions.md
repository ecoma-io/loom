# RowActions

The action group belonging to one row of a dense list: quiet at rest,
revealed on pointer hover or keyboard focus. The reveal carries an
accessibility contract that is easy to get wrong in a way nothing fails on —
that contract, fixed once here, is the decision that makes this a component
rather than three utility classes copied at every call site.

<script setup lang="ts">
import { RowActions } from "@ecoma-io/loom";
import RowActionsDemo from "../../src/blocks/RowActions/RowActionsDemo.vue";
import rowActionsDemoSource from "../../src/blocks/RowActions/RowActionsDemo.vue?raw";
</script>

## Usage

The row element must carry Tailwind's `group` class — the reveal is scoped
to that group, so other rows stay quiet.

```vue
<script setup lang="ts">
import { RowActions, Button } from "@ecoma-io/loom";
import { Trash2 } from "@lucide/vue";
</script>

<template>
  <li class="group flex items-center gap-3 px-3 py-2.5">
    <div class="min-w-0 flex-1"><!-- row content --></div>
    <RowActions>
      <Button size="icon-sm" variant="ghost" :aria-label="`Delete ${row.name}`">
        <Trash2 />
      </Button>
    </RowActions>
  </li>
</template>
```

`size="icon-sm"` is the matching size for an action on a dense row (32×32 —
see Button's sizes).

<Demo title="Hover or Tab into a row" :source="rowActionsDemoSource">
  <RowActionsDemo />
</Demo>

## Four rules in one place, so no view has to re-derive them

- **Revealed by `opacity`, never by `display` or `v-if`.** Hiding the group
  with `hidden` or unmounting it until hover drops it out of the tab order
  entirely — a keyboard-only or screen-reader user cannot reach it. The
  pointer path still works, so nothing turns red.
- **`group-focus-within`, not only `group-hover`.** Tabbing into the row has
  to bring the actions up, or focus lands on something invisible and the
  focus ring appears to come from nowhere.
- **The actions stay mounted and named.** Each child keeps its own
  `aria-label` — the reveal changes what is seen, never what exists.
- **`pointer-coarse` opts out of the reveal entirely.** A hover reveal has no
  trigger on a touch screen, and the `focus-within` fallback only fires after
  a tap has already landed on something invisible. So on a coarse pointer
  the actions are simply always visible; the reveal is a refinement for
  precise pointers, not a gate on reaching the actions at all.

Collecting these once means a view never has to reason through them again —
and re-deriving them by hand is exactly where one of the four tends to drop.

The reveal itself rides a 4px inward slide alongside the fade, so it reads
as the actions arriving rather than a panel blinking on. Both are
token-tier, `duration-fast`, and flattened together by the global
reduced-motion rule.

## API

<!-- @api RowActions -->
