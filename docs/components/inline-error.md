# InlineError

The one error contract for a field or a section, instead of a paragraph
here and a badge there. It pairs a `text-destructive` presentation with
`role="alert"`, so a screen reader announces the message as soon as it
enters the DOM — no `aria-live` attribute needed, because `alert` carries an
implicit live region.

<script setup lang="ts">
import { InlineError } from "@ecoma-io/loom";
import InlineErrorDemo from "../../src/primitives/InlineError/InlineErrorDemo.vue";
import inlineErrorDemoSource from "../../src/primitives/InlineError/InlineErrorDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { InlineError } from "@ecoma-io/loom";
</script>

<template>
  <InlineError message="This folder could not be opened." />
</template>
```

## Mount it, don't hide it

Because `role="alert"` announces on DOM insertion, InlineError must be
mounted with `v-if`, never toggled with `v-show`. CSS visibility leaves the
node in the DOM the whole time, so a message change under `v-show` may not
be re-announced — the live region only fires reliably the moment the
element itself appears.

<Demo title="Message prop">
  <InlineError message="This folder could not be opened. It may have moved or been deleted." />
</Demo>

## Slot content, and the action slot

A default-slot child overrides the `message` prop when both are given. An
optional `action` slot renders a control — a retry or remove button — to
the right of the text, its own layout kept separate from the message.

<Demo title="With an action" :source="inlineErrorDemoSource">
  <InlineErrorDemo />
</Demo>

## Persists until the cause resolves

There is no auto-dismiss timer and no built-in close button. InlineError
disappears when the host's error state clears — typically because its
`v-if` condition does — not because someone dismissed it. A transient
notice that hides itself after a delay belongs to a toast, not here.

## Field or section scope only

InlineError sits next to the one control or section it explains: a form
field (usually through [Field](./field)), a card, a panel. An issue that
applies to an entire open document or surface — an external file conflict,
a sync failure — calls for a persistent banner at the top of that surface
instead, which is dismissible independently of whether the underlying cause
has resolved. Reach for InlineError when the error belongs to _part_ of
what's on screen; reach for a banner when it belongs to _all_ of it.

## API

<!-- @api InlineError -->
