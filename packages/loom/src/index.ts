// The public surface of `@ecoma-io/loom`.
//
// This file is the single source of truth for the published package. Roots in
// the foundation packages (core, labels) and re-exports every component
// package under packages/<tier>/<name>/ plus the utilities and types a
// consumer needs. Nothing in a component package imports this file — the
// dependency direction runs core ↑ theme-core ↑ components ↑ … ↑ this facade.

// Core utilities — the utilities every component reaches for.
export { cn } from "@ecoma-io/loom-core";
export { optional } from "@ecoma-io/loom-core";
export { useSplitAttrs } from "@ecoma-io/loom-core";
export { listStaggerDelay } from "@ecoma-io/loom-core";
export { WCAG_TAGS } from "@ecoma-io/loom-core";
export { useTheme, themeScript } from "@ecoma-io/loom-core";
export type { ThemePreference, ResolvedTheme } from "@ecoma-io/loom-core";
export { applyLoomIconDefaults } from "@ecoma-io/loom-core";

// Labels — the localisation seam and field context system.
export { provideLoomLabels, useLabels } from "@ecoma-io/loom-labels";
export type { LabelOf, LabelOverrides, LoomLabelOverrides } from "@ecoma-io/loom-labels";
export type { LoomLabels } from "@ecoma-io/loom-labels";
export {
  CALENDAR_PANEL_LABELS,
  DATE_SEGMENT_LABELS,
  RANGE_CELL_LABELS,
  TIME_SEGMENT_LABELS,
} from "@ecoma-io/loom-labels";
export type {
  CalendarPanelLabels,
  DateSegmentLabels,
  RangeCellLabels,
  RangeCellPart,
  TimeSegmentLabels,
} from "@ecoma-io/loom-labels";
export { COUNT_LABELS, warningWindow } from "@ecoma-io/loom-labels";
export type { CountBand, CountLabels } from "@ecoma-io/loom-labels";
export { provideFieldContext, useFieldControl, useOuterFieldContext } from "@ecoma-io/loom-labels";
export type {
  FieldContext,
  FieldContextSource,
  FieldControl,
  FieldControlAttrs,
  FieldControlProps,
} from "@ecoma-io/loom-labels";
export { useAncestorDisabled } from "@ecoma-io/loom-labels";

// Component re-exports are added here as each component migrates from src/ to
// packages/<tier>/<name>/. The pattern for each is:
//
//   export { default as Separator } from "@ecoma-io/loom-separator";
//   export type { SeparatorOrientation } from "@ecoma-io/loom-separator";

// Primitives — alphabetical.
export { default as HoverCard } from "@ecoma-io/loom-hover-card";
export type { HoverCardAlign, HoverCardSide } from "@ecoma-io/loom-hover-card";
export { default as Progress, progressVariants, PROGRESS_LABELS } from "@ecoma-io/loom-progress";
export type { ProgressLabels, ProgressSize } from "@ecoma-io/loom-progress";
export {
  default as RadialProgress,
  radialProgressVariants,
  RADIAL_PROGRESS_LABELS,
} from "@ecoma-io/loom-radial-progress";
export type {
  RadialProgressLabels,
  RadialProgressSize,
  RadialProgressThickness,
} from "@ecoma-io/loom-radial-progress";
export { default as ScrollArea } from "@ecoma-io/loom-scroll-area";
export type { ScrollAreaOrientation } from "@ecoma-io/loom-scroll-area";
export { default as Separator } from "@ecoma-io/loom-separator";
export type { SeparatorOrientation } from "@ecoma-io/loom-separator";
export { default as Skeleton, skeletonVariants } from "@ecoma-io/loom-skeleton";
export type { SkeletonVariant } from "@ecoma-io/loom-skeleton";
export { default as Spinner, spinnerVariants } from "@ecoma-io/loom-spinner";
export type { SpinnerSize } from "@ecoma-io/loom-spinner";
export { default as Surface, surfaceVariants } from "@ecoma-io/loom-surface";
export type { SurfaceElevation, SurfacePad } from "@ecoma-io/loom-surface";

// Primitives — alphabetical (continued).
export { default as Accordion } from "@ecoma-io/loom-accordion";
export type { AccordionGap, AccordionItem, AccordionType } from "@ecoma-io/loom-accordion";
export { default as Avatar, avatarVariants } from "@ecoma-io/loom-avatar";
export type { AvatarShape, AvatarSize, AvatarVariant } from "@ecoma-io/loom-avatar";
export { default as Badge, badgeVariants } from "@ecoma-io/loom-badge";
export type { BadgeVariant } from "@ecoma-io/loom-badge";
export { default as Breadcrumb, BREADCRUMB_LABELS } from "@ecoma-io/loom-breadcrumb";
export type {
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbLabels,
} from "@ecoma-io/loom-breadcrumb";
export { default as Button, buttonVariants } from "@ecoma-io/loom-button";
export type { ButtonSize, ButtonVariant } from "@ecoma-io/loom-button";
export { default as Calendar, CALENDAR_LABELS } from "@ecoma-io/loom-calendar";
export type { CalendarLabels } from "@ecoma-io/loom-calendar";
export { default as Carousel, CAROUSEL_LABELS } from "@ecoma-io/loom-carousel";
export type { CarouselLabels } from "@ecoma-io/loom-carousel";
export { default as Card } from "@ecoma-io/loom-card";
export type { CardPad } from "@ecoma-io/loom-card";
export { default as Chip, chipVariants } from "@ecoma-io/loom-chip";
export type { ChipSize, ChipVariant } from "@ecoma-io/loom-chip";
export { default as Collapse } from "@ecoma-io/loom-collapse";
export { default as ContextMenu } from "@ecoma-io/loom-context-menu";
export type { ContextMenuEntry } from "@ecoma-io/loom-context-menu";
export { default as DropdownMenu } from "@ecoma-io/loom-dropdown-menu";
export type { DropdownMenuEntry } from "@ecoma-io/loom-dropdown-menu";
export { default as IconButton, iconButtonVariants } from "@ecoma-io/loom-icon-button";
export type { IconButtonSize, IconButtonVariant } from "@ecoma-io/loom-icon-button";
export { default as InlineError } from "@ecoma-io/loom-inline-error";
export { default as Kbd, kbdVariants } from "@ecoma-io/loom-kbd";
export type { KbdSize } from "@ecoma-io/loom-kbd";
export { default as Link, linkVariants } from "@ecoma-io/loom-link";
export type { LinkVariant } from "@ecoma-io/loom-link";
export { List, ListItem } from "@ecoma-io/loom-list";
export type { ListItemShape } from "@ecoma-io/loom-list";
export { default as Menubar } from "@ecoma-io/loom-menubar";
export type { MenubarItem, MenubarMenu } from "@ecoma-io/loom-menubar";
export { default as Popover } from "@ecoma-io/loom-popover";
export type { PopoverAlign, PopoverSide } from "@ecoma-io/loom-popover";
export { default as SpeedDial } from "@ecoma-io/loom-speed-dial";
export type { SpeedDialAction, SpeedDialDirection } from "@ecoma-io/loom-speed-dial";
export { default as Tabs } from "@ecoma-io/loom-tabs";
export type { TabItem } from "@ecoma-io/loom-tabs";
export { default as Tooltip } from "@ecoma-io/loom-tooltip";
export type { TooltipSide } from "@ecoma-io/loom-tooltip";

export { default as Timeline, TIMELINE_LABELS } from "@ecoma-io/loom-timeline";
export type { TimelineLabels, TimelineStatus } from "@ecoma-io/loom-timeline";
export { TimelineItem } from "@ecoma-io/loom-timeline";
export {
  TableCell,
  TableHead,
  TableRow,
  default as Table,
  TABLE_LABELS,
  tableRowVariants,
} from "@ecoma-io/loom-table";
export type { TableAlign, TableDensity, TableLabels, TableSort } from "@ecoma-io/loom-table";

// Primitives — alphabetical (continued, batch C).
export { default as Alert, ALERT_LABELS } from "@ecoma-io/loom-alert";
export type { AlertLabels, AlertVariant } from "@ecoma-io/loom-alert";
export { default as AlertDialog, ALERT_DIALOG_LABELS } from "@ecoma-io/loom-alert-dialog";
export type { AlertDialogLabels } from "@ecoma-io/loom-alert-dialog";
export { default as AvatarGroup, AVATAR_GROUP_LABELS } from "@ecoma-io/loom-avatar-group";
export type {
  AvatarGroupItem,
  AvatarGroupLabels,
  AvatarGroupSurface,
} from "@ecoma-io/loom-avatar-group";
export { default as Checkbox } from "@ecoma-io/loom-checkbox";
export { default as ColorPicker, COLOR_PICKER_LABELS } from "@ecoma-io/loom-color-picker";
export type { ColorPickerLabels } from "@ecoma-io/loom-color-picker";
export { default as Combobox, comboboxVariants, COMBOBOX_LABELS } from "@ecoma-io/loom-combobox";
export type { ComboboxLabels, ComboboxOption, ComboboxSize } from "@ecoma-io/loom-combobox";
export { default as DatePicker } from "@ecoma-io/loom-date-picker";
export type { DatePickerLabels } from "@ecoma-io/loom-date-picker";
export { default as DateRangePicker, DATE_RANGE_LABELS } from "@ecoma-io/loom-date-range-picker";
export type {
  DateRange,
  DateRangeLabels,
  DateRangePickerLabels,
} from "@ecoma-io/loom-date-range-picker";
export { default as DateTimePicker } from "@ecoma-io/loom-date-time-picker";
export type { DateTimePickerLabels } from "@ecoma-io/loom-date-time-picker";
export {
  default as DateTimeRangePicker,
  DATE_TIME_RANGE_LABELS,
} from "@ecoma-io/loom-date-time-range-picker";
export type {
  DateTimeRange,
  DateTimeRangeLabels,
  DateTimeRangePickerLabels,
} from "@ecoma-io/loom-date-time-range-picker";
export { default as Dialog, DIALOG_LABELS } from "@ecoma-io/loom-dialog";
export type { DialogLabels, DialogSize } from "@ecoma-io/loom-dialog";
export { default as Drawer, DRAWER_LABELS } from "@ecoma-io/loom-drawer";
export type { DrawerLabels, DrawerSide, DrawerSize } from "@ecoma-io/loom-drawer";
export { default as Editable, EDITABLE_LABELS } from "@ecoma-io/loom-editable";
export type {
  EditableActivationMode,
  EditableLabels,
  EditableSubmitMode,
} from "@ecoma-io/loom-editable";
export { default as Field } from "@ecoma-io/loom-field";
export { default as Fieldset } from "@ecoma-io/loom-fieldset";
export { default as FileUpload, FILE_UPLOAD_LABELS } from "@ecoma-io/loom-file-upload";
export type {
  FileUploadLabels,
  FileUploadRejectReason,
  FileUploadRejection,
} from "@ecoma-io/loom-file-upload";
export {
  default as Indicator,
  indicatorVariants,
  indicatorToneVariants,
  INDICATOR_LABELS,
} from "@ecoma-io/loom-indicator";
export type {
  IndicatorLabels,
  IndicatorVariant,
  IndicatorStatus,
  IndicatorPlacement,
  IndicatorTone,
  IndicatorSurface,
} from "@ecoma-io/loom-indicator";
export { default as NumberField, NUMBER_FIELD_LABELS } from "@ecoma-io/loom-number-field";
export type { NumberFieldLabels } from "@ecoma-io/loom-number-field";
export { default as OtpInput, OTP_INPUT_LABELS } from "@ecoma-io/loom-otp-input";
export type { OtpInputLabels, OtpInputType } from "@ecoma-io/loom-otp-input";
export {
  default as Pagination,
  paginationVariants,
  PAGINATION_LABELS,
} from "@ecoma-io/loom-pagination";
export type { PaginationLabels, PaginationVariant } from "@ecoma-io/loom-pagination";
export { default as RadioGroup } from "@ecoma-io/loom-radio-group";
export type { RadioOption } from "@ecoma-io/loom-radio-group";
export { default as Rating, RATING_LABELS } from "@ecoma-io/loom-rating";
export type { RatingLabels, RatingSize } from "@ecoma-io/loom-rating";
export { default as SegmentedControl } from "@ecoma-io/loom-segmented-control";
export type { SegmentedControlOption } from "@ecoma-io/loom-segmented-control";
export { default as Select, selectVariants } from "@ecoma-io/loom-select";
export type { SelectOption, SelectSize } from "@ecoma-io/loom-select";
export { default as Slider } from "@ecoma-io/loom-slider";
export { default as Stepper, STEPPER_LABELS } from "@ecoma-io/loom-stepper";
export type { StepperLabels, StepperStep, StepperOrientation } from "@ecoma-io/loom-stepper";
export { default as Switch } from "@ecoma-io/loom-switch";
export { default as TagsInput, TAGS_INPUT_LABELS } from "@ecoma-io/loom-tags-input";
export type {
  TagsInputLabels,
  TagsInputRejection,
  TagsInputRejectReason,
} from "@ecoma-io/loom-tags-input";
export { default as Textarea, TEXTAREA_LABELS } from "@ecoma-io/loom-textarea";
export type { TextareaLabels, TextareaResize } from "@ecoma-io/loom-textarea";
export { default as TextField, TEXT_FIELD_LABELS } from "@ecoma-io/loom-text-field";
export type { TextFieldLabels, TextFieldSize, TextFieldType } from "@ecoma-io/loom-text-field";
export { default as TimePicker } from "@ecoma-io/loom-time-picker";
export type { TimePickerLabels } from "@ecoma-io/loom-time-picker";
export { Toast, ToastItem, TOAST_LABELS } from "@ecoma-io/loom-toast";
export type { ToastVariant, ToastLabels } from "@ecoma-io/loom-toast";
export { default as WindowControls, WINDOW_CONTROLS_LABELS } from "@ecoma-io/loom-window-controls";
export type { WindowPlatform, WindowControlsLabels } from "@ecoma-io/loom-window-controls";

// Compositions — alphabetical.
export { default as Center } from "@ecoma-io/loom-center";
export type { CenterMaxWidth } from "@ecoma-io/loom-center";
export { default as Frame } from "@ecoma-io/loom-frame";
export type { FrameRatio } from "@ecoma-io/loom-frame";
export { default as Grid } from "@ecoma-io/loom-grid";
export type { GridGap } from "@ecoma-io/loom-grid";
export { default as Inline } from "@ecoma-io/loom-inline";
export type { InlineAlign, InlineGap } from "@ecoma-io/loom-inline";
export { default as ScrollReel, SCROLL_REEL_LABELS } from "@ecoma-io/loom-scroll-reel";
export type { ScrollReelGap, ScrollReelSnap, ScrollReelLabels } from "@ecoma-io/loom-scroll-reel";
export { default as Sidebar } from "@ecoma-io/loom-sidebar";
export type { SidebarSide } from "@ecoma-io/loom-sidebar";
export { default as Split } from "@ecoma-io/loom-split";
export type { SplitGap, SplitSide } from "@ecoma-io/loom-split";
export { default as Stack } from "@ecoma-io/loom-stack";
export type { StackAlign, StackGap } from "@ecoma-io/loom-stack";

// Layouts — alphabetical.
export { default as AppShell } from "@ecoma-io/loom-app-shell";
export type { AppShellSidebarWidth } from "@ecoma-io/loom-app-shell";
export { default as Centered } from "@ecoma-io/loom-centered";
export type { CenteredMaxWidth } from "@ecoma-io/loom-centered";
export { default as Dashboard } from "@ecoma-io/loom-dashboard";
export type { DashboardMinTileWidth } from "@ecoma-io/loom-dashboard";
export { default as FormLayout } from "@ecoma-io/loom-form-layout";
export type { FormLayoutMaxWidth } from "@ecoma-io/loom-form-layout";
export { default as MasterDetail } from "@ecoma-io/loom-master-detail";
export type { MasterDetailMinMasterWidth, MasterDetailGap } from "@ecoma-io/loom-master-detail";
export { default as Reading } from "@ecoma-io/loom-reading";
export type { ReadingGutter } from "@ecoma-io/loom-reading";
export { default as Settings } from "@ecoma-io/loom-settings";
export type { SettingsNavWidth } from "@ecoma-io/loom-settings";
export { default as SplitLayout } from "@ecoma-io/loom-split-layout";
export type { SplitLayoutGap } from "@ecoma-io/loom-split-layout";

// Blocks — alphabetical.
export { default as AppHeader } from "@ecoma-io/loom-app-header";
export { default as DashboardGrid } from "@ecoma-io/loom-dashboard-grid";
export { default as DesktopAppShell } from "@ecoma-io/loom-desktop-app-shell";
export { default as EmptyState } from "@ecoma-io/loom-empty-state";
export { default as ErrorState } from "@ecoma-io/loom-error-state";
export { default as FormActions } from "@ecoma-io/loom-form-actions";
export type { FormActionsAlign } from "@ecoma-io/loom-form-actions";
export { default as FormSection } from "@ecoma-io/loom-form-section";
export type { FormSectionGap } from "@ecoma-io/loom-form-section";
export { default as LoadingState } from "@ecoma-io/loom-loading-state";
export { default as MetricCard } from "@ecoma-io/loom-metric-card";
export type { MetricCardTrend } from "@ecoma-io/loom-metric-card";
export { default as PageHeader } from "@ecoma-io/loom-page-header";
export { default as RowActions } from "@ecoma-io/loom-row-actions";
export { default as SidebarNav } from "@ecoma-io/loom-sidebar-nav";
export type { SidebarNavItem, SidebarNavSection } from "@ecoma-io/loom-sidebar-nav";
export { default as TitleBar } from "@ecoma-io/loom-title-bar";
export { default as ToastStack } from "@ecoma-io/loom-toast-stack";
export type { ToastStackItem } from "@ecoma-io/loom-toast-stack";
