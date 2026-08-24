# ToastStack

Renders a host-owned toast queue through **one** shared provider/viewport, so
several toasts open at once stack vertically with a gap instead of piling
onto the same fixed corner — which is what mounting several standalone
`Toast`s next to each other produces, since each one bundles its own
viewport at the same screen coordinates. That single shared viewport is the
decision that makes this a block: a host with more than one live toast needs
it, and nothing short of composing the two together gets it right.

<script setup lang="ts">
import { ToastStack } from "@ecoma-io/loom";
import ToastStackDemo from "../demos/ToastStackDemo.vue";
import toastStackDemoSource from "../demos/ToastStackDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { ToastStack, type ToastStackItem } from "@ecoma-io/loom";

const items = ref<ToastStackItem[]>([]);

function dismiss(id: string | number) {
  items.value = items.value.filter((item) => item.id !== id);
}
</script>

<template>
  <ToastStack :items="items" @dismiss="dismiss" />
</template>
```

<Demo title="A host-owned queue, stacked with a gap" :source="toastStackDemoSource">
  <ToastStackDemo />
</Demo>

## The queue stays the host's

`Toast` is deliberately queue-free — its own documentation says so — and
`ToastStack` does not change that. The host keeps the array of visible
entries (typically capped, dropping the oldest first) and passes it in as
`items`. Closing one — by hand, swipe, `Esc`, or auto-dismiss — always routes
through the same event: `ToastStack` emits `dismiss` with that entry's `id`,
and the host removes it from its own array. `ToastStack` owns only the
shared-viewport presentation.

Every rendered item is driven with its own `open` fixed to `true`.
Visibility is deciding whether an entry belongs in `items`, never a per-item
open flag the block would otherwise have to track — which is also why an
absent `open` value can never reach a card here.

## The viewport is sized for both ends of the range it lands in

- **Width `min(92vw, 24rem)`** — a phone gets a near-full-bleed card, a
  desktop a bounded one.
- **The bottom inset resolves through `env(safe-area-inset-bottom)`.** On a
  device with a home indicator, a flat `p-4` would put the newest toast —
  and its dismiss control — under the system gesture bar, so the padding is
  `max(1rem, env(safe-area-inset-bottom))` instead.
- **The stack is height-bounded** (`max-h-dvh` plus `overflow-hidden`), so a
  host that hands over more entries than fit pushes the oldest off the top
  rather than growing a column taller than the screen. `dvh`, not `vh`:
  mobile browser chrome collapses the visual viewport, and `vh` does not
  follow it.

## Severity decides politeness

Each entry is announced by its own severity, inside the one shared provider:
a `destructive` toast is read out through an assertive live region
(`role="alert"`, `aria-live="assertive"`), so an error report interrupts
whatever the screen reader is already saying, and every other variant
announces politely — an ordinary notification never interrupts. Same rule as
[`Toast`](/components/toast): no prop decides it, severity alone does.

## `Toast` or `ToastStack`

| Use          | When                                                        |
| ------------ | ----------------------------------------------------------- |
| `Toast`      | one transient notice, self-managing its own `open`          |
| `ToastStack` | the host keeps a queue — several toasts can be live at once |

## API

`ToastStackItem`: `id` (`string \| number`) · `title` (`string`) ·
`description?` (`string`) · `variant?` (`"info" \| "success" \| "warning" \|
"destructive" \| "accent"`) · `duration?` (`number`, ms — defaults to 4000: a
stack turns over faster than a lone toast). The `dismiss` event carries the
`id` of the entry to remove.

<!-- @api ToastStack -->
