# Meter

<!-- @api Meter -->

`Meter` renders a scalar measurement within a known range — disk usage, budget
consumption, seat allocation — on the WAI-ARIA [`meter` role](https://www.w3.org/TR/wai-aria-1.2/#meter).
It is a sibling of `Progress` in anatomy (same stroke scale, track and fill) and
its opposite in meaning.

## Distinctness from Progress and RadialProgress

`Progress` and `RadialProgress` communicate **task completion** — a percentage
of work done, with an indeterminate state for "we don't know yet". `Meter`
communicates a **measured quantity at a point in time**. A disk that is 90% full
is not 90% "done"; nothing completes. The ARIA `meter` role exists precisely
because the two are different facts: a progressbar announces task state, a meter
announces a quantity against a scale. Meter has no indeterminate state, and its
thresholds model _health_, not completion.

## Value and range

`:value` is the measured amount, `:min` (default `0`) and `:max` (default `100`)
the scale. A value outside the range is clamped for **both** the painted fill
and `aria-valuenow` — a spoken number outside the declared range would contradict
the gauge it belongs to.

## Thresholds

`:low`, `:high` and `:optimum` are the HTML `meter` element's three thresholds.
They partition the range into three regions, and `optimum` decides which region
is the good one:

| Optimum sits in | Its own region | The other near region   | The far region |
| --------------- | -------------- | ----------------------- | -------------- |
| low region      | optimal        | cautionary              | critical       |
| middle region   | optimal        | cautionary (both sides) | —              |
| high region     | optimal        | cautionary              | critical       |

With `threshold`, the fill recolours per band (`bg-success` / `bg-warning` /
`bg-destructive`) and each band renders a redundant **non-colour cue** — the
band's word plus an icon — because colour alone is never the state. The cue is
`aria-hidden`: the announced value already lets assistive technology locate the
band against the declared thresholds, and the cue exists because a sighted
reader cannot hear the number while glancing at a colour.

An inverted pair (`low` above `high`) is treated as unset rather than building
regions from crossed bounds; thresholds and the optimum are clamped into the
range first.

## Accessible name — mandatory

A meter without a name is a number with no referent. Four sources, in order:
`ariaLabelledby`, `ariaLabel`, `label` (visible text that also names the gauge),
and finally the labels-seam fallback, so the name is never absent. The visible
`label` is rendered as a `<span>` (a `div[role="meter"]` is not labelable) and
wired through `aria-labelledby`.

## Labels

All strings go through the `@ecoma-io/loom-labels` seam — override one
instance with the `labels` prop or translate every Loom component at once with
`provideLoomLabels` above your application root. `valueText` builds
`aria-valuetext` from the raw `{ value, min, max }` (default "17 of 40" — a
host wording "17 of 40 seats" replaces the message, not a suffix), `name` is
the fallback accessible name, and `optimal` / `cautionary` / `critical` are the
band words the threshold cue prints.

## Motion

The fill slides on `--duration-slow` with the shared ease-out lane, and the
band recolour eases over the same duration; the global `prefers-reduced-motion`
rule stills both.
