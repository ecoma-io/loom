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
 */

// Utilities.
export { cn } from "./lib/cn";
export { applyLoomIconDefaults } from "./lib/icon-defaults";
export { LIST_STAGGER_CAP, LIST_STAGGER_STEP_MS, listStaggerDelay } from "./lib/motion";

// Primitives, alphabetical. Each component ships beside the types its own
// props are written in, so a host can name a variant without reaching into a
// deep path. `ToastItem` is absent on purpose: it is the card `Toast` bundles
// with its provider and viewport, and it renders nothing usable on its own.
export { default as Avatar } from "./primitives/Avatar/Avatar.vue";
export type { AvatarSize } from "./primitives/Avatar/Avatar.vue";
export { default as Badge, badgeVariants } from "./primitives/Badge/Badge.vue";
export type { BadgeVariant } from "./primitives/Badge/Badge.vue";
export { default as Button, buttonVariants } from "./primitives/Button/Button.vue";
export type { ButtonSize, ButtonVariant } from "./primitives/Button/Button.vue";
export { default as Checkbox } from "./primitives/Checkbox/Checkbox.vue";
export { default as Dialog } from "./primitives/Dialog/Dialog.vue";
export type { DialogSize } from "./primitives/Dialog/Dialog.vue";
export { default as DropdownMenu } from "./primitives/DropdownMenu/DropdownMenu.vue";
export type { DropdownMenuEntry } from "./primitives/DropdownMenu/DropdownMenu.vue";
export { default as Field } from "./primitives/Field/Field.vue";
export { default as InlineError } from "./primitives/InlineError/InlineError.vue";
export { default as Menubar } from "./primitives/Menubar/Menubar.vue";
export type { MenubarItem, MenubarMenu } from "./primitives/Menubar/Menubar.vue";
export { default as NumberField } from "./primitives/NumberField/NumberField.vue";
export { default as Popover } from "./primitives/Popover/Popover.vue";
export type { PopoverAlign, PopoverSide } from "./primitives/Popover/Popover.vue";
export { default as Progress } from "./primitives/Progress/Progress.vue";
export { default as RadioGroup } from "./primitives/RadioGroup/RadioGroup.vue";
export type { RadioOption } from "./primitives/RadioGroup/RadioGroup.vue";
export { default as SegmentedControl } from "./primitives/SegmentedControl/SegmentedControl.vue";
export type { SegmentedControlOption } from "./primitives/SegmentedControl/SegmentedControl.vue";
export { default as Select, selectVariants } from "./primitives/Select/Select.vue";
export type { SelectOption, SelectSize } from "./primitives/Select/Select.vue";
export { default as Separator } from "./primitives/Separator/Separator.vue";
export type { SeparatorOrientation } from "./primitives/Separator/Separator.vue";
export { default as Skeleton, skeletonVariants } from "./primitives/Skeleton/Skeleton.vue";
export type { SkeletonVariant } from "./primitives/Skeleton/Skeleton.vue";
export { default as Slider } from "./primitives/Slider/Slider.vue";
export { default as Spinner, spinnerVariants } from "./primitives/Spinner/Spinner.vue";
export type { SpinnerSize } from "./primitives/Spinner/Spinner.vue";
export { default as Surface, surfaceVariants } from "./primitives/Surface/Surface.vue";
export type { SurfaceElevation, SurfacePad } from "./primitives/Surface/Surface.vue";
export { default as Switch } from "./primitives/Switch/Switch.vue";
export { default as Tabs } from "./primitives/Tabs/Tabs.vue";
export type { TabItem } from "./primitives/Tabs/Tabs.vue";
export { default as Textarea } from "./primitives/Textarea/Textarea.vue";
export type { TextareaResize } from "./primitives/Textarea/Textarea.vue";
export { default as TextField } from "./primitives/TextField/TextField.vue";
export type { TextFieldSize, TextFieldType } from "./primitives/TextField/TextField.vue";
export { default as Toast } from "./primitives/Toast/Toast.vue";
export type { ToastVariant } from "./primitives/Toast/Toast.vue";
export { default as Tooltip } from "./primitives/Tooltip/Tooltip.vue";
export type { TooltipSide } from "./primitives/Tooltip/Tooltip.vue";
export { default as WindowControls } from "./primitives/WindowControls/WindowControls.vue";
export type { WindowControlsLabels } from "./primitives/WindowControls/WindowControls.vue";

// Icons — custom domain glyphs, taking the same props as any Lucide icon.
export { default as BrandMark } from "./icons/BrandMark";
