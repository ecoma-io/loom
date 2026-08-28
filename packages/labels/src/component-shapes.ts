// The vocabulary shapes of the components that speak, declared once here so the
// package graph stays acyclic: labels sits below every component, exports the
// shapes, and each component re-exports its own shape from this module (see its
// `src/index.ts`). The shape of what a component says is part of its contract,
// but it lives here because declaring it in the component and importing it back
// here — as the registry does — would put a package-cycle into the Moon graph.
//
// Type-only imports: nothing here is imported for its value.
import type { CountLabels } from "./count-labels";
import type { DateValue } from "@internationalized/date";
import type { LabelOf } from "./labels";

// Family-level helper types that accompany a shape: they are part of what the
// shape documents, so they sit beside it here and each owning component
// re-exports them rather than re-declaring them.
/** What a cell accepts, and what keyboard a phone raises for it. `numeric` is digits only; `text` takes any character, for an alphanumeric backup code. */
export type OtpInputType = "numeric" | "text";

/** Why a file the reader offered was not added to the list. */
export type FileUploadRejectReason = "too-large" | "type" | "duplicate" | "too-many";

/** One refused file, paired with the rule that refused it. */
export interface FileUploadRejection {
  /** The file as the browser handed it over — untouched, so a host can report on it. */
  file: File;
  /** Which rule turned it away. */
  reason: FileUploadRejectReason;
}

/** Which rule turned a value away. */
export type TagsInputRejectReason = "duplicate" | "max";

/** One value the field would not take, and the rule that refused it. */
export interface TagsInputRejection {
  /** The value as it would have been committed — trimmed, exactly as a token would read. */
  readonly value: string;
  /** Which rule refused it. */
  readonly reason: TagsInputRejectReason;
}

/**
 * The two buttons, which are the whole of what this component says on its own
 * account: the title and the consequence line are the host's, and there is no
 * body slot for anything else to arrive through.
 *
 * These were `confirmLabel` and `cancelLabel` props, and folding them in here
 * is not a rename. A prop default is per-instance by construction, so
 * "Confirm" and "Cancel" were the two strings in this library that a host
 * could correct at every call site and nowhere else — an application in
 * Vietnamese had to restate `cancelLabel` on every alert it rendered, and
 * forgetting one left an English button in the middle of a Vietnamese
 * decision. As a slot, `cancel` is set once for the application and `confirm`
 * is corrected per instance, which is the split these two actually want.
 */
export interface AlertDialogLabels {
  /**
   * The action button. **Replace it with the verb it performs** — "Delete",
   * "Discard", "Leave without saving". The default is a placeholder: "Confirm"
   * tells a reader they are confirming and not what.
   */
  readonly confirm: string;
  /**
   * The way out, and the control that opens with focus. Unlike `confirm` this
   * one usually is the same word everywhere in an application, which is what
   * makes a vocabulary rather than a prop the right home for it.
   */
  readonly cancel: string;
}

/**
 * What Alert says on its own account: the name of its dismiss control. The
 * tone's icon and message belong to the host's content; this is the one word
 * the component itself renders, and an unnamed close button in a wall of
 * alerts tells a screen-reader user nothing about which note they are
 * removing.
 */
export interface AlertLabels {
  /** The dismiss control's accessible name. */
  readonly dismiss: string;
}

/**
 * What this surface speaks of its own account: the names of the two buttons
 * that page the months, and the two halves of the selection line under the
 * header.
 *
 * Everything else a reader is told is already shaped by the control's own
 * `locale` — the month-and-year heading and each day cell's full-date name
 * are formatted from it, so there is no English behind them for this slot to
 * replace.
 *
 * **The selection line exists because the engine announces nothing.** A
 * choice reaches the DOM only as `aria-selected` flipping on a cell, and a
 * flipped attribute under an unmoved focus point is silent to a screen
 * reader — there is no field beside this surface whose value change would be
 * announced instead. The line is DateRangePicker's `role="status"` summary,
 * reduced to what a point selection has to say.
 */
export interface CalendarLabels {
  /** The button that pages the calendar back one month. */
  readonly previousMonth: string;
  /** The button that pages the calendar on one month. */
  readonly nextMonth: string;
  /**
   * What that line says once a day is chosen. It receives the day already
   * written out in full by the control's own formatter — the same string the
   * chosen cell is named with — because formatting it a second way here would
   * build a second `Intl` path beside the one that exists.
   */
  readonly chosen: LabelOf<{ date: string }>;
  /**
   * What the same line says while nothing is chosen, and what it returns to
   * when the chosen day is picked again.
   */
  readonly cleared: string;
}

/**
 * What Carousel says on its own account: the region's name, the two controls'
 * names, and the sentence that turns a position into a sentence. `slide` is
 * a message in the labels package's sense — it receives the raw numbers and
 * returns finished words, so pluralisation stays in the consumer's locale.
 */
export interface CarouselLabels {
  /** The carousel region's accessible name. */
  readonly region: string;
  readonly previous: string;
  readonly next: string;
  /** Per-slide and live-region announcement, from 1-based position. */
  readonly slide: LabelOf<{ position: number; total: number }>;
}

/**
 * What CopyButton says on its own account: its own name and the two
 * outcomes. `copy` is the icon-only button's accessible name; `copied` and
 * `failed` are the announcements assistive technology hears — the visible
 * glyph swap is deliberately not the only carrier of the state.
 */
export interface CopyButtonLabels {
  /** The button's accessible name. */
  readonly copy: string;
  /** Announced when the clipboard accepts the write. */
  readonly copied: string;
  /** Announced when the clipboard refuses or the host's `getText` throws — the button stays operable, so the next click retries. */
  readonly failed: string;
}

/**
 * What Table says on its own account: the scrollable region's fallback name
 * (a caption prop overrides it) and the sort control's state in words —
 * chevrons are shape-only semantics, so the words carry the state to a
 * screen reader instead.
 */
/**
 * What Timeline says on its own account: the ordered list's accessible name
 * and the three status words announced beside each title — a dot's colour
 * alone is not a state.
 */
export interface TimelineLabels {
  readonly region: string;
  readonly complete: string;
  readonly current: string;
  readonly upcoming: string;
}

export interface TableLabels {
  readonly region: string;
  readonly sortedAscending: string;
  readonly sortedDescending: string;
  readonly sort: string;
}
export interface DataGridLabels {
  readonly region: string;
  readonly selectAll: string;
  readonly selectRow: string;
  readonly sortedAscending: string;
  readonly sortedDescending: string;
  readonly sort: string;
}

/**
 * The two sentences the row says that are not a member's own name.
 *
 * **`accent` is one key and not a name, a comma and a qualifier.** Where the
 * qualifier sits relative to the name, and whether a comma is what separates
 * them at all, is a property of the language — Loom joining `${who}, ${what}`
 * has already answered both, in English, for every host that translates the
 * two halves. The name arrives raw because it is the caller's own data rather
 * than anything Loom formatted, and the empty case arrives too: a face with no
 * `alt` and no `fallback` still carries the accent variant, and the accent
 * label alone is the honest reading of it.
 *
 * `overflow` takes the count for the reason every counted message here does —
 * "3 more" is a plural category English collapses and Russian does not.
 */
export interface AvatarGroupLabels {
  /** The counter tile at the end of the row, named for how many faces it stands in for. */
  readonly overflow: LabelOf<{ count: number }>;
  /** One member's whole name, with the accent qualifier already worked into it. `name` is empty when the member gave neither an `alt` nor a `fallback`. */
  readonly accent: LabelOf<{ name: string }>;
}

/**
 * The one name this component publishes: its `<nav>` landmark's accessible
 * name. Every visible word on the trail is the host's own item label, so this
 * is the whole slot — but it is not optional, because a page commonly carries
 * several navigation landmarks and a screen reader's landmark menu listing
 * three entries all called "navigation" cannot tell them apart.
 */
export interface BreadcrumbLabels {
  /** The `<nav>` landmark's own name. */
  readonly label: string;
}

/**
 * Everything this picker publishes to assistive technology, and none of it is
 * optional: a saturation surface, two thumbs and a row of coloured squares
 * carry no text at all, so a name missing here is a control announced as
 * "slider" and nothing else.
 *
 * Six of the nine replace a string Reka UI writes in English inside its own
 * render function, with no prop to reach it — `ColorAreaThumb`'s
 * `Saturation, Brightness`, `ColorSliderThumb`'s `Hue`, the three
 * `aria-roledescription`s (`Color picker`, `Color thumb`, `color swatch`) and
 * the colour *name* `ColorSwatch` and `ColorSwatchPickerItem` derive from the
 * hex. Loom binds over each one, which works for the reason
 * `docs/foundations/localisation.md` sets out: Vue merges a caller's
 * fallthrough attributes after the render function that produced the vnode, and
 * for everything but `class`, `style` and `on*` the later value wins.
 *
 * **`swatch` defaults to the hex rather than to a colour name**, and that is a
 * deliberate loss. Reka answers "vibrant red"; its `getColorName` is not part
 * of the package's public surface, so Loom cannot delegate to it, and inventing
 * a second English colour vocabulary here would be shipping translations — the
 * one thing this seam exists to avoid. `#ef4444` is at least the value itself,
 * in no language, and a host with real colour names supplies them through this
 * key.
 *
 * `aria-roledescription` is exposed rather than suppressed because an empty one
 * is not a neutral choice either: it drops the phrase and leaves the screen
 * reader's own localised role announcement, which is what a host may well want
 * — setting the key to `""` is how they ask for it.
 */
export interface ColorPickerLabels {
  /** The saturation/brightness surface. Reka gives it `role="application"` and hands it every key press, so this name is what tells a reader where those keys are going. */
  readonly area: string;
  /** Replaces Reka's `aria-roledescription` on that surface (`Color picker`). */
  readonly areaRoleDescription: string;
  /** The two-axis thumb inside the surface. */
  readonly areaThumb: string;
  /** Replaces Reka's `aria-roledescription` on that thumb (`Color thumb`). */
  readonly areaThumbRoleDescription: string;
  /**
   * What that thumb reports as its value on every arrow key, replacing the
   * `aria-valuetext="Saturation 60, Brightness 80"` Reka builds from its own
   * English channel names.
   *
   * It is the one string in this control a reader hears repeatedly rather than
   * once, and both numbers arrive raw so a host can order the sentence its own
   * way and put the digits through `Intl.NumberFormat`.
   */
  readonly areaValue: LabelOf<{ saturation: number; brightness: number }>;
  /** The hue slider's thumb. */
  readonly hue: string;
  /** The hex field — the picker's one non-colour channel, and its only real form control. */
  readonly hex: string;
  /** The preset row, which is a listbox. */
  readonly presets: string;
  /** One colour named: the swatch beside the hex field and every preset square. */
  readonly swatch: LabelOf<{ color: string }>;
  /** Replaces Reka's `aria-roledescription` on the swatch beside the hex field (`color swatch`). */
  readonly swatchRoleDescription: string;
}

/**
 * Everything this control says that does not come from the host's own options.
 *
 * `trigger` replaces a name Reka UI writes in English of its own accord:
 * `ComboboxTrigger` puts `aria-label="Show popup"` in its own vnode props and
 * exposes no prop for it, so without this the chevron is the one control on a
 * fully localised form still speaking English. A binding on the Loom side
 * arrives as a fallthrough attribute, which Vue merges onto the root vnode
 * after Reka's render function produced it, and `mergeProps` is last-write-wins
 * for everything that is not `class`, `style` or `on*` — so it replaces Reka's
 * rather than competing with it.
 *
 * `empty` is Loom's own, and it is the default beneath the `emptyMessage`
 * prop rather than a competitor to it: the prop is the wording for one box —
 * "No country by that name" — and this is what every other box says.
 *
 * The two multi-select keys take the **number**, never a formatted string, for
 * the reason `src/lib/labels.ts` gives at length: "3 selected" has one plural
 * form in Vietnamese, two in English and six in Arabic, and `+47` is a
 * punctuation choice made in one language. A host handed the integer reaches
 * `Intl.PluralRules` for the category and `Intl.NumberFormat` for the digits.
 */
export interface ComboboxLabels {
  /** The chevron that opens the list. It is not a Tab stop; this is what a screen reader reads on it. */
  readonly trigger: string;
  /** The row shown in place of the list when the filter matches nothing, unless `emptyMessage` says otherwise. */
  readonly empty: string;
  /**
   * How many options are chosen, read out when the box takes focus.
   *
   * Multi-select only, and the only thing that tells a reader the size of a
   * selection without walking the list: the trigger shows the first few tokens
   * and a count for the rest, and neither is announced on its own.
   */
  readonly count: LabelOf<{ count: number }>;
  /** The visible summary standing in for the tokens the trigger did not have room for. */
  readonly overflow: LabelOf<{ hidden: number }>;
}

/**
 * The strings this control says that no other member of the family says: the
 * two half-group names and the status line above the grids.
 *
 * They are **not** shared with `DateTimeRangePicker`, which says both in
 * different words and from different facts — `Start date` against `Start date
 * and time`, a count of whole days against a signed duration. A key shared
 * between them would have to be a sentence that is never true of both. Its
 * calendar cells' names *are* shared, in `rangeCell`, because those differ in
 * neither.
 *
 * The segment names and the calendar chrome, which every one of the five
 * shares, come from `src/lib/date-labels.ts` too.
 */
export interface DateRangeLabels {
  /** The group holding the first half of the field. Reka names a segment `day` or `year` alone, which is two identical sets of three names with nothing to tell the ends apart. */
  readonly startDate: string;
  /** The group holding the second half of the field. */
  readonly endDate: string;
  /**
   * The `role="status"` line above the grids — what has been chosen, what is
   * wanted next, and how long the finished span is.
   *
   * One message rather than four phrases and a joiner. Which end is chosen,
   * whether a count follows the dates or precedes them, and how "7 days" is
   * written are all properties of a language, and a control that emitted them
   * as separate nodes would have decided all three in English.
   *
   * `days` counts **both ends**, which is how a reader counts a booking: the
   * 14th to the 20th is seven days. It arrives as a number so the plural
   * category is the host's to select — Loom ships no plural engine — and
   * `locale` arrives with it only because Loom's own English default has to
   * format the two dates somehow. A host replacing this formats with whatever
   * their application already uses and ignores it.
   */
  readonly status: LabelOf<{
    locale: string;
    start: DateValue | undefined;
    end: DateValue | undefined;
    days: number | undefined;
  }>;
}

/**
 * The strings this control says that no other member of the family says: the
 * two half-group names and the status line above the grids.
 *
 * They are **not** shared with `DateRangePicker`, which says both in different
 * words and from different facts — `Start date` against `Start date and time`,
 * a count of whole days against a signed duration. A key shared between them
 * would have to be a sentence that is never true of both. Its calendar cells'
 * names *are* shared, in `rangeCell`, because those differ in neither.
 *
 * The segment names and the calendar chrome, which every one of the five
 * shares, come from `src/lib/date-labels.ts` too.
 */
export interface DateTimeRangeLabels {
  /** The group holding the first half of the field. Reka names a segment `hour` or `year` alone, which is ten segments and two identical sets of five names with nothing to tell the ends apart. */
  readonly startDate: string;
  /** The group holding the second half of the field. */
  readonly endDate: string;
  /**
   * The `role="status"` line above the grids — what has been chosen, what is
   * wanted next, how long the finished span is, and whether it runs backwards.
   *
   * **One message rather than four sentences and a joiner**, and that collapse
   * is what deleted this control's hand-rolled pluraliser rather than moving
   * it. `minutes` is the whole duration as a number, so a host builds "2 days
   * 3 hours" with `Intl.DurationFormat`, `Intl.PluralRules` or their own
   * translation file — Loom ships no plural engine and appends no `"s"`.
   *
   * `minutes` is **signed**: negative means the end falls before the start,
   * which within a single day only the times can decide and which nothing in
   * the grid distinguishes. It is `undefined` while the range is half made.
   *
   * `locale`, `hour12` and `seconds` arrive only because Loom's own English
   * default has to format the two instants somehow, and they are the control's
   * own props rather than anything it has already decided. A host replacing
   * this formats with whatever their application already uses and ignores all
   * three.
   */
  readonly status: LabelOf<{
    locale: string;
    start: DateValue | undefined;
    end: DateValue | undefined;
    minutes: number | undefined;
    hour12: boolean | undefined;
    seconds: boolean;
  }>;
}

/**
 * The one thing this component says on its own account.
 *
 * Everything else on the surface is the host's — `title`, `description`, the
 * body and the footer all arrive as props or slots — so the corner close
 * control is the whole of Dialog's vocabulary. Its glyph is `aria-hidden` by
 * construction, which makes this name the only thing a screen reader has to go
 * on rather than a nicety on top of visible text.
 */
export interface DialogLabels {
  /** The corner control that dismisses the dialog. */
  readonly close: string;
}

/**
 * The one thing this component says on its own account. The title, the
 * description, the body and the footer are all the host's; the drag handle is
 * `aria-hidden` and unfocusable by Reka's own design, so it says nothing at
 * all.
 *
 * The close control's glyph is `aria-hidden`, which makes this name the only
 * thing a screen reader has to go on — and unlike Dialog's, this control is
 * unconditional, so a drawer always publishes it.
 */
export interface DrawerLabels {
  /** The corner control that dismisses the panel. */
  readonly close: string;
}

/**
 * Everything this control publishes to assistive technology — and every one of
 * these replaces a name Reka UI would otherwise supply in English of its own
 * accord.
 *
 * `input` stands in for the `aria-label="editable input"` Reka writes into
 * `EditableInput`'s own vnode; `submit` and `cancel` for the `aria-label`s and
 * the visible `Submit` / `Cancel` text its two triggers render. A binding on
 * the Loom side arrives as a fallthrough attribute, which Vue merges onto the
 * root vnode *after* the render function produced it, and `mergeProps` is
 * last-write-wins for everything that is not `class`, `style` or `on*` — so
 * these replace Reka's rather than competing with it. Removing one does not
 * fall back to nothing: it falls back to Reka's English, which no test of
 * Loom's own strings would catch, and which `Editable.test.ts` therefore pins
 * by reading the rendered attribute back.
 *
 * `edit` is Loom's own, and it is the one that decides whether this component
 * is accessible at all. Edit-in-place fails a screen reader by looking like
 * text and therefore reading like text; this word is what the preview appends
 * to its value so it announces as something a reader can act on.
 */
export interface EditableLabels {
  /**
   * Appended to the preview's accessible name, after the value, so the text
   * announces as a control rather than as prose. It is what a reader hears at
   * the end of "Quarterly report, Edit, button".
   */
  readonly edit: string;
  /**
   * The editor's own name, used only where nothing else names it — no
   * wrapping [Field](../Field/Field.vue), no `ariaLabel`, no `aria-labelledby`.
   * Naming the *kind* of value it holds beats naming the widget.
   */
  readonly input: string;
  /** The button that commits the edit. */
  readonly submit: string;
  /** The button that abandons it and restores the previous value. */
  readonly cancel: string;
  /**
   * Announced when a submit is refused because the box was left empty and
   * `allowEmpty` is off. The value is the one that was restored, so a host can
   * say what came back rather than only that something did — see `LabelOf` in
   * `src/lib/labels.ts` for why it arrives as a value and not as a sentence.
   */
  readonly restored: LabelOf<{ value: string }>;
}

/**
 * What the ErrorSummary says on its own account: the heading that names the
 * problem and states the count — a reader should know the size of the list
 * before it is read — and the optional line under it. The heading takes the
 * **number**, never a finished sentence, for the reason `LabelOf` gives:
 * "2 errors" has one plural form in English and another in Arabic, and a
 * host handed the integer reaches `Intl.PluralRules`.
 */
export interface ErrorSummaryLabels {
  /** The summary's heading, carrying the number of field errors it lists. */
  readonly heading: LabelOf<{ count: number }>;
  /** Supporting text under the heading, before the list. Empty by default; render nothing when it is. */
  readonly description: LabelOf<{ count: number }>;
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
 * What a screen reader is told when the caller passes no `label` — which is
 * every string this component can utter, because a marker that renders nothing
 * but a coloured circle has no text of its own to fall back on.
 *
 * The four presence keys are named for the four `IndicatorStatus` members and
 * resolved by lookup, so a status added to the union without a name for it is a
 * compile error rather than an unnamed dot.
 *
 * `count` takes the number and not a formatted string: "3 unread" is a plural
 * category in most languages and a digit shape in several, and a component
 * whose whole job is to show a small integer has no business deciding either.
 * It also reports the *real* figure rather than the clamped `99+` — see the
 * comment on `name` below.
 */
export interface IndicatorLabels {
  /** The `online` dot. */
  readonly online: string;
  /** The `offline` dot. */
  readonly offline: string;
  /** The `busy` dot. */
  readonly busy: string;
  /** The `away` dot. */
  readonly away: string;
  /** The `count` pill, named for how many things it counts. */
  readonly count: LabelOf<{ count: number }>;
  /** A dot with no `status`: something changed here, and nothing more specific. */
  readonly attention: string;
}

/**
 * Everything this gauge publishes that is not the host's own label — and all
 * four keys exist because the meter role has no English of its own.
 *
 * `valueText` takes `{ value, min, max }` rather than a pre-formatted string.
 * A host handed "17 of 40" can format the digits for its locale and word the
 * qualifier — "17 of 40 seats", "17 / 40 places", "used 17 out of 40" — but a
 * host handed the formatted string can only re-read it. The rounding therefore
 * lives in Loom's default, not in the component, so it is a wording choice a
 * host replaces along with the words.
 *
 * The three band words (`optimal`, `cautionary`, `critical`) name the HTML
 * meter element's three quality regions — the non-colour cue that is mandatory
 * when `threshold` is on. They are not adjectives applied to a value; they are
 * the region's own name, so a language can pick the word that reads naturally
 * as a label beside the gauge ("Optimal" / "Caution" / "Critical").
 */
export interface MeterLabels {
  /** Fallback accessible name when no label/ariaLabel/ariaLabelledby is provided. */
  readonly name: string;
  /** The announced value, from the clamped amount and the range it sits in. */
  readonly valueText: LabelOf<{ value: number; min: number; max: number }>;
  /** The word for the optimal band — the region containing the optimum value. */
  readonly optimal: string;
  /** The word for the cautionary band — a suboptimal region, but not the worst. */
  readonly cautionary: string;
  /** The word for the critical band — the farthest region from the optimum. */
  readonly critical: string;
}
/**
 * Everything this control publishes to assistive technology — and all three of
 * these are names Reka UI would otherwise supply in English of its own accord.
 *
 * `increment` and `decrement` are the stepper buttons, which Reka labels
 * `Increase` and `Decrease` inside its own render function with no prop to
 * reach them by. `roleDescription` replaces the `aria-roledescription="Number
 * field"` Reka writes on the spinbutton itself — the phrase a screen reader
 * announces *in place of* "spin button", so leaving it unreachable means a
 * fully localised form still names its own control in English.
 *
 * A binding on the Loom side arrives as a fallthrough attribute, which Vue
 * merges onto the root vnode after Reka's render function produced it, and
 * `mergeProps` is last-write-wins for everything that is not `class`, `style`
 * or `on*`. So these replace Reka's rather than competing with it, and
 * `NumberField.test.ts` pins that by overriding each one and reading the DOM
 * back — the check the wording alone cannot make, since Loom's English for the
 * role description is the same phrase Reka chose.
 */
export interface NumberFieldLabels {
  /** The stepper's up button. */
  readonly increment: string;
  /** The stepper's down button. */
  readonly decrement: string;
  /**
   * What the field calls itself, announced in place of "spin button". Set it
   * to the kind of number the field holds — "Rotation, in degrees" — where
   * that is more use to a reader than the control's generic name.
   */
  readonly roleDescription: string;
}

/**
 * The one name this control publishes, and it replaces one Reka writes in
 * English of its own accord: `PinInputInput` labels every cell
 * `` `pin input ${index + 1} of ${length}` `` and exposes no prop for it.
 *
 * **One key, not "Digit" plus "Character" plus a joiner plus a position.** The
 * noun and the two numbers arrive together in one argument object, and the
 * variant — whether this row takes digits or any character — arrives with
 * them, because which word a language uses for a cell and where the position
 * sits relative to it are one decision rather than two. Four fragment keys
 * Loom then joined would be a sentence no translator could reorder.
 *
 * `index` is 1-based: it is a position a person is being read, not an offset
 * into an array, and handing over the 0-based one would make every override
 * write `index + 1` before it could say anything.
 */
export interface OtpInputLabels {
  /** One cell, named for what it takes and where it sits in the row. */
  readonly cell: LabelOf<{ index: number; length: number; type: OtpInputType }>;
}

/**
 * Everything this control publishes to assistive technology — including the six
 * names Reka would otherwise supply in English of its own accord.
 *
 * `first`, `previous`, `next`, `last` and `page` are not decoration. Reka's
 * `PaginationFirst` and its siblings write `aria-label="First Page"` into their
 * own vnode props and expose no prop for it; `PaginationListItem` writes
 * `` `Page ${value}` ``. A binding on the Loom side arrives as a fallthrough
 * attribute, which Vue merges onto the root vnode *after* the render function
 * produced it, and `mergeProps` is last-write-wins for everything that is not
 * `class`, `style` or `on*`. So these replace Reka's rather than competing with
 * it — the same mechanism `DateRangePicker`'s cell triggers have relied on
 * since they landed, and `Pagination.test.ts` pins it by asserting the
 * *capitalisation* Loom uses and Reka does not.
 *
 * `page` and `position` take the numbers rather than a formatted string, so an
 * `ar-EG` host reaches `Intl.NumberFormat` for Eastern Arabic digits and a
 * language that orders "of" differently can order it differently. See
 * `LabelOf` in `src/lib/labels.ts`.
 */
export interface PaginationLabels {
  /**
   * The `<nav>` landmark's own name. A page commonly carries two of these —
   * above and below a table — and two `<nav>`s named the same thing are as
   * confusing to a screen reader as two named nothing, so give each one a name
   * that says which it is.
   */
  readonly nav: string;
  /** The button that jumps to page one. */
  readonly first: string;
  /** The button that steps back one page. */
  readonly previous: string;
  /** The button that steps on one page. */
  readonly next: string;
  /** The button that jumps to the last page. */
  readonly last: string;
  /** One numbered button in the `full` variant, named for the page it reaches. */
  readonly page: LabelOf<{ page: number }>;
  /** The position readout the `compact` and `simple` variants publish. */
  readonly position: LabelOf<{ page: number; pageCount: number }>;
  /** The ellipsis standing in for the pages the window had no room for. */
  readonly ellipsis: string;
}

/**
 * The one thing this bar prints, and the placeholder it prints instead when
 * there is no percentage yet.
 *
 * **`value` takes both raw numbers and no formatting at all.** A hand-built
 * `${Math.round(pct)}%` has already decided three things a component cannot
 * know: that the sign trails the digits — Turkish writes `%42` — that the
 * digits are Western Arabic, and that a percentage is the right reading of the
 * pair at all. Handed `value` and `max`, a host reaches
 * `Intl.NumberFormat(locale, { style: "percent" })` for the first two and can
 * answer "3 of 4 steps" instead of "75%" for the third.
 *
 * The rounding therefore lives in Loom's default rather than in the component,
 * so it is a wording choice a host replaces along with the words.
 */
export interface ProgressLabels {
  /** The readout beside the track, from the clamped value and the scale it is out of. */
  readonly value: LabelOf<{ value: number; max: number }>;
  /** What the readout prints while there is no percentage — never a false zero. */
  readonly indeterminate: string;
}

/**
 * The one thing this ring prints, and the placeholder it prints instead when
 * there is no percentage yet. `Progress`'s keys, for the reason its whole
 * contract is `Progress`'s — see `ProgressLabels` for why both raw numbers go
 * over and nothing is formatted first.
 *
 * A separate slot rather than a shared one, though, and that is deliberate:
 * the readout beside a bar has a line to itself, where this one sits inside a
 * 40px circle at `text-micro`. "42% uploaded" fits the first and overflows the
 * second, and one shared slot would leave a host no way to say so.
 */
export interface RadialProgressLabels {
  /** The readout in the ring's centre, from the clamped value and the scale it is out of. */
  readonly value: LabelOf<{ value: number; max: number }>;
  /** What the readout prints while there is no percentage — never a false zero. */
  readonly indeterminate: string;
}

/**
 * The one thing this control says out loud — and it carries both numbers,
 * because a row of star glyphs announces nothing at all on its own.
 *
 * **One key, not a score plus a joiner plus a noun.** "4 of 5 stars" is three
 * language decisions in one sentence: where the qualifier sits relative to the
 * numbers, how the digits are written, and which plural form "stars" takes at
 * 1, at 4 and at 0.5 — a category English does not distinguish and Russian
 * does. Handing over both raw numbers is what lets a host make all three of
 * those; a `${score} of ${length} stars` template with holes in it has already
 * made the first two, in English.
 *
 * Rounding to two decimals lives in Loom's default rather than in the
 * component, so it is a wording choice a host replaces along with the words:
 * it is what turns a half step's `4.0` into `4`.
 */
export interface RatingLabels {
  /**
   * The score out of the scale. It names the read-only picture, and it names
   * every radio in the interactive branch — which is what turns a bare "4"
   * into "4 of 5 stars" at the moment a reader arrives on it.
   */
  readonly score: LabelOf<{ score: number; length: number }>;
}

/**
 * Everything the spine publishes that is not one of the host's own step
 * titles — and two of the three exist because Reka UI says them in English of
 * its own accord.
 *
 * `group` replaces the literal `aria-label="progress"` that `StepperRoot`
 * writes into its own vnode props, which it exposes no prop for. `position`
 * replaces the live region it renders as a bare text node inside its render
 * function, which no attribute can reach at all — `src/styles/global.css`
 * carries how that one is taken out of the accessibility tree, and why it has
 * to be taken out rather than translated in place.
 *
 * `position`, `step` and `completed` take values rather than returning fragments Loom
 * would join. "Step 3 of 12" is not four keys and a preposition; it is one
 * sentence a translator has to be able to re-order, and the same is true of
 * where a language puts a qualifier relative to the thing it qualifies. See
 * `LabelOf` in `src/lib/labels.ts`.
 */
export interface StepperLabels {
  /**
   * The name of the whole spine, as a group. A page carrying two flows should
   * name each one for what it steps through rather than leaving both
   * "Progress"; a caller's own `aria-label` on `<Stepper>` still wins over
   * this, for the instance that needs it.
   */
  readonly group: string;
  /**
   * The position, announced politely each time the flow advances. It takes the
   * two numbers raw, so a language can order them its own way and
   * `Intl.NumberFormat` can write the digits.
   */
  readonly position: LabelOf<{ step: number; stepCount: number }>;
  /**
   * A trigger's position, joined into that trigger's accessible name. The
   * indicator a reader sees is the step's number, and WCAG 2.5.3 (Label in
   * Name) makes a control's visible text part of its name, so a voice user
   * saying "Step 2" must land on the same trigger one saying "Shipping" does
   * — the number has to join the name, and this is where it joins. Measured
   * 2026-08-26: `label-content-name-mismatch` fired on every Stepper trigger
   * before this key existed.
   */
  readonly step: LabelOf<{ step: number }>;
  /**
   * A finished step's whole accessible name, built from its title. ARIA has a
   * value for "you are here" and none for "done", and the check glyph is
   * invisible to a screen reader, so the word has to join the name — and where
   * it joins is a property of the language, which is why this receives the
   * title rather than being a suffix Loom appends to it.
   */
  readonly completed: LabelOf<{ title: string }>;
}

/**
 * Everything this control says out loud, and every word of it is Loom's own.
 *
 * That is worth stating because it is the exception in this library. Reka's
 * `Pagination` writes `aria-label="Next Page"` into its own vnode props, and
 * `Pagination.vue` carries a paragraph about replacing rather than competing
 * with it. Reka's TagsInput family writes **no** name and **no** English at
 * all: the root and the item are unlabelled `div`s, and the one string
 * `TagsInputItemText` renders is `displayValue(value)` — the host's own token.
 * So nothing here falls back to English when a key is dropped; it falls back to
 * nothing, which is the louder failure and the easier one to notice.
 *
 * `count` takes the number rather than a formatted string, for the reason
 * `src/lib/labels.ts` gives at length: "3 tags" has one plural form in
 * Vietnamese, two in English and six in Arabic, and a host handed the number
 * reaches `Intl.PluralRules` and `Intl.NumberFormat` for both the category and
 * the digits.
 *
 * `remove` takes the token because a row of six buttons all called "Remove" is
 * six identical announcements and one guess about which one a reader is on —
 * the same rule `FileUpload` applies to its file rows.
 */
export interface TagsInputLabels {
  /** One token's remove control, named for the token it takes out. */
  readonly remove: LabelOf<{ value: string }>;
  /**
   * How many tokens are in the field, read out when the text box takes focus.
   *
   * `max` is `undefined` when the field has no limit, so a host can word the
   * bounded and unbounded cases differently rather than being handed "3 of
   * undefined".
   */
  readonly count: LabelOf<{ count: number; max: number | undefined }>;
  /** Everything one interaction refused, as one message. Fires once per interaction, not once per value. */
  readonly rejected: LabelOf<{
    rejections: readonly TagsInputRejection[];
    max: number | undefined;
  }>;
  /** The control that empties the field. */
  readonly clear: string;
}

/**
 * Everything this control says out loud, and every word of it is Loom's own —
 * a bare `<input>` renders no English of anybody else's, so a dropped key here
 * falls back to nothing rather than to a stray untranslated string.
 *
 * The five counter keys are shared with Textarea by name and by argument shape
 * — a host that has already worded a character counter can copy that bag across
 * unchanged. They come from `src/lib/count-labels.ts` rather than being declared
 * a second time. This slot also carries `reveal`, a password toggle a textarea
 * has no use for.
 */
export interface TextFieldLabels extends CountLabels {
  /**
   * The password reveal toggle, named for what pressing it does. The name is
   * **stable across both states** and `aria-pressed` carries which state the
   * field is in, so word it as an action ("Show password"), not as a report.
   */
  readonly reveal: string;
}

/**
 * Everything this control says out loud, and every word of it is Loom's own —
 * a bare `<textarea>` renders no English of anybody else's, so a dropped key
 * here falls back to nothing rather than to a stray untranslated string.
 *
 * These are TextField's five counter keys, by name and by argument shape, and
 * deliberately so: a host that has already worded a character counter should be
 * able to copy that bag across unchanged. They come from `./count-labels`
 * rather than being declared a second time. They are a slot of their own rather
 * than a share of `textField`'s because that slot also carries `reveal`, and
 * handing a textarea's translator a password-toggle key to fill in is asking a
 * question the control cannot answer.
 */
export type TextareaLabels = CountLabels;

/**
 * Everything a toast publishes that is not the host's own copy — including the
 * two strings Reka UI would otherwise supply in English of its own accord.
 *
 * Declared here rather than in `Toast.vue`, which is where a reader would look
 * for it, and the reason is a module cycle rather than a preference.
 * `Toast.vue` imports this file; this file needs the defaults for the close
 * control it renders. Declaring them in `Toast.vue` and importing them back
 * would make that a real runtime cycle where today it is a type-only one, and
 * it would cost the block that reuses this card — `ToastStack` mounts
 * `ToastItem` directly through its own provider — the whole seam. Owning them
 * here means every card resolves its own names wherever it is mounted.
 *
 * `announce` and `region` are not decoration. Reka's `ToastProvider` defaults
 * its `label` to "Notification" and reads it out ahead of every toast's own
 * text in a hidden live region; its `ToastViewport` names the list
 * "Notifications ({hotkey})". Both are real props rather than hard-coded
 * vnode attributes, so these are set rather than overridden — but leaving
 * either unset falls back to English, not to nothing.
 */
export interface ToastLabels {
  /** The ✕ control on the card. */
  readonly close: string;
  /**
   * Spoken before each toast's own title, in a hidden live region, to say what
   * kind of thing has just arrived. Keep it to one word — it is a prefix on
   * every announcement, not a sentence.
   */
  readonly announce: string;
  /**
   * The name of the list the toasts stack in. `hotkey` is the key that focuses
   * it, as the environment reports it ("F8"), handed over raw so a language
   * can put it wherever it belongs in the phrase.
   */
  readonly region: LabelOf<{ hotkey: string }>;
}

/**
 * The strings the TreeView says that no node in it says. Everything else a
 * tree renders arrives as a node's own `label`, so the bag is small — but the
 * one string it does carry is one a reader waits on: a lazy branch that is
 * fetching its children has to say so rather than sit silent, because an
 * expand that produces nothing reads as a broken control.
 */
export interface TreeViewLabels {
  /** Shown on, and announced for, a node whose children are being fetched. */
  readonly loading: string;
}

/**
 * The three buttons' accessible names. There are four, because the middle
 * button is one control in two states and a language may well name them with
 * unrelated words.
 *
 * Every glyph here is an inline SVG marked `aria-hidden`, so these names are
 * the only thing a screen reader has to go on — a missing one is not a degraded
 * label but an unnamed button.
 */
export interface WindowControlsLabels {
  /** Send the window to the taskbar. */
  readonly minimize: string;
  /** Fill the screen. The middle button's name while the window is restored. */
  readonly maximize: string;
  /** Return to the previous size. The same button's name while maximized. */
  readonly restore: string;
  /** Close the window. */
  readonly close: string;
}

/**
 * The one name this component publishes: the scroll strip's accessible name,
 * announced as a scrollable region. The items inside are the host's content
 * and carry their own names, so this is the whole slot — but it is not
 * optional, because a strip of images or cards with no region name is
 * announced as an anonymous scrollable container.
 */
export interface ScrollReelLabels {
  /** The reel region's accessible name. */
  readonly region: string;
}

/**
 * The one string this component renders: the bypass link's visible text.
 * It is the first thing a keyboard user meets on the page, so it is the
 * first string a host translating the interface translates.
 */
export interface SkipLinkLabels {
  /** The link's visible text. */
  readonly label: string;
}
