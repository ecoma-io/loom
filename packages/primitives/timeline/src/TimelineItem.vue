<script lang="ts">
import { cva } from "class-variance-authority";

/**
 * The marker, per status. Complete fills with success and takes the check;
 * current fills with primary and wears a halo — emphasis without motion, so
 * reduced-motion readers lose nothing; upcoming is a hollow dot, present but
 * not yet lived.
 */
export const timelineMarkerVariants = cva(
  "relative z-raised flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
  {
    variants: {
      status: {
        complete: "border-success bg-success text-success-foreground",
        current: "border-primary bg-primary-muted text-primary-text ring-4 ring-primary-muted",
        upcoming: "border-border bg-background text-muted-foreground",
      },
    },
    defaultVariants: { status: "upcoming" as TimelineStatus },
  },
);
</script>

<script setup lang="ts">
import { computed } from "vue";
import { Check } from "@lucide/vue";
import { useLabels, type LabelOverrides, type TimelineLabels } from "@ecoma-io/loom-labels";
import { cn } from "@ecoma-io/loom-core";
import { TIMELINE_LABELS, type TimelineStatus } from "./Timeline.vue";

const props = withDefaults(
  defineProps<{
    /** The moment's heading. */
    title: string;
    /** A line under the title. */
    description?: string;
    /** When it happened (or will). Rendered inside a real `<time>`. */
    timestamp?: string;
    /** Machine-readable timestamp for `<time datetime>`. */
    datetime?: string;
    /** Where the moment sits relative to now. The host owns the truth. */
    status?: TimelineStatus;
    /** Names what the item says on its own account, as any subset of `TimelineLabels`. */
    labels?: LabelOverrides<TimelineLabels>;
  }>(),
  { status: "upcoming" },
);

// `text`, not `labels`: one of three sources, resolved key by key.
const text = useLabels("timeline", TIMELINE_LABELS, () => props.labels);

const STATUS_WORD = {
  complete: "complete",
  current: "current",
  upcoming: "upcoming",
} as const;
const statusWord = computed(() => {
  const bag = text.value;
  return bag[STATUS_WORD[props.status]];
});
</script>

<template>
  <!-- pl-8 clears the marker column; the connector stub is drawn by this
       item along the left edge of that gutter and retired by the wrapper for
       the last entry, so the line stops where the story does. -->
  <div
    role="listitem"
    class="relative pb-8 pl-8 last:pb-0"
    :aria-current="status === 'current' ? 'step' : undefined"
  >
    <!-- The spine sits under the marker column: left-3 is exactly the
         h-6 marker's centre, so the line runs through every dot and retires
         with the final entry. -->
    <span
      aria-hidden="true"
      class="loom-timeline-line absolute top-6 bottom-0 left-3 w-px -translate-x-1/2 bg-border"
    />

    <span
      aria-hidden="true"
      :class="cn(timelineMarkerVariants({ status }), 'absolute left-0 top-0')"
    >
      <Check v-if="status === 'complete'" class="h-3.5 w-3.5" />
    </span>

    <div>
      <div class="flex flex-wrap items-baseline gap-x-2">
        <p class="text-sm font-medium">{{ title }}</p>
        <time
          v-if="timestamp || datetime"
          :datetime="datetime"
          class="text-small tabular text-muted-foreground"
          >{{ timestamp ?? datetime }}</time
        >
        <span class="sr-only">{{ statusWord }}</span>
      </div>
      <p v-if="description" class="mt-1 text-small text-muted-foreground">{{ description }}</p>
      <!-- @slot Anything beyond title/description/timestamp — a Badge, a link out. -->
      <div v-if="$slots.default" class="mt-2">
        <slot />
      </div>
    </div>
  </div>
</template>
