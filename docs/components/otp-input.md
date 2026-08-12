# OtpInput

The row of single-character cells a one-time code or a short PIN is typed into.
Reach for it when the value really is a fixed-length code that arrived out of
band — a six-digit SMS code, an authenticator code, a four-digit PIN.

The cells are not decoration. They are what lets each one carry
`autocomplete="one-time-code"`, so iOS and Android offer the code the phone has
just received instead of making a reader memorise six digits and switch back;
and for a numeric code they raise the digit keypad rather than the alphabet.
That pair is the entire reason this exists rather than a TextField with a
`maxlength`.

Which is also the boundary. Anything a reader would want to read back, correct
in the middle, or paste in parts belongs in a TextField — a licence key, a
password, a coupon. A code longer than about eight characters is miserable in
cells whatever it is for.

<script setup lang="ts">
import { OtpInput } from "@ecoma-io/loom";
import OtpInputDemo from "../../src/primitives/OtpInput/OtpInputDemo.vue";
import otpInputDemoSource from "../../src/primitives/OtpInput/OtpInputDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { OtpInput } from "@ecoma-io/loom";

const code = ref("");

// `complete` fires once, as the last cell takes its character — so the code is
// submitted the moment it is finished rather than behind a separate button.
async function verify(value: string) {
  await signIn(value);
}
</script>

<template>
  <OtpInput v-model="code" aria-label="Verification code" @complete="verify" />
</template>
```

## The value is one string

`modelValue` is the code as a scalar `string` — `"4839"` — shorter than
`length` while it is still being typed. That is what a host posts to an API and
compares against, so it is what this control exposes, even though the cells
underneath are modelled one at a time.

One consequence is worth knowing before it surprises you. A string cannot hold
a gap, so clearing a cell in the middle closes the gap and the characters after
it shift left, exactly as deleting a character in a text field does. The row and
the value therefore always agree; there is no state in which the cells show
something the model does not.

`complete` fires once, at the moment the last empty cell takes a character, and
carries the finished code. It is the event to submit on — waiting for a separate
button after a code is complete is a step nobody wants.

<Demo title="A six-digit code">
  <OtpInput aria-label="Verification code" />
</Demo>

## Length and type

`length` is the number of cells, six by default. `type` decides what a cell
accepts and which keyboard a phone raises: `numeric` (the default) takes digits
only and asks for the digit keypad, `text` takes any character.

Numeric is not a number. A code with a leading zero is still that code, so the
value stays a string and nothing here ever parses one.

<Demo title="Length and type">
  <div class="flex flex-col gap-4">
    <OtpInput :length="4" aria-label="Four-digit code" />
    <OtpInput :length="8" type="text" aria-label="Eight-character backup code" />
  </div>
</Demo>

## Mask

`mask` renders each filled cell as a dot instead of its character, for a PIN
typed where someone else can see the screen. The cell still reads as filled —
the dot is as visible as the digit was — so nothing about the state depends on
colour.

<Demo title="Mask">
  <OtpInput :length="4" mask aria-label="PIN" />
</Demo>

## Disabled and invalid

A disabled row drains to a grey fill with muted characters, and refuses every
cell. It is a colour rather than an opacity, and the reason is sharper here than
anywhere else in the library: a cell holds one character and nothing else, so
fading the row does not dim a code so much as erase it. `--color-foreground`
measures 14.09:1 on the resting fill and 2.99:1 once composited at half alpha;
drained, each character keeps a measured 4.67:1 and the row still plainly reads
as unavailable.

An invalid row still works: every cell takes the destructive border and focus
ring and sets `aria-invalid`, and whatever was typed stays put so it can be
corrected rather than retyped. That is the same error language every other form
control here speaks.

<Demo title="Disabled and invalid">
  <div class="flex flex-col gap-4">
    <OtpInput :model-value="'4839'" :length="4" disabled aria-label="Code, disabled" />
    <OtpInput :model-value="'482'" invalid aria-label="Code, rejected" />
  </div>
</Demo>

## Keyboard and screen readers

The row is **one Tab stop**, not one per cell. Tab lands on the first empty cell
— where the next character goes — or on the last cell once the code is full, and
one more Tab leaves the control entirely. Focus moves between the cells with the
arrow keys, or by typing.

| Key            | Behaviour                                                         |
| -------------- | ----------------------------------------------------------------- |
| A character    | Fills the cell and moves to the next one                          |
| `Backspace`    | Clears the cell; on an empty cell, steps back and clears that one |
| `Delete`       | Clears the cell without moving                                    |
| `←` `→`        | Moves one cell, without wrapping                                  |
| `Home` / `End` | Jumps to the first cell, or as far along as the code reaches      |
| `Tab`          | Leaves the row — the whole row is one stop                        |
| Paste          | Distributes the whole code across the row, from the first cell    |

Focus never gets ahead of the code: a cell beyond the first empty one hands
focus straight back to it, whether it was reached by a click, an arrow key or
`End`. That is what keeps a code from being entered out of order, and it is why
a gap in the middle is something only `Backspace` or `Delete` can make.

The naming is the part this control usually gets wrong. Six inputs that each
announce the purpose of the field make a screen reader read "verification code"
six times over. So the row is a labelled `role="group"`: the name is announced
once on entering it, and each cell then carries only its position — "Digit 3 of
6". Give that name with `aria-label`, or with `aria-labelledby` pointing at the
visible text that already labels the row.

A filled cell shows its character, or its mask dot, and takes a heavier border.
The character is the signal and the border is a redundant second one, so a
reader who cannot tell the two border weights apart has lost nothing.

## Motion

Only the cell being typed into moves, and only in colour and shadow: the border
and the focus ring cross-fade at `duration-fast`, the same lane every other
control uses for a direct response to a keystroke. Nothing slides, nothing
scales, and a cell filling does not animate — six cells filling in a burst
would turn a code being typed into a light show. It is a plain CSS transition,
so the global `prefers-reduced-motion` rule collapses it to an instant change.

<Demo title="Every state" :source="otpInputDemoSource">
  <OtpInputDemo />
</Demo>

## Inside a Field

Wrapped in a [Field](./field), OtpInput wires itself: the id of the row's hint
or error line, `required`, `invalid`, `disabled` and the name the code is posted
under all arrive from the row.

```vue
<Field name="otp" error="That code has expired" required>
  <OtpInput v-model="code" aria-label="Verification code" @complete="verify" />
</Field>
```

`disabled` and `invalid` still win when you set them, in both directions — which
is why both are `boolean | undefined` and default to `undefined` rather than
`false`.

**Give the row a name anyway.** This is the one control a Field cannot name for
you: a `<label for>` associates with a labelable element, and the row is a
`role="group"`. Keep `aria-label` (or `aria-labelledby`) on the OtpInput, and
leave the Field's own `label` off unless it is labelling something else — a
label whose `for` resolves to nothing is worse than no label at all.

**What lands where.** The description goes on the group, because it is about the
whole code and repeating it on six cells would have a screen reader read it six
times. `aria-required` and `aria-invalid` go on the cells, because those are
states of the boxes being typed into and `role="group"` supports neither. The
code is posted through a hidden input, which is also where the row's id lands —
clicking a label pointed at it hands focus to the first cell.

**A row's `readonly` is ignored, deliberately.** There is nothing to read in an
uneditable code box that a line of text would not show better, and the cells
exist to be typed into.

## Labels

One string, and it replaces one Reka UI writes in English of its own accord:
every cell arrives named `pin input 3 of 6` unless something else names it.

```ts
interface OtpInputLabels {
  cell: (args: { index: number; length: number; type: "numeric" | "text" }) => string;
}
```

One key rather than four — a noun, a joiner and two numbers — because which word
a language uses for a cell and where the position sits relative to it are one
decision rather than several. The noun this row wants arrives as `type`, the
position as a 1-based `index`, and both numbers arrive raw so `Intl.NumberFormat`
decides how the digits are written and your own translation decides where they
sit in the sentence. Four fragment keys Loom then joined would be a sentence no
translator could reorder.

```vue
<OtpInput
  :length="4"
  aria-label="Licence key"
  :labels="{ cell: ({ index, length }) => `Group ${index} of ${length}` }"
/>
```

Annotate a bag of your own with `LabelOverrides<OtpInputLabels>` rather than with
`OtpInputLabels` itself: the override type is partial, so a key added in a later
release is one your bag may ignore, where the bag interface is total and would
stop compiling.

For a whole application set this once with `provideLoomLabels` rather than at
every call site; the `labels` prop is for the per-instance correction — a row
whose cells are neither digits nor characters in the reader's terms. See
[Localisation](/foundations/localisation).

## API

<!-- @api OtpInput -->
