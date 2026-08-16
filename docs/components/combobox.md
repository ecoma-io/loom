# Combobox

A text input that narrows a list as you type, for the list too long to scan.
Countries, currencies, repositories, people — anywhere a reader knows roughly
what they are looking for and would rather type three letters than scroll past
two hundred rows.

Its neighbour is [Select](/components/select), and the boundary between them is
the length of the list rather than the shape of the control. Select's own page
puts it from the other side: a list long enough that a reader would want to
search it wants a combobox. Read that as a threshold around fifteen rows. Below
it, a search box is a keystroke charged for nothing — the reader could have read
the whole list in the time it took to type. Above it, scrolling is the tax
instead, and this is the control that removes it. Two to five options that
should all be visible at once are neither: they belong in a segmented control.

The two are one family on purpose. The heights come off the same scale as the
text input, the popover surface, the row styling, the check mark, the stagger
and the chevron are the same, so moving between a Select and a Combobox in the
same form is not a change of vocabulary. What genuinely differs is the keyboard
model, and it differs because it has to: this control's reader is typing, so
focus stays in the input and the active row is pointed at rather than moved to.

<script setup lang="ts">
import { computed, ref } from "vue";
import { Combobox } from "@ecoma-io/loom";
import ComboboxDemo from "../demos/ComboboxDemo.vue";
import comboboxDemoSource from "../demos/ComboboxDemo.vue?raw";

const countries = [
  { value: "au", label: "Australia" },
  { value: "br", label: "Brazil" },
  { value: "ca", label: "Canada" },
  { value: "de", label: "Germany" },
  { value: "es", label: "Spain" },
  { value: "fr", label: "France" },
  { value: "id", label: "Indonesia" },
  { value: "in", label: "India" },
  { value: "jp", label: "Japan" },
  { value: "kr", label: "South Korea" },
  { value: "mx", label: "Mexico" },
  { value: "ng", label: "Nigeria" },
  { value: "ph", label: "Philippines" },
  { value: "se", label: "Sweden" },
  { value: "th", label: "Thailand" },
  { value: "vn", label: "Viet Nam" },
  { value: "za", label: "South Africa", disabled: true },
];

const visited = ref(["br", "jp", "se", "th", "vn"]);
const everywhere = ref(countries.map((option) => option.value));

const query = ref("");
const found = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return countries;
  return countries.filter(
    (option) =>
      option.label.toLowerCase().includes(needle) || option.value.toLowerCase().includes(needle),
  );
});
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { Combobox, type ComboboxOption } from "@ecoma-io/loom";

const countries: ComboboxOption[] = [
  { value: "vn", label: "Viet Nam" },
  { value: "jp", label: "Japan" },
];

const country = ref("vn");
</script>

<template>
  <Combobox
    v-model="country"
    :options="countries"
    placeholder="Search countries"
    aria-label="Country"
  />
</template>
```

## Options

An option is `value`, `label`, and an optional `disabled`. `value` is what the
model carries and what `update:modelValue` reports; `label` is what a reader
sees, what the filter matches, and what the input shows once the row is chosen.
Keeping them separate is what lets the label be translated without the stored
value moving.

`ComboboxOption` is declared by this component rather than shared with
`SelectOption`. The two shapes are identical today and are deliberately two
declarations: either surface may grow a field the other should not inherit by
accident, and a shared alias would make that change look free when it is not.

A `disabled` option still renders. It is present but unchoosable — muted,
skipped by the keyboard, and unresponsive to a click — which is the honest way
to show that a choice exists and is currently out of reach.

Muted, and deliberately not dimmed. The row's label moves to the muted
foreground colour rather than being drawn at half opacity, because a
transparency multiplies the _text_ down with everything else: at 50% the label
measured 3.13:1 against the popover, under the 4.5:1 the rest of the site holds
itself to. The colour is a measured 5.76:1 and still visibly lighter than the
rows around it.

<Demo title="Options">
  <div class="w-full max-w-xs">
    <Combobox :model-value="'vn'" :options="countries" placeholder="Search countries" aria-label="Country" />
  </div>
</Demo>

## Choosing several

`multiple` turns the control into a many-of-many picker. Three things change,
and nothing else does.

**The list stops closing.** A chosen row stays where it is and toggles: pressing
it again takes the value back out, and the typed query survives the toggle, so
one search can pick several rows. `Esc` and a click outside still close, exactly
as they do in single-select.

**The input goes back to being only a search box.** In single-select it shows
the chosen option's label; here it shows nothing, because the selection is
shown beside it as tokens — the same [Chip](./chip) a
[TagsInput](./tags-input) commits its values to, so a chosen set looks the same
wherever a form shows one.

**The tokens are inert**, and deliberately. TagsInput gives each of its tokens a
remove control because it has no list to send a reader back to; this control
does, so the list is where a value is chosen and where it is unchosen. That
keeps the whole thing the single Tab stop it is in single-select, and it keeps a
value hidden behind the overflow count reachable by exactly the same gesture as
a visible one.

**The box does not grow.** It sits in a form row beside controls on a fixed
height scale, so past `visibleValues` — three by default — the tail collapses
into one summary. Five chosen shows three tokens and "+2 more"; fifty shows
three and "+47 more". Raise `visibleValues` for a wider box; the token row never
wraps, so a number the box has no room for is a number that truncates.

<Demo title="Several at once">
  <div class="flex w-full max-w-xs flex-col gap-3">
    <Combobox v-model="visited" multiple :options="countries" placeholder="Add a country" aria-label="Countries visited" />
    <Combobox v-model="everywhere" multiple :options="countries" aria-label="Countries visited, all of them" />
  </div>
</Demo>

`modelValue` is `string | string[]`, one prop rather than a generic component,
and the mode is the invariant: single-select emits and accepts a `string` and
never an array, multi-select an array and never a bare string. A generic would
say that in the type system and cost more than it buys — it would print a
conditional type in the API table below, and it would break
`InstanceType<typeof Combobox>`, which is how a consumer types a template ref.
Existing single-select code compiles unchanged.

**The size of the selection reaches a screen reader**, which neither the tokens
nor the overflow count does on its own. It is published as
[`labels.count`](#labels) and wired into the input's `aria-describedby`, so it
is heard on focus and on every return to the box — which is when the question is
asked. Each individual toggle is already announced by the row's own
`aria-selected`, and the listbox carries `aria-multiselectable` to say the
control takes more than one value in the first place.

```vue
<Combobox v-model="visited" multiple :options="countries" aria-label="Countries visited" />
```

## The empty state

A filter that matches nothing has to say so. This is the state most often
forgotten, and the failure is quiet: the popover opens, holds nothing, and a
reader is left to guess whether the search found nothing or the control broke. A
screen reader is told even less, because an empty container announces nothing at
all.

So "no results" is a row inside the listbox rather than a caption beside it — a
`role="option"` marked `aria-disabled`, which is a legitimate child of a listbox
and therefore something a screen reader reaches, while remaining a statement
rather than a choice. `emptyMessage` is its wording for one box; say what was
searched rather than restating the obvious, and the row will carry it. Leave it
unset and the row says what [`labels.empty`](#labels) says, which is where the
wording for a whole application belongs.

<Demo title="Empty state — type anything that matches nothing">
  <div class="w-full max-w-xs">
    <Combobox :options="countries" placeholder="Search countries" empty-message="No country by that name" aria-label="Country, with a custom empty message" />
  </div>
</Demo>

## Filtering, and taking it over

By default the component filters `options` against the typed text itself. The
match is locale-aware and ignores case and diacritics, so an unaccented keyboard
still reaches an accented row — typing `viet` finds "Việt".

`update:query` reports the input's text on every change, which is what lets a
host run its own search: fetch on the query, hand back the results as `options`.
Doing that means turning `filter` off, and the reason is worth stating plainly.
A server search legitimately returns rows that do not contain the typed string —
a synonym, a corrected spelling, a match on an identifier the reader cannot see.
With the built-in filter still running underneath, those rows arrive and are
immediately hidden again, and the control shows "no results" over a list of
perfectly good ones. `:filter="false"` is what stops that second pass.

The example below filters on the country code as well as the name, which the
built-in filter cannot do because it only ever sees the label: `vn` finds Viet
Nam.

<Demo title="Host-driven search">
  <div class="w-full max-w-xs">
    <Combobox :options="found" :filter="false" placeholder="Name or code" aria-label="Country, searched by name or code" @update:query="query = $event" />
  </div>
</Demo>

## Size

`size` shares its scale with the text input and with Select exactly — `sm`, `md`
(the default), `lg` — so a form row mixing the three never comes out uneven.
That shared scale is the reason to change `size` rather than reach past it for
an `h-*` class: a height set directly moves this one control off the scale the
row is aligned to.

<Demo title="Size">
  <div class="flex w-full max-w-xs flex-col gap-3">
    <Combobox :model-value="'vn'" :options="countries" size="sm" aria-label="Country, small" />
    <Combobox :model-value="'vn'" :options="countries" size="md" aria-label="Country, medium" />
    <Combobox :model-value="'vn'" :options="countries" size="lg" aria-label="Country, large" />
  </div>
</Demo>

## Keyboard and screen readers

The input is the `role="combobox"` node, wired to the list by `aria-expanded`
and `aria-controls` and announcing its behaviour with
`aria-autocomplete="list"`. The whole control is a single Tab stop: the chevron
is a real button, but it is out of the tab order and carries its own accessible
name, so a keyboard reader never lands on it separately.

| Key            | Behaviour                                               |
| -------------- | ------------------------------------------------------- |
| A character    | Opens the list if it was closed, and filters it         |
| `↓`            | Opens the list, then moves the active row down          |
| `↑`            | Moves the active row up                                 |
| `Home` / `End` | Jumps to the first or last row                          |
| `Enter`        | Chooses the active row — and closes, unless `multiple`  |
| `Esc`          | Closes, leaving focus and the typed text where they are |
| `Tab`          | Leaves the control, which closes                        |
| Click outside  | Closes                                                  |

With `multiple`, `Enter` toggles the active row and the list stays open, so the
same keystroke run picks several values. Nothing else in the table changes, and
neither does the number of Tab stops: the tokens the box grows are text, not
controls.

Focus never leaves the input, because the reader is still typing: the active row
is pointed at with `aria-activedescendant` rather than focused. This is the one
place Combobox and Select genuinely diverge — Select moves real focus onto the
row, which it can do because nothing is being typed into it. Escape therefore
has no focus to restore; it closes the list and the caret stays exactly where it
was.

Closing puts the chosen option's label back in the input, and reopening shows
the whole list again rather than the rows that survived the last query — the
text in the box is a value, not a filter still being applied.

The input has no text of its own until something is chosen, so name it:
`aria-label` or `aria-labelledby` lands on the input along with every other
attribute you pass.

## Motion

The list rises in on the shared overlay lane, and its rows arrive one step after
another from the shared list stagger, so a Combobox opening beside a Select or a
menu moves at the same rhythm and caps at the same depth — a long list never
turns into a slow one.

The stagger belongs to the _reveal_ only. Once the reader is typing, rows arrive
immediately: re-staggering on every keystroke would make the list feel like it
was rebuilding under their fingers, and a filter is meant to feel like the list
settling rather than a new one being dealt. Rows that survive a keystroke are
not re-animated at all — they are the same elements, still where they were.

<Demo title="Every state" :source="comboboxDemoSource">
  <ComboboxDemo />
</Demo>

## Disabled and invalid

A disabled Combobox drains, takes no text and refuses to open: the box takes the
neutral fill, the value inside it moves to the muted foreground colour, and the
hairline recedes from `border-input` to `border-border`. It does not fade — the
box is what shows the chosen value, and that value is the one thing a reader
still needs from a control they cannot change. Half opacity took it to 3.06:1;
the drained pair measures 4.68:1.

The border is the second channel on purpose. A fill and a text colour are both
hue, and unavailability carried by hue alone is unavailability a reader who
cannot resolve `muted` from `background` never learns about; a change in the
edge is a change in shape. This control has no read-only state to be told apart
from — see below — so it takes that one row of the treatment rather than all
three.

An invalid one still works: it takes the destructive border and focus ring and
sets
`aria-invalid`, which is the same error language every other form control
speaks, so a field reporting an error looks the same whichever control it holds.

<Demo title="Disabled and invalid">
  <div class="flex w-full max-w-xs flex-col gap-3">
    <Combobox :model-value="'jp'" :options="countries" disabled aria-label="Country, disabled" />
    <Combobox :options="countries" invalid placeholder="Pick one to continue" aria-label="Country, invalid" />
  </div>
</Demo>

## Inside a Field

Wrapped in a [Field](./field), Combobox wires itself: the row's id, the id of
its hint or error line, `required`, `invalid`, `disabled` and the name the
chosen value is posted under all arrive from the row, so nothing is written at
the call site.

```vue
<Field label="Country" name="country" error="Pick a country to continue" required>
  <Combobox v-model="country" :options="countries" placeholder="Search countries" />
</Field>
```

`disabled` and `invalid` still win when you set them, in both directions — which
is why both are `boolean | undefined` and default to `undefined` rather than
`false`. `<Combobox />` says nothing and inherits the row; `<Combobox :invalid="false" />`
says this one control is fine even though its row is not, and it is obeyed.

**`name` posts the value, never the text in the box.** The input holds the
chosen option's _label_ — "Viet Nam" — while the model carries `vn`, so the name
goes to a hidden control alongside it rather than onto the input itself. A form
reading `country` gets `vn`.

**A row's `readonly` is ignored, deliberately.** The text in the box is a
caption rewritten on every choice rather than the value, so making it read-only
would freeze the caption while the list underneath still opened on a click. A
choice nobody may change is a disabled Combobox, or the label rendered as text.

## Labels

The strings on this control that are its own rather than yours. The chevron is a
real button and Reka UI names it `Show popup`, in English, inside its own render
function with no prop to reach it by; the empty row needs wording when
`emptyMessage` gives it none; and a multi-select says two things about the size
of its selection.

```ts
interface ComboboxLabels {
  trigger: string; // the chevron that opens the list
  empty: string; // the row shown when the filter matches nothing
  count: (args: { count: number }) => string; // how many are chosen, for a screen reader
  overflow: (args: { hidden: number }) => string; // the visible "+2 more"
}
```

**The last two take the number, never a formatted string**, for the reason
[Localisation](/foundations/localisation) sets out: "3 selected" has one plural
form in Vietnamese, two in English and six in Arabic, and `+47` is a punctuation
choice made in one language. Handed the integer, your own `Intl.PluralRules`
picks the category and `Intl.NumberFormat` shapes the digits.

`emptyMessage` and `labels.empty` are not rivals. The prop is one box's wording
— "No country by that name" — and the label is what every other box says, so the
prop wins wherever both are set. Reach for the label when you are translating an
application and for the prop when you are writing copy for one control.

```vue
<Combobox :options="countries" :labels="{ trigger: 'Hiện danh sách' }" />
```

Every key is optional — supply one and the other stays as your application's
vocabulary, or Loom's English, left it. Annotate a bag of your own with
`LabelOverrides<ComboboxLabels>` rather than with `ComboboxLabels` itself: the
override type is partial, so a key added in a later release is one your bag may
ignore, where the bag interface is total and would stop compiling.

For a whole application set these once with `provideLoomLabels` rather than at
every call site; the `labels` prop is for the per-instance correction. See
[Localisation](/foundations/localisation).

## API

<!-- @api Combobox -->
