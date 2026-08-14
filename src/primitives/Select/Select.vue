<script lang="ts">
import { cva } from "class-variance-authority";

/** One row of the list. `value` is what the model carries; `label` is what a reader sees. */
export interface SelectOption {
  /** The value bound to `v-model` when this row is chosen. Unique within the list. */
  value: string;
  /** The text shown on the row, and on the trigger once it is chosen. */
  label: string;
  /** Present but unchoosable — visible, skipped by the keyboard, unclickable. */
  disabled?: boolean;
}

/**
 * The trigger's height scale. It matches the text input scale exactly, so a
 * form row mixing a Select beside a text field never comes out uneven — which
 * is why reaching past `size` for an `h-*` class is always the wrong fix.
 */
export type SelectSize = "sm" | "md" | "lg";

export const selectVariants = cva(
  [
    "group inline-flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background text-foreground",
    "transition-[color,background-color,box-shadow] duration-fast ease-out hover:bg-subtle",
    // Rim-lit at rest; the ring blooms on focus.
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    // No `opacity` here, and that is the point. The trigger is the node that
    // carries the chosen label, and what a reader needs from an unavailable
    // Select is exactly that: what it is set to. `disabled:opacity-50`
    // composited `text-foreground` down to 3.06:1 on this fill — halving the
    // alpha more than halves the contrast. Unavailability is painted in
    // measured colours instead: the fill drains to the neutral well and the
    // label lands on `--color-muted-foreground`, 4.68:1 over it.
    //
    // Both survive their neighbours on this element. `hover:` sorts *before*
    // `disabled:` in Tailwind's variant order, so the disabled fill wins over
    // `hover:bg-subtle` rather than flickering under a pointer; and
    // `data-[placeholder]:text-muted-foreground` names the same colour, so the
    // two colour rules agree whatever the sort puts last.
    //
    // The third channel — the rim slackening from `input` to `border` — is
    // **not** here, and cannot be: a `disabled:` variant outranks a plain
    // `border-destructive` on specificity, so a Select that was both in error
    // and unavailable would lose its destructive rim to it. It is written as a
    // plain conditional in the template, where `cn()` can order the two.
    "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
    "data-[placeholder]:text-muted-foreground",
  ],
  {
    // `satisfies` keeps the two halves honest: the union above is the name a
    // consumer imports and the documentation prints, the map below is the
    // classes. Adding a member to one and not the other stops compiling.
    variants: {
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-9 px-3 text-sm",
        lg: "h-11 px-4 text-base",
      } satisfies Record<SelectSize, string>,
    },
    defaultVariants: { size: "md" },
  },
);
</script>

<script setup lang="ts">
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
} from "reka-ui";
import { computed } from "vue";
import { Check, ChevronDown } from "@lucide/vue";
import { cn } from "../../lib/cn";
import { listStaggerDelay } from "../../lib/motion";
import { useSplitAttrs } from "../../lib/attrs";
import { useFieldControl } from "../../lib/field-context";

/**
 * Select — pick one value out of a closed list, through a compact trigger and
 * a popover listbox. It suits roughly three to fifteen rows where one value is
 * always chosen: a language, a resolution, a quality preset.
 *
 * Below that, two to five options a reader should see all of at once are
 * better shown than hidden. Above it, a list long enough to need searching
 * wants a combobox, which is a different control rather than a longer version
 * of this one.
 *
 * Built on Reka UI's Select, which supplies the listbox semantics: arrow-key
 * navigation, first-character typeahead, Escape and outside-click to close, and
 * the `role="combobox"` trigger wired to the listbox by `aria-expanded` and
 * `aria-controls`. The active row is tracked by moving real focus onto it, not
 * by `aria-activedescendant`.
 *
 * Inside a [Field](../Field/Field.vue) it wires itself: the row's id, the id of
 * its hint or error line, `required`, `invalid`, `disabled` and the name the
 * chosen value is submitted under all arrive through `useFieldControl()`, so
 * `<Field label="Language" error="…"><Select … /></Field>` needs no attributes
 * at the call site. Both booleans below still win over the row when they are
 * set, in both directions — which is why they default to `undefined` rather
 * than `false`.
 *
 * A row's `readonly` is deliberately ignored. A read-only value is one a reader
 * may see and copy but not change, and a closed list has nothing to show that
 * the trigger is not already showing — so a read-only Select is a disabled
 * Select that lies about being reachable. Rows holding a value nobody may edit
 * want a disabled Select, or no control at all.
 *
 * The consequence is that the library's three resting appearances collapse to
 * two here. A TextField rests available, on show, or unavailable; this control
 * has no middle state, so the lifted `subtle` fill never appears on it and the
 * trigger goes straight from `background` to the drained fill, muted label and
 * slackened rim of the disabled row.
 */
const props = withDefaults(
  defineProps<{
    /** The chosen option's `value`. Leave it unset to show the placeholder. */
    modelValue?: string;
    /** The rows, in the order they are shown. */
    options: SelectOption[];
    /** Shown on the trigger while nothing is chosen. It is not an option. */
    placeholder?: string;
    /** Unavailable: dims the trigger and refuses to open. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** Error state: paints the destructive border and ring, and sets `aria-invalid`. Unset defers to a wrapping Field's `error`. */
    invalid?: boolean | undefined;
    /** Trigger height. It shares the text input scale so mixed form rows stay aligned. */
    size?: SelectSize;
  }>(),
  {
    // Not `false`, for either. `false` is a caller saying "this control is fine
    // / enabled even though its row is not"; absent is a caller saying nothing,
    // and only `undefined` survives to mean that past Vue's
    // absent-Boolean-casts-to-false rule — see TextField.vue, which carries the
    // full reasoning.
    disabled: undefined,
    invalid: undefined,
    size: "md",
  },
);

defineEmits<{
  /** The chosen option's `value`. Fires once per choice; the list closes with it. */
  "update:modelValue": [value: string];
}>();

// The root renders no DOM node at all, so fallthrough attributes would be
// dropped on the floor rather than landing anywhere. They go to the trigger,
// which is the interactive element they describe.
//
// `class` is pulled out of that spread and merged through `cn()` instead.
// Spreading it alongside the trigger's own `:class` only concatenates the two
// lists — Vue's merge is generic, not Tailwind-aware — so a caller's `w-28`
// silently loses to the trigger's own `w-full` depending on which utility
// Tailwind happened to emit last.
defineOptions({ inheritAttrs: false });
const { attrs, rest: triggerAttrs } = useSplitAttrs();

// `id` and `aria-describedby` reach this control as fallthrough attrs rather
// than props, so they are read off `attrs` and handed in as this caller's own
// values — a caller who sets either still beats the row, and the row's
// description is merged into theirs rather than replacing it. `name`,
// `readonly` and `required` are absent from this object because there is no
// prop to oppose the row with; the row's answer stands unopposed, which is
// what is wanted.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: attrs["aria-describedby"] as string | undefined,
  disabled: props.disabled,
  invalid: props.invalid,
}));

// Two of the resolved keys do not travel with the bag, and both are Reka
// facts rather than preferences.
//
// `aria-required` cannot be delivered this way at all: Reka's `Slot` merges an
// as-child chain as `mergeProps(attrs, child.props)`, so the trigger's own
// declaration — `aria-required` off the root's `required` prop — beats anything
// arriving from outside, and a value spread here would be dropped silently.
// The root's prop below is the only lever, and it is bound from the same
// resolved value.
//
// `name` would be the `name` of a `<button type="button">`, which no form
// submission has ever included; the hidden input at the end of the template
// carries the value instead.
const triggerFieldAttrs = computed(() => {
  // Removed from a copy rather than listed positively, so a key added to the
  // resolved bag later reaches this trigger without anyone remembering to come
  // back here.
  const aria: Record<string, unknown> = { ...field.attrs };
  delete aria.name;
  delete aria["aria-required"];
  return aria;
});
</script>

<template>
  <SelectRoot
    :model-value="modelValue ?? ''"
    :disabled="field.disabled"
    :required="field.required"
    @update:model-value="$emit('update:modelValue', String($event))"
  >
    <SelectTrigger
      v-bind="{ ...triggerAttrs, ...triggerFieldAttrs }"
      :data-invalid="field.invalid || undefined"
      :class="
        cn(
          selectVariants({ size }),
          !field.invalid && 'focus-visible:shadow-halo',
          // The border half of the disabled treatment, and it lives here rather
          // than beside the fill in the variant map for the reason written
          // there. Read as a pair with the line below: `cn()` resolves a border
          // colour by whichever class it saw last, so an unavailable trigger
          // that is also in error still shows the destructive rim.
          field.disabled && 'border-border',
          field.invalid && 'border-destructive focus-visible:outline-destructive',
          attrs.class as string,
        )
      "
    >
      <SelectValue :placeholder="placeholder ?? ''" />
      <SelectIcon class="shrink-0 text-muted-foreground">
        <ChevronDown
          class="h-4 w-4 transition-transform duration-fast ease-out group-data-[state=open]:rotate-180"
        />
      </SelectIcon>
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="6"
        :class="
          cn(
            'z-50 min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md',
            // Scoped to the open state, never unconditional. Reka keeps the
            // closed content mounted while it waits for an animationend that a
            // mount-only animation never fires again — an invisible overlay
            // eating clicks. Scoping it makes the closed element compute
            // `animation-name: none`, which is the immediate-unmount branch.
            'data-[state=open]:animate-fade-rise',
          )
        "
      >
        <SelectViewport class="p-1">
          <!-- The rows reveal one step after another, from the shared stagger
               vocabulary rather than a per-template delay of its own. -->
          <SelectItem
            v-for="(option, index) in options"
            :key="option.value"
            :value="option.value"
            :disabled="option.disabled ?? false"
            :style="{ animationDelay: listStaggerDelay(index) }"
            :class="
              cn(
                'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-1.5 pr-8 text-sm text-foreground outline-none',
                'transition-colors duration-fast ease-out',
                'animate-fade-rise',
                'data-[highlighted]:bg-subtle',
                'data-[state=checked]:bg-primary-muted data-[state=checked]:text-primary-text',
                // Inert, but still readable: a row a reader cannot pick is
                // still a row they have to read to understand why the list is
                // shaped the way it is. `data-[disabled]:opacity-50` took the
                // label to 3.13:1 on the popover; the colour on the text node
                // below leaves it at 5.76:1 and still visibly lighter than the
                // rows around it.
                'data-[disabled]:pointer-events-none',
              )
            "
          >
            <!-- The mute lives here rather than on the row, and it has to.
                 `data-[disabled]:` sorts *before* `data-[state=checked]:` in
                 Tailwind's variant order, so a disabled row that is also the
                 chosen one would take `text-primary-text` from the container and a
                 container colour is only inherited. Declared on the text node
                 it wins whatever the row resolved to. -->
            <SelectItemText :class="option.disabled && 'text-muted-foreground'">{{
              option.label
            }}</SelectItemText>
            <SelectItemIndicator class="absolute right-2 inline-flex items-center">
              <Check class="h-4 w-4" />
            </SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>

    <!-- What a surrounding `<form>` reads, and only once a row has given this
         control a name. Reka can render a hidden native `<select>` from the
         root's own `name` instead, and two of its behaviours are wrong here: a
         native select always resolves to one of its options, so it would post
         the first row while the placeholder was still showing, and `required`
         on a visually-hidden control arms browser validation the library
         deliberately never arms — a submission blocked with "an invalid form
         control is not focusable" and no bubble anyone can see. A hidden input
         posts the model and nothing else. -->
    <input
      v-if="field.name"
      type="hidden"
      :name="field.name"
      :value="modelValue ?? ''"
      :disabled="field.disabled"
    />
  </SelectRoot>
</template>
