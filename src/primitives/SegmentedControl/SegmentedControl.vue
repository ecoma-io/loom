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

/**
 * SegmentedControl — pick one of 2-5 mutually exclusive options, all visible
 * at once; one is always active. Built on Reka UI's RadioGroup (single
 * choice, roving tabindex — the group is one Tab stop, not N — with
 * arrow-key navigation). Styled with Loom tokens.
 */
const props = withDefaults(
  defineProps<{
    /** The selected option's `value`. */
    modelValue?: string;
    /** The segments to render, in order. */
    options: SegmentedControlOption[];
    /** Disables every segment at once, distinct from a single option's own `disabled`. */
    disabled?: boolean;
    /** `"sm"` is the compressed form for dense chrome — e.g. a status bar density level. */
    size?: "default" | "sm";
  }>(),
  { disabled: false, size: "default" },
);

defineEmits<{ "update:modelValue": [value: string] }>();

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
    v-bind="optional({ modelValue })"
    :disabled="disabled"
    orientation="horizontal"
    class="relative inline-flex items-center gap-0.5 rounded-md border border-input bg-muted p-0.5"
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
          'relative z-10 inline-flex items-center justify-center rounded-sm text-muted-foreground',
          size === 'sm' ? 'px-1.5 py-px text-[11px]' : 'px-3 py-1 text-sm',
          'data-[state=checked]:font-medium data-[state=checked]:text-foreground',
          'data-[state=unchecked]:hover:bg-subtle',
          'active:scale-[0.97]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo',
          'disabled:pointer-events-none disabled:opacity-50',
        )
      "
    >
      {{ opt.label }}
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
