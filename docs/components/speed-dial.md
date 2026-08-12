# SpeedDial

One prominent circular button that expands into a short fan of related actions —
the floating-action-button pattern. It carries the single most likely thing to do
on a screen, with its three or four nearest neighbours a press away.

Underneath the circle it is a menu button, and it is built on the same Reka UI
parts as [DropdownMenu](./dropdown-menu.md): `aria-haspopup="menu"` on the
trigger, `aria-expanded` tracking the state, one Tab stop with roving focus
across the actions, Esc closing the fan and returning focus to the trigger. What
a SpeedDial adds is shape — a circular trigger, a fan of labelled pills rather
than a panel of rows, and a direction to fan out in.

Reach for [DropdownMenu](./dropdown-menu.md) when the trigger belongs in a
toolbar or a table row and the commands read as a list, and for
[Button](./button.md) when there is one action and no menu at all. A SpeedDial
that has grown past four or five actions has become a menu and should be one.

<script setup lang="ts">
import { SpeedDial } from "@ecoma-io/loom";
import { FilePlus, Upload, UserPlus } from "@lucide/vue";
import SpeedDialDemo from "../../src/primitives/SpeedDial/SpeedDialDemo.vue";
import speedDialDemoSource from "../../src/primitives/SpeedDial/SpeedDialDemo.vue?raw";

const quickActions = [
  { label: "New document", icon: FilePlus },
  { label: "Invite a teammate", icon: UserPlus },
  { label: "Upload a file", icon: Upload },
];
</script>

<Demo title="SpeedDial">
  <SpeedDial :actions="quickActions" label="Create" />
</Demo>

## Usage

```vue
<script setup lang="ts">
import { SpeedDial, type SpeedDialAction } from "@ecoma-io/loom";
import { FilePlus, Upload, UserPlus } from "@lucide/vue";

const actions: SpeedDialAction[] = [
  { label: "New document", icon: FilePlus },
  { label: "Invite a teammate", icon: UserPlus },
  { label: "Upload a file", icon: Upload },
];

function onSelect(action: SpeedDialAction, index: number) {
  // The host decides what the action means.
}
</script>

<template>
  <SpeedDial :actions="actions" label="Create" class="fixed bottom-6 right-6" @select="onSelect" />
</template>
```

## Actions

An action is a `label`, an optional `icon` and an optional `disabled`. The label
is required and it is **visible text**, not a tooltip: it rides beside the glyph
on the action itself. A vertical stack of unlabelled circles is the failure mode
of this pattern — it reads only to whoever already knows the icons — and a
`title` attribute does not rescue it, because a `title` is not an accessible name
and never appears at all for a touch or keyboard user.

The icon is decoration on top of that label, and it is hidden from assistive
technology for the same reason: the text is already saying what the action is.

A `disabled` action still renders. It is announced as disabled, skipped by the
keyboard, and selects nothing on either the pointer path or the keyboard one,
which is the honest way to show that an action exists and is currently out of
reach.

Its pill drains to the neutral well and gives up its elevation, rather than
fading. Each action floats over the page with nothing behind it, so an opacity
composites the label against whatever happens to be underneath — the words that
name the unavailable action are the last thing that can afford to go.

Its rim is the one place a Loom control does **not** follow the library's
disabled row, which slackens the border from `--color-input` to the lighter
`--color-border`. Every other control drains against a surface that stays behind
it; this one does not, so once the elevation goes the rim is all that delimits
the pill, and `--color-muted` on the page ground is 1.12:1. The rim tightens to
`--color-border-strong` instead — an unavailable action still has to be findable
before it can read as unavailable.

`select` carries the action itself and its index in `actions`. The index is the
stable identity — a label is display text and gets translated, so matching on one
is a bug waiting for the first locale.

## Direction

`direction` is which side of the trigger the fan opens onto: `up` (the default),
`down`, `left` or `right`. It decides three things at once, and they stay in
agreement: which side the fan is placed on, which axis it stacks along, and which
arrow keys walk it.

The actions always render in array order along the fan's own reading direction —
top to bottom for `up` and `down`, left to right for `left` and `right`. That
means the arrow keys, the screen reader's reading order and the eye all move the
same way. The alternative, putting `actions[0]` nearest the trigger in an upward
fan, is the more familiar convention and it costs Arrow Down moving the highlight
_up_ the screen, which is not a trade worth making.

The fan flips to the opposite side if there is not room for it where it was
asked to go, the same as any other popover on this site.

<Demo title="Direction">
  <div class="flex flex-wrap items-center gap-10">
    <SpeedDial :actions="quickActions" label="Create, opening upward" direction="up" />
    <SpeedDial :actions="quickActions" label="Create, opening downward" direction="down" />
    <SpeedDial :actions="quickActions" label="Create, opening leftward" direction="left" />
    <SpeedDial :actions="quickActions" label="Create, opening rightward" direction="right" />
  </div>
</Demo>

## Placement

**Positioning is yours, not the component's.** SpeedDial renders as an ordinary
inline-level element and pins itself to nothing. A library that nailed itself to
a viewport corner could never be placed in a panel, a card or a map — so the
`class` you pass lands on the trigger and decides where it sits:

```vue
<!-- The classic: pinned to the viewport's bottom-right corner. -->
<SpeedDial :actions="actions" label="Create" class="fixed bottom-6 right-6 z-40" />

<!-- Or inside a panel that is itself `relative`. -->
<SpeedDial :actions="actions" label="Create" class="absolute bottom-4 right-4" />
```

The fan is deliberately not modal, and that follows from the same decision. A
modal menu locks the page behind it and compensates for the vanished scrollbar
with padding — which widens the viewport and slides a viewport-pinned trigger
sideways the moment it is pressed. A control whose whole job is to sit in a
corner cannot jump out of it on press, so the page keeps scrolling and the fan
stays attached to the trigger.

<Demo title="Pinned inside a panel">
  <div class="relative h-40 w-full overflow-hidden rounded-md border border-border bg-sunken">
    <p class="p-4 text-sm text-muted-foreground">A panel, with the dial pinned to its corner.</p>
    <SpeedDial :actions="quickActions" label="Create, pinned in a panel" class="absolute bottom-4 right-4" />
  </div>
</Demo>

## Keyboard and screen readers

The trigger has no text of its own — a lone glyph names nothing — so `label` is
required and becomes its accessible name. Both glyphs on it are hidden from
assistive technology, leaving that one name in play.

- **Enter, Space or Arrow Down** on the trigger opens the fan and moves focus
  into it.
- **Arrow Down and Arrow Up** walk the actions in a vertical fan; **Arrow Right
  and Arrow Left** walk a horizontal one. The whole fan is one Tab stop with
  roving focus, not one stop per action.
- **Typing a character** jumps to the first action starting with it.
- **Home and End** go to the first and last action.
- **Enter or Space** chooses the focused action and closes the fan.
- **Esc, or a click outside,** closes it and returns focus to the trigger.

The fan announces the orientation it is actually laid out on, so a horizontal fan
is not described as a vertical menu while the horizontal arrow keys are the ones
moving through it.

## Motion

The trigger's glyph cross-fades into a close cross on `duration-fast`, the
feedback lane every press in Loom uses — the swap is a direct response to a
press, so it may not be slower than that. It cross-fades rather than simply
rotating 45° into a cross because the glyph can be replaced with your own, and a
pencil rotated 45° is a tilted pencil rather than a dismissal.

The actions themselves `animate-scale-in`, one after another, on the shared list
stagger — the same rhythm and the same cap as every other revealed list on this
site, so a fifth action does not trail in noticeably later than the second. That
stagger is entry only. Collapsing has no animation at all: the fan unmounts in
one frame, which is what keeps the reverse from playing out as a staggered
mess.

Everything here runs on CSS animation and transition, so the global
`prefers-reduced-motion` rule collapses all of it.

<Demo title="Every state" :source="speedDialDemoSource">
  <SpeedDialDemo />
</Demo>

## API

<!-- @api SpeedDial -->
