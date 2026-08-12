<script lang="ts">
import type { LabelOf } from "../../lib/labels";

/** Why a file the reader offered was not added to the list. */
export type FileUploadRejectReason = "too-large" | "type" | "duplicate" | "too-many";

/** One refused file, paired with the rule that refused it. */
export interface FileUploadRejection {
  /** The file as the browser handed it over — untouched, so a host can report on it. */
  file: File;
  /** Which rule turned it away. */
  reason: FileUploadRejectReason;
}

const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

/**
 * A byte count as a person reads it.
 *
 * Binary steps with the short decimal names, which is what every operating
 * system file dialog beside this control shows — a reader comparing "1.4 MB"
 * here against "1.4 MB" in their own file browser should see the same number,
 * and the pedantically-correct "1.5 MB" (or "1.4 MiB") only reads as a bug.
 * One decimal below ten and none above it, so the size column stays the same
 * width down the list.
 *
 * Deliberately not exported: it is a formatter this control needs, not a
 * public utility, and the moment a host imports it from here the wording of a
 * file size becomes part of this component's API.
 */
function formatBytes(bytes: number): string {
  let value = Math.max(bytes, 0);
  let step = 0;
  while (value >= 1024 && step < BYTE_UNITS.length - 1) {
    value /= 1024;
    step += 1;
  }
  const rounded = step > 0 && value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return `${String(rounded)} ${BYTE_UNITS[step] ?? "B"}`;
}

/**
 * Everything this control puts in front of a reader that is not a file name —
 * and it is the most prose in the library, which is why every one of these
 * takes raw values and returns a finished string.
 *
 * **Every size arrives as a byte count, never as `"5 MB"`.** The unit ladder,
 * the decimal separator and the space before the unit are all language
 * decisions: `formatBytes` above writes `1,5 MB` nowhere and `%42` never, and
 * a host handed the number reaches `Intl.NumberFormat` for both. Handing over
 * a string Loom had already formatted would make Loom's English the only
 * arithmetic anyone could do.
 *
 * **`rejected` takes the whole list, not one refusal at a time.** Loom joined
 * four sentences with a space before this, and a joiner is a fragment — the
 * character between two sentences is a property of the script, and a language
 * that would rather say "3 files were refused" than list them cannot get there
 * from a per-file message. One function over the list can say either.
 *
 * **`remove` and `rejected` are handed the `File` itself**, not its name, for
 * the same reason: a host that would rather name the row by index, or truncate
 * a long name from the middle, has the whole object to work from.
 */
export interface FileUploadLabels {
  /** The zone's own line of copy, which is also the file input's accessible name. The `label` prop overrides it for one zone. */
  readonly zone: LabelOf<{ multiple: boolean }>;
  /** The smaller line under it, stating the size limit. The `hint` prop overrides it for one zone. */
  readonly hint: LabelOf<{ maxSize: number }>;
  /** The size shown against one chosen file. */
  readonly size: LabelOf<{ bytes: number }>;
  /** The button that takes one file back out of the list. */
  readonly remove: LabelOf<{ file: File }>;
  /** Everything refused by one interaction, as one message. `maxSize` is `undefined` when no limit is set. */
  readonly rejected: LabelOf<{
    rejections: readonly FileUploadRejection[];
    maxSize: number | undefined;
  }>;
}

/**
 * Every refusal names the file, because the reader is looking at a list of
 * several and "that file is too large" identifies none of them.
 */
function describeRejection(rejection: FileUploadRejection, limit: string): string {
  const name = rejection.file.name;
  switch (rejection.reason) {
    case "too-large":
      return `${name} is larger than ${limit}.`;
    case "type":
      return `${name} is not an accepted file type.`;
    case "duplicate":
      return `${name} has already been chosen.`;
    case "too-many":
      return `${name} was not added — only one file can be chosen.`;
  }
}

/**
 * Loom's English, co-located with the component so it tree-shakes with it, and
 * exported so a host can build a partial vocabulary against the real thing.
 */
export const FILE_UPLOAD_LABELS: FileUploadLabels = {
  zone: ({ multiple }) =>
    multiple ? "Choose files or drag them here" : "Choose a file or drag it here",
  hint: ({ maxSize }) => `Up to ${formatBytes(maxSize)}`,
  size: ({ bytes }) => formatBytes(bytes),
  remove: ({ file }) => `Remove ${file.name}`,
  rejected: ({ rejections, maxSize }) => {
    const limit = maxSize === undefined ? "the size limit" : formatBytes(maxSize);
    return rejections.map((rejection) => describeRejection(rejection, limit)).join(" ");
  },
};
</script>

<script setup lang="ts">
import { computed, ref, useId } from "vue";
import { CloudUpload, File as FileIcon, TriangleAlert, X } from "@lucide/vue";
import { cn } from "../../lib/cn";
import { listStaggerDelay } from "../../lib/motion";
import { useSplitAttrs } from "../../lib/attrs";
import { useFieldControl } from "../../lib/field-context";
import { useLabels, type LabelOverrides } from "../../lib/labels";

/**
 * FileUpload — choosing files, and nothing else. A drop zone that is also a
 * real file dialog, plus the list of what has been chosen so far, with each
 * row removable.
 *
 * **It chooses; it does not upload.** There is no progress bar here and no
 * request: the host reads `modelValue`, sends it wherever it goes, and renders
 * `Progress` (or `Spinner`, when there is no percentage) for that half. Two
 * controls rather than one, because the upload's states — retrying, partial,
 * failed on the server — belong to whatever is doing the uploading, and a
 * control that owned both would have to guess at all of them.
 *
 * **Drag and drop is a shortcut, never the path.** The zone is a `<label>`
 * wrapped around a real `<input type="file">`, visually hidden by the clip
 * technique rather than by `display: none` or `hidden` — both of which take
 * the input out of the tab order and leave a control only a pointer can reach.
 * Tab lands on the input, Space or Enter opens the system file dialog, and the
 * zone draws the focus ring on its behalf because a 1px input cannot show one.
 * A `div` with a click handler in place of that input is the standard defect
 * in this control, and it is invisible to everyone testing with a mouse.
 *
 * Files arriving while `multiple` is set are appended to the list rather than
 * replacing it: a reader who drops two files and then a third means three, and
 * the native input's replace-everything behaviour is the surprise. Without
 * `multiple` the newest choice replaces the old one, exactly as the input does.
 *
 * Inside a [Field](../Field/Field.vue) it wires itself through
 * `useFieldControl()`: the row's id lands on the input (and on the `<label>`'s
 * `for`, so the zone keeps activating it), and the row's `name`, `required`,
 * `invalid` and the id of its hint or error line arrive with it. The row's
 * description is **merged** with this control's own refusal message rather than
 * replacing it — a file turned away for being too large has to keep saying so.
 *
 * There is no `readonly`, and a row's is ignored rather than approximated.
 * `readonly` is inert on `<input type="file">` in every browser, for the reason
 * it is inert on a checkbox: there is no text to protect, only a dialog to
 * open. A zone that may be read but not added to is a disabled zone above a
 * list — and the list, which is where the value actually is, stays readable
 * either way.
 */
const props = withDefaults(
  defineProps<{
    /** The chosen files. Leave it unbound to let the control keep its own list. */
    modelValue?: File[] | undefined;
    /** What the file dialog offers and what a drop is checked against — the native `accept` syntax: `.csv`, `image/png`, `image/*`, comma-separated. */
    accept?: string;
    /** Allows more than one file, and appends each new choice to the list instead of replacing it. */
    multiple?: boolean;
    /** Largest file accepted, in bytes. A file over it is refused and named in the message. */
    maxSize?: number;
    /** Unavailable: dims the zone, refuses the dialog, the drop and every remove button. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** Error state: paints the destructive border and ring, and sets `aria-invalid` on the input. Unset defers to a wrapping Field's `error`. */
    invalid?: boolean | undefined;
    /** The zone's own line of copy, which is also the input's accessible name. Defaults to `labels.zone`, whose wording matches `multiple`. */
    label?: string;
    /** The smaller line under it. Defaults to `labels.hint` against the `maxSize` limit, when there is one. */
    hint?: string;
    /**
     * Everything this control says that is not a file name, as any subset of
     * `FileUploadLabels` — the rest stay as the host's `provideLoomLabels`
     * vocabulary left them, and then as Loom's English.
     *
     * This is the per-instance correction, not the place to localise an
     * application. `label` and `hint` are the shorter way to reach the two
     * keys of the same name for one zone; this is what reaches the refusal
     * message, the remove buttons and the size column.
     */
    labels?: LabelOverrides<FileUploadLabels>;
  }>(),
  {
    // Not `[]`. An empty array is a concrete value, so it would say "the host
    // owns this list" — and a host that binds nothing would then watch every
    // file it chose vanish on the next render. `undefined` is what leaves the
    // control managing its own, the same distinction `optional()` exists to
    // preserve for the Reka-backed primitives.
    modelValue: undefined,
    multiple: false,
    // Not `false`, for either. `false` is a caller saying "this zone is fine /
    // enabled even though its row is not"; absent is a caller saying nothing,
    // and only `undefined` survives to mean that past Vue's
    // absent-Boolean-casts-to-false rule — see TextField.vue, which carries the
    // full reasoning.
    disabled: undefined,
    invalid: undefined,
  },
);

const emit = defineEmits<{
  /** The full list after the change — files added, or one removed. Never a partial list. */
  "update:modelValue": [files: File[]];
  /** Every file refused by this one interaction, each with the rule that refused it. Fires once per interaction, not once per file. */
  reject: [rejections: FileUploadRejection[]];
}>();

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves, and a template reading the raw prop would be reading the overrides
// rather than the answer.
const text = useLabels("fileUpload", FILE_UPLOAD_LABELS, () => props.labels);

// `class` sizes the whole control, so it lands on the root; everything else a
// caller passes — `name`, `id`, `data-testid`, `aria-describedby` — describes
// the real `<input type="file">` and lands there. Splitting them is the only
// way to route both correctly: the root is not a form control and the input is
// not the box a caller lays out.
defineOptions({ inheritAttrs: false });
const { attrs, rest: inputAttrs } = useSplitAttrs();

// The label's `for` needs the input's id, and a caller passing their own id —
// or a Field row publishing one — must not end up with a label pointing at
// nothing. `inputId` is resolved from `field` at the foot of this block.
const generatedId = useId();
const messageId = useId();

const ownFiles = ref<File[]>([]);
const files = computed(() => props.modelValue ?? ownFiles.value);

const rejections = ref<FileUploadRejection[]>([]);

/**
 * A stable key per file, held against the File object itself.
 *
 * Keying the rows by index instead re-keys every row after the one removed, so
 * removing the first of five replays the entrance animation on the other four
 * — the list appears to reload because one row left it. A WeakMap keys by
 * identity, holds nothing alive, and survives the list being reordered.
 */
const rowIds = new WeakMap<File, number>();
let nextRowId = 0;
function rowId(file: File): number {
  let id = rowIds.get(file);
  if (id === undefined) {
    id = nextRowId++;
    rowIds.set(file, id);
  }
  return id;
}

/** Name, size and mtime — what the file system itself calls the same file. */
function signature(file: File): string {
  return `${file.name}:${String(file.size)}:${String(file.lastModified)}`;
}

/**
 * The same test the native input applies to `accept`, applied again to a drop
 * — the browser enforces it in the file dialog and not at all on a drag, so a
 * zone that only sets the attribute accepts anything dropped on it.
 *
 * `file.type` is the browser's guess from the extension and it is empty for
 * anything it does not recognise, which is why an `accept` written as MIME
 * types alone turns away files it meant to take. Naming both — `.csv,text/csv`
 * — is the form that works, and it is what the documentation shows.
 */
function accepts(file: File): boolean {
  const accept = props.accept?.trim();
  if (accept === undefined || accept.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept.split(",").some((raw) => {
    const pattern = raw.trim().toLowerCase();
    if (pattern.length === 0) return false;
    if (pattern.startsWith(".")) return name.endsWith(pattern);
    if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1));
    return type === pattern;
  });
}

function commit(next: File[]): void {
  if (props.modelValue === undefined) ownFiles.value = next;
  emit("update:modelValue", next);
}

/** Runs the offered files past every rule, keeping what passes and reporting the rest. */
function add(incoming: File[]): void {
  if (field.disabled) return;

  const current = files.value;
  const kept = props.multiple ? [...current] : [];
  const seen = new Set(kept.map(signature));
  const refused: FileUploadRejection[] = [];
  const limit = props.maxSize;

  for (const file of incoming) {
    if (!props.multiple && kept.length > 0) {
      refused.push({ file, reason: "too-many" });
    } else if (limit !== undefined && file.size > limit) {
      refused.push({ file, reason: "too-large" });
    } else if (!accepts(file)) {
      refused.push({ file, reason: "type" });
    } else if (seen.has(signature(file))) {
      refused.push({ file, reason: "duplicate" });
    } else {
      seen.add(signature(file));
      kept.push(file);
    }
  }

  rejections.value = refused;
  if (refused.length > 0) emit("reject", refused);

  const unchanged = kept.length === current.length && kept.every((file, i) => file === current[i]);
  if (!unchanged) commit(kept);
}

function remove(index: number): void {
  if (field.disabled) return;
  // The message named files from the last selection. Once the reader edits the
  // list themselves it no longer describes anything on screen, and an error
  // sitting under a list somebody is actively fixing reads as an error about
  // that list.
  rejections.value = [];
  commit(files.value.filter((_, i) => i !== index));
}

function onSelect(event: Event): void {
  const input = event.target as HTMLInputElement;
  add(Array.from(input.files ?? []));
  // Cleared so choosing the same file a second time still fires `change`. The
  // input compares the new selection against its own value and stays silent
  // when they match — which, after a file has been removed from the list, is a
  // control that refuses to take back the file the reader just took out.
  input.value = "";
}

/**
 * Enters minus leaves, rather than a boolean.
 *
 * `dragleave` fires on the zone every time the pointer crosses onto one of its
 * own children, so an enter/leave pair drops the highlight and picks it up
 * again as the reader drags across the icon and the copy — the zone flickers
 * under the cursor at the exact moment it is meant to be saying "let go here".
 * A child's `dragenter` always lands before the parent's `dragleave`, so the
 * count never reaches zero until the pointer has genuinely left. `relatedTarget`
 * answers the same question in one line, but it is not reliably populated for a
 * drag that began outside the document — which is every drag this zone sees.
 */
const dragDepth = ref(0);
const dragging = computed(() => dragDepth.value > 0 && !field.disabled);

function onDragEnter(): void {
  dragDepth.value += 1;
}

function onDragLeave(): void {
  dragDepth.value = Math.max(dragDepth.value - 1, 0);
}

function onDragOver(event: DragEvent): void {
  // Without this the browser keeps its default handling, which for a file is
  // "navigate to it" — the drop never reaches the zone and the page is gone.
  // Setting dropEffect is what makes the cursor say copy rather than move.
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = field.disabled ? "none" : "copy";
}

function onDrop(event: DragEvent): void {
  event.preventDefault();
  // Reset rather than decrement: the drop consumes the drag, and no matching
  // `dragleave` follows it.
  dragDepth.value = 0;
  add(Array.from(event.dataTransfer?.files ?? []));
}

// Nothing here listens on `window` or `document`. A page-wide drag handler
// would be the usual way to stop a file dropped *beside* the zone from
// navigating the browser away, but a library primitive that installs one
// silently governs every other drop target on the host's page. That decision
// is the host's, so the listeners a component cannot tear down are the ones it
// never registers.

// The two content props sit *above* the resolved label rather than replacing
// it: `label` is the wording for one zone — "Drop last month's export here" —
// and the label is what every other zone says. Read through `text.` here and
// not resolved above, so a language switch after mount repaints the copy.
const zoneLabel = computed(() => props.label ?? text.value.zone({ multiple: props.multiple }));

const zoneHint = computed(() => {
  if (props.hint !== undefined) return props.hint;
  // The limit is handed over as a byte count, never as `formatBytes` output: a
  // host that writes `1,5 Mo` or Eastern Arabic digits cannot get there from a
  // string this component already decided the shape of.
  return props.maxSize === undefined ? undefined : text.value.hint({ maxSize: props.maxSize });
});

// One call over the whole list rather than one per refusal joined with a
// space. The joiner was the fragment: which character separates two sentences
// is a property of the script, and a language that would rather count the
// refused files than list them has no way to say so from a per-file message.
const message = computed(() =>
  rejections.value.length === 0
    ? ""
    : text.value.rejected({ rejections: rejections.value, maxSize: props.maxSize }),
);

// The Field wiring sits here, below `message`, because it reads it: this is the
// one control in the family that already had something of its own to say about
// itself, so its `describedBy` is a *merge* and not a hand-over. Its refusal
// message reads first — a file turned away for being too large is the most
// specific thing there is to say — then whatever the caller pointed at, then
// the row's hint or error, which `useFieldControl` appends. Replacing rather
// than merging at either end is how a rejection stops being announced.
//
// The condition is `message` itself, not `rejections`, so the id can never
// point at a `<p>` the template has not rendered.
//
// `name` and `required` are absent from the object because this component has
// no prop for either: the row's answer stands unopposed, and its `name` reaches
// the real `<input type="file">`, which is what a `<form>` posts. `readonly` is
// absent for the reason the docblock gives.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: [message.value.length > 0 ? messageId : undefined, attrs["aria-describedby"]]
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .join(" "),
  disabled: props.disabled,
  invalid: props.invalid,
}));

// `field.id` is the caller's own id, then the row's; the generated one is the
// floor beneath both, because the `<label for>` and the input have to agree on
// an id whether or not anybody supplied one.
const inputId = computed(() => field.id ?? generatedId);
</script>

<template>
  <div :class="cn('flex w-full flex-col', attrs.class as string)">
    <!-- The drag handlers sit on a <label>, which the rule reads as a static
         element — and it is usually right to: a box with a drop handler and
         nothing else is a control no keyboard can reach. Here the keyboard
         path is the real <input type="file"> nested inside, which the label
         both names and activates, so the drop adds a pointer shortcut to a
         control that already works without one. -->
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
    <label
      :for="inputId"
      :data-dragging="dragging || undefined"
      :data-invalid="field.invalid || undefined"
      :data-disabled="field.disabled || undefined"
      :class="
        cn(
          'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input bg-background px-6 py-8 text-center',
          // Border and fill are the drag feedback, so they carry the transition
          // — fast, because a zone that lights up after the pointer has already
          // crossed it is answering a question the reader stopped asking.
          'transition-[color,background-color,border-color,box-shadow] duration-fast ease-out',
          // Focus lives on the clipped input, which is 1px and can show a reader
          // nothing. The zone wears the ring on its behalf, the same
          // focus-within arrangement TextField uses for its own inner input.
          'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
          !field.invalid && 'focus-within:shadow-halo',
          // The dash going solid is what keeps the drag state off colour alone.
          'data-[dragging]:border-solid data-[dragging]:border-primary data-[dragging]:bg-primary-muted',
          field.invalid && 'border-destructive focus-within:outline-destructive',
          field.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-subtle',
        )
      "
      @dragenter="onDragEnter"
      @dragleave="onDragLeave"
      @dragover="onDragOver"
      @drop="onDrop"
    >
      <!-- `field.attrs` spreads **after** the fallthrough attrs, and that
           position is the contract (see TextField.vue): the bag has already
           resolved the caller's own id and merged their description with this
           zone's refusal message and the row's hint, and it drops every key
           that resolved to nothing, so it can only add. The `:aria-invalid` and
           `:aria-describedby` bindings that used to sit here went with it — an
           individual attribute written after a `v-bind` wins, so either one
           kept would overwrite the resolved value with the raw prop.

           `:id` is the deliberate exception, and not that failure: `inputId` is
           the bag's own id with the generated one beneath it, so it can only
           ever restate what the bag holds or supply the id the `<label for>`
           needs when the bag holds none. -->
      <input
        v-bind="{ ...inputAttrs, ...field.attrs }"
        :id="inputId"
        type="file"
        :accept="accept"
        :multiple="multiple"
        :disabled="field.disabled"
        class="sr-only"
        @change="onSelect"
      />
      <!-- The medallion, as EmptyState draws it: a 20px glyph alone in a large
           blank region has nothing holding it and reads as a stray mark. -->
      <span
        aria-hidden="true"
        class="grid h-10 w-10 place-items-center rounded-full border border-border bg-subtle text-muted-foreground"
      >
        <CloudUpload class="h-5 w-5" />
      </span>
      <span class="text-sm text-foreground">{{ zoneLabel }}</span>
      <span v-if="zoneHint" class="text-small text-muted-foreground">{{ zoneHint }}</span>
    </label>

    <!-- The region is in the DOM from the first render, empty. A live region
         mounted at the same moment as its text is a region assistive tech was
         not yet watching, so the first refusal — the one that matters most —
         is the one it announces least reliably. -->
    <div aria-live="polite" aria-atomic="true">
      <p
        v-if="message.length > 0"
        :id="messageId"
        class="mt-2 flex animate-fade-rise items-start gap-2 text-small text-destructive"
      >
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{{ message }}</span>
      </p>
    </div>

    <ul v-if="files.length > 0" class="mt-3 flex flex-col gap-1.5">
      <li
        v-for="(file, index) in files"
        :key="rowId(file)"
        class="flex animate-fade-rise items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
        :style="{ animationDelay: listStaggerDelay(index) }"
      >
        <FileIcon class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate text-sm text-foreground">{{ file.name }}</span>
        <span class="shrink-0 tabular text-small text-muted-foreground">
          {{ text.size({ bytes: file.size }) }}
        </span>
        <!-- Named with the file it removes. Seven buttons all called "Remove"
             are seven identical announcements and one guess about which row a
             reader is on. -->
        <button
          type="button"
          :aria-label="text.remove({ file })"
          :disabled="field.disabled"
          class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo disabled:cursor-not-allowed disabled:opacity-50"
          @click="remove(index)"
        >
          <X class="h-4 w-4" />
        </button>
      </li>
    </ul>
  </div>
</template>
