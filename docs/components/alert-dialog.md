# AlertDialog

A modal that demands a decision before anything else happens. "Delete this
permanently?", "Discard unsaved changes?" — the question that has to be
answered rather than deferred.

Loom already has [Dialog](./dialog.md), and the difference is not that this one
looks different. **Dialog is dismissible**: Esc, a click on the overlay and the
close control in the corner all mean "not now", which is exactly right for a
task surface a reader wandered into. **An AlertDialog has no such exit.** A
click outside does nothing, there is no close glyph, and the only ways out are
the two buttons. It carries `role="alertdialog"`, so its description is
announced together with its name instead of waiting to be navigated to — which
is the point when the sentence a reader needs is the one describing what they
are about to lose.

Reach for it when dismissing by accident would lose work or destroy something.
Reach for Dialog for everything else. An AlertDialog wrapped around an ordinary
form is a control that traps a reader for no reason: they opened it to look,
and now the only way back to the page is to answer a question they never
wanted to be asked.

<script setup lang="ts">
import { AlertDialog, Button } from "@ecoma-io/loom";
import AlertDialogDemo from "../demos/AlertDialogDemo.vue";
import alertDialogDemoSource from "../demos/AlertDialogDemo.vue?raw";
</script>

<Demo title="AlertDialog">
  <AlertDialog
    title="Delete workflow?"
    description="Every scene in it goes too, and this cannot be undone."
    :labels="{ confirm: 'Delete permanently', cancel: 'Keep it' }"
    destructive
  >
    <template #trigger>
      <Button variant="destructive">Delete workflow</Button>
    </template>
  </AlertDialog>
</Demo>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { AlertDialog, Button } from "@ecoma-io/loom";

const open = ref(false);

function remove() {
  // The alert does not close itself. Close it when the work has actually run.
  open.value = false;
}
</script>

<template>
  <AlertDialog
    v-model:open="open"
    title="Delete workflow?"
    description="Every scene in it goes too, and this cannot be undone."
    :labels="{ confirm: 'Delete permanently', cancel: 'Keep it' }"
    destructive
    @confirm="remove"
  >
    <template #trigger>
      <Button variant="destructive">Delete workflow</Button>
    </template>
  </AlertDialog>
</template>
```

## Focus opens on Cancel

This is the behaviour the component exists to guarantee, and it is worth
stating plainly: **when the panel opens, focus is on Cancel, never on the
action.**

A destructive confirm that opens with "Delete" focused turns a reflexive Enter
— from a reader who has not finished reading the sentence yet, or who was
already mid-keystroke when the panel arrived — into a deletion. Nothing about
the interface warned them; they simply pressed the key they were going to press
anyway. Opening on Cancel makes that same reflex harmless: the worst outcome of
not reading is that nothing happens.

It is also why the alert has no dismissible exits. A click on the overlay is
the _other_ accidental answer — a stray click at the edge of the screen — and
here it does nothing at all.

## Labels are the destructive signal

`labels.confirm` defaults to "Confirm", and that default is a placeholder rather
than a recommendation. **Replace it with the verb the button performs**:
"Delete", "Discard", "Leave without saving", "Publish now".

`destructive` paints the action in the destructive colour, and colour is not
allowed to carry that meaning by itself. What actually tells a reader — in a
high-contrast theme, in forced colours, read aloud — that this button destroys
something is the verb in its label. The paint is emphasis added to a sentence
that already said it.

Not every alert is destructive. Some are merely irreversible: publishing to
eleven thousand subscribers is not damage, but it cannot be recalled either.
Those keep the primary paint, and the verb still does the work.

<Demo title="Destructive, irreversible, and what each decision resolves to" :source="alertDialogDemoSource">
  <AlertDialogDemo />
</Demo>

## Title and description

`title` is required, and it is the panel's accessible name. Write the
consequence — "Delete workflow?" rather than "Are you sure?", which names
nothing and reads identically to every other alert in the product.

`description` is the consequence line, and it is wired as the panel's
accessible description. Under `role="alertdialog"` that description is
announced with the name at the moment the panel opens, which is the one thing
this role buys over `role="dialog"`. Omitting it gives that up, so omit it only
when the title genuinely says everything.

There is no body slot, deliberately. A question that needs body content is a
task, and a task is a [Dialog](./dialog.md). Keeping the surface to a title, a
consequence line and two buttons is what stops this from quietly becoming an
undismissible form.

## Labels

Two names, and they are the whole of what this component says on its own
account — the title and the consequence line are yours, and there is no body
slot for anything else to arrive through.

```ts
interface AlertDialogLabels {
  confirm: string; // the action; replace it with the verb it performs
  cancel: string; // the way out, and the control that opens with focus
}
```

The two want different homes, which is the reason they are one bag rather than
two props. `cancel` is the same word everywhere in an application, so it belongs
in `provideLoomLabels` and is written once. `confirm` is the verb _this_ one
decision performs, so it belongs on the instance:

```vue
<AlertDialog title="Delete workflow?" :labels="{ confirm: 'Delete permanently' }" destructive />
```

Every key is optional, and the prop takes **any subset** — supply `confirm` and
`cancel` stays as your application's vocabulary, or Loom's English, left it.
Annotate your own bag with `LabelOverrides<AlertDialogLabels>` rather than with
`AlertDialogLabels` itself: the override type is partial, so a key added to Loom
in a later release is one your bag may ignore. See
[Localisation](/foundations/localisation).

## Deciding is the host's job

The alert reports the outcome and waits. `confirm` and `cancel` say which
button was pressed; `update:open` fires alongside either one, so a host driving
`v-model:open` needs only that. Nothing closes itself, which is what lets the
deletion actually run before the panel goes away — and what lets a failed
deletion keep it open.

## Keyboard and screen readers

- **Tab** cycles the two buttons and nothing else. Focus is trapped in the
  panel, so it never reaches the page behind.
- **Focus on open** is on Cancel.
- **Enter** or **Space** activates the focused button.
- **Esc** is the cancel button — it emits `cancel` and requests the close, the
  same as pressing Cancel. It is not treated as a dismissal, and it is not
  blocked either: a modal a keyboard user cannot leave with the key every modal
  answers to is a trap, and the outcome Esc reaches here is the safe one. What
  the alert removes is the _accidental_ exit, and a deliberate keystroke is not
  that.
- **Focus on close** returns to whatever opened it, after either outcome.
- **The page behind does not scroll**, and everything outside the panel is
  hidden from assistive technology.
- `aria-describedby` points at the rendered description, and is dropped
  entirely when there is none rather than left pointing at an element that does
  not exist.

## Motion

The scrim fades and the panel scales in, the same pair Dialog uses — an alert
arriving with different motion from a dialog would read as a different kind of
thing when it is the same kind of thing wearing fewer exits.

- The overlay plays `animate-fade` at `--duration-normal` with `--ease-out`. It
  fades rather than moves, so nothing behind the panel appears to shift.
- The panel plays `animate-scale-in` at `--duration-fast` with `--ease-spring`
  — a short, released settle rather than a slow arrival, because a question
  that blocks the screen should already be readable by the time the eye gets
  there.

Both are scoped to the open state, and both collapse under
`prefers-reduced-motion` through the global rule.

## API

<!-- @api AlertDialog -->
