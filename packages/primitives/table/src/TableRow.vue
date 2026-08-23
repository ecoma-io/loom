<script lang="ts">
import { cva } from "class-variance-authority";

/** Row emphasis. `selected` and `interactive` compose — a picked row that is
 * also clickable reads as both. */
export type TableRowState = "selected" | "interactive" | "disabled";

export const tableRowVariants = cva("transition-colors duration-fast ease-out", {
  variants: {
    state: {
      // Hover is a promise: only an interactive row may answer the pointer.
      interactive:
        "cursor-pointer hover:bg-subtle/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:bg-subtle/60",
      selected: "bg-primary-muted/60",
      disabled: "text-muted-foreground",
      none: "",
    },
  },
});
</script>

<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@ecoma-io/loom-core";

const props = withDefaults(
  defineProps<{
    /** Hover/press language plus keyboard activation; the host owns what activation MEANS via `@activate`. */
    interactive?: boolean;
    /** Marks the row as the current choice among its peers (`aria-selected`). */
    selected?: boolean;
    /** Unavailable rather than hidden: muted, inert, still announced. */
    disabled?: boolean;
  }>(),
  { interactive: false, selected: false, disabled: false },
);

const emit = defineEmits<{ activate: [] }>();

// A row is not a button, so it cannot lean on native activation. Clicks
// coming from real controls inside a cell (RowActions, links) belong to
// those controls — bubbling them up here would fire the row's activation
// behind the control's back.
function onActivateClick(event: MouseEvent): void {
  if (!props.interactive || props.disabled) return;
  const target = event.target;
  if (
    target instanceof Element &&
    target.closest("a, button, input, select, textarea, label, [role='button']")
  )
    return;
  emit("activate");
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.interactive || props.disabled) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    emit("activate");
  }
}

const state = computed(() =>
  props.disabled
    ? "disabled"
    : props.interactive
      ? "interactive"
      : props.selected
        ? "selected"
        : "none",
);
</script>

<template>
  <tr
    :class="
      cn(
        tableRowVariants({ state }),
        // Selected rides above interactive's hover wash, not under it.
        selected && !disabled && 'bg-primary-muted/60',
      )
    "
    :aria-selected="interactive || selected ? selected : undefined"
    :tabindex="interactive && !disabled ? 0 : undefined"
    @click="onActivateClick"
    @keydown="onKeydown"
  >
    <!-- @slot The row's cells (`TableCell`, or `TableHead` inside `<thead>`). -->
    <slot />
  </tr>
</template>
