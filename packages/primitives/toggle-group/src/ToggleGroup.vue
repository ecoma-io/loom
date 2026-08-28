<script lang="ts">
import type { Component } from "vue";

/** One toggle inside a {@link ToggleGroup}. */
export interface ToggleGroupItem {
  /** Matched against `modelValue`. */
  value: string;
  /** Visible label, rendered inside the button. */
  label: string;
  /** Optional glyph rendered before the label; hidden from the tree, the label is the name. */
  icon?: Component;
  /** Disables this button alone, leaving its neighbours toggleable. */
  disabled?: boolean;
  /** Forwarded to the button's DOM node — lets hosts keep stable test hooks. */
  testId?: string;
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { ToggleGroupRoot, ToggleGroupItem as RekaToggleGroupItem } from "reka-ui";
import type { AcceptableValue } from "reka-ui";
import { useAncestorDisabled, useFieldControl } from "@ecoma-io/loom-labels";
import { cn, optional, useSplitAttrs } from "@ecoma-io/loom-core";

/**
 * ToggleGroup — a set of toggle actions or filters whose pressed state is the
 * value: bold/italic/underline, column filters, metric toggles. Each item is
 * a real `<button aria-pressed>` — deliberately **not** `aria-checked`/radio
 * semantics, which is the whole distinction from
 * [SegmentedControl](../../segmented-control): a segmented control is a value
 * picker where one option is always active, while here zero-or-more buttons
 * can be on at once and the group's `type` says which contract the model
 * follows — `"single"` holds one value or `null`, `"multiple"` a `string[]`.
 * Built on Reka UI's ToggleGroup: the group is one Tab stop (roving
 * tabindex), Arrow keys move focus between buttons skipping disabled ones —
 * they move *focus only* and never flip a toggle, unlike a radio group where
 * the arrows change the value. Styled with Loom tokens; a pressed button
 * fills with the primary token and takes weight, so the state is carried by
 * `aria-pressed` plus fill plus weight — never colour alone.
 *
 * Inside a [Field](../Field/Field.vue) the row's description, `required` and
 * `invalid` reach the group through `useFieldControl()`, and a
 * `<Fieldset disabled>` above it disables every button.
 *
 * **A row's label does not name this group.** `<label for>` names a labelable
 * element and this renders a `div[role="group"]`, so the row's label resolves
 * to the element and names nobody. Name it with a
 * [Fieldset](../Fieldset/Fieldset.vue)'s real `<legend>`, or with an
 * `aria-label`/`aria-labelledby` of its own — which is what every example
 * already does, because the component carries no label text of its own and
 * therefore no labels prop: the item labels are the caller's content.
 *
 * There is no `readonly`: a toggle that displays a state but cannot change it
 * is a disabled one showing an answer, so a row's `readonly` arrives as
 * nothing at all rather than as that disguise.
 */
const props = withDefaults(
  defineProps<{
    /** The pressed value (`"single"`), the pressed values (`"multiple"`), or nothing pressed. */
    modelValue?: string | string[] | null;
    /** The buttons to render, in order. */
    items: ToggleGroupItem[];
    /** `"single"` models one value or `null`; `"multiple"` a `string[]`. */
    type?: "single" | "multiple";
    /** The track's resting look; a pressed button fills with the primary token in every variant. */
    variant?: "secondary" | "outline" | "ghost";
    /** `"sm"` is the compressed form for dense chrome — e.g. an editor toolbar. */
    size?: "sm" | "md" | "lg";
    /** Disables every button at once, distinct from a single item's own `disabled`. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
  }>(),
  {
    // Not `false`: absent has to stay tellable from `false` for a Field above
    // to disable the group and for `:disabled="false"` to overrule one that
    // does. Vue casts an absent Boolean prop with no declared default to
    // `false`, which would leave the context wired and inert.
    disabled: undefined,
    type: "single",
    variant: "secondary",
    size: "md",
  },
);

const emit = defineEmits<{ "update:modelValue": [value: string | null | string[]] }>();

defineOptions({ inheritAttrs: false });
const { attrs, rest: groupAttrs } = useSplitAttrs();

/**
 * The buttons are real `<button>`s, so a `<fieldset disabled>` above this
 * group already makes each of them inert — but Reka's roving focus is what
 * decides where Tab lands, and it is driven by the group's own `disabled`,
 * which the fieldset never reaches. Its own `disabled` prop sets that to
 * `-1`, exactly as SegmentedControl does.
 *
 * Read off the DOM rather than taken from the Field context, which publishes
 * no `disabled` on purpose — see `../../lib/ancestor-disabled.ts`.
 */
const root = useTemplateRef<{ $el?: Element }>("root");
const groupDisabled = useAncestorDisabled(() => root.value?.$el);

const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: attrs["aria-describedby"] as string | undefined,
  // The fieldset beats the prop in both directions, exactly as it does for
  // the buttons themselves.
  disabled: groupDisabled.value ? true : props.disabled,
}));

/**
 * Reka's own model is `AcceptableValue` for `"single"` and `AcceptableValue[]`
 * for `"multiple"`, and its typing has no `undefined` rung under
 * `exactOptionalPropertyTypes`. The seam's contract adds `null` for "nothing
 * pressed" and keeps a `null`/absent model from reaching Reka as a stray
 * non-string: a single group with nothing pressed shows Reka `""`, which is
 * no item's value — and `data-state="off"` on every button — in both engines.
 */
const rootValue = computed<string | string[]>(() => {
  if (props.type === "multiple") {
    return Array.isArray(props.modelValue) ? props.modelValue : [];
  }
  return typeof props.modelValue === "string" ? props.modelValue : "";
});

function onUpdate(value: AcceptableValue | AcceptableValue[]) {
  if (props.type === "multiple") {
    // Every item's value is a caller-provided `string`, so the array Reka
    // hands back can only hold those strings.
    emit("update:modelValue", Array.isArray(value) ? (value as string[]) : []);
  } else {
    // Reka hands back `undefined` when the pressed button is pressed again —
    // the seam publishes that as `null`, the model's spelling of "nothing".
    emit("update:modelValue", typeof value === "string" && value !== "" ? value : null);
  }
}

const iconClass = computed(() => (props.size === "sm" ? "size-3.5" : "size-4"));
</script>

<template>
  <ToggleGroupRoot
    ref="root"
    :type="type"
    :model-value="rootValue"
    orientation="horizontal"
    :disabled="field.disabled"
    v-bind="{ ...groupAttrs, ...field.attrs }"
    :class="
      cn(
        'inline-flex items-center gap-0.5 rounded-md p-0.5',
        // The track has three resting looks. `secondary` is SegmentedControl's
        // own track — a muted well with a rim; `outline` keeps the rim but
        // sits on the page ground; `ghost` has neither rim nor well and leans
        // entirely on the buttons.
        variant === 'secondary' && 'border border-input bg-muted',
        variant === 'outline' && 'border border-input bg-background',
        variant === 'ghost' && 'bg-transparent',
        // The one thing the *track* has left to say when the whole group is
        // unavailable: the rim slackening from `input` to the lighter
        // `border` — the well is already spent. A ghost track has no rim to
        // slacken, so it says it through its buttons alone.
        field.disabled && variant !== 'ghost' && 'border-border cursor-not-allowed',
        attrs.class as string,
      )
    "
    @update:model-value="onUpdate"
  >
    <RekaToggleGroupItem
      v-for="opt in items"
      :key="opt.value"
      :value="opt.value"
      :disabled="opt.disabled ?? false"
      v-bind="optional({ 'data-testid': opt.testId })"
      :class="
        cn(
          // Named, not the bare `group`: this control is dropped into
          // application chrome, and a bare `group-*` would also answer to any
          // ancestor a host happened to mark up as one.
          // `min-h-6`/`min-w-6` are the WCAG 2.5.8 target floors made
          // explicit in the sm form, whose one-character labels would
          // otherwise collapse under 24px.
          'group/item relative inline-flex items-center justify-center gap-1.5 rounded-sm text-muted-foreground',
          size === 'sm' && 'min-h-6 min-w-6 px-1.5 py-px text-micro',
          size === 'md' && 'min-h-8 px-3 py-1 text-sm',
          size === 'lg' && 'min-h-10 px-4 py-1.5',
          'data-[state=off]:hover:bg-subtle',
          // The pressed state is fill plus weight plus `aria-pressed` — never
          // colour alone.
          'data-[state=on]:bg-primary data-[state=on]:font-medium data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm',
          'active:scale-press',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo',
          // No `opacity` here either, for SegmentedControl's reason: the label
          // is most of the button, and a dim took it to 1.96:1. Unavailability
          // is a fill instead — the cell drains to the page ground — and the
          // mute lives on the span, where it beats whatever the button
          // resolved to.
          'disabled:pointer-events-none data-[disabled]:bg-background',
        )
      "
    >
      <component
        :is="opt.icon"
        v-if="opt.icon"
        aria-hidden="true"
        :class="cn('shrink-0', iconClass)"
      />
      <span class="group-data-[disabled]/item:text-muted-foreground">{{ opt.label }}</span>
    </RekaToggleGroupItem>
  </ToggleGroupRoot>
</template>
