# Typography

Loom self-hosts one type family — Geist for prose, Geist Mono for anything
tabular — and exposes it as a named scale rather than as raw size and weight
utilities.

<!-- @tokens text -->

## A view composes the scale

`theme.css` states the reason directly: a view composes `text-display`,
`text-heading`, `text-title`, `text-body`, `text-small` or `text-micro`
instead of hand-picking a size, a weight and a tracking value per heading.
Each utility above carries all three together — size, line height and, where
the step calls for it, a weight and a negative letter-spacing — so choosing a
step is one decision instead of three independent ones that can drift out of
proportion with each other. `font-*` and `tracking-*` utilities still work on
top of any of them; reach for those only for a deliberate divergence from the
step, not as the default way to set type.

Six steps, and what each is for:

- **`text-display`** — the largest heading a screen has, tight line height and
  a small negative tracking so its own heavy weight does not read loose.
- **`text-heading`** — a section heading below the page's own display text.
- **`text-title`** — a card or panel's own title, no tracking adjustment,
  meant to sit above body copy inside a smaller surface than a full section.
- **`text-body`** — the default reading size, with a generous line height for
  paragraphs of prose rather than UI labels.
- **`text-small`** — captions, helper text, secondary metadata.
- **`text-micro`** — the smallest step: badges, timestamps, anything that
  trades legibility for density on purpose.

<Demo title="The scale, top to bottom">
  <div class="flex w-full flex-col gap-3">
    <p class="text-display">Display</p>
    <p class="text-heading">Heading</p>
    <p class="text-title">Title</p>
    <p class="text-body">Body — the default reading size, set for paragraphs of prose.</p>
    <p class="text-small">Small — captions and helper text.</p>
    <p class="text-micro">Micro — badges and timestamps.</p>
  </div>
</Demo>

## Two families, and why both are self-hosted

```css
--font-sans: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
--font-mono: "Geist Mono", ui-monospace, "SF Mono", "JetBrains Mono", monospace;
```

`src/styles/fonts.css` vendors both faces as variable `woff2` files (weight
100–900) under the SIL Open Font License, rather than pulling them from a
CDN. That is the same offline-safe rule the rest of the library follows:
nothing about rendering the library's own type depends on a network request
succeeding, and no third party learns which page loaded from the font
request.

`--font-mono` is not only for code. The `tabular` utility
(`font-variant-numeric: tabular-nums` plus `font-family: var(--font-mono)`)
switches any element that carries meaning in aligned digits — an identifier, a
count, a column of numbers a reader scans down — onto the monospace metrics so
the digits line up.

<Demo title="tabular for aligned numerics">
  <div class="flex flex-col items-end gap-1">
    <span class="tabular text-body">1,204.50</span>
    <span class="tabular text-body">12.00</span>
  </div>
</Demo>
