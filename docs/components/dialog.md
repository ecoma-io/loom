# Dialog

A modal task surface: it takes over the screen until it is resolved. Use it for
the decision that cannot be deferred — a destructive confirm, a form that
deserves the user's whole attention, an authoring surface opened from a row.

Modality is the cost, so spend it deliberately. Everything a dialog is open over
is unreachable: not dimmed, unreachable.

<script setup lang="ts">
import { Dialog, Button } from "@ecoma-io/loom";
import DialogDemo from "../../src/primitives/Dialog/DialogDemo.vue";
import dialogDemoSource from "../../src/primitives/Dialog/DialogDemo.vue?raw";
</script>

<Demo title="Dialog">
  <Dialog title="Delete scene?" description="This cannot be undone.">
    <template #trigger>
      <Button variant="destructive">Delete scene</Button>
    </template>
    <p class="text-sm">Tab around: focus never leaves the panel.</p>
  </Dialog>
</Demo>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { Dialog, Button } from "@ecoma-io/loom";

const open = ref(false);
</script>

<template>
  <Dialog v-model:open="open" title="Delete scene?" description="This cannot be undone.">
    <template #trigger>
      <Button variant="destructive">Delete scene</Button>
    </template>
    <template #footer>
      <Button variant="subtle" @click="open = false">Keep it</Button>
      <Button variant="destructive" @click="confirm">Delete permanently</Button>
    </template>
  </Dialog>
</template>
```

## Title and description

`title` is required, and not as chrome. It is the dialog's accessible name:
without it a screen reader announces a modal that says nothing about what it is
asking. Write the consequence — "Delete scene?" rather than "Are you sure?".

`hideTitle` keeps that name for assistive technology while dropping it from the
visual layout, which is what a panel with its own heading needs. It hides the
title, never removes it.

`description` is wired as the dialog's accessible description, so it is
announced with the title rather than found later as loose body text. One
consequence line belongs here; the rest belongs in the default slot.

## Sizes

Width is the primitive's decision rather than a class the caller passes, so
three dialogs opened from three screens cannot be three different widths.

- `md` — a confirm or a short form.
- `lg` — a form with several sections.
- `xl` — an authoring surface: an editor living inside a dialog.

Each is capped against the viewport, so even `xl` stays usable on a laptop
instead of running off the screen.

<Demo title="Sizes, hidden titles and a dialog with no way out but a decision" :source="dialogDemoSource">
  <DialogDemo />
</Demo>

## Closing

`closable` shows the close affordance in the corner, and it is on by default.
Turning it off does not make the dialog inescapable — Esc and the overlay still
close it. Use it where the corner button would compete with an explicit choice
in the footer, not to force an answer.

The dialog never closes itself when the host drives it: it reports the request
through `update:open` and waits. That is what lets a save run before the panel
goes away, and what makes a failed save able to keep it open.

## Escape contract

The strictest of the overlays, and the reason to reach for it deliberately:

- **Closes on** Esc, a click on the overlay, the close button, or the host
  setting `open` to `false`.
- **Focus on open** moves into the panel, and is **trapped** there: Tab cycles
  the dialog's own controls and never reaches the page behind.
- **Focus on close** returns to whatever opened it.
- **The page behind does not scroll**, and everything outside the panel is
  hidden from assistive technology. That second half is what makes the block
  real rather than visual — without it a screen reader walks straight out of the
  modal into a page the pointer cannot reach.

Reach for [Popover](./popover.md) when the content is secondary rather than
blocking, and a transient notification when the user need not act at all.

## API

<!-- @api Dialog -->
