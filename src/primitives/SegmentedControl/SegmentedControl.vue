<script lang="ts">
/** One segment in a {@link SegmentedControl}. */
export interface SegmentedControlOption {
  /** Matched against `modelValue`. */
  value: string;
  /** Visible label, rendered inside the segment. */
  label: string;
  /** Disables this segment alone, leaving its neighbours pickable. */
  disabled?: boolean;
  /** Forwarded to the segment's DOM node — lets hosts keep stable test hooks. */
  testId?: string;
}
</script>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { RadioGroupRoot, RadioGroupItem } from "reka-ui";
import { cn } from "../../lib/cn";
import { optional } from "../../lib/props";
import { useSplitAttrs } from "../../lib/attrs";
import { useFieldControl } from "../../lib/field-context";

/**
 * SegmentedControl — pick one of 2-5 mutually exclusive options, all visible
 * at once; one is always active. Built on Reka UI's RadioGroup (single
 * choice, roving tabindex — the group is one Tab stop, not N — with
 * arrow-key navigation). Styled with Loom tokens.
 *
 * Inside a [Field](../Field/Field.vue) the row's description, `name`,
 * `required` and `invalid` reach the group through `useFieldControl()`.
 *
 * **A row's label does not name this group.** `<label for>` names a labelable
 * element and this renders a `div[role="radiogroup"]`, so the row's label
 * resolves to the element and names nobody. Name it with a
 * [Fieldset](../Fieldset/Fieldset.vue)'s real `<legend>`, or with an
 * `aria-label`/`aria-labelledby` of its own — which is what every example
 * already does, because the control carries no label text.
 *
 * There is no `readonly`, and a row's is ignored rather than approximated: each
 * segment is a `<button role="radio">` with no native read-only state to put it
 * in, and one segment is always active, so a read-only control here would be a
 * disabled one showing an answer.
 */
const props = withDefaults(
  defineProps<{
    /** The selected option's `value`. */
    modelValue?: string;
    /** The segments to render, in order. */
    options: SegmentedControlOption[];
    /** Disables every segment at once, distinct from a single option's own `disabled`. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** `"sm"` is the compressed form for dense chrome — e.g. a status bar density level. */
    size?: "default" | "sm";
  }>(),
  {
    // Not `false`: absent has to stay tellable from `false` for a Field above
    // to disable the control and for `:disabled="false"` to overrule one that
    // does. Vue casts an absent Boolean prop with no declared default to
    // `false`, which would leave the context wired and inert.
    disabled: undefined,
    size: "default",
  },
);

defineEmits<{ "update:modelValue": [value: string] }>();

defineOptions({ inheritAttrs: false });
const { attrs, rest: groupAttrs } = useSplitAttrs();

// One rendered node, so the split is only about `class` — a caller's class
// needs a Tailwind-aware merge rather than Vue's concatenating fallthrough.
//
// `id` and `aria-describedby` arrive as fallthrough attrs rather than props, so
// they are handed in as this caller's own values; `field.attrs` then spreads
// **after** `groupAttrs`, and that position is the contract (see TextField.vue).
//
// `name`, `required` and `invalid` are omitted because this component has no
// prop for any of them — the row's answer stands unopposed, and its `name`
// reaches RadioGroupRoot's own prop, which mints the hidden input a `<form>`
// submits. `readonly` is omitted for the reason the docblock gives.
//
// The resolved `required` then reaches the group through Reka's own prop rather
// than the `aria-required` in `field.attrs`: RadioGroupRoot writes that
// attribute itself, so leaving it to the bag is a race with a `false` — see
// Checkbox.vue, where the merge order makes the same race a certainty.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: attrs["aria-describedby"] as string | undefined,
  disabled: props.disabled,
}));

// Shared sliding indicator behind the checked segment. Measured off the live
// DOM (offsetLeft/offsetWidth of the [data-state=checked] item), not derived
// from index/width math, so "sm"/"default" sizing and variable-width labels
// stay correct without per-size indicator code.
const indicatorEl = ref<HTMLElement | null>(null);
const indicatorStyle = reactive({ left: "0px", width: "0px", opacity: "0" });

let resizeObserver: ResizeObserver | undefined;

// Re-targets onto the checked item itself (not the container) so a late
// width settle on exactly that element — e.g. the `font-medium` weight swap
// on data-[state=checked] reflowing after this function's own read — is
// caught by the observer and re-measured, instead of going unnoticed because
// the container's total box happened not to change.
function updateIndicator() {
  const container = indicatorEl.value?.parentElement;
  const active = container?.querySelector<HTMLElement>('[role="radio"][data-state="checked"]');
  if (!active) {
    indicatorStyle.opacity = "0";
    resizeObserver?.disconnect();
    return;
  }
  indicatorStyle.left = `${active.offsetLeft}px`;
  indicatorStyle.width = `${active.offsetWidth}px`;
  indicatorStyle.opacity = "1";
  resizeObserver?.disconnect();
  resizeObserver?.observe(active);
}

onMounted(() => {
  resizeObserver = new ResizeObserver(updateIndicator);
  updateIndicator();
});
onUnmounted(() => resizeObserver?.disconnect());

watch(
  () => props.modelValue,
  () => nextTick(updateIndicator),
);
watch(
  () => props.options,
  () => nextTick(updateIndicator),
  { deep: true },
);
</script>

<template>
  <RadioGroupRoot
    v-bind="{ ...optional({ modelValue }), ...groupAttrs, ...field.attrs }"
    :disabled="field.disabled"
    :required="field.required"
    orientation="horizontal"
    :class="
      cn(
        'relative inline-flex items-center gap-0.5 rounded-md border border-input bg-muted p-0.5',
        attrs.class as string,
      )
    "
    @update:model-value="$emit('update:modelValue', String($event))"
  >
    <span
      ref="indicatorEl"
      aria-hidden="true"
      class="pointer-events-none absolute inset-y-0.5 rounded-sm bg-card shadow-sm"
      style="
        transition:
          left var(--duration-fast) var(--ease-spring),
          width var(--duration-fast) var(--ease-spring);
      "
      :style="{
        left: indicatorStyle.left,
        width: indicatorStyle.width,
        opacity: indicatorStyle.opacity,
      }"
    />
    <RadioGroupItem
      v-for="opt in options"
      :key="opt.value"
      :value="opt.value"
      :disabled="opt.disabled ?? false"
      v-bind="optional({ 'data-testid': opt.testId })"
      style="
        transition:
          transform var(--duration-fast) var(--ease-spring),
          color var(--duration-fast) var(--ease-out);
      "
      :class="
        cn(
          // Named, not the bare `group`: a segmented control is dropped into
          // application chrome, and a bare `group-*` would also answer to any
          // ancestor a host happened to mark up as one.
          'group/segment relative z-10 inline-flex items-center justify-center rounded-sm text-muted-foreground',
          size === 'sm' ? 'px-1.5 py-px text-[11px]' : 'px-3 py-1 text-sm',
          'data-[state=checked]:font-medium data-[state=checked]:text-foreground',
          'data-[state=unchecked]:hover:bg-subtle',
          'active:scale-press',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo',
          // No `opacity` here. A segment *is* its label — there is no glyph and
          // no fill of its own to dim — so `disabled:opacity-50` had nothing to
          // act on but the text, taking an unchecked segment to 1.96:1 and a
          // chosen one to 3.13:1 on its thumb.
          //
          // Unavailability is a fill instead, and it is the one step this
          // system already treats as meaningful: the cell drains up a rung of
          // the elevation rhythm, from the track's `bg-muted` to the page's own
          // `bg-background`, so it reads as a hole in the track rather than as
          // part of it. On a *chosen* segment that same fill covers the raised
          // white thumb, which is the whole signal — the value is still shown
          // and it is visibly no longer settable.
          'disabled:pointer-events-none data-[disabled]:bg-background',
        )
      "
    >
      <!-- The mute lives on this span rather than on the segment, and it has
           to. `data-[disabled]:` sorts *before* `data-[state=checked]:` in
           Tailwind's variant order, so a disabled segment that is also the
           chosen one would take `text-foreground` from the button — and a
           colour set on the button is only inherited here. Declared on the span
           it wins whatever the segment resolved to: 5.25:1 over the drained
           fill, against the 1.96:1 the dim used to leave. -->
      <span class="group-data-[disabled]/segment:text-muted-foreground">{{ opt.label }}</span>
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
