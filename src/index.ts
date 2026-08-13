/**
 * The public surface of `@ecoma-io/loom`.
 *
 * This file is the complete export list, and it is the file to read before
 * hand-rolling a generic affordance in a consuming product — the rule that
 * decides most questions, stated in CONTRIBUTING.md, is checked against
 * exactly this list.
 *
 * Two things deliberately do not appear here. Styles ship as CSS, imported by
 * a host from `@ecoma-io/loom/styles/global.css`. And `WCAG_TAGS` ships from
 * the narrow `@ecoma-io/loom/a11y` entry, so a consumer that compiles no Vue
 * at all can read it without resolving a single component below.
 *
 * `useTheme` and `themeScript` are re-exported here for convenience, but the
 * primary entry is `@ecoma-io/loom/theme`, which carries no component weight.
 */

// Utilities.
export { cn } from "./lib/cn";
export { applyLoomIconDefaults } from "./lib/icon-defaults";
// Theme switching. The primary entry is `@ecoma-io/loom/theme`; these are
// re-exported so a consumer already importing components can add theme
// support without a second import path.
export { useTheme, themeScript } from "./lib/theme";
export type { ThemePreference, ResolvedTheme } from "./lib/theme";
// The localisation seam. Loom ships the contract, never the content: there is
// no i18n dependency here and no bundled translations, and a label that takes a
// count is a function the host supplies, because pluralisation differs by
// language and Loom carries no engine that could decide it.
export { provideLoomLabels } from "./lib/labels";
export type { LabelOf, LabelOverrides, LoomLabelOverrides } from "./lib/labels";
export type { LoomLabels } from "./lib/label-registry";
export { LIST_STAGGER_CAP, LIST_STAGGER_STEP_MS, listStaggerDelay } from "./lib/motion";
// The date family's shared vocabulary. Five controls say the same twelve things
// because one Reka implementation sits under all of them, so the slices live
// beside each other rather than being written out five times.
export {
  CALENDAR_PANEL_LABELS,
  DATE_SEGMENT_LABELS,
  RANGE_CELL_LABELS,
  TIME_SEGMENT_LABELS,
} from "./lib/date-labels";
export type {
  CalendarPanelLabels,
  DateSegmentLabels,
  RangeCellLabels,
  RangeCellPart,
  TimeSegmentLabels,
} from "./lib/date-labels";

// Primitives, alphabetical. Each component ships beside the types its own
// props are written in, so a host can name a variant without reaching into a
// deep path. `ToastItem` is absent on purpose: it is the card `Toast` bundles
// with its provider and viewport, and it renders nothing usable on its own.
export { default as Accordion } from "./primitives/Accordion/Accordion.vue";
export type {
  AccordionGap,
  AccordionItem,
  AccordionType,
} from "./primitives/Accordion/Accordion.vue";
export {
  default as AlertDialog,
  ALERT_DIALOG_LABELS,
} from "./primitives/AlertDialog/AlertDialog.vue";
export type { AlertDialogLabels } from "./primitives/AlertDialog/AlertDialog.vue";
export { default as Avatar, avatarVariants } from "./primitives/Avatar/Avatar.vue";
export type { AvatarShape, AvatarSize, AvatarVariant } from "./primitives/Avatar/Avatar.vue";
export {
  default as AvatarGroup,
  AVATAR_GROUP_LABELS,
} from "./primitives/AvatarGroup/AvatarGroup.vue";
export type {
  AvatarGroupItem,
  AvatarGroupLabels,
  AvatarGroupSurface,
} from "./primitives/AvatarGroup/AvatarGroup.vue";
export { default as Badge, badgeVariants } from "./primitives/Badge/Badge.vue";
export type { BadgeVariant } from "./primitives/Badge/Badge.vue";
export { default as Breadcrumb } from "./primitives/Breadcrumb/Breadcrumb.vue";
export type { BreadcrumbItem, BreadcrumbSeparator } from "./primitives/Breadcrumb/Breadcrumb.vue";
export { default as Button, buttonVariants } from "./primitives/Button/Button.vue";
export type { ButtonSize, ButtonVariant } from "./primitives/Button/Button.vue";
export { default as Checkbox } from "./primitives/Checkbox/Checkbox.vue";
export { default as Chip, chipVariants } from "./primitives/Chip/Chip.vue";
export type { ChipSize, ChipVariant } from "./primitives/Chip/Chip.vue";
export {
  default as ColorPicker,
  COLOR_PICKER_LABELS,
} from "./primitives/ColorPicker/ColorPicker.vue";
export type { ColorPickerLabels } from "./primitives/ColorPicker/ColorPicker.vue";
export {
  default as Combobox,
  comboboxVariants,
  COMBOBOX_LABELS,
} from "./primitives/Combobox/Combobox.vue";
export type {
  ComboboxLabels,
  ComboboxOption,
  ComboboxSize,
} from "./primitives/Combobox/Combobox.vue";
export { default as ContextMenu } from "./primitives/ContextMenu/ContextMenu.vue";
export type { ContextMenuEntry } from "./primitives/ContextMenu/ContextMenu.vue";
export { default as DatePicker } from "./primitives/DatePicker/DatePicker.vue";
export type { DatePickerLabels } from "./primitives/DatePicker/DatePicker.vue";
export {
  default as DateRangePicker,
  DATE_RANGE_LABELS,
} from "./primitives/DateRangePicker/DateRangePicker.vue";
export type {
  DateRange,
  DateRangeLabels,
  DateRangePickerLabels,
} from "./primitives/DateRangePicker/DateRangePicker.vue";
export { default as DateTimePicker } from "./primitives/DateTimePicker/DateTimePicker.vue";
export type { DateTimePickerLabels } from "./primitives/DateTimePicker/DateTimePicker.vue";
export {
  default as DateTimeRangePicker,
  DATE_TIME_RANGE_LABELS,
} from "./primitives/DateTimeRangePicker/DateTimeRangePicker.vue";
export type {
  DateTimeRange,
  DateTimeRangeLabels,
  DateTimeRangePickerLabels,
} from "./primitives/DateTimeRangePicker/DateTimeRangePicker.vue";
export { default as Dialog, DIALOG_LABELS } from "./primitives/Dialog/Dialog.vue";
export type { DialogLabels, DialogSize } from "./primitives/Dialog/Dialog.vue";
export { default as Drawer, DRAWER_LABELS } from "./primitives/Drawer/Drawer.vue";
export type { DrawerLabels, DrawerSide, DrawerSize } from "./primitives/Drawer/Drawer.vue";
export { default as DropdownMenu } from "./primitives/DropdownMenu/DropdownMenu.vue";
export type { DropdownMenuEntry } from "./primitives/DropdownMenu/DropdownMenu.vue";
export { default as Editable, EDITABLE_LABELS } from "./primitives/Editable/Editable.vue";
export type {
  EditableActivationMode,
  EditableLabels,
  EditableSubmitMode,
} from "./primitives/Editable/Editable.vue";
export { default as Field } from "./primitives/Field/Field.vue";
export { default as Fieldset } from "./primitives/Fieldset/Fieldset.vue";
export { default as FileUpload, FILE_UPLOAD_LABELS } from "./primitives/FileUpload/FileUpload.vue";
export type {
  FileUploadLabels,
  FileUploadRejectReason,
  FileUploadRejection,
} from "./primitives/FileUpload/FileUpload.vue";
export { default as HoverCard } from "./primitives/HoverCard/HoverCard.vue";
export type { HoverCardAlign, HoverCardSide } from "./primitives/HoverCard/HoverCard.vue";
export {
  default as Indicator,
  indicatorToneVariants,
  indicatorVariants,
  INDICATOR_LABELS,
} from "./primitives/Indicator/Indicator.vue";
export type {
  IndicatorLabels,
  IndicatorPlacement,
  IndicatorStatus,
  IndicatorSurface,
  IndicatorTone,
  IndicatorVariant,
} from "./primitives/Indicator/Indicator.vue";
export { default as InlineError } from "./primitives/InlineError/InlineError.vue";
export { default as IconButton, iconButtonVariants } from "./primitives/IconButton/IconButton.vue";
export type { IconButtonSize, IconButtonVariant } from "./primitives/IconButton/IconButton.vue";
export { default as Menubar } from "./primitives/Menubar/Menubar.vue";
export type { MenubarItem, MenubarMenu } from "./primitives/Menubar/Menubar.vue";
export { default as Link, linkVariants } from "./primitives/Link/Link.vue";
export type { LinkVariant } from "./primitives/Link/Link.vue";
export {
  default as NumberField,
  NUMBER_FIELD_LABELS,
} from "./primitives/NumberField/NumberField.vue";
export type { NumberFieldLabels } from "./primitives/NumberField/NumberField.vue";
export { default as OtpInput, OTP_INPUT_LABELS } from "./primitives/OtpInput/OtpInput.vue";
export type { OtpInputLabels, OtpInputType } from "./primitives/OtpInput/OtpInput.vue";
export {
  default as Pagination,
  paginationVariants,
  PAGINATION_LABELS,
} from "./primitives/Pagination/Pagination.vue";
export type { PaginationLabels, PaginationVariant } from "./primitives/Pagination/Pagination.vue";
export { default as Popover } from "./primitives/Popover/Popover.vue";
export type { PopoverAlign, PopoverSide } from "./primitives/Popover/Popover.vue";
export {
  default as Progress,
  progressVariants,
  PROGRESS_LABELS,
} from "./primitives/Progress/Progress.vue";
export type { ProgressLabels, ProgressSize } from "./primitives/Progress/Progress.vue";
export {
  default as RadialProgress,
  radialProgressVariants,
  RADIAL_PROGRESS_LABELS,
} from "./primitives/RadialProgress/RadialProgress.vue";
export type {
  RadialProgressLabels,
  RadialProgressSize,
  RadialProgressThickness,
} from "./primitives/RadialProgress/RadialProgress.vue";
export { default as RadioGroup } from "./primitives/RadioGroup/RadioGroup.vue";
export type { RadioOption } from "./primitives/RadioGroup/RadioGroup.vue";
export { default as Rating, RATING_LABELS } from "./primitives/Rating/Rating.vue";
export type { RatingLabels, RatingSize } from "./primitives/Rating/Rating.vue";
export { default as SegmentedControl } from "./primitives/SegmentedControl/SegmentedControl.vue";
export type { SegmentedControlOption } from "./primitives/SegmentedControl/SegmentedControl.vue";
export { default as ScrollArea } from "./primitives/ScrollArea/ScrollArea.vue";
export type { ScrollAreaOrientation } from "./primitives/ScrollArea/ScrollArea.vue";
export { default as Select, selectVariants } from "./primitives/Select/Select.vue";
export type { SelectOption, SelectSize } from "./primitives/Select/Select.vue";
export { default as Separator } from "./primitives/Separator/Separator.vue";
export type { SeparatorOrientation } from "./primitives/Separator/Separator.vue";
export { default as Skeleton, skeletonVariants } from "./primitives/Skeleton/Skeleton.vue";
export type { SkeletonVariant } from "./primitives/Skeleton/Skeleton.vue";
export { default as Slider } from "./primitives/Slider/Slider.vue";
export { default as SpeedDial } from "./primitives/SpeedDial/SpeedDial.vue";
export type { SpeedDialAction, SpeedDialDirection } from "./primitives/SpeedDial/SpeedDial.vue";
export { default as Spinner, spinnerVariants } from "./primitives/Spinner/Spinner.vue";
export type { SpinnerSize } from "./primitives/Spinner/Spinner.vue";
export { default as Stepper, STEPPER_LABELS } from "./primitives/Stepper/Stepper.vue";
export type {
  StepperLabels,
  StepperOrientation,
  StepperStep,
} from "./primitives/Stepper/Stepper.vue";
export { default as Surface, surfaceVariants } from "./primitives/Surface/Surface.vue";
export type { SurfaceElevation, SurfacePad } from "./primitives/Surface/Surface.vue";
export { default as Switch } from "./primitives/Switch/Switch.vue";
export { default as Tabs } from "./primitives/Tabs/Tabs.vue";
export type { TabItem } from "./primitives/Tabs/Tabs.vue";
export { default as TagsInput, TAGS_INPUT_LABELS } from "./primitives/TagsInput/TagsInput.vue";
export type {
  TagsInputLabels,
  TagsInputRejection,
  TagsInputRejectReason,
} from "./primitives/TagsInput/TagsInput.vue";
export { default as Textarea } from "./primitives/Textarea/Textarea.vue";
export type { TextareaResize } from "./primitives/Textarea/Textarea.vue";
export { default as TextField } from "./primitives/TextField/TextField.vue";
export type { TextFieldSize, TextFieldType } from "./primitives/TextField/TextField.vue";
export { default as TimePicker } from "./primitives/TimePicker/TimePicker.vue";
export type { TimePickerLabels } from "./primitives/TimePicker/TimePicker.vue";
export { default as Toast, TOAST_LABELS } from "./primitives/Toast/Toast.vue";
export type { ToastLabels, ToastVariant } from "./primitives/Toast/Toast.vue";
export { default as Tooltip } from "./primitives/Tooltip/Tooltip.vue";
export type { TooltipSide } from "./primitives/Tooltip/Tooltip.vue";
export {
  default as WindowControls,
  WINDOW_CONTROLS_LABELS,
} from "./primitives/WindowControls/WindowControls.vue";
export type { WindowControlsLabels } from "./primitives/WindowControls/WindowControls.vue";

// Composition primitives, alphabetical. Layout intent — not "what it looks
// like" (a primitive) or "what it means" (a block) but "how things are
// arranged." A composition primitive wraps a CSS layout technique that is
// easy to get wrong, hard to remember, or both, and gives it a name and a
// responsive default so every call site gets it right without writing it out.
export { default as Center } from "./composition/Center/Center.vue";
export type { CenterMaxWidth } from "./composition/Center/Center.vue";
export { default as Frame } from "./composition/Frame/Frame.vue";
export type { FrameRatio } from "./composition/Frame/Frame.vue";
export { default as Grid } from "./composition/Grid/Grid.vue";
export type { GridGap } from "./composition/Grid/Grid.vue";
export { default as Inline } from "./composition/Inline/Inline.vue";
export type { InlineAlign, InlineGap } from "./composition/Inline/Inline.vue";
export { default as ScrollReel } from "./composition/ScrollReel/ScrollReel.vue";
export type { ScrollReelGap, ScrollReelSnap } from "./composition/ScrollReel/ScrollReel.vue";
export { default as Sidebar } from "./composition/Sidebar/Sidebar.vue";
export type { SidebarSide } from "./composition/Sidebar/Sidebar.vue";
export { default as Split } from "./composition/Split/Split.vue";
export type { SplitGap, SplitSide } from "./composition/Split/Split.vue";
export { default as Stack } from "./composition/Stack/Stack.vue";
export type { StackAlign, StackGap } from "./composition/Stack/Stack.vue";

// Layouts, alphabetical. A layout composes composition primitives into a
// ready-made responsive application shell — the "flagship" tier. Where a
// composition primitive answers "how are things arranged?", a layout answers
// "what does the whole screen look like?" — mobile through ultrawide, with
// named slots for the host's content and responsive behaviour the host never
// has to author. Content has a maximum readable width; extra viewport on
// ultrawide goes to intentional whitespace, never stretching.
export { default as AppShell } from "./layouts/AppShell/AppShell.vue";
export type { AppShellSidebarWidth } from "./layouts/AppShell/AppShell.vue";
export { default as Centered } from "./layouts/Centered/Centered.vue";
export type { CenteredMaxWidth } from "./layouts/Centered/Centered.vue";
export { default as Dashboard } from "./layouts/Dashboard/Dashboard.vue";
export type { DashboardMinTileWidth } from "./layouts/Dashboard/Dashboard.vue";
export { default as FormLayout } from "./layouts/FormLayout/FormLayout.vue";
export type { FormLayoutMaxWidth } from "./layouts/FormLayout/FormLayout.vue";
export { default as MasterDetail } from "./layouts/MasterDetail/MasterDetail.vue";
export type { MasterDetailMinMasterWidth } from "./layouts/MasterDetail/MasterDetail.vue";
export { default as Reading } from "./layouts/Reading/Reading.vue";
export { default as Settings } from "./layouts/Settings/Settings.vue";
export type { SettingsNavWidth } from "./layouts/Settings/Settings.vue";
export { default as SplitLayout } from "./layouts/SplitLayout/SplitLayout.vue";
export type { SplitLayoutCollapseAt } from "./layouts/SplitLayout/SplitLayout.vue";

// Blocks, alphabetical. A block is an arrangement of primitives that an
// application repeats — an application header, an empty state, a stack of
// toasts — shipped so the arrangement is decided once rather than in each
// product. They take composition where a primitive takes configuration: the
// content arrives through slots, and the block owns only the layout, the
// spacing and the behaviour that layout implies.
export { default as AppHeader } from "./blocks/AppHeader/AppHeader.vue";
export { default as DashboardGrid } from "./blocks/DashboardGrid/DashboardGrid.vue";
export { default as DesktopAppShell } from "./blocks/DesktopAppShell/DesktopAppShell.vue";
export { default as EmptyState } from "./blocks/EmptyState/EmptyState.vue";
export { default as ErrorState } from "./blocks/ErrorState/ErrorState.vue";
export { default as FormActions } from "./blocks/FormActions/FormActions.vue";
export type { FormActionsAlign } from "./blocks/FormActions/FormActions.vue";
export { default as FormSection } from "./blocks/FormSection/FormSection.vue";
export type { FormSectionGap } from "./blocks/FormSection/FormSection.vue";
export { default as LoadingState } from "./blocks/LoadingState/LoadingState.vue";
export { default as MetricCard } from "./blocks/MetricCard/MetricCard.vue";
export type { MetricCardTrend } from "./blocks/MetricCard/MetricCard.vue";
export { default as PageHeader } from "./blocks/PageHeader/PageHeader.vue";
export { default as RowActions } from "./blocks/RowActions/RowActions.vue";
export { default as SidebarNav } from "./blocks/SidebarNav/SidebarNav.vue";
export type { SidebarNavItem, SidebarNavSection } from "./blocks/SidebarNav/SidebarNav.vue";
export { default as TitleBar } from "./blocks/TitleBar/TitleBar.vue";
export { default as ToastStack } from "./blocks/ToastStack/ToastStack.vue";
export type { ToastStackItem } from "./blocks/ToastStack/ToastStack.vue";
