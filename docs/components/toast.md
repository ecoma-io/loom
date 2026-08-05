# Toast

A **transient, self-dismissing** notification the user need not act on — a
save confirmed, a render finished, a recoverable error. Built on Reka UI's
Toast: it announces to assistive tech (`role`/`aria-live`), pauses on
hover/focus, and is dismissible by swipe or `Esc`.

<script setup lang="ts">
import { Toast, Button } from "@ecoma-io/loom";
import ToastDemo from "../../src/primitives/Toast/ToastDemo.vue";
import toastDemoSource from "../../src/primitives/Toast/ToastDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Toast } from "@ecoma-io/loom";
</script>

<template>
  <Toast
    v-model:open="open"
    variant="success"
    title="Composition saved"
    description="Synced at 14:32."
    action-label="Undo"
    @action="undo"
  />
</template>
```

<Demo title="Success, error and AI variants" :source="toastDemoSource">
  <ToastDemo />
</Demo>

## Presentational — the host owns the queue

Toast is purely presentational and self-contained: it bundles its own
provider and viewport, so a single toast works standalone with no other
setup. It carries **no** queue logic — the host decides _when_ to open a
toast (this primitive only ever renders one). An app that needs to show
several toasts at once has to manage its own queue on the host side;
mounting several standalone `Toast`s side by side would give each one its
own viewport at the same screen coordinates rather than a single list that
stacks cleanly, so a multi-toast host owns that layout itself.

## Variants

| Variant       | Use for                                     |
| ------------- | ------------------------------------------- |
| `info`        | neutral information                         |
| `success`     | a completed action                          |
| `warning`     | something to notice, not yet an error       |
| `destructive` | an error (recoverable)                      |
| `ai`          | a result or action taken by an agent (weft) |

## Picking the right component

| Use           | When                                                              |
| ------------- | ----------------------------------------------------------------- |
| `Toast`       | a transient notice the user is **not required** to act on         |
| `Dialog`      | a **blocking** confirmation that needs a decision                 |
| `InlineError` | a field/section error that **stays until resolved**, no auto-hide |

## Mechanics

- `open` supports `v-model:open`; `duration` (ms) drives auto-dismiss and
  pauses while hovered or focused.
- `actionLabel` renders a single inline action button and emits `action`;
  `closable` shows the ✕ close button.
- Motion: the card slides in from the right edge (the swipe-to-dismiss axis)
  and settles on `--ease-spring`. The animation plays on the card's own inner
  element, never on `ToastRoot` — Reka needs `ToastRoot`'s transform free for
  the swipe gesture.

## Do / Don't

- Do keep the copy short and state the consequence plainly; pair with an
  `Undo` action when one exists.
- Do use `destructive` with a retry action for errors that can be recovered.
- Don't use Toast for an error that must be dealt with immediately — reach
  for `InlineError` or `Dialog`.
- Don't pack in long copy or multiple buttons.

## API

<!-- @api Toast -->
