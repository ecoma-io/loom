# Colour

`src/styles/theme.css` is the only place a colour is declared. Nothing in a
component is a literal hex or `hsl()` — every fill, border and text colour a
component renders is one of the custom properties below, reached through a
Tailwind utility (`bg-primary`, `text-muted-foreground`, `border-border`).
That single source is what the table below reads at build time, so it can
never say something `theme.css` does not.

<!-- @tokens color -->

## The neutrals

The ground is a cooled, technical paper rather than a pure white — `background`
is tilted toward the same hue family as the brand colours so nothing on top of
it fights for temperature. `card` is true white,
which is what makes a card read as lifted off the page without needing a
shadow to say so. `sunken`, one step darker than `background`, is reserved for
workspace chrome — a sidebar, a rail — so navigation recedes and the content
above it reads as the raised surface. `muted` and `subtle` are both neutral
fills below that: `muted` for a quietly de-emphasized block (a disabled
field's own background, a secondary badge), `subtle` specifically for a
hover/press state — a hover is not an action colour, so it never borrows from
`primary`. `muted-foreground` is the quietest _text_ the language allows, and
one step lighter, `muted-foreground-soft`, is a graphical object's step of the
same ladder: a glyph that must keep clearing the 3:1 floor of WCAG 1.4.11
while receding behind `muted-foreground` — the disabled Rating's unfilled
stars, which carry the maximum. It is never text: text is held to 4.5:1, and
a value that cannot reach that floor is a different token, not a faded one.

Two border weights exist for the same reason two neutrals do: `border` is a
hairline that recedes everywhere by default, and `border-strong` is reserved
for the few places that must assert an edge — an active panel, a keyboard
target zone — rather than for every border that "feels like it should stand
out."

## Two action colours

Loom's colour system has two action colours, and each carries a distinct
semantic role:

- **Primary** (`--color-primary`) — the default action colour: what a person
  authors and decides. `--color-ring`, the focus ring, is the same hue for the
  same reason — keyboard focus is a person acting.
- **Accent** (`--color-accent`) — a second semantic colour for contrast or
  emphasis distinct from the primary action. A surface only carries it when the
  thing happening on it genuinely calls for a colour other than primary.

Each action colour gets a "wash" — `primary-muted` and `accent-muted` — a pale
tint of its own hue for a selected or accent-marked surface fill, distinct
from a hover state's neutral `subtle`.

## Functional hues

`destructive`, `success`, `warning` and `info` are deliberately outside both
action hues, so a status colour can never be misread as "a primary action" or
"an accent-marked action." None of the four is reused as an action colour
outside its own meaning.

Each carries its own wash too — `destructive-muted`, `success-muted`,
`warning-muted`, `info-muted` — on the same pattern as the two action colours. Reach
for one whenever a status needs a _fill_ rather than a mark: a badge's ground,
a selected chip, the panel behind an inline error. The strong hue then goes on
top of it, as the text or the hairline, and every pairing holds at least 4.5:1.

**Reach for the wash rather than an alpha of the base hue.** Writing
`bg-warning/12` looks equivalent and is not: an alpha fill composites against
whatever sits behind it, so the same badge comes out one colour on a `card` and
another on `sunken`, and a reader cannot learn a status tint that moves. The
washes are opaque for exactly that reason. If you find yourself picking a
percentage, the answer is a token.

## Scrims

An overlay's scrim is `foreground` at one of two named weights, written as a
modifier — `bg-foreground/scrim` and `bg-foreground/scrim-light`:

<!-- @tokens opacity -->

The choice is a statement about the surface, not a taste setting. `scrim` is
for a surface that **interrupts**: a dialog demands an answer, so the page
behind it drops to context. `scrim-light` is for a surface worked **alongside**
its page — a drawer where you tune a filter and watch the rows change behind
it — so that page stays legible and stays the subject. Pick by which of those
two things the overlay is, and a third overlay will land in the right place
without anyone having to rediscover the reasoning.

## Dark mode

The dark palette mirrors the light one with inverted lightness: the paper
ground becomes near-black, the text becomes off-white, and the elevation
gradient runs upward through lighter backgrounds instead of downward through
shadows. Every token above has a dark counterpart declared under
`:root[data-theme="dark"]`, and switching between the two is a single
attribute change on `<html>` — no partial overrides, no fallback to light.

The [theming page](/foundations/theming) covers the switching API, flash
prevention, and the dark token design principles.
