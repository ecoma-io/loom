// Label and form-context subsystem.
//
// The localisation seam (provideLoomLabels / useLabels), the field context
// system (provideFieldContext / useFieldControl), the date-family shared
// vocabularies, and the ancestor-disabled composable.

// The localisation seam.
export { provideLoomLabels, useLabels } from "./labels";
export type { LabelOf, LabelOverrides, LoomLabelOverrides } from "./labels";

// The label registry — the central namespace a host's vocabulary keys into.
export type { LoomLabels } from "./label-registry";

// The component vocabulary shapes. Declared here (below every component) and
// re-exported from each component's barrel; the registry's keys are these.
export type {
  AlertLabels,
  AlertDialogLabels,
  AvatarGroupLabels,
  BreadcrumbLabels,
  CalendarLabels,
  CarouselLabels,
  ColorPickerLabels,
  ComboboxLabels,
  DateRangeLabels,
  DateTimeRangeLabels,
  DialogLabels,
  DrawerLabels,
  EditableLabels,
  FileUploadLabels,
  FileUploadRejectReason,
  FileUploadRejection,
  IndicatorLabels,
  NumberFieldLabels,
  OtpInputLabels,
  OtpInputType,
  PaginationLabels,
  ProgressLabels,
  RadialProgressLabels,
  RatingLabels,
  ScrollReelLabels,
  SkipLinkLabels,
  TableLabels,
  TimelineLabels,
  StepperLabels,
  TagsInputLabels,
  TagsInputRejectReason,
  TagsInputRejection,
  TextFieldLabels,
  TextareaLabels,
  ToastLabels,
  TreeViewLabels,
  WindowControlsLabels,
} from "./component-shapes";

// The date family's shared vocabulary.
export {
  CALENDAR_PANEL_LABELS,
  DATE_SEGMENT_LABELS,
  RANGE_CELL_LABELS,
  TIME_SEGMENT_LABELS,
  emptySegmentValueText,
  formatFullDay,
  isDateSegmentPart,
  isTimeSegmentPart,
  segmentAriaLabel,
  segmentAriaValueText,
} from "./date-labels";
export type {
  CalendarPanelLabels,
  DateSegmentLabels,
  DateSegmentName,
  RangeCellLabels,
  RangeCellPart,
  SegmentAriaValueTextArgs,
  SegmentVocabularies,
  TimeSegmentLabels,
  TimeSegmentName,
} from "./date-labels";

// Counter labels shared by TextField and Textarea.
export { COUNT_LABELS, warningWindow } from "./count-labels";
export type { CountBand, CountLabels } from "./count-labels";

// Field context — the wrapper-to-control contract.
export { provideFieldContext, useFieldControl, useOuterFieldContext } from "./field-context";
export type {
  FieldContext,
  FieldContextSource,
  FieldControl,
  FieldControlAttrs,
  FieldControlProps,
} from "./field-context";

// Ancestor-disabled composable.
export { useAncestorDisabled } from "./ancestor-disabled";
