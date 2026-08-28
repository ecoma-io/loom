# CopyButton

The clipboard affordance: an icon button that copies a piece of text and tells
the user what happened — a check while the write succeeded, a cross while it
refused, and a screen-reader announcement either way. Click again to copy
again; a failure is a message, not a dead end.

<script setup lang="ts">
import { CopyButton } from "@ecoma-io/loom";
import CopyButtonDemo from "../demos/CopyButtonDemo.vue";
import copyButtonDemoSource from "../demos/CopyButtonDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { CopyButton } from "@ecoma-io/loom";
</script>

<template>
  <CopyButton value="pnpm add @ecoma-io/loom" />
</template>
```

<Demo title="CopyButton" :source="copyButtonDemoSource">
  <CopyButtonDemo />
</Demo>

## Not IconButton

CopyButton is an icon button that owns a clipboard contract, and it composes
[IconButton](/components/icon-button) rather than reimplementing it: the
variant and size props are IconButton's, verbatim, and the press language —
the wash on hover, the ring and halo on focus, the neutral drain when
disabled — is inherited wholesale. What CopyButton adds is the one thing a
generic icon button must not have an opinion about: what the click copies,
what the outcome looks like, and what assistive technology hears.

## What it copies

Give it a static `value`, or a `getText` callback for text that only exists
when the user asks for it — a freshly generated snippet, a permalink built
from current state. The callback may be asynchronous; a throwing callback is
treated exactly like a clipboard refusal.

The copy goes through the async Clipboard API. There is no
`document.execCommand("copy")` fallback: the API is available in every
secure context Loom ships into, and a fallback that silently
half-works is worse than an honest failure state. Insecure contexts get the
failed announcement, which is the truthful answer.

## Feedback, and who carries it

The visible swap is only half the feedback. The full contract:

- **The accessible name never changes.** The button is always named by
  `labels.copy`, so a screen reader's cursor never loses the button it is
  sitting on.
- **The outcome is announced** — `labels.copied` or `labels.failed` —
  through Loom's shared live-region seam. The region pre-exists the message
  (a region mounted in the same tick as its first announcement is heard
  unreliably), and no `role="status"` is stacked on top of a component that
  did not opt into that exactness contract.
- **The glyph swaps** to a check or a cross for two seconds and reverts. The
  swap is instant: no crossfade, so there is nothing for
  `prefers-reduced-motion` to collapse. A click during the feedback window is
  a legitimate "copy again", not a swallowed duplicate.

Colour and shape alone never carry the state — the announcement is the
second carrier, and the button stays operable after a failure so the very
next click retries.

## Labels

Override one instance with the `labels` prop — `copy` names the button,
`copied` and `failed` are the announcements:

```vue
<CopyButton
  :value="installCommand"
  :labels="{ copy: 'Befehl kopieren', copied: 'Kopiert', failed: 'Kopieren fehlgeschlagen' }"
/>
```

or translate every Loom component at once above your application root:

```ts
provideLoomLabels(() => ({
  copyButton: { copy: "Befehl kopieren", copied: "Kopiert", failed: "Kopieren fehlgeschlagen" },
}));
```

## Do / Don't

**Do** put a CopyButton beside the text it copies, close enough that the
check lands next to what just landed on the clipboard.

**Don't** use it as a general icon button, and don't queue uploads or
navigation on its click — the contract is a clipboard write and an
announcement, nothing else. For a generic icon-only button, use
[IconButton](/components/icon-button) directly.

## API

<!-- @api CopyButton -->
