# FileUpload

A drop zone that is also a real file dialog, with the list of what has been
chosen underneath it and a remove control on every row. Reach for it wherever a
person hands files to an application: an attachment on a message, a batch of
invoices, a profile picture.

It chooses files and it does nothing else. There is no progress bar here and no
request — the host reads `modelValue`, sends it wherever it goes, and renders
[Progress](/components/progress) beside it for that half, or
[Spinner](/components/spinner) where there is no percentage to paint. Two
controls rather than one, because an upload's states — retrying, partial, refused
by the server — belong to whatever is doing the uploading, and a control owning
both halves would have to guess at every one of them.

The refusals it does own are the ones it can decide by itself, before anything
is sent: a file over `maxSize`, a file outside `accept`, a file already in the
list, and every file after the first when `multiple` is not set. Each one is
announced, named on screen, and reported through `reject`.

<script setup lang="ts">
import { FileUpload } from "@ecoma-io/loom";
import FileUploadDemo from "../../src/primitives/FileUpload/FileUploadDemo.vue";
import fileUploadDemoSource from "../../src/primitives/FileUpload/FileUploadDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { FileUpload, type FileUploadRejection } from "@ecoma-io/loom";

const attachments = ref<File[]>([]);

function onReject(rejections: FileUploadRejection[]) {
  // `rejections` carries the File and the rule that turned it away.
  console.warn(rejections);
}
</script>

<template>
  <FileUpload
    v-model="attachments"
    multiple
    accept=".pdf,application/pdf"
    :max-size="5 * 1024 * 1024"
    label="Choose attachments or drag them here"
    @reject="onReject"
  />
</template>
```

`modelValue` is an array of `File` objects — the browser's own, untouched. Leave
it unbound and the control keeps its own list, which is what makes a zone dropped
into a page work before it is wired to anything.

## One file or many

`multiple` changes two things at once. It lets the file dialog return more than
one file, and it makes each new choice **add** to the list rather than replace
it: a reader who drops two files and then a third means three, and the native
input's replace-everything behaviour is the surprise. Without it the newest
choice replaces the old one, exactly as the input does, and every file after the
first in one drop is refused with a reason that says so.

A file already in the list — same name, same size, same modification time — is
refused rather than listed twice.

<Demo title="One file or many">
  <div class="flex w-full max-w-sm flex-col gap-6">
    <FileUpload multiple label="Choose attachments or drag them here" />
    <FileUpload label="Choose one document" />
  </div>
</Demo>

## Accept and maxSize

`accept` takes the native syntax — `.csv`, `text/csv`, `image/*`, comma-separated
— and it is applied twice: the browser uses it to filter the file dialog, and the
component applies it again to a drop, which no browser checks at all. A zone that
only sets the attribute accepts anything dropped on it.

Write both forms of a type where you can. `file.type` is the browser's guess from
the extension and it is empty for anything the operating system does not
recognise, so an accept list of MIME types alone quietly turns away files it
meant to take. `.csv,text/csv` is the version that behaves.

`maxSize` is in bytes. When no `hint` is given the limit becomes the zone's second
line, spelled out in the units a file browser uses, so a reader learns it before
choosing rather than after being refused.

<Demo title="Accept and maxSize">
  <div class="w-full max-w-sm">
    <FileUpload multiple accept=".csv,text/csv" :max-size="64 * 1024" label="Choose a CSV export" />
  </div>
</Demo>

## Refusals

Nothing is refused silently. Every rejected file produces three things at once: a
line of text under the zone naming the file and the rule, an announcement through
a live region that was already in the page waiting for it, and one `reject` event
carrying `{ file, reason }` for each — one event per interaction, not one per
file.

The four reasons are `too-large`, `type`, `duplicate` and `too-many`. What a
refusal _means_ is the host's: a conversion offer, a retry, a link to whoever can
raise the limit. The control only reports it — and the wording it reports with is
[`labels.rejected`](#labels), one function over the whole list rather than a
sentence per file.

The message clears itself as soon as the reader edits the list, because a message
about a file that was never added stops describing anything on screen the moment
the rows beside it change.

## Disabled and invalid

A disabled zone refuses the file dialog, the drop and every remove button
together, and dims. An invalid one still works: it takes the destructive border
and focus ring and sets `aria-invalid` on the input, which is the same error
language [TextField](/components/text-field) and [Select](/components/select)
speak — a field reporting an error looks the same whichever control it holds. The
error text itself belongs to the field around it,
[InlineError](/components/inline-error) rather than this component's own live
region, which is reserved for what the zone itself refused.

<Demo title="Disabled and invalid">
  <div class="flex w-full max-w-sm flex-col gap-6">
    <FileUpload disabled label="Choose a contract" />
    <FileUpload invalid label="Choose a signed copy" />
  </div>
</Demo>

## Inside a Field

A [Field](/components/field) publishes what the row knows and the zone takes it, and this
is the one control in the family that had something of its own to say first.
The row's id lands on the input **and** on the `<label>`'s `for`, so the zone
keeps activating it; the row's `name`, `required` and `invalid` land on the
input beside them; and the row's hint or error line is **added** to the zone's
own refusal message rather than replacing it. A file turned away for being too
large keeps saying why, and the reader hears both — the refusal first, because
it is the more specific thing to say.

```vue
<Field label="Attachments" hint="PDFs only" name="attachments" required>
  <FileUpload v-model="attachments" multiple accept=".pdf,application/pdf" />
</Field>
```

Unlike the other bare controls here, a row's label really does name this one:
the zone is a real `<input type="file">`, so a `<label for>` resolves to it. It
does not _replace_ the zone's copy, though — the zone is itself a `<label>`
around that input, so what a reader hears is both, in order: "Attachments,
choose files or drag them here". Keep the row's label the field's **name** and
the `label` prop its **instruction**, and the pair reads as one sentence instead
of as the same words twice.

`disabled` and `invalid` both still win wherever you set them, in both
directions, which is why each is `boolean | undefined` and defaults to
`undefined` rather than `false`.

There is no `readonly`, and a row's is ignored rather than approximated.
`readonly` is inert on `<input type="file">` in every browser, for the reason it
is inert on a checkbox: there is no text to protect, only a dialog to open. A
zone that may be read but not added to is a disabled zone — and the list beneath
it, which is where the value actually is, stays readable either way.

## Keyboard and screen readers

**Drag and drop is a shortcut here, never the path.** The zone is a `<label>`
wrapped around a real `<input type="file">`, hidden by clipping rather than by
`display: none` or the `hidden` attribute — both of which take the input out of
the tab order and leave a control only a pointer can reach. A `div` with a click
handler standing in for that input is the standard defect in this control, and it
is invisible to everyone who tests with a mouse.

So: Tab lands on the input, Space or Enter opens the system file dialog, and the
zone draws the focus ring on the input's behalf, because a clipped one-pixel
element can show a reader nothing. The zone's own copy is the input's accessible
name, which is why `label` is a prop rather than a decoration — and why passing
`aria-label` replaces a good name with whatever you wrote instead.

Each chosen file is a list row, and each row's remove button is named after the
file it removes: "Remove invoice-2026-01.pdf", never seven buttons all called
"Remove". The rows are independent objects rather than a set of alternatives, so
each button is its own Tab stop; roving focus is for a group where only one member
can be chosen.

The refusal message lives in an `aria-live="polite"` region that is in the page
from the first render, empty. A live region mounted at the same moment as its
text is a region assistive technology was not yet watching, so the first refusal —
the one that matters most — would be the one it announced least reliably. The
message is also wired to the input through `aria-describedby`, so it can be heard
again on focus rather than only once.

Drag state is never carried by colour alone: the dashed border goes solid as the
drag enters, and a `data-dragging` attribute marks the zone.

## Motion

The border and the fill are the drag feedback, and they transition at
`duration-fast` on `--ease-out` — a zone that lights up after the pointer has
already crossed it is answering a question the reader stopped asking, so it sits
below the `--duration-normal` feedback ceiling rather than at it.

List rows arrive with `animate-fade-rise`, staggered through the shared list
vocabulary, which caps the delay so a long list never turns into a slow one — the
same rhythm a Select's rows reveal at. Rows are keyed by the file itself rather
than by position, so removing one does not replay the entrance animation on all
the rows below it.

Nothing loops. There is no upload progress in this component to loop for.

<Demo title="Every state" :source="fileUploadDemoSource">
  <FileUploadDemo />
</Demo>

## Labels

This control carries the most prose in the library, and every word of it is
replaceable.

```ts
interface FileUploadLabels {
  zone: (args: { multiple: boolean }) => string; // the zone's copy, and the input's name
  hint: (args: { maxSize: number }) => string; // the limit, spelled out
  size: (args: { bytes: number }) => string; // the size against one chosen file
  remove: (args: { file: File }) => string; // one row's remove button
  rejected: (args: {
    rejections: readonly FileUploadRejection[];
    maxSize: number | undefined;
  }) => string; // everything one interaction refused, as one message
}
```

**Every size arrives as a byte count, never as `5 MB`.** The unit ladder, the
decimal separator and the space before the unit are all language decisions —
French writes `5 Mo` and a comma, and `Intl.NumberFormat` reaches Eastern Arabic
digits — so handing over a string Loom had already formatted would make Loom's
English the only arithmetic anyone could do.

**`rejected` takes the whole list rather than one refusal at a time**, and that
is the reason there is one key here rather than four sentences plus a joiner.
The character between two sentences is a property of the script, and a language
that would rather say "3 files were refused" than list them cannot get there
from a per-file message. `maxSize` is `undefined` when no limit is set, so that
case is worded by you as well.

```ts
rejected: ({ rejections, maxSize }) =>
  rejections.length === 1
    ? t("upload.refusedOne", { name: rejections[0].file.name })
    : t("upload.refusedMany", rejections.length);
```

`label` and `hint` are props as well as keys, and they are not rivals: the props
are one zone's copy — "Attach the signed contract" — and the keys are what every
other zone says, so a prop wins wherever both are set.

Every key is optional — supply one and the rest stay as your application's
vocabulary, or Loom's English, left them. Annotate a bag of your own with
`LabelOverrides<FileUploadLabels>` rather than with `FileUploadLabels` itself:
the override type is partial, so a key added in a later release is one your bag
may ignore, where the bag interface is total and would stop compiling.

For a whole application set these once with `provideLoomLabels` rather than at
every call site; the `labels` prop is for the per-instance correction. See
[Localisation](/foundations/localisation).

## API

<!-- @api FileUpload -->
