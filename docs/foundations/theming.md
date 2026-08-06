# Theming

## What a consumer imports

```css
@import "@ecoma-io/loom/styles/global.css";
```

One import is the whole surface a normal host needs: the Tailwind engine,
`theme.css`'s tokens, the self-hosted Geist faces, the base element styling
in `@layer base`, and the motion keyframe library. `package.json`'s `exports`
map is the complete list of what can be imported by path, and it names
exactly three stylesheets:

- **`@ecoma-io/loom/styles/global.css`** — the one import above; pulls in the
  other two.
- **`@ecoma-io/loom/styles/theme.css`** — the tokens alone.
- **`@ecoma-io/loom/styles/fonts.css`** — the `@font-face` declarations alone.

A host assembling its own Tailwind entry rather than taking `global.css`
outright can import `theme.css` and `fonts.css` separately — they are
exported for exactly that — but it then owns the import order itself, and
Tailwind's own `@import "tailwindcss"` has to come first, or `@theme` has no
engine registered yet to attach its tokens to.

## What is overridable

Every value on the four foundations pages above is a custom property, which
means every one of them can be overridden from outside the library, the
ordinary CSS way — redeclaring the variable at a scope that wins the
cascade. Nothing about a Loom component reaches past its own tokens to a
literal value, so overriding the token is overriding the component; there is
no second, more specific place a colour or a radius is hiding.

## What is not

**There is no runtime light/dark switch.** `theme.css` states the reasoning
up front: Loom is light-first by design, for a daytime operations tool, and
the paper-light theme is the single default rather than one of two the
library ships and lets a host pick between. A symmetric dark theme is named
explicitly as a reserved seam — a deliberate gap in the design, not an
oversight — that returns with the first surface that actually needs one, not
before. This documentation site's own configuration reflects the same
decision: its `appearance` option is set to `false`, which removes
VitePress's own light/dark toggle rather than shipping a control that would
only half work, switching the site's chrome dark while every live component
demo on the page stayed on the one palette underneath it.

**`@theme static` rather than plain `@theme`.** Tailwind's default `@theme`
only emits the CSS variables its own generated utilities actually reference,
which would silently drop every token an inline `style` binding or a
`@keyframes` block reads directly instead of through a class — and Loom has
several of exactly that shape (`var(--duration-fast)` inside a component's
own `:style`, for one). `static` is what makes all of them emit regardless,
so a token stays resolvable from anywhere, not only from the utility
classes Tailwind happens to generate for it.
