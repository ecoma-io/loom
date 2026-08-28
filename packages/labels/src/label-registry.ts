import type {
  CalendarPanelLabels,
  DateSegmentLabels,
  RangeCellLabels,
  TimeSegmentLabels,
} from "./date-labels";
import type {
  AlertLabels,
  CalendarLabels,
  CarouselLabels,
  CopyButtonLabels,
  TableLabels,
  TimelineLabels,
  AlertDialogLabels,
  AvatarGroupLabels,
  BreadcrumbLabels,
  ColorPickerLabels,
  ComboboxLabels,
  DataGridLabels,
  DateRangeLabels,
  DateTimeRangeLabels,
  DialogLabels,
  DrawerLabels,
  ErrorSummaryLabels,
  EditableLabels,
  FileUploadLabels,
  IndicatorLabels,
  NumberFieldLabels,
  OtpInputLabels,
  PaginationLabels,
  ProgressLabels,
  RadialProgressLabels,
  RatingLabels,
  ScrollReelLabels,
  SkipLinkLabels,
  StepperLabels,
  TagsInputLabels,
  TextFieldLabels,
  TextareaLabels,
  ToastLabels,
  TreeViewLabels,
  WindowControlsLabels,
} from "./component-shapes";

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
 * Every import here is `import type`, so this module emits nothing. The label
 * types come straight from the component packages that declare them — a
 * dependency edge in the type graph only, never a value import, so a consumer
 * importing `provideLoomLabels` alone ships no component bytes. The direction
 * runs components → labels-registry (types in, values out), never the reverse.
 * A value import in this file would turn the whole library into one chunk and
 * cost every consumer the components they did not use.
 *
 * Adding a component to the sweep is one line. Adding it in the wrong shape is
 * a compile error at that component's own `useLabels` call, not here.
 */
export interface LoomLabels {
  readonly alert: AlertLabels;
  readonly table: TableLabels;
  readonly dataGrid: DataGridLabels;
  readonly timeline: TimelineLabels;
  readonly carousel: CarouselLabels;
  readonly pagination: PaginationLabels;
  readonly windowControls: WindowControlsLabels;
  readonly breadcrumb: BreadcrumbLabels;
  readonly scrollReel: ScrollReelLabels;
  readonly skipLink: SkipLinkLabels;
  readonly copyButton: CopyButtonLabels;
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
  // The standalone Calendar's own pager names and selection line — a slot of
  // its own, not a share of `calendarPanel`, because that slice also carries
  // the popover's open button and the panel name, neither of which an
  // always-visible surface renders. Its heading and cell names need no slot:
  // the control's own `locale` formats them.
  readonly calendar: CalendarLabels;
  // The form controls that say something of their own. `Select` is deliberately
  // absent: every string it renders arrives as a prop or an option, so it has
  // no slot rather than an empty one.
  readonly numberField: NumberFieldLabels;
  readonly combobox: ComboboxLabels;
  readonly otpInput: OtpInputLabels;
  readonly fileUpload: FileUploadLabels;
  readonly rating: RatingLabels;
  readonly tagsInput: TagsInputLabels;
  readonly editable: EditableLabels;
  readonly errorSummary: ErrorSummaryLabels;
  readonly textField: TextFieldLabels;
  // Two slots for one counter vocabulary, and the keys match on purpose so a
  // host's bag copies across. Not one slot, because `textField` also carries
  // `reveal` — a password toggle a textarea has no use for, and a key its
  // translator would be asked to fill in for nothing.
  readonly textarea: TextareaLabels;
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
  readonly avatarGroup: AvatarGroupLabels; // Two slots and not one, though the keys match: a readout beside a bar and a
  // readout inside a 40px ring are the same fact given very different room, and
  // a host wanting "42% uploaded" on the one and "42%" on the other has no way
  // to say so through a shared slot.
  readonly progress: ProgressLabels;
  readonly radialProgress: RadialProgressLabels;
  readonly colorPicker: ColorPickerLabels;
  // The one selection composite: everything a tree renders arrives as a node's
  // own label, so its slot is only the strings the control says about itself.
  readonly treeView: TreeViewLabels;
}
