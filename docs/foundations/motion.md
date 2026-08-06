# Motion

`theme.css` opens its motion section with the position the rest of the file
follows: motion is meaning, not decoration. Every transition in Loom answers
a question the interface just raised — did my press register, is this list
open now, is something still working — and nothing loops for its own sake
except the two loaders where the loop **is** the message.

## Durations

<!-- @tokens duration -->

`--duration-normal` is called out in its own comment as the feedback
ceiling: the slowest a direct response to input is allowed to take before it
reads as sluggish rather than snappy. `instant` and `fast` sit under it for
presses and micro-interactions; `slow` and `slower` are for the few
transitions that are deliberately unhurried — a panel taking over the screen,
not a button reacting to a click.

Tailwind's own bare `transition-*` utility has no duration namespace of its
own — a component that writes plain `transition-colors` with no explicit
duration still resolves to `--duration-normal`, because `theme.css` sets
`--default-transition-duration` and `--default-transition-timing-function` to
it and to `--ease-out`. Four utilities close the one remaining gap:
`duration-instant`, `duration-fast`, `duration-slow` and `duration-slower`
are declared as `@utility` blocks in `theme.css` itself, because Tailwind's
generated `duration-*` class only accepts a bare millisecond count or an
arbitrary value — not a token name. That is why no component in the source
ever writes an arbitrary value like `duration-[173ms]`.

## Easings

<!-- @tokens ease -->

`ease-out` is the default — an emphasized decelerate, named directly in its
own comment as the one to reach for absent a reason to choose otherwise.
`ease-spring` is a restrained overshoot, used where a motion should feel
released rather than merely stopped: a button's press-and-release, a
checkbox's box scaling back in.

<Demo title="Instant, fast, normal, slow, slower — press to compare">
  <div
    class="h-10 w-10 rounded-md bg-primary transition-transform duration-instant ease-out active:scale-75"
  ></div>
  <div
    class="h-10 w-10 rounded-md bg-primary transition-transform duration-fast ease-out active:scale-75"
  ></div>
  <div
    class="h-10 w-10 rounded-md bg-primary transition-transform duration-normal ease-out active:scale-75"
  ></div>
  <div
    class="h-10 w-10 rounded-md bg-primary transition-transform duration-slow ease-out active:scale-75"
  ></div>
  <div
    class="h-10 w-10 rounded-md bg-primary transition-transform duration-slower ease-out active:scale-75"
  ></div>
</Demo>

## The named animation vocabulary

<!-- @tokens animate -->

The keyframes themselves live in `src/styles/global.css`; the table above is
each one paired with the duration and easing it plays at, under the name a
component actually reaches for (`animate-fade-rise`, not the bare
`fade-rise` keyframe). A few, in the words of their own source comments:

- **`conduct`** — "the weft's shuttle beat": a pulsing ring in the agent
  colour, Force 2's motion voice for "an agent is working."
- **`seam-flow`** — the warp↔weft boundary drifting while a human↔agent
  collaboration is actually running, then going static once the work settles;
  meant to be applied to a `bg-seam` element and stopped deliberately, not
  left looping forever.
- **`toast-in`** — applied to a toast's inner card, sliding in from the same
  edge it is later swiped away on, so an entrance transform never fights a
  live swipe gesture.

<Demo title="fade-rise and scale-in">
  <div class="animate-fade-rise rounded-md border border-border bg-card px-4 py-2 text-sm">fade-rise</div>
  <div class="animate-scale-in rounded-md border border-border bg-card px-4 py-2 text-sm">scale-in</div>
</Demo>

## The reduced-motion contract

`global.css` closes with one rule, applied globally rather than left to each
component to opt into:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Every animation and transition in the library collapses to effectively
instant and non-repeating under the setting — including the loaders, so a
reader who has asked the system for less motion never sees an infinite
shimmer or pulse either. Nothing has to remember to add its own
reduced-motion branch; a component only needs to use Loom's motion utilities
in the first place, and the collapse is inherited for free.
