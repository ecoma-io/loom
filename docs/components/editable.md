# Editable

Text that becomes an input where it stands. A record's title, an owner's name,
a cell in a table: the value is edited in the place it is read, rather than in a
dialog opened to hold one field. It is the control that makes an operations
screen feel direct.

Reach for a [text field](./text-field) instead whenever the value is being
_entered_ rather than corrected. A form is a set of empty boxes and should look
like one; this is for a value that already exists, that is usually right, and
that is occasionally wrong. For a value chosen from a closed list the same
argument points at a [select](./select) — an editable is for free text.

<script setup lang="ts">
import { Editable, Field } from "@ecoma-io/loom";
import EditableDemo from "../../src/primitives/Editable/EditableDemo.vue";
import editableDemoSource from "../../src/primitives/Editable/EditableDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { Editable } from "@ecoma-io/loom";

const title = ref("Q3 operations review");
</script>

<template>
  <Editable v-model="title" aria-label="Record title" @submit="save" />
</template>
```

`update:modelValue` fires once, with the committed value, alongside `submit`.
Keystrokes are not published: a control whose whole purpose is that an edit can
be taken back cannot report every intermediate character as though it were the
value. `cancel` fires when an edit is abandoned.

## Activation

`activationMode` decides what a **pointer** has to do to open the editor. The
keyboard is deliberately not on this axis — Enter and Space open it in all three
modes, because a mode a reader cannot reach by keyboard is a control they cannot
use.

`click` is the default: one click on the text opens it. It is the whole promise
of edit-in-place, and the only one of the three a touch reader can perform.
`dblclick` is for a row or a cell where a single click already means something
else, such as selecting it. `focus` opens on arrival, so Tab walks straight into
the editor — useful for a column of values being corrected in order, and the
mode that makes the Escape behaviour below load-bearing.

<Demo title="Activation">
  <div class="flex w-full max-w-sm flex-col gap-3">
    <Editable model-value="One click opens this" aria-label="Click to edit" />
    <Editable model-value="Two clicks open this" activation-mode="dblclick" aria-label="Double click to edit" />
    <Editable model-value="Landing on this opens it" activation-mode="focus" aria-label="Focus to edit" />
  </div>
</Demo>

## Committing and abandoning

`submitMode` decides what commits: `both` (the default) accepts Enter or focus
leaving the control, `enter` accepts Enter alone and discards on the way out,
and `blur` leaves Enter to whatever the control is nested inside.

**Escape abandons under all three, and restores the previous value.** Ending an
edit hides the editor, and a browser drops focus to the document body when the
focused node goes away — so focus is handed back to the value it came from.
Without that, a reader who abandoned an edit would lose their place in the page
entirely. Under `activationMode="focus"` the returning focus would then re-open
the editor it had just closed, so it is suppressed exactly once: the control
stays showing its value until the reader leaves and comes back deliberately.

A save and a cancel button appear beside the editor while it is open. They are
not decoration — "Enter commits, Escape abandons" is an invisible contract, and
a reader working by pointer has no way to learn it.

**An empty submit restores rather than clears.** Emptying the box and committing
is genuinely ambiguous, and under `submitMode="blur"` it can happen by accident;
Loom decides it the way round where the damage is recoverable, because a value
wrongly kept is on screen and can be edited again while a title wrongly emptied
is gone. The refusal reports itself as `cancel` and is announced to assistive
technology, so it is never a silent snap-back. Set `allowEmpty` on a value that
can legitimately be blank.

<Demo title="Committing">
  <div class="flex w-full max-w-sm flex-col gap-3">
    <Editable model-value="Enter, or click away" aria-label="Commits on Enter or blur" />
    <Editable model-value="Enter only — leaving discards" submit-mode="enter" aria-label="Commits on Enter only" />
    <Editable model-value="This one may be emptied" allow-empty aria-label="May be emptied" />
  </div>
</Demo>

## Size, and why there is not one

Every other control in the library picks a height off the shared scale. This one
does not take a `size` at all: it inherits the typography around it, so an
editable page title stays the size of a page title and an editable table cell
stays the size of a cell.

What it does pin is that the two states are the same size as **each other**. The
preview and the editor are the only two children of one padded box; both are
single-line, both inherit that box's type, and the box carries a border of the
same width in both states — transparent at rest, `border-input` while editing.
Nothing below the control moves when it switches.

`autoResize` goes further for an editable sitting inline in a sentence: it
stacks the two states in a single grid cell, so the box is the width of the
larger of them rather than of whichever is showing. It measures the committed
value, not what is being typed.

<Demo title="Size">
  <div class="flex w-full max-w-sm flex-col gap-3">
    <div class="text-lg font-semibold">
      <Editable model-value="A title, at title size" aria-label="Title-sized" />
    </div>
    <p class="text-sm">
      Owned by <Editable model-value="Mai Phương" auto-resize aria-label="Owner, inline" /> since March.
    </p>
  </div>
</Demo>

## Placeholder and empty values

`placeholder` shows in both states while the value is empty, muted in the
preview and native in the editor. An editable with no value and no placeholder
is an empty box a reader has no reason to press, so give one wherever the value
can legitimately start unset.

<Demo title="Placeholder">
  <div class="w-full max-w-sm">
    <Editable model-value="" placeholder="Add a nickname" allow-empty aria-label="Nickname" />
  </div>
</Demo>

## Disabled and read-only

A disabled Editable drops out of the tab order and refuses to open. It drains
rather than fades — the neutral fill and the muted foreground colour, never half
opacity — because the value is the entire reason the control is on the page, and
a value nobody can read is worse than one nobody can edit.

A read-only one is a different state, not a milder version of the same one. It
stays reachable and copyable, keeps its value at full contrast, and is not
rendered as a button at all: a button that refuses to act is worse than plain
text.

<Demo title="Disabled and read-only">
  <div class="flex w-full max-w-sm flex-col gap-3">
    <Editable model-value="Archived record" disabled aria-label="Record title, disabled" />
    <Editable model-value="LM-4471-A" readonly aria-label="SKU, read only" />
  </div>
</Demo>

## Inside a Field

Wrapped in a [Field](./field), Editable wires itself: the row's id, the id of its
hint or error line, `required`, `invalid`, `disabled`, `readonly` and the name
the value is posted under all arrive from the row, so nothing is written at the
call site.

```vue
<Field label="Rate" hint="Percent, whole numbers only" name="rate">
  <Editable v-model="rate" :max-length="3" />
</Field>
```

Every prop still wins over the row when it is set, in both directions — which is
why the four booleans are `boolean | undefined` and default to `undefined`
rather than `false`.

Two things are worth knowing about what the row's answers reach here. **The row
labels the editor, not the preview**: `<label for>` can only name a real form
control, and the editor is the one on the page. The preview names itself from
the value it is showing plus the word `Edit`, which is what a reader hears
whether or not there is a row above it. And **`name` posts through a hidden
input** that Reka renders alongside the control, never through the editor
itself: the editor is a real `<input>` and a hidden input still posts, so
carrying the name on both would submit the field twice.

<Demo title="Inside a Field">
  <div class="flex w-full max-w-sm flex-col gap-4">
    <Field label="Rate" hint="Percent, whole numbers only" name="rate">
      <Editable model-value="18" :max-length="3" />
    </Field>
    <Field label="Region" error="Pick a region this team actually covers">
      <Editable model-value="Southern" />
    </Field>
  </div>
</Demo>

## Keyboard and screen readers

The resting value is a real `<button>`, and that is the whole accessibility
answer for edit-in-place: without a role it looks like text, so it reads like
text and a reader never learns the value can be changed. Its accessible name is
the value followed by the word `Edit` — the value first, because that is the
visible label a voice-control reader will say out loud.

Tab reaches it, Enter or Space opens the editor in every activation mode, and
focus moves into the editor as it appears. Enter commits, Escape restores the
previous value, and either way focus returns to the value it came from. Tab from
the open editor reaches the save and cancel buttons, which sit inside the
control and so do not count as leaving it under `submitMode="blur"`.

Every name the control says is replaceable: `labels` per instance, or
`provideLoomLabels({ editable: … })` for an application. Nothing here falls back
to English from the underlying library — the editor, the save button and the
cancel button each carry a Loom name in place of the one Reka UI writes, and the
refusal of an empty submit is announced through a live region rather than only
shown.

## Motion

The swap is a state change, not a journey: nothing slides, nothing fades in, and
the editor appears exactly where the value was. What moves is the box itself,
whose border, fill and focus bloom cross-fade at `duration-fast` on `ease-out`.
A control that took the full `duration-normal` feedback ceiling to become
editable would feel broken, and one that animated its two states past each other
would move the row below it.

<Demo title="Every state" :source="editableDemoSource">
  <EditableDemo />
</Demo>

## API

<!-- @api Editable -->
