# TextField

Single-line text entry — text, email, password, search, url, tel. The
border, focus ring and invalid state live on the wrapper rather than the
input, which is the decision that makes adornments possible: a leading
search icon or a trailing unit sits _inside_ the field and shares its focus
bloom, instead of every caller re-inventing an icon-inside-input layout by
hand. It also puts adornments unmistakably inside the field's boundary
rather than beside it — a `#trailing` clear button reads as part of the
input it clears, not as a second control next to it.

<script setup lang="ts">
import { ref } from "vue";
import { TextField } from "@ecoma-io/loom";
import TextFieldDemo from "../../src/primitives/TextField/TextFieldDemo.vue";
import textFieldDemoSource from "../../src/primitives/TextField/TextFieldDemo.vue?raw";

const docHeadline = ref("Weaving interfaces that hold together");
const docOverrun = ref("A headline written before anyone mentioned the limit");
const docRunning = ref("");
</script>

## Usage

```vue
<script setup lang="ts">
import { TextField } from "@ecoma-io/loom";
</script>

<template>
  <TextField v-model="email" type="email" aria-label="Email" placeholder="you@example.com" />
</template>
```

## Naming

TextField is a bare primitive — it is named only by its host. Pass
`aria-label` (a string) or `aria-labelledby` (the id of a visible label).
Wrapped in [Field](./field), Field handles the association for you.

<Demo title="Named by aria-labelledby">
  <div class="flex flex-col gap-2" style="max-width: 20rem">
    <span id="tf-doc-name" class="text-xs text-muted-foreground">Full name</span>
    <TextField aria-labelledby="tf-doc-name" placeholder="Enter your name" />
  </div>
</Demo>

## Adornments

`#leading`/`#trailing` take an icon or short text — a unit, a clear button.
They sit inside the field's own border and focus treatment because the
wrapper, not the input, owns both: a plain input can only draw a focus ring
around itself, so an icon placed next to it would sit outside that ring and
read as a separate element. Wrapping the whole group lets the ring, the
border and the invalid color apply once, to everything inside.

<Demo title="Leading icon">
  <TextField aria-label="Search" type="search" placeholder="Search assets, scenes…">
    <template #leading>🔍</template>
  </TextField>
</Demo>

## Revealing a password

`revealable` adds a toggle to the adornment row that shows the typed
password in place. It is a prop here rather than a `PasswordField` beside
this one because `password` is already a `TextFieldType` and the adornment
row already exists: a second component would duplicate an entire input, its
Field wiring and its three sizes to add one button.

It does nothing on any other type — not "nothing visible", nothing at all.
The toggle is not rendered and the type cannot flip, so
`<TextField type="email" revealable />` is exactly `<TextField type="email" />`.

<Demo title="Password with a reveal toggle">
  <TextField aria-label="Password" type="password" revealable placeholder="Your passphrase" />
</Demo>

Three details that are the whole feature:

**The caret survives.** Flipping `type` is what loses it — the input is
re-created enough, engine by engine, that the selection lands back at 0 or at
the end, and a reader fixing the third character of a long passphrase is now
somewhere else with no way to tell where. The range is read before the flip
and written back after, so the caret and any selection are exactly where they
were left.

**The button says what is true, not only what it offers.** It carries a
stable name — "Show password" — and an `aria-pressed` state that changes with
the reveal. A name that changed instead ("Show" ↔ "Hide") could only say what
pressing _will_ do, so a reader arriving on the control has to infer the
current state from the offer; and on activation the announcement would be a
_rename_, which some screen readers re-read and some do not, so the change
could pass in silence. A pressed state under an unmoving name is announced as
a state change by every major screen reader, and it keeps the control
findable by voice under the one name it always had. The eye/eye-off glyph is
the sighted half of the same fact.

**The reveal ends when the reader ends it.** There is no reset on blur, and
that is deliberate twice over. Clicking the toggle blurs the input on the way
to it, so a field that re-hid on blur would undo the reveal it was just asked
for; and a reader who tabbed away to check the password rules and came back
would find the field silently changed under them, since blur is not an event
assistive technology reports as a state change. The shoulder-surfer the reset
is imagined to defeat is present while the reader is typing, which is exactly
when the field is focused. A surface that genuinely cannot afford a revealed
password should not pass `revealable`. It is per-instance state and never
outlives the component: a remount starts hidden, and so does a field whose
`type` stops being `password`.

The toggle stays available on a read-only field — `readonly` is about
changing the value, and revealing does not — and goes unavailable with a
disabled one.

## Character count

`maxLength` gives the field a limit to report, and the counter appears inside
the border with it. `showCount` overrules that in either direction: `true`
shows a running total where there is no limit, `false` holds a limit the
field reports nowhere.

<Demo title="Counting against a limit">
  <div class="flex w-full flex-col gap-4" style="max-width: 22rem">
    <TextField v-model="docHeadline" :max-length="48" aria-label="Headline" />
    <TextField v-model="docOverrun" :max-length="48" aria-label="Headline, over the limit" />
    <TextField v-model="docRunning" show-count aria-label="Notes with no limit" placeholder="No limit, just a total" />
  </div>
</Demo>

**The limit is reported, not enforced**, exactly as `required` is. `maxLength`
does not set the native `maxlength`, which truncates a paste silently and
tells the reader nothing about the 120 characters it dropped. Pass
`maxlength` yourself as a plain attribute where you want the browser to
enforce it as well:

```vue
<TextField v-model="headline" :max-length="48" maxlength="48" aria-label="Headline" />
```

**Over the limit is a state, and it is not carried by colour.** The counter
turns destructive _and_ its wording changes — `21/20` becomes
`21/20 over limit` — so the state survives a monochrome display, a
colour-blind reader and forced-colours mode. The digits themselves are the
third reading of it.

Over the limit is not, on its own, an error. It sets no `aria-invalid` and
paints no destructive border: whether an over-long value blocks the form is
the form's decision, and `invalid` stays the caller's word — or the row's.
Set it alongside `maxLength` where it is one.

**The counter renders inside the field's border**, with the other adornments,
because the border is what a caller's `class` sizes: a readout hung
underneath would need an outer element, and `w-64` would then be sizing
something other than the field. With no count asked for, neither the counter
nor its live region is rendered at all and the box is byte-for-byte what it
was.

## Inside a Field

Wrapped in a [Field](./field), TextField wires itself: the row's id, the id of
its hint or error line, and `required`, `invalid`, `disabled`, `readonly` and
`name` all arrive from the row, so nothing is written at the call site.

```vue
<Field label="Email" name="email" error="Invalid address" required>
  <TextField v-model="email" type="email" />
</Field>
```

Every one of those props still wins when you set it, in both directions — which
is why `invalid`, `required`, `disabled` and `readonly` are `boolean | undefined`
and default to `undefined` rather than `false`. `<TextField />` says nothing and
inherits the row; `<TextField :invalid="false" />` says this one field is fine
even though its row is not, and it is obeyed.

## Error state

`invalid` paints the destructive border and ring and sets `aria-invalid` on
the input — the error reaches both a sighted reader and a screen reader,
never color alone. The message itself belongs to
[InlineError](./inline-error), usually rendered through
[Field](./field).

<Demo title="Invalid">
  <TextField aria-label="Email" type="email" invalid placeholder="you@example.com" />
</Demo>

## Required, read-only and disabled

`required` sets `aria-required` on the input and nothing else. It deliberately
does not set the native `required` attribute: that would begin blocking form
submissions in applications that upgrade without changing a line, and it opens a
browser-styled validation bubble no design system controls. Telling assistive
technology the field is mandatory is the accessibility fix; enforcing it stays
your form's decision.

`readonly` and `disabled` are different states, not two dials on one, so the
field rests in three appearances rather than two. A read-only field is a value
on show: it stays a Tab stop, stays in the form's submitted data, and is filled
rather than dimmed. A disabled field is unavailable: no Tab stop, not submitted,
drained. Reaching for `disabled` to render a value nobody may edit tells a
screen reader the field is unavailable when it is simply not editable.

The three are told apart on three channels, and that is the design rather than a
flourish. The fill steps down — the page's own background, then the lifted
neutral, then the drained one. The text follows only on the last step, because a
read-only value exists to be read and keeps its full 13.46:1. The border weight
moves with them, from `--color-input` to the lighter `--color-border`, and a
change in _shape_ is the one a reader who cannot separate two greys still
receives. Before this, read-only and disabled shared a fill and parted on the
text colour alone, which is a distinction made in hue and nothing else.

None of it is an `opacity`. Half alpha over the box takes the value to 3.08:1
and the placeholder — already the muted colour before the fade — to 2.07:1, so
the state that exists to show a value would be the state that hides it.

<Demo title="Available, read-only and disabled">
  <div class="flex w-full flex-col gap-3" style="max-width: 20rem">
    <TextField aria-label="Display name (available)" name="displayName" model-value="Ada Lovelace" />
    <TextField aria-label="Workspace (read-only)" name="workspace" readonly model-value="Loom Studio" />
    <TextField aria-label="Invite code (disabled)" disabled placeholder="Not available yet" />
  </div>
</Demo>

The same treatment answers a [Fieldset](./fieldset) that disables its group.
`<fieldset disabled>` disables the `<input>` inside this control natively — no
prop travels, and nothing is walked — so the drained appearance is painted off
the fieldset's own attribute rather than off anything a row passed down. One
fact, written in one place, read by the browser and by the stylesheet alike; a
raw `<fieldset disabled>` you wrote yourself works exactly as one of ours does.

## Sizes

| Size | Height        | Use for                          |
| ---- | ------------- | -------------------------------- |
| `sm` | 32px (`h-8`)  | toolbars, dense rows, inline use |
| `md` | 36px (`h-9`)  | the default                      |
| `lg` | 44px (`h-11`) | spacious forms, onboarding       |

<Demo title="Every type, size and state" :source="textFieldDemoSource">
  <TextFieldDemo />
</Demo>

## Keyboard and screen readers

| Key             | What happens                                                                   |
| --------------- | ------------------------------------------------------------------------------ |
| `Tab`           | into the input, then on to the reveal toggle if there is one — never before it |
| `Enter` `Space` | on the toggle, shows or hides the password; focus stays on the toggle          |

The toggle takes no `tabindex` of its own. It sits after the input in the
document, which is what puts it after the input in the focus order: a control
that acts on a field must never stand between the reader and the field.
Activating it leaves focus where it is, so hiding the password again is one
more press rather than a Shift+Tab away.

The counter is not focusable and is not announced as it changes. It is wired
into the input's `aria-describedby`, so it is read when the field takes focus
and on every return to it — after any description the caller set, and before
a wrapping [Field](./field)'s hint or error line, which is the same
most-specific-first order the row itself uses.

What _is_ announced are the two facts a reader cannot see coming: the limit
is close, and the limit is passed. Each is spoken once, as the value crosses,
from a `role="status"` region that is in the page from the first render and
empty until then. A region holding the counter itself would speak on every
keystroke, burying the field's own echo of the character just typed under a
number nobody asked for — worse than silence. The warning fires over the last
quarter of a short allowance or the last ten characters of a long one,
whichever is smaller; ten characters is about a word, and a warning is only
worth anything while there is still room to act on it. Because it is spoken
at the crossing, its numbers are true at that moment and the visible counter
carries them afterwards.

## Labels

Every word this control says is replaceable, and every word is Loom's own — a
bare `<input>` renders no English of anybody else's, so a key you drop here
falls back to Loom's English rather than to a second, untranslated vocabulary
underneath it.

```ts
interface TextFieldLabels {
  reveal: string; // the password toggle, named for what pressing it does
  count: (args: { count: number }) => string; // a running total, no limit
  countOfMax: (args: { count: number; max: number }) => string; // within the limit
  countOverMax: (args: { count: number; max: number; over: number }) => string; // past it
  approachingLimit: (args: { remaining: number; max: number }) => string; // spoken once
  limitExceeded: (args: { over: number; max: number }) => string; // spoken once
}
```

**The counters are handed the numbers, never a formatted string.** `21/20` is
a punctuation choice made in one language, and "3 characters left" has one
plural form in Vietnamese, two in English and six in Arabic — so the integers
go over the seam and `Intl.PluralRules` picks the category in your own
locale, with `Intl.NumberFormat` for the digits.

```ts
countOfMax: ({ count, max }) => t("field.count", { count, max });
```

Two of them carry a requirement rather than a preference. `reveal` is worded
as an action and stays the same in both states, because `aria-pressed` is
what carries the state; and `countOverMax` must read differently from
`countOfMax` rather than only being painted differently, or the over-limit
state is carried by colour alone.

Every key is optional — supply one and the rest stay as your application's
vocabulary, or Loom's English, left them. Annotate a bag of your own with
`LabelOverrides<TextFieldLabels>` rather than with `TextFieldLabels` itself:
the override type is partial, so a key added in a later release is one your
bag may ignore, where the bag interface is total and would stop compiling.

For a whole application set these once with `provideLoomLabels` rather than at
every call site; the `labels` prop is for the per-instance correction, such as
a field counting words rather than characters. See
[Localisation](/foundations/localisation).

## Motion

The border, the fill and the focus bloom transition at `duration-fast` on
`--ease-out`, below the `--duration-normal` feedback ceiling: a field that
lights up after the reader has already started typing is answering a question
they stopped asking. The adornments, the reveal toggle and the counter share
that lane, so the whole field settles as one thing rather than in parts.

Nothing loops, and nothing here animates outside a CSS transition, so the
global `prefers-reduced-motion` rule covers all of it.

## API

<!-- @api TextField -->
