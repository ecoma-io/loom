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

## Motion that leaves

Every entrance above has a mirror: `fade-out`, `fade-fall` and `scale-out`
answer `fade`, `fade-rise` and `scale-in`, and `slide-out-to-left` and its
three siblings take an edge-anchored panel back off the way it came.

Two rules govern them, and both are visible in the table's own values.
**An exit is shorter than the entrance it mirrors** — a surface arriving is
decelerating into place and is worth watching, while one leaving has already
done its job and should clear the eye rather than hold it. And **an exit runs
on `--ease-in`** where an entrance runs on `--ease-out`: decelerate into
presence, accelerate out of the way. `--ease-in` exists for this and is used
for nothing else.

Reach for an exit whenever you have scoped an entrance. The pairing is written
as two state-scoped classes on the same element:

```vue
<DialogOverlay class="data-[state=open]:animate-fade data-[state=closed]:animate-fade-out" />
```

**Both halves must stay scoped**, and the reason is mechanical rather than
stylistic. Reka's `Presence` keeps a closing element mounted until an
`animationend` arrives, so an unconditional entrance animation — one that
never re-fires — strands an invisible, click-eating overlay over the page. That
is a defect this library actually shipped once. A `data-[state=closed]:`
animation is not a return of that hazard but the cure for its other half: an
animation that _ends_ is exactly what `Presence` is waiting for, so the overlay
leaves on its own timing instead of being cut mid-frame. Reduced motion is safe
too — the global rule collapses the duration to 0.01ms, and a 0.01ms animation
still fires `animationend`.

The four `slide-out-to-*` animations move the `translate` property rather than
`transform`, which is what lets them coexist with a drag gesture written onto
the same element. There is deliberately **no matching `slide-in` family**: a
panel entering from an edge is better served by a transition with
`@starting-style`, which composes with a live swipe where a keyframe would
fight it. `Drawer.vue` documents that split in place, and it is the reason the
vocabulary is asymmetric on purpose.

<Demo title="The pairs, entrance above exit">
  <div class="animate-fade-rise rounded-md border border-border bg-card px-4 py-2 text-sm">fade-rise</div>
  <div class="animate-fade-fall rounded-md border border-border bg-card px-4 py-2 text-sm">fade-fall</div>
  <div class="animate-scale-in rounded-md border border-border bg-card px-4 py-2 text-sm">scale-in</div>
  <div class="animate-scale-out rounded-md border border-border bg-card px-4 py-2 text-sm">scale-out</div>
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
