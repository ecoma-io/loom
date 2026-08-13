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

## Dual themes

Loom ships both a light and a dark theme, declared as symmetric token sets.
The light tokens are the default; the dark tokens override every semantic
colour under `:root[data-theme="dark"]`. Switching replaces the entire set,
so the two cannot drift apart and contrast is verified for each independently.

The single source of truth is the `data-theme` attribute on `<html>`. When
present and set to `"dark"`, the dark palette takes effect; when absent or
set to `"light"`, the light palette applies.

### Theme switching

The `useTheme` composable manages the attribute, persists the preference to
`localStorage`, and resolves a `"system"` mode from the OS preference:

```vue
<script setup>
import { useTheme } from "@ecoma-io/loom/theme";

const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
</script>

<template>
  <button @click="toggleTheme">
    {{ resolvedTheme === "dark" ? "☀️" : "🌙" }}
  </button>
</template>
```

- **`theme`** — the user's preference: `"light"`, `"dark"`, or `"system"`
  (defers to the OS).
- **`resolvedTheme`** — the actual active theme, with `"system"` resolved
  to `"light"` or `"dark"`.
- **`setTheme(preference)`** — set the preference explicitly.
- **`toggleTheme()`** — flip between light and dark. `"system"` resolves
  first and then locks to the opposite.

The primary entry point is `@ecoma-io/loom/theme`, which carries no
component weight. `useTheme` and `themeScript` are also re-exported from
the main entry for convenience.

### Flash prevention on SSR pages

On server-rendered pages, the first frame arrives before Vue hydrates and
before `useTheme` can run. A reader with a stored dark preference would see
a flash of the light theme before the switch kicks in. `themeScript` is an
inline JavaScript string that reads `localStorage` and sets `data-theme`
synchronously, before the browser paints:

```html
<head>
  <!-- …other head content… -->
  <script>
    <%= themeScript %>
  </script>
</head>
```

The script is deliberately tiny and has no dependencies. Inject it into
`<head>` before any stylesheet links so the first frame is already in the
right theme.

### Dark token design

The dark palette follows these principles:

- **Same hue family, inverted lightness** — dark is the mirror, not a new
  palette.
- **Functional colours slightly desaturated** — bright saturated colours on
  dark backgrounds cause eye strain and can fail contrast against dark
  surfaces.
- **Elevation = lighter background, not shadow** — shadows are invisible on
  dark; elevated surfaces use a slightly lighter background instead.
- **Borders brighten** — the hairline that recedes on light must be visible
  on dark.
- **Focus ring stays primary** — the halo shifts to a lighter shade for
  visibility on dark.

### `color-scheme`

`global.css` sets `color-scheme: light dark` on `<html>`, which tells the
browser that both schemes are supported. This enables native dark-mode
rendering for form controls, scrollbars, and other browser chrome that
follows the system preference.

## What is not

**`@theme static` rather than plain `@theme`.** Tailwind's default `@theme`
only emits the CSS variables its own generated utilities actually reference,
which would silently drop every token an inline `style` binding or a
`@keyframes` block reads directly instead of through a class — and Loom has
several of exactly that shape (`var(--duration-fast)` inside a component's
own `:style`, for one). `static` is what makes all of them emit regardless,
so a token stays resolvable from anywhere, not only from the utility
classes Tailwind happens to generate for it.

**Dark tokens are plain CSS overrides, not a second `@theme` block.**
Tailwind's `@theme` directive cannot be scoped with a selector like
`[data-theme="dark"]`, so the dark palette is declared as a regular
`:root[data-theme="dark"] { … }` rule that overrides the same custom
properties the `@theme` block set. The two are structurally distinct — one
is a Tailwind registration, the other is a CSS cascade override — but the
token names are identical, so a consumer reading `var(--color-background)`
gets the right value for whichever theme is active.
