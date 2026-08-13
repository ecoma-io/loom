# Field

The form-row wrapper: label, control, and one hint-or-error line, composed
the same way at every call site instead of by hand each time. It renders
nothing of its own for the control — the default slot is a text field, a
textarea, or any other bare control — which is the one decision worth
calling out: Field lays out and names, it never wraps or re-styles what you
put inside it.

What it does reach into is the control's accessibility wiring. A Loom control
in the slot takes the row's id, the id of whichever message is showing, and
whether the row is mandatory, in error, disabled or read-only — so the three
attributes this component used to ask you to copy by hand are now the default,
and forgetting one is no longer a silent defect.

<script setup lang="ts">
import { Field, TextField } from "@ecoma-io/loom";
import FieldDemo from "../../src/primitives/Field/FieldDemo.vue";
import fieldDemoSource from "../../src/primitives/Field/FieldDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Field, TextField } from "@ecoma-io/loom";
</script>

<template>
  <Field label="Email" name="email" hint="We never share this">
    <TextField v-model="email" />
  </Field>
</template>
```

## The row wires the control

<Demo title="Label, hint and required">
  <Field label="Full name" name="name" hint="Shown publicly" required>
    <TextField placeholder="Enter your name" />
  </Field>
</Demo>

Field mints an id, points its own `<label for>` at it, derives
`${id}-description` for the hint or the error, and publishes all of it to the
control in the slot. That control renders the matching `id`, the
`aria-describedby`, and — from `required` and `error` — `aria-required` and
`aria-invalid`. Nothing above is written at the call site.

It reaches a Loom control, not an arbitrary one: the channel is
`provide`/`inject`, so a plain `<input>`, a product's own control or a
third-party widget cannot pick it up. That case is what `for` is for, and it
has not changed — see below.

## Overruling the row

Everything the row hands down is a default. A prop set on the control wins, in
both directions: `undefined` is the only value that yields, and `false` is a
decision.

<Demo title="One control opting out of the row's error">
  <Field label="Postcode" name="postcode" error="Check the address below">
    <TextField model-value="SW1A 1AA" :invalid="false" />
  </Field>
</Demo>

That is why `invalid`, `required`, `disabled` and `readonly` on a Loom control
are `boolean | undefined` with no `false` default. `<TextField />` says nothing
and inherits; `<TextField :invalid="false" />` says this one field is fine even
though its row is not, and it is obeyed.

## Read-only rows

`readonly` marks the row as a value on show rather than one being entered. Every
control inside stays focusable, stays in the tab order and is still submitted —
it is filled rather than dimmed, because a read-only field is not an unavailable
one. Reach for `disabled` when the control genuinely cannot be used yet.

<Demo title="Read-only, not disabled">
  <div class="flex w-full flex-col gap-4" style="max-width: 22rem">
    <Field label="Workspace" name="workspace" hint="Set by your administrator" readonly>
      <TextField model-value="Loom Studio" />
    </Field>
    <Field label="Invite code" name="invite" hint="Available once billing is active" disabled>
      <TextField placeholder="Not available yet" />
    </Field>
  </div>
</Demo>

Not every control participates in `readonly`. A read-only checkbox or toggle is a
disabled one that lies about it, so those controls deliberately decline it: the
wrapper's instruction is dropped, and the control stays operable. In development,
a `console.warn` fires when a Field sets `readonly` but the control inside it does
not claim it — a signal that the instruction was silently ignored.

| Claims `readonly`   | Declines `readonly` |
| ------------------- | ------------------- |
| DatePicker          | Checkbox            |
| DateRangePicker     | ColorPicker         |
| DateTimePicker      | Combobox            |
| DateTimeRangePicker | FileUpload          |
| Editable            | OtpInput            |
| NumberField         | RadioGroup          |
| Rating              | SegmentedControl    |
| TagsInput           | Select              |
| TextField           | Slider              |
| Textarea            | Switch              |
| TimePicker          |                     |

## Naming a control Field cannot reach

`for` is not a legacy path, and it is not deprecated. It is the answer for
anything in the slot that cannot inject:

```vue
<Field label="Account number" for="account" hint="From your last invoice">
  <input id="account" aria-describedby="account-description" />
</Field>
```

Pass it and the label points at your id, the message line publishes
`${for}-description` for you to point `aria-describedby` at, and — for a Loom
control — that id is adopted instead of a generated one, so an existing call
site keeps every id it published.

With `label` set and neither a `for` nor anything in the slot, Field renders a
plain `<span>` rather than a `<label>`: a label pointing at nothing names no
control and focuses none, while looking correct in the DOM.

## Hint and error

<Demo title="Hint replaced by error">
  <Field label="Email" name="email" error="That address is not valid" required>
    <TextField placeholder="you@example.com" />
  </Field>
</Demo>

`hint` shows only while there is no `error` — a row carries one message at a
time, never both stacked. Setting `error` swaps in InlineError with that
message, hides the hint until the error clears, and marks the control inside
invalid: the message and `aria-invalid` are two halves of one state rather than
two switches that can disagree.

The description id is published only while a message is actually on screen. An
`aria-describedby` resolving to an element that was never rendered is worse than
no attribute at all — a screen reader announces nothing, and the row looks
correctly wired.

If the control already carries an `aria-describedby` of its own, the row's id is
**added** to it rather than replacing it. `aria-describedby` is a token list, so
a row's message is additional to whatever else you pointed at.

## Inside a Fieldset

A [Fieldset](./fieldset) hands down exactly one thing, `readonly`, and a Field
inside one inherits it unless it sets its own. Everything else a group knows
either travels natively — `disabled`, through the real `<fieldset>` — or stops
at the group on purpose: a mandatory group is not fifteen mandatory controls,
and a group-level error does not make each control in it individually wrong.

## Keyboard and screen readers

Field adds no tab stop of its own and changes no tab order. Clicking the label
focuses the control, which is the `<label for>` doing its job.

A screen reader reaching the control announces the label, then the value, then
the hint or the error through `aria-describedby`, and reports the field as
required or invalid where the row says so. `required` sets `aria-required` and
deliberately not the native `required` attribute: turning on native constraint
validation would start blocking form submissions in applications that upgrade
without changing a line, and it opens a browser-styled bubble no design system
controls. Marking the field mandatory to assistive tech is the accessibility
fix; enforcing it stays your form's decision.

## Motion

None of its own. Field is a layout, so nothing here transitions on a state
change. The one moving part is the error line, which rises in on the
`animate-fade-rise` lane InlineError already owns, so a row's error arrives the
same way a group's does.

<Demo title="Every case" :source="fieldDemoSource">
  <FieldDemo />
</Demo>

## API

<!-- @api Field -->
