# TagsInput

Several values typed into one field, each committed to a removable token:
keywords on an article, recipients on a message, labels on an issue. The reader
types, presses Enter or a comma, and what they typed becomes a chip they can
take back out.

Reach for it when the reader **invents** the values. A
[Select](/components/select) or a [Combobox](/components/combobox) picks from a
list somebody else wrote and cannot produce a value that is not already in it,
which is the right behaviour for a country or an assignee and the wrong one for
a keyword. A [TextField](/components/text-field) holds one value, and a
comma-separated string in one is a list the application has to parse and the
reader has to punctuate correctly — including the space after the comma, which
half of them will forget. [Chip](/components/chip) on its own is the display
half: a row of chips nobody types into is not a field.

Each token here _is_ a Chip, in the removable shape Chip already ships, so a
token in this field and a chip elsewhere in the same form are the same object at
the same size.

<script setup lang="ts">
import { TagsInput, Field } from "@ecoma-io/loom";
import TagsInputDemo from "../../src/primitives/TagsInput/TagsInputDemo.vue";
import tagsInputDemoSource from "../../src/primitives/TagsInput/TagsInputDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { TagsInput, type TagsInputRejection } from "@ecoma-io/loom";

const keywords = ref<string[]>(["design systems"]);

function onReject(rejections: TagsInputRejection[]) {
  // `rejections` carries the value and the rule that turned it away.
  console.warn(rejections);
}
</script>

<template>
  <TagsInput
    v-model="keywords"
    :max="8"
    aria-label="Keywords"
    placeholder="Add a keyword"
    @reject="onReject"
  />
</template>
```

`modelValue` is an array of strings, trimmed. Leave it unbound and the field
keeps its own list, which is what makes one dropped into a page work before it is
wired to anything.

<Demo title="Keywords">
  <div class="w-full max-w-sm">
    <TagsInput :model-value="['design systems', 'accessibility']" aria-label="Keywords" placeholder="Add a keyword" />
  </div>
</Demo>

## Committing a value

Enter commits. So does `delimiter`, which is `","` by default: typing it commits
whatever is in front of it, and **pasting** text that contains it splits at
every one. Pasting `a, b, c` produces three tokens, and the trailing comma in
`a, b, c,` produces nothing at all rather than a fourth, empty one.

Every committed value is trimmed, so the space after a pasted comma never
becomes part of the token — a rule worth stating because it is the difference
between three tokens and three tokens that will not match anything.

Set `delimiter` to a semicolon for a field of addresses, or to a space for tags
that never contain one.

<Demo title="Committing a value">
  <div class="flex w-full max-w-sm flex-col gap-4">
    <TagsInput aria-label="Comma-separated keywords" placeholder="design, research, ux" />
    <TagsInput delimiter=";" aria-label="Semicolon-separated addresses" placeholder="ana@ecoma.io; bo@ecoma.io" />
  </div>
</Demo>

## Refusals

Two rules refuse a value, and neither does it quietly.

`duplicates` is off, so a value already in the field is turned away rather than
listed twice. `max` caps the field. In both cases three things happen at once: a
line of text appears under the field naming the value and the rule, an
announcement goes out through a live region that was already in the page waiting
for it, and one `reject` event carries `{ value, reason }` for everything that
one interaction refused — one event per interaction, not one per value, because a
paste can refuse several at once.

A refused value is also **put back in the box** when it was the only one, rather
than being swallowed. A field that eats what it will not take leaves the reader
retyping something they can no longer see.

The message clears itself the moment the reader edits the list past it: a
message about a value that was never added stops describing anything on screen
as soon as the tokens beside it change.

<Demo title="Refusals">
  <div class="flex w-full max-w-sm flex-col gap-4">
    <TagsInput :model-value="['blue', 'green']" :max="3" aria-label="Shortlist, three at most" placeholder="Add a colour" />
    <TagsInput :model-value="['ux']" duplicates aria-label="Aliases, repeats allowed" placeholder="Add an alias" />
  </div>
</Demo>

## Available, read-only and disabled

These are three states, not two dials on one, and this control is where the
difference shows most.

**Read-only** shows the tokens and takes nothing: the box accepts no typing and
no paste, every remove control goes away, and the field stays a tab stop and
stays in the submitted data. It is a value on show — so the box lifts off the
page's own background onto `--color-subtle` and its text stays at full strength,
13.45:1, because being read is the entire purpose of the state. The border does
not move, because nothing about the field's reach has.

**Disabled** is unavailable: not a tab stop, not submitted. The tokens keep
their remove controls so the row does not reflow on its way to unavailable, but
each one is inert, and both the box and the chips drain to measured unavailable
colours rather than being dimmed with opacity — halving the alpha of a chip that
has already drained takes its label below the contrast floor. The box steps down
all three channels together: the fill to `--color-muted`, the text to
`--color-muted-foreground` at 4.67:1 over it, and the rim from `--color-input` to
the lighter `--color-border`.

Three channels rather than one, and that is the design rather than a flourish.
Read-only and disabled used to share a fill and part on the text colour alone,
which is a distinction made in hue and nothing else — the one a reader with a
colour deficiency, a low-quality display or forced-colors mode does not receive.
A change in _shape_ survives where a change in hue does not.

**Invalid** still works. It takes the destructive border and focus ring and sets
`aria-invalid` on the box, which is the same error language
[TextField](/components/text-field) and [Select](/components/select) speak, so a
row reporting an error looks the same whichever control it holds.

<Demo title="Available, read-only and disabled">
  <div class="flex w-full max-w-sm flex-col gap-4">
    <TagsInput :model-value="['invoice', 'q3']" aria-label="Editable filters" />
    <TagsInput :model-value="['invoice', 'q3']" readonly aria-label="Applied filters" />
    <TagsInput :model-value="['invoice', 'q3']" disabled aria-label="Archived filters" />
    <TagsInput :model-value="['invoice']" invalid aria-label="Filters with an error" />
  </div>
</Demo>

The same treatment answers a [Fieldset](./fieldset) that disables its group.
`<fieldset disabled>` disables the `<input>` and every token's remove button
inside this control natively — no prop travels, and nothing is walked — so the
drained appearance is painted off the fieldset's own attribute rather than off
anything a row passed down. One fact, written in one place, read by the browser
and by the stylesheet alike; a raw `<fieldset disabled>` you wrote yourself
works exactly as one of ours does.

## Inside a Field

A [Field](/components/field) publishes what the row knows and the control takes
it: the row's id lands on the box so the `<label for>` names it, the row's
`name`, `required` and `invalid` land beside it, and the row's hint or error line
is **added** to what the field already says about itself rather than replacing
it. A reader hears the refusal first, because it is the more specific thing to
say, then the token count, then the row's message.

```vue
<Field label="Labels" hint="Press Enter or type a comma" name="labels" required>
  <TagsInput v-model="labels" />
</Field>
```

`disabled`, `readonly`, `invalid` and `required` all still win wherever you set
them, in both directions, which is why each is `boolean | undefined` and defaults
to `undefined` rather than `false`.

`name` is the one that lands somewhere unexpected. The visible box holds a
_draft_ — what is half-typed and not yet committed — so posting it under the
row's name would submit the wrong thing entirely. The tokens are posted instead,
as `labels[0]`, `labels[1]` and so on, through hidden inputs beside the field.

<Demo title="Inside a Field">
  <div class="w-full max-w-sm">
    <Field label="Labels" hint="Press Enter or type a comma" name="labels" required>
      <TagsInput placeholder="Add a label" />
    </Field>
  </div>
</Demo>

## Keyboard and screen readers

**Backspace on an empty box lifts the last token back into it** — as editable
text, with the caret at the end — rather than deleting it. Nothing is destroyed:
the value is on screen, in a box the reader is already focused on, and Enter puts
it straight back. Correcting a typo in the token you just committed is one
Backspace and a keystroke.

That is a deliberate replacement for the more common behaviour, which is to mark
the last token on the first Backspace and delete it on the second. The marking
moves no focus and publishes no `aria-activedescendant`, so on screen it is a
highlight and to a screen reader it is nothing at all — and the second Backspace
then destroys a value the reader was never told was chosen. This control makes
that state unreachable rather than trying to narrate it.

Tab reaches the box and each token's remove control, and **each of those controls
is named for the token it removes**: "Remove design", never six buttons all
called "Remove". The tokens are independent objects with one action each, not a
set of alternatives, so each button is its own tab stop; roving focus is for a
group where only one member can be chosen. Removing a token hands focus to the
box, which is the one node in the control that never goes away.

The field publishes **how many tokens it holds** through `aria-describedby`, so
focusing the box says "Keywords, edit text, 3 tags" and a reader learns the size
of the list without walking it. It is a description rather than an announcement
deliberately: it is heard on focus and on every return to the field, which is when
the question is actually asked. The tokens are a real list underneath it, so
browsing them reads them as items.

The refusal message lives in an `aria-live="polite"` region that is in the page
from the first render, empty. A live region mounted at the same moment as its
text is a region assistive technology was not yet watching, so the first refusal —
the one that matters most — would be the one it announced least reliably.

## Motion

The border, the fill and the focus bloom transition at `duration-fast` on
`--ease-out`, below the `--duration-normal` feedback ceiling: a field that lights
up after the reader has already started typing is answering a question they
stopped asking.

A token arrives with `animate-fade-rise` and **no stagger**. The shared list
stagger is for a set of rows revealed together; a token appears one at a time in
answer to a keystroke, and a per-row delay there is a lag on a direct response.
Tokens are keyed by value and by which occurrence of it they are, so removing one
of them leaves every other node exactly where it was.

Nothing loops.

<Demo title="Every state" :source="tagsInputDemoSource">
  <TagsInputDemo />
</Demo>

## Labels

Every word this control says is replaceable, and — unusually for a Reka-backed
primitive — every word is Loom's own. Reka's TagsInput writes no `aria-label` and
no English of its own anywhere, so a key you drop here falls back to Loom's
English rather than to a second, untranslated vocabulary underneath it.

```ts
interface TagsInputLabels {
  remove: (args: { value: string }) => string; // one token's remove control
  count: (args: { count: number; max: number | undefined }) => string; // the size of the list
  rejected: (args: {
    rejections: readonly TagsInputRejection[];
    max: number | undefined;
  }) => string; // everything one interaction refused, as one message
  clear: string; // the control that empties the field
}
```

**`count` is handed the number, never a formatted string.** "3 tags" has one
plural form in Vietnamese, two in English and six in Arabic, and no placeholder
syntax Loom could invent would carry that — so the number goes over the seam and
`Intl.PluralRules` picks the category in your own locale, with
`Intl.NumberFormat` for the digits. `max` is `undefined` when the field has no
limit, so the bounded and unbounded cases are worded by you as well.

**`remove` is handed the token** for the same reason `FileUpload`'s is handed the
file: a field of recipients wants "Remove Ana Duarte", and a field of keywords
wants something shorter. Only the caller knows which.

```ts
count: ({ count, max }) =>
  max === undefined ? t("tags.count", count) : t("tags.countOf", { count, max });
```

Every key is optional — supply one and the rest stay as your application's
vocabulary, or Loom's English, left them. Annotate a bag of your own with
`LabelOverrides<TagsInputLabels>` rather than with `TagsInputLabels` itself: the
override type is partial, so a key added in a later release is one your bag may
ignore, where the bag interface is total and would stop compiling.

For a whole application set these once with `provideLoomLabels` rather than at
every call site; the `labels` prop is for the per-instance correction. See
[Localisation](/foundations/localisation).

## API

<!-- @api TagsInput -->
