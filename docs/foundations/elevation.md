# Elevation

Loom reads depth from two things working together: a rhythm of three
background lightnesses, and three shadows kept small and cool enough to stay
believable as depth rather than glow.

<script setup lang="ts">
import { Surface, Button } from "@ecoma-io/loom";
</script>

## Sunken, background, card

`AppHeader`'s own source states the rhythm directly: **sunken < background <
card**. Work surfaces sit on `background`; a card floating above the page is
`card`, white and lifted; workspace chrome around the edges — a sidebar, a
rail — is `sunken`, one step darker than `background`, so navigation recedes
instead of competing with the content above it. `SidebarNav` is the real
consumer: its root is `bg-sunken`.

<Demo title="The rhythm, stacked" flush>
  <div class="flex w-full gap-3 bg-sunken p-4">
    <div class="flex h-24 flex-1 items-center justify-center rounded-md text-xs text-muted-foreground">
      sunken
    </div>
    <div class="flex h-24 flex-1 items-center justify-center rounded-md bg-background text-xs text-foreground">
      background
    </div>
    <div class="flex h-24 flex-1 items-center justify-center rounded-md border border-border bg-card text-xs text-card-foreground shadow-sm">
      card
    </div>
  </div>
</Demo>

On the paper-light ground a white `card` already reads as raised against the
cooled-grey `background` beneath it, purely from the lightness step — that is
what `Surface`'s own source calls "hairline over shadow": a `card` variant
needs only a hairline border to read as a distinct surface, and `overlay` is
the one variant that adds a real shadow, because it is the one meant to float
above everything else rather than merely sit apart from it.

<Demo title="Surface: card, muted, overlay">
  <Surface variant="card" pad="sm">card</Surface>
  <Surface variant="muted" pad="sm">muted</Surface>
  <Surface variant="overlay" pad="sm">overlay</Surface>
</Demo>

## Three shadows

<!-- @tokens shadow -->

Each step is reserved for a different weight of surface, not chosen by "how
much depth looks right" per component:

- **`shadow-sm`** — a resting control that sits slightly proud of the surface
  under it: `Button`'s `primary` and `destructive` variants, a `Switch`'s
  thumb, `SegmentedControl`'s sliding indicator.
- **`shadow-md`** — a floating panel anchored to a trigger: `DropdownMenu`,
  `Popover`, `Select`'s listbox, `Tooltip`, `Menubar`'s open menu, `Surface`'s
  own `overlay` variant.
- **`shadow-lg`** — reserved for the two surfaces that take over the screen
  rather than float beside something: `Dialog`'s panel and a `Toast`.

All three are cool and low-alpha — every shadow in `theme.css` is built from
the same desaturated, near-black neutral, only the alpha and spread change —
which is what keeps a shadow reading as depth against the paper ground rather
than as a dark smear.

## The focus halo

`--shadow-halo` is a warp-coloured haze added **around** the crisp
`:focus-visible` outline, on top of it, never replacing it — so the outline
underneath still shows even where the halo itself is suppressed. Nearly every interactive primitive pairs
the two together: `focus-visible:outline-2 focus-visible:outline-offset-2
focus-visible:outline-ring focus-visible:shadow-halo`.

<Demo title="Tab to the button to see the ring and the halo together">
  <Button variant="primary">Focus me</Button>
</Demo>
