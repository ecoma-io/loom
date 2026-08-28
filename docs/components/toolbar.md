# Toolbar

A named row of controls behind **one Tab stop**, in the WAI-ARIA [toolbar
pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/). Tab enters the
toolbar once and lands on its active control; Tab again leaves it; the arrow
keys walk between the controls inside. Without it, a formatting strip of
seven controls costs a keyboard user seven Tab presses to walk past.

<script setup lang="ts">
import ToolbarDemo from "../demos/ToolbarDemo.vue";
import toolbarDemoSource from "../demos/ToolbarDemo.vue?raw";
</script>

<Demo title="One Tab stop, arrow-key roving, heterogeneous controls" :source="toolbarDemoSource">
  <ToolbarDemo />
</Demo>

## Usage

```vue
<script setup lang="ts">
import { IconButton, Select, Toolbar, ToolbarSeparator } from "@ecoma-io/loom";
import { Bold, Italic, Underline } from "@lucide/vue";
import { ref } from "vue";

const bold = ref(false);
</script>

<template>
  <Toolbar label="Text formatting">
    <IconButton label="Bold" variant="ghost" :class="bold ? 'bg-subtle' : ''" @click="bold = !bold">
      <Bold class="size-4" />
    </IconButton>
    <IconButton label="Italic" variant="ghost">
      <Italic class="size-4" />
    </IconButton>
    <IconButton label="Underline" variant="ghost" disabled>
      <Underline class="size-4" />
    </IconButton>
    <ToolbarSeparator />
    <Select :options="[{ value: '14', label: '14 px' }]" aria-label="Font size" class="w-24" />
  </Toolbar>
</template>
```

## Participation needs no contract on the controls

The toolbar collects its own focusable descendants — `button`, `input`,
`select`, `textarea`, links with `href`, `summary`, and anything carrying a
real `tabindex` — whenever it renders and whenever its subtree changes, and
manages their `tabindex` itself. **Any control participates by being slotted
in**: a Loom `IconButton`, a native `<button>`, a `Select`, a text input, all
in the same toolbar, with no wrapper component and no registration prop. The
first enabled, visible control holds `tabindex="0"`; every other stop holds
`-1`; the arrow keys move focus and the stops follow it.

The roving index never lands on a control that is disabled (`disabled` or
`aria-disabled="true"`) or hidden (`hidden`, `aria-hidden="true"`, or removed
from the render tree) — such controls are skipped by the arrows but keep
their position, exactly as the pattern prescribes. Visibility is measured
with `getComputedStyle` in the browser, so CSS-hidden controls are skipped
too; only inline-style and attribute visibility resolve under jsdom, which
the unit tests work within.

## Keyboard map

| Key                 | Action                                                      |
| ------------------- | ----------------------------------------------------------- |
| `Tab` / `Shift+Tab` | Enters once (landing on the active control) and leaves once |
| `←` `↑`             | Previous enabled control, wrapping at the edge              |
| `→` `↓`             | Next enabled control, wrapping at the edge                  |
| `Home` / `End`      | First / last enabled control                                |

Wrapping is on, the way an editor's format strip behaves. Every walk key —
both arrow pairs, `Home`, `End` — **inside** an editable control — `input`,
`textarea`, `select`, `contenteditable` — belongs to that control (caret
movement, value stepping, text-field line jumps); Tab is the way out, as it
is everywhere else.

## A toolbar is not a menubar

`Menubar` holds **menus** — its Enter opens a panel and the arrows walk the
panel's rows. A `Toolbar` holds **direct controls** — its keys act
immediately on the thing the toolbar serves. If pressing the control performs
an action on the spot, it is toolbar material; if it opens a menu, it belongs
to a `Menubar`.

## Labels

The component owns no localisable strings, so there is no labels prop: the
toolbar's accessible name is the consumer's to supply (`label`, or a
pass-through `aria-label`), and `ToolbarSeparator` carries no text. Controls
inside bring their own names, as they must anywhere.

## API

<!-- @api Toolbar -->
