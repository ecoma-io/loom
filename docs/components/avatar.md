# Avatar

A person or entity in a picture, with a graceful initials fallback for no `src`,
a broken URL, or an image that is still loading. It is built on Reka UI's
Avatar, which paints the image only once it has actually finished loading —
the fallback stays visible the whole time until then, so first paint is
always either the real photo or the initials, never a broken-image icon.

Two neighbours are worth naming. Several faces standing for one thing — the
people on a task, the entities on a run — are an [AvatarGroup](./avatar-group),
which owns the overlap, the stacking order and the "+3" so that a row of them
is one object to a screen reader rather than a handful of unrelated images.
Anything pinned onto the avatar's corner — a presence dot, an unread count —
is an [Indicator](./indicator) wrapped around it; this component deliberately
draws nothing there, precisely so the corner stays free.

<script setup lang="ts">
import { Avatar } from "@ecoma-io/loom";
import AvatarDemo from "../demos/AvatarDemo.vue";
import avatarDemoSource from "../demos/AvatarDemo.vue?raw";
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

Always pass `alt` describing the person or entity in the picture. It lands
directly on the inner `<img>` (`AvatarImage` requires it, so a screen reader
announces the picture's actual subject).

## Sizes

<Demo title="Sizes">
  <Avatar size="xs" fallback="XS" alt="Extra small" />
  <Avatar size="sm" fallback="SM" alt="Small" />
  <Avatar size="md" fallback="MD" alt="Medium" />
  <Avatar size="lg" fallback="LG" alt="Large" />
  <Avatar size="xl" fallback="XL" alt="Extra large" />
</Demo>

`md` is the default membership-card size. `sm` is for a dense list row or a
comment and `xs` for a table cell, where the avatar is a marker beside text
rather than a portrait; `lg` is for a profile header and `xl` for a detail
page, where it is the subject of the block rather than an ornament on it.

The five heights are a single `cva` map held to the `AvatarSize` union by
`satisfies`, so a sixth size added to the type and forgotten in the map is a
compile error rather than an avatar that silently renders at no size at all.

## Shape

`circle`, the default, is a person. `square` is for a subject a circle would
misdescribe — an organisation, a project, a repository — and it is a rounded
square rather than a hard one.

Its corner is not one value. `rounded-md` is Loom's control radius, calibrated
against a control around 36px tall; held flat across this scale it is a third
of the side on the 24px tile, where a milled fillet stops reading as a corner
and starts reading as a blob, and it has all but vanished on the 64px one. So
the radius steps with the size and keeps the corner between a sixth and a
quarter of the side throughout — the nesting law from the token file, applied
to a tile whose padding is its own edge.

<Demo title="Shape">
  <Avatar shape="square" size="xs" fallback="LO" alt="Loom, extra small" />
  <Avatar shape="square" size="sm" fallback="LO" alt="Loom, small" />
  <Avatar shape="square" size="md" fallback="LO" alt="Loom, medium" />
  <Avatar shape="square" size="lg" fallback="LO" alt="Loom, large" />
  <Avatar shape="square" size="xl" fallback="LO" alt="Loom, extra large" />
</Demo>

## Default and accent variants

An avatar that should stand out from the default — to mark a highlighted
category, a distinct role, or an item the reader should notice at a glance —
uses `variant="accent"`. The default (no `variant`) is what every existing
caller already gets.

`accent` is deliberately Badge's own name for that second variant rather than a
second word for one idea, and it means here exactly what it means there:
accent-marked items, never decoration.

The treatment is two signals rather than one, because a colour on its own is
not a state this library is allowed to convey. An accent avatar wears a rim in
the accent colour — and the rim's _presence_ is what a reader who cannot resolve
the hue still sees, since a default avatar has no edge at all — and it carries a
visually hidden `accentLabel`, "Accent" by default, for the reader who sees no
avatar. Localise that string; clear it only when something around the avatar
already says the same thing, which is what `AvatarGroup` does.

The corner is left alone on purpose. That is Indicator's, and a presence dot
pinned there would land on top of anything drawn in the same place.

<Demo title="Default and accent">
  <Avatar fallback="AL" alt="Ada Lovelace" />
  <Avatar variant="accent" fallback="WV" alt="Weaver" />
  <Avatar variant="accent" shape="square" fallback="ND" alt="Nightly digest run" />
</Demo>

## Motion

Reka paints the image only once it has loaded, so `animate-scale-in` plays
at exactly the moment the photo replaces the initials — a gentle settle
rather than a hard swap. Under `prefers-reduced-motion` the settle is
instant, per the reduced-motion rule in the global stylesheet.

Nothing else here moves. An avatar is an identity on a page, and identities do
not need to announce themselves twice.

<Demo title="Every state" :source="avatarDemoSource">
  <AvatarDemo />
</Demo>

## API

<!-- @api Avatar -->
