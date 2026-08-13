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

## Two forces

Ecoma's form language is dual-force, and the two action colours encode it
rather than decorate it:

- **Human — warp** (`--color-primary`) — what a person
  authors and decides. It is also the default action colour: `primary`
  doubles as both because a person drives the interface. `--color-ring`, the
  focus ring, is the same hue for the same reason — keyboard focus is a person
  acting.
- **Agent — weft** (`--color-agent`) — work an agent is
  running or has produced. It never appears as a default action colour; a
  surface only carries it when the thing happening on it genuinely is agent
  work.

Each force gets a "wash" — `primary-muted` and `agent-muted` — a pale tint of
its own hue for a selected or agent-driven surface fill, distinct from a hover
state's neutral `subtle`.

## Functional hues

`destructive`, `success`, `warning` and `info` are deliberately outside both
force hues, so a status colour can never be misread as "a person did this" or
"an agent did this." None of the four is reused as an action colour outside
its own meaning.

Each carries its own wash too — `destructive-muted`, `success-muted`,
`warning-muted`, `info-muted` — on the same pattern as the two forces. Reach
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

## The seam

The one place the two forces are allowed to touch visually is a gradient
between them, interpolated in OKLCH so the midpoint never turns muddy grey:

<!-- @tokens seam -->

Reach it through the `bg-seam` utility (`background-image: var(--seam)`), and
only where the two forces are actually meeting — a handoff, a co-authored
asset, a brand moment. `theme.css` states the restriction directly: never
under body text, never on anything smaller than 20px, and never as an
interaction state. The seam marks a moment where human and agent work meet,
not a decoration to reach for because it looks good — a hover state or a
selected row still uses the ordinary force colours above.
