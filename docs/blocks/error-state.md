# ErrorState

The shape of "something went wrong": icon → title → optional description →
optional retry action, centered in the region. This is EmptyState's mirror:
where that block says "nothing here yet" and invites the next step, this one
says "something broke" and offers a retry. That fixed shape is the decision
that makes this a block — an error region should name the problem and offer
exactly one way forward, and a hand-rolled version drifts call site to call
site.

<script setup lang="ts">
import { ErrorState } from "@ecoma-io/loom";
import ErrorStateDemo from "../demos/ErrorStateDemo.vue";
import errorStateDemoSource from "../demos/ErrorStateDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ErrorState, Button } from "@ecoma-io/loom";
import { AlertTriangle } from "@lucide/vue";
</script>

<template>
  <ErrorState title="Failed to load data" description="Check your connection and try again.">
    <template #icon><AlertTriangle /></template>
    <template #action>
      <Button variant="primary">Try again</Button>
    </template>
  </ErrorState>
</template>
```

<Demo title="Icon, title, description and a retry button" :source="errorStateDemoSource">
  <ErrorStateDemo />
</Demo>

## Error vs empty vs loading

Three situations look similar and are not:

- **Load failed** → `ErrorState` — something broke; offer a retry, never
  disguise it as "nothing here yet".
- **No data yet** (first run, or everything was deleted) → `EmptyState` —
  inviting, pointed at the next action.
- **Still loading** → `Skeleton` / `Spinner` — never flash an error or empty
  state before the real result is known. A state that flickers and disappears
  is a short-lived lie.

## No staggered entrance

Unlike EmptyState, ErrorState renders everything at once. EmptyState is content
appearing — a welcome — and its staggered fade-rise is budgeted like a panel
reveal. An error is not content; it is a problem that needs attention now, and
a film that delays the message reads as indifference.

## The icon sits in a destructive-tinted medallion

The same hairline medallion shape as EmptyState, but tinted `bg-destructive/10`
with a `border-destructive/30` ring — the colour alone signals alarm, so the
neutral `bg-subtle` backing EmptyState uses is replaced with one that matches
the urgency. The icon is decorative and `aria-hidden`; the title already
carries the meaning.

## API

<!-- @api ErrorState -->
