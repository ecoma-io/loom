# Avatar

A person or agent's picture, with a graceful initials fallback for no `src`,
a broken URL, or an image that is still loading. It is built on Reka UI's
Avatar, which paints the image only once it has actually finished loading —
the fallback stays visible the whole time until then, so first paint is
always either the real photo or the initials, never a broken-image icon.

<script setup lang="ts">
import { Avatar } from "@ecoma-io/loom";
import AvatarDemo from "../../src/primitives/Avatar/AvatarDemo.vue";
import avatarDemoSource from "../../src/primitives/Avatar/AvatarDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Avatar } from "@ecoma-io/loom";
</script>

<template>
  <Avatar src="/ada.jpg" alt="Ada Lovelace" fallback="AL" />
</template>
```

## Fallback behaviour

`Avatar` only shows the image once it has loaded successfully. The initials
in `fallback` are visible from the first paint and disappear exactly when
the real image is ready. No `src`, an empty `src`, and a `src` that fails to
load all resolve to the same state: the fallback stays on screen.

`fallback` takes a string the caller has already reduced to initials — for
example "AL" for "Ada Lovelace". The component does not derive it from `alt`.

## Accessible name

Always pass `alt` describing the person or agent in the picture. It lands
directly on the inner `<img>` (`AvatarImage` requires it, so a screen reader
announces the picture's actual subject).

## Sizes

<Demo title="Sizes">
  <Avatar size="sm" fallback="SM" alt="Small" />
  <Avatar size="md" fallback="MD" alt="Medium" />
  <Avatar size="lg" fallback="LG" alt="Large" />
</Demo>

`lg` is for a profile header or a detail page; `sm` is for a dense list row
or a comment; `md` is the default membership-card size.

## Motion

Reka paints the image only once it has loaded, so `animate-scale-in` plays
at exactly the moment the photo replaces the initials — a gentle settle
rather than a hard swap. Under `prefers-reduced-motion` the settle is
instant, per the reduced-motion rule in the global stylesheet.

<Demo title="Every state" :source="avatarDemoSource">
  <AvatarDemo />
</Demo>

## API

<!-- @api Avatar -->
