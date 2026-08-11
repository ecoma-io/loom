# Fieldset

Several related controls under one name and one shared hint-or-error line: an
address block, a set of notification switches, a date range. Where
[Field](./field.md) is a single row — label, control, message — Fieldset is the
group those rows sit in, and the two nest. A Fieldset of Fields is the shape it
was drawn for.

Reach for it when the message or the disabling belongs to the group rather than
to any one control in it. "Enter both a street and a city" is not the street
field's error and it is not the city field's error; it is the address block's.
A lone control never needs a group — that is a Field.

It is not the wrapper for a control that already _is_ a group. RadioGroup and
SegmentedControl own their own grouping semantics and their own roving focus,
so putting one inside a Fieldset gives it a second name. Wrap those in a Field,
or in a Fieldset only when they sit alongside other controls that share the
group's fate.

<script setup lang="ts">
import { Checkbox, Field, Fieldset, TextField } from "@ecoma-io/loom";
import FieldsetDemo from "../../src/primitives/Fieldset/FieldsetDemo.vue";
import fieldsetDemoSource from "../../src/primitives/Fieldset/FieldsetDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Field, Fieldset, TextField } from "@ecoma-io/loom";
</script>

<template>
  <Fieldset id="shipping" legend="Shipping address" hint="We only use this for delivery" required>
    <Field label="Street" name="street">
      <TextField v-model="street" />
    </Field>
    <Field label="City" name="city">
      <TextField v-model="city" />
    </Field>
  </Fieldset>
</template>
```

## The legend names the group

<Demo title="Legend, hint and required">
  <div class="w-full max-w-sm">
    <Fieldset id="docs-shipping" legend="Shipping address" hint="We only use this for delivery" required>
      <Field label="Street" name="docs-shipping-street">
        <TextField placeholder="12 Warp Lane" />
      </Field>
      <Field label="City" name="docs-shipping-city">
        <TextField placeholder="Hanoi" />
      </Field>
    </Fieldset>
  </div>
</Demo>

`legend` renders as a real `<legend>`, which is what a screen reader reads out
when focus first enters the group — before the label of whichever control it
landed on. That is the whole reason to write one: it turns "Street" into
"Shipping address, Street" without repeating the group name in every label.

`required` appends the same destructive asterisk Field uses, in the same place,
so a required group and a required row look alike. It marks the group, not each
control: which of the rows inside are individually mandatory is still each
row's own business.

## Disabling the group

This is the reason Fieldset renders a real `<fieldset>` rather than a `div`
with `role="group"`. `<fieldset disabled>` disables every form control inside
it natively — no prop is passed down, nothing is walked, the browser does it —
and that reaches controls Fieldset never rendered and holds no reference to:
anything a caller put in the default slot, however deeply nested.

<Demo title="One disabled group, three disabled controls">
  <div class="w-full max-w-sm">
    <Fieldset id="docs-notify" legend="Email notifications" hint="Available once a workspace owner enables email delivery" disabled>
      <Checkbox label="Weekly digest" />
      <Checkbox label="When someone mentions me" />
      <Field label="Send to" name="docs-notify-to">
        <TextField type="email" placeholder="you@example.com" />
      </Field>
    </Fieldset>
  </div>
</Demo>

Nothing in that group is disabled in its own right. A `div` with an ARIA role
cannot do this: a wrapper cannot pass a `disabled` prop to a control it never
rendered, so the alternative is asking every caller to thread the same flag
through every child by hand and to keep doing it as the group grows.

It is also the _only_ mechanism. Fieldset deliberately does not also hand
`disabled` down through the [Field](./field) context, because one fact carried
two ways is one fact that can disagree with itself: a control written
`:disabled="false"` would beat the context by the usual precedence rule and
still be disabled by the element, leaving a live-looking control that silently
refuses input. The element reaches further anyway.

The group also dims as a unit, because a set of controls that silently stops
accepting input reads as a broken form rather than an unavailable one. A
control that already dims itself when disabled — Switch, RadioGroup, Select —
ends up fainter still inside a disabled group; that is deliberate, and it reads
as one inactive block. The native `disabled` attribute carries the same state
to assistive technology, so the state is never colour alone.

## Hint and error

<Demo title="A message that belongs to the group">
  <div class="w-full max-w-sm">
    <Fieldset id="docs-billing" legend="Billing address" error="Enter both a street and a city, or copy the shipping address" required>
      <Field label="Street" name="docs-billing-street">
        <TextField placeholder="12 Warp Lane" />
      </Field>
      <Field label="City" name="docs-billing-city">
        <TextField placeholder="Hanoi" />
      </Field>
    </Fieldset>
  </div>
</Demo>

`hint` shows only while there is no `error` — a group carries one message at a
time, never both stacked — and setting `error` swaps in an InlineError with
that message. This is the same pair Field has, answered the same way, so a
group-level message and a row-level one behave identically.

The `id` prop drives it. Fieldset publishes the message under
`${id}-description` and points the group's own `aria-describedby` at that id,
which is the one thing Field cannot do for itself: Field has no element of its
own to carry the attribute, so it leaves that last link to the caller. Here it
is already wired. Pass the same id to a control inside only if you want the
message announced a second time on that control.

Without an `id`, the hint and the error still render and still read visually,
but nothing is associated with them programmatically — so pass one whenever the
group carries a message.

## Read-only groups

`readonly` is the one thing the group hands down through the
[Field](./field) context, because it is the one state no native `<fieldset>`
attribute can carry. Every Loom control inside renders read-only: focusable,
still in the tab order, still submitted, and filled rather than dimmed.

<Demo title="A group of values on show">
  <div class="w-full max-w-sm">
    <Fieldset id="docs-filed" legend="Filed return" hint="Locked once the return was submitted" readonly>
      <Field label="Reference" name="docs-filed-reference">
        <TextField model-value="LM-2024-0117" />
      </Field>
      <Field label="Filed by" name="docs-filed-by">
        <TextField model-value="Ada Lovelace" />
      </Field>
    </Fieldset>
  </div>
</Demo>

The ladder is control, then Field, then Fieldset: a `Field` that sets its own
`readonly` overrules the group, and a control that sets its own overrules both.
`undefined` is the only value that yields.

## What stops at the group

Everything else a Fieldset knows is deliberately not pushed onto the controls
inside it, and each one is a decision rather than an omission:

| Fact          | Where it goes                                                                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled`    | The native `<fieldset>`, and nowhere else — one mechanism, so the two can never disagree.                                                                                                                     |
| `required`    | The legend's asterisk. A mandatory group is not a mandatory control: an address block needs a street and not an apartment number, and `aria-required` on a field a reader need not fill is a false statement. |
| `error`       | The group's own message and its own `aria-describedby`. A group-level error does not make each control in it individually wrong.                                                                              |
| The hint's id | The group's own `aria-describedby`. Repeating it on every control inside means announcing it once per control.                                                                                                |
| `id`          | The `<fieldset>` element itself — a control adopting it would duplicate the id.                                                                                                                               |
| `name`        | Nowhere. One shared name is right for a set of radios and wrong for everything else.                                                                                                                          |

## Fitting into a form grid

Fieldset sets `min-width: 0` on itself, and that line is load-bearing. Every
browser's own stylesheet gives `<fieldset>` a `min-inline-size: min-content`,
which no `width` can beat: a group holding a text input refuses to shrink below
that input's intrinsic width, and blows out the column of any layout that puts
one in a flex or grid parent. Overriding the minimum is the only fix, and it is
applied here so no consumer has to discover it.

A `class` you pass is merged Tailwind-aware, so `class="min-w-full"` replaces
that utility rather than fighting it.

## Layout and the legend

Fieldset draws no border of its own — it spaces the group, it does not box it,
which matches Field and the rest of the form family. That is also the simplest
answer to the legend: with no border to interrupt, the notch a `<legend>` cuts
into a fieldset's frame never arises, and the legend reads as the heading it is.

If you add a border yourself, expect the native rendering back: the legend will
sit in the border rather than above it, and it takes its own margin rather than
the container's gap, because a rendered legend sits outside the anonymous box
that holds a fieldset's content.

## Keyboard and screen readers

Fieldset adds no tab stop and changes no tab order. The legend is not
focusable, and the controls inside are reached in document order exactly as
they would be without the group.

The one-Tab-stop-with-roving-focus rule belongs to a control that _is_ a group
of options — RadioGroup, SegmentedControl — not to a section of a form. Three
text fields under one legend are three tab stops, and collapsing them into one
would be a defect rather than a courtesy.

What a screen reader gains is the announcement on entry: the legend is read
when focus first crosses into the group, and again when it leaves and returns.
Setting `disabled` is reported as such on every control inside, and the hint or
error is exposed through the group's `aria-describedby`.

## Motion

None. A group container is a place things sit, not a place things move, so
nothing here transitions, animates or reflows on a state change — including the
dim that arrives with `disabled`.

The one exception is the error line, which rises in on the shared
`animate-fade-rise` lane that InlineError already owns, so a group's error
arrives the same way a row's does. Fieldset adds nothing of its own on top of
it.

<Demo title="Every state" :source="fieldsetDemoSource">
  <FieldsetDemo />
</Demo>

## API

<!-- @api Fieldset -->
