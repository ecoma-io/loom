import type {
  CalendarPanelLabels,
  DateSegmentLabels,
  RangeCellLabels,
  TimeSegmentLabels,
} from "./date-labels";
import type { DateRangeLabels } from "../primitives/DateRangePicker/DateRangePicker.vue";
import type { DateTimeRangeLabels } from "../primitives/DateTimeRangePicker/DateTimeRangePicker.vue";
import type { ComboboxLabels } from "../primitives/Combobox/Combobox.vue";
import type { FileUploadLabels } from "../primitives/FileUpload/FileUpload.vue";
import type { NumberFieldLabels } from "../primitives/NumberField/NumberField.vue";
import type { OtpInputLabels } from "../primitives/OtpInput/OtpInput.vue";
import type { PaginationLabels } from "../primitives/Pagination/Pagination.vue";
import type { RatingLabels } from "../primitives/Rating/Rating.vue";
import type { WindowControlsLabels } from "../primitives/WindowControls/WindowControls.vue";
import type { AvatarGroupLabels } from "../primitives/AvatarGroup/AvatarGroup.vue";
import type { ColorPickerLabels } from "../primitives/ColorPicker/ColorPicker.vue";
import type { IndicatorLabels } from "../primitives/Indicator/Indicator.vue";
import type { ProgressLabels } from "../primitives/Progress/Progress.vue";
import type { RadialProgressLabels } from "../primitives/RadialProgress/RadialProgress.vue";
import type { AlertDialogLabels } from "../primitives/AlertDialog/AlertDialog.vue";
import type { DialogLabels } from "../primitives/Dialog/Dialog.vue";
import type { DrawerLabels } from "../primitives/Drawer/Drawer.vue";
import type { StepperLabels } from "../primitives/Stepper/Stepper.vue";
import type { ToastLabels } from "../primitives/Toast/Toast.vue";

/**
 * Every slot a host can localise, and nothing else. One line per component that
 * speaks; the keys themselves live with the component that says them.
 *
 * This file exists so that both halves of the seam can be true at once. The
 * *keys* belong beside the component — `PaginationLabels` is declared in
 * `Pagination.vue`, where its doc comments sit next to the markup that renders
 * them and where a component's whole contract can be read in one file. The
 * *namespace* has to be central, or `provideLoomLabels({ pagination: … })` could
 * not check a misspelled slot and a consumer would have no single place to see
 * what the library can be asked to say.
 *
 * Every import here is `import type`, so this module emits nothing and the
 * apparent cycle — component imports `useLabels`, `useLabels` imports this,
 * this imports the component — exists only in the type graph, where TypeScript
 * resolves it lazily. A value import in this file would turn the whole library
 * into one chunk and cost every consumer the components they did not use.
 *
 * Adding a component to the sweep is one line. Adding it in the wrong shape is
 * a compile error at that component's own `useLabels` call, not here.
 */
export interface LoomLabels {
  readonly pagination: PaginationLabels;
  readonly windowControls: WindowControlsLabels;
  // Six slots for the five date and time controls, because four of the six are
  // shared: the two halves of a segmented field's part names, the calendar
  // popover's chrome and a range calendar's cell are each one vocabulary spoken
  // by up to five components. `src/lib/date-labels.ts` carries why they are
  // sliced by what a control actually says rather than declared per component.
  readonly dateSegments: DateSegmentLabels;
  readonly timeSegments: TimeSegmentLabels;
  readonly calendarPanel: CalendarPanelLabels;
  readonly rangeCell: RangeCellLabels;
  readonly dateRange: DateRangeLabels;
  readonly dateTimeRange: DateTimeRangeLabels;
  // The form controls that say something of their own. `Select` is deliberately
  // absent: every string it renders arrives as a prop or an option, so it has
  // no slot rather than an empty one.
  readonly numberField: NumberFieldLabels;
  readonly combobox: ComboboxLabels;
  readonly otpInput: OtpInputLabels;
  readonly fileUpload: FileUploadLabels;
  readonly rating: RatingLabels;
  // The overlays and the flow. `SpeedDial` is deliberately absent for the same
  // reason `Select` is: its trigger name, its action labels and its glyphs all
  // arrive from the host, so it has no slot rather than an empty one.
  readonly dialog: DialogLabels;
  readonly alertDialog: AlertDialogLabels;
  readonly drawer: DrawerLabels;
  readonly stepper: StepperLabels;
  readonly toast: ToastLabels;
  // The markers and the readouts — the components whose whole output is a
  // shape, a number or a colour, and which therefore say everything they mean
  // in a hidden string. `Field` and `Fieldset` are deliberately absent for the
  // reason `Select` is: their label, hint, error and legend all arrive as
  // props, and the required marker is a glyph rather than a word.
  readonly indicator: IndicatorLabels;
  readonly avatarGroup: AvatarGroupLabels;
  // Two slots and not one, though the keys match: a readout beside a bar and a
  // readout inside a 40px ring are the same fact given very different room, and
  // a host wanting "42% uploaded" on the one and "42%" on the other has no way
  // to say so through a shared slot.
  readonly progress: ProgressLabels;
  readonly radialProgress: RadialProgressLabels;
  readonly colorPicker: ColorPickerLabels;
}
