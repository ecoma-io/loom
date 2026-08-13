# Link

A styled anchor for navigating to destinations within the current context or on the wider web.

<script setup lang="ts">
import { Link } from "@ecoma-io/loom";
import LinkDemo from "../../src/primitives/Link/LinkDemo.vue";
import linkDemoSource from "../../src/primitives/Link/LinkDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Link } from "@ecoma-io/loom";
</script>

<template>
  <Link href="/guides">Read the guides</Link>
</template>
```

<Demo title="Link states" :source="linkDemoSource">
  <LinkDemo />
</Demo>

## Variants

Use `default` for standard navigation, `muted` for links with lower emphasis, `accent` for
accent-marked destinations, and `subtle` when the link should sit quietly within surrounding text.

<div class="flex flex-wrap items-center gap-4">
  <Link href="#default" variant="default">Default link</Link>
  <Link href="#muted" variant="muted">Muted link</Link>
  <Link href="#accent" variant="accent">Accent link</Link>
  <Link href="#subtle" variant="subtle">Subtle link</Link>
</div>

Set `underline` to `false` only when the surrounding interface already makes the navigation
affordance clear.

```vue
<Link href="/account" :underline="false">Account</Link>
```

## External links

Set `external` for destinations outside the current site. Link opens the destination in a new tab,
adds `noopener noreferrer`, and appends an icon so the change in browsing context is visible.

```vue
<Link href="https://example.com" external>Visit example.com</Link>
```

## Disabled

A disabled Link renders as a non-interactive `span` with `aria-disabled="true"`, so the unavailable
destination cannot be followed or focused.

```vue
<Link href="/reports" disabled>Reports unavailable</Link>
```

## API

<!-- @api Link -->
