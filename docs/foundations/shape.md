# Shape

Loom's corners are small and even — "milled, never blobby," in `theme.css`'s
own words — and every radius in the library derives from one value.

<!-- @tokens radius -->

`--radius-md` is the only radius declared as a literal length. The other
three are `calc()` expressions against it, stepping down for `sm` and up for
`lg` and `xl` in even increments. Changing the one control radius moves every
step with it, in the same proportion, rather than four independent numbers
that can drift out of relation to each other.

## The nesting law

An element sitting inside a padded container should not share its parent's
radius outright — a tight corner against a wide one reads as a mismatch, not
as "consistent." `theme.css` states the rule: **inner radius = outer radius −
padding, floored at 2px.** Pick the step that honours it for the padding
actually in play, rather than reaching for whichever radius utility "looks
about right."

Two real pairings from the source, both consuming this scale rather than a
literal `border-radius`:

- `Dialog`'s panel is `rounded-lg` with `p-6` padding (24px) around its
  content — the panel's own corner, not an inner element's, so the law does
  not apply to the panel itself. Its own close button, sized independently
  inside the corner, is `rounded-md`.
- `DropdownMenu`'s panel is `rounded-md`; `SegmentedControl`'s sliding
  indicator, inset inside that control's own padding, is `rounded-sm` —
  a smaller step nested inside a larger one, in the direction the law
  describes.

<Demo title="Nesting: an inner corner smaller than the one around it">
  <div class="rounded-lg border border-border bg-card p-4">
    <div class="rounded-sm border border-border-strong bg-muted p-3 text-xs text-muted-foreground">
      inner
    </div>
  </div>
</Demo>

## The four steps, side by side

<Demo title="sm · md · lg · xl">
  <div class="h-16 w-16 rounded-sm border border-border bg-card"></div>
  <div class="h-16 w-16 rounded-md border border-border bg-card"></div>
  <div class="h-16 w-16 rounded-lg border border-border bg-card"></div>
  <div class="h-16 w-16 rounded-xl border border-border bg-card"></div>
</Demo>
