# EmptyState

The shape of "nothing here yet": icon → title → optional description → at
most one call-to-action, centered in the region. That fixed shape is the
decision that makes this a block rather than something a host would lay out
itself — an empty region should explain what is missing and invite exactly
one next step, and a hand-rolled version of that drifts call site to call
site (one CTA here, two there, a description that turns into a paragraph
somewhere else).

<script setup lang="ts">
import { EmptyState } from "@ecoma-io/loom";
import EmptyStateDemo from "../../src/blocks/EmptyState/EmptyStateDemo.vue";
import emptyStateDemoSource from "../../src/blocks/EmptyState/EmptyStateDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { EmptyState, Button } from "@ecoma-io/loom";
import { Inbox } from "@lucide/vue";
</script>

<template>
  <EmptyState title="No workflows yet" description="Create your first workflow.">
    <template #icon><Inbox /></template>
    <template #action>
      <Button variant="primary">Create workflow</Button>
    </template>
  </EmptyState>
</template>
```

<Demo title="Icon, title, description and a single CTA" :source="emptyStateDemoSource">
  <EmptyStateDemo />
</Demo>

## Empty is a welcome, not an error

Three situations look similar and are not:

- **No data yet** (first run, or everything was deleted) → `EmptyState` —
  inviting, pointed at the next action.
- **Load failed** → `InlineError` — that is an error; do not disguise it as
  "nothing here yet".
- **Still loading** → `Skeleton` / `Spinner` — never flash `EmptyState`
  before the real result is known. An empty state that flickers and
  disappears is a short-lived lie.

## The entrance is a staggered fade-rise, not a fade-in-all-at-once

The icon, title, description and CTA arrive in reading order, 60ms apart.
This is content appearing rather than feedback for an action the user just
took, so it budgets like a panel reveal instead of against a tighter
interaction ceiling. The icon is decorative and `aria-hidden`; the CTA's
label and behavior belong entirely to the host, through the `action` slot.

## The icon sits in a hairline medallion, never bare

A 20px glyph — the emphasis step of the icon scale — floating alone in a
large blank region has nothing to anchor it and reads as a stray mark. The
medallion (a `bg-subtle` disc with a hairline `border`) gives it a shape to
sit against without adding a shadow: it is a surface plus a hairline, never
a float. `bg-subtle` rather than `bg-card` keeps the disc visible whether
the block is dropped onto `bg-card` or `bg-background` — it is used on both.

## API

<!-- @api EmptyState -->
