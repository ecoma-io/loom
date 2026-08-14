# Responsive design

Loom's responsive strategy is not a set of breakpoints you memorise — it is a
set of principles that make every layout work from a phone to an ultrawide
monitor without the host writing a single media query.

## Width only

The breakpoint scale measures horizontal room, not vertical. A viewport class
is a question about the device's width; a content area's height is a property
of the content, not the device rendering it. That is why there is no height
breakpoint scale, and why every responsive decision in the library is about
columns wrapping, gaps tightening, or sidebars collapsing — never about rows
compressing.

See [Layout](./layout) for the full breakpoint scale.

## Two responsive mechanisms

### Intrinsic collapse (no media query)

`Sidebar`, `Split`, and every layout that places two regions side by side use
`flex-wrap` rather than a media query. The content area demands a minimum
percentage of the container (usually 50%), and the side panel has a fixed
minimum width. When the container is too narrow to fit both, the layout wraps
and both go full-width. The breakpoint is derived from the components' own
constraints, not from the viewport — which means the collapse works correctly
inside any container, not only at the top of the page.

This is the [Every Layout "Sidebar" pattern](https://every-layout.dev/layouts/sidebar/),
and the reason it is wrapped into a component is that the `calc()` technique
for intrinsic sidebar width is non-obvious and easy to get wrong. Loom
prevents the footgun.

### Viewport-aware steps

`Stack`, `Inline`, `Center`, and the layouts that compose them use viewport
breakpoints for the one thing intrinsic collapse cannot handle: spacing that
should tighten on small screens and widen on large ones. The gap between items
steps down below `sm`, and gutters step up at `3xl` — the component handles
this internally, so the host never writes `gap-2 sm:gap-3` at every call site.

## The ultrawide principle

Content has a maximum readable width. Extra viewport on a QHD or ultrawide
monitor goes to intentional whitespace, side panels, or supplementary content —
**never** to stretching. A line of text that spans 3440px is unreadable, and a
card grid that stretches to fill every pixel is indistinguishable from a
spreadsheet.

`Center` is the composition primitive that enforces this: it caps its content
at a `maxWidth` and centers the result, so a `prose`-width article never
exceeds ~65 characters per line regardless of how wide the monitor is.

The layouts apply the same principle at a larger scale: `AppShell` widens its
content gutters at `3xl`, `Reading` caps its line length, and `Dashboard`
lets the grid auto-fit columns while bounding the overall width.

## Layout responsive behaviour

Every layout documents its responsive transitions. The general pattern:

| Viewport    | Sidebar        | Content                 | Gutters           |
| ----------- | -------------- | ----------------------- | ----------------- |
| Below 48rem | Stacked above  | Full-width              | Tight             |
| 48rem–80rem | Beside content | Fills remaining space   | Standard          |
| 80rem+      | Beside content | Bounded at readable max | Wider (ultrawide) |

The exact thresholds vary by layout — `MasterDetail` collapses at a different
point than `Settings` — but the three-zone pattern (stack / split / bound) is
the same everywhere.

## Container queries

Composition primitives and layouts are built around viewport breakpoints
because that is what the flex-wrap intrinsic collapse pattern uses. A component
that needs to respond to its own container's width — a card that rearranges
when placed in a sidebar versus a main content area — can use CSS container
queries directly. The `@container` breakpoints are not provided as tokens yet;
they are on the roadmap.
