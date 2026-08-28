# LiveRegion

A shared announcement seam for assistive tech. One part is a permanently
mounted, visually hidden `aria-live` region — `<LiveRegion politeness="polite"
/>`; the other is `useAnnounce()`, the composable any component or composable
calls to push a message into it. The region exists before the first message
because a live region only announces **changes** that happen after it exists:
a region added in the same tick as its message, or toggled into existence per
message, is announced unreliably or not at all.

<script setup lang="ts">
import LiveRegionDemo from "../demos/LiveRegionDemo.vue";
import liveRegionDemoSource from "../demos/LiveRegionDemo.vue?raw";
</script>

<Demo title="One seam, two politenesses, always mounted" :source="liveRegionDemoSource">
  <LiveRegionDemo />
</Demo>

## Usage

```vue
<script setup lang="ts">
import { LiveRegion, useAnnounce } from "@ecoma-io/loom";

// Any component — call once in setup.
const announce = useAnnounce();
</script>

<template>
  <LiveRegion politeness="polite" />
  <LiveRegion politeness="assertive" />
  <button @click="announce('3 results found')">Search</button>
</template>
```

`announce(message, politeness = "polite")` routes the message to the mounted
region registered for that politeness. If no region for that politeness is
mounted, the message still lands: the first `useAnnounce()` call with no
region in the tree mounts a polite/assertive pair on `document.body` and the
message goes there. A region mounted in the tree always outranks the
standalone pair, so an application that mounts its own regions near the shell
owns its announcements completely.

## Where to mount it

Beside the app shell, next to the toast viewport and the skip link — mounted
once, empty, for the lifetime of the page. Two regions cover the vocabulary
of urgency: one `polite`, one `assertive`. Do not toggle a region on to
deliver one message and unmount it after; that is exactly the unreliability
the permanence exists to prevent.

## Polite or assertive

`politeness` maps onto `aria-live` verbatim — `polite` waits its turn,
`assertive` interrupts whatever is being read. The bar from the Toast
severity work applies here too: an assertive announcement can swallow what
the screen reader was already saying, so it belongs to the messages a user
must not miss, not to messages a user should hurry for. Nothing is layered
on top — no `role="status"` or `role="alert"`, because the politeness prop is
the whole semantic contract and duplicating it in a role would only let the
two disagree.

## Repeating a message

Assistive tech announces a region's _changes_, so rewriting identical text in
place announces nothing. `announce()` clears the region and re-adds the
message across the next frame — the repeat is a real content addition, and
"Saved" announced twice plays twice.

## A LiveRegion is not a Toast

`Toast` is a visible card that announces its own appearance and leaves a
dismissible record on screen. `LiveRegion` announces and leaves nothing: no
visual, no dismissal, no viewport. It is the seam for announcements that have
no UI of their own — a result count, a filter outcome, a background failure.
Components that currently carry ad-hoc hidden `aria-live` regions of their
own (Toast, TagsInput, Carousel) could adopt this seam later; that adoption
is a follow-up, not part of this change.

## Labels

The component owns no localisable strings — the messages are the caller's —
so there is no labels prop and nothing to translate.

## API

<!-- @api LiveRegion -->
