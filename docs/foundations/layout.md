# Layout

Loom's layout vocabulary is a breakpoint scale, and deliberately nothing
else — there is no accompanying spacing scale or height vocabulary of its
own. Spacing is Tailwind's own scale, used directly; a component picks
`gap-2`, `p-4`, `h-14` the same way any Tailwind project would, because
spacing is not a place this design system found a reason to diverge from the
framework's defaults.

## The breakpoint scale

Tailwind ships its own scale up to `2xl`, and `theme.css` uses those five
names unmodified — `sm` (40rem / 640px), `md` (48rem / 768px), `lg` (64rem /
1024px), `xl` (80rem / 1280px) and `2xl` (96rem / 1536px) are Tailwind's own
defaults, not redeclared anywhere in Loom's token file. `@theme` merges
rather than replaces, so adding new steps on top leaves those five intact.

Three more are Loom's own addition, because that default scale stops short of
where the desktop products in this ecosystem actually run:

<!-- @tokens breakpoint -->

The comment beside them is explicit about what each maps to in practice:
`3xl` is a maximized window on a single FHD monitor, `4xl` is QHD, `5xl` is a
21:9 ultra-wide. The rule for using them is stated just as directly — snap a
window's minimum width to one of these names, never to an arbitrary pixel
count, the same discipline the rest of the token system asks for everywhere
else.

`AppHeader` is the concrete example already in the library: its two-row
collapse below `sm` is a real consumer of the scale's low end, driven by
measuring what a brand, a search field and a trailing cluster actually need
at 390px rather than by an arbitrary guess.

## Width only

The comment in `theme.css` states the omission on purpose: **width only —
there is deliberately no height vocabulary.** A breakpoint answers "how much
horizontal room is there," which is a question about the viewport a layout is
composed for. Height is a property of content, not of the device class
rendering it, so no `--breakpoint` equivalent exists for it, and a component
that needs a height decision makes it with Tailwind's ordinary `h-*` scale
rather than reaching for a token that does not exist here.
