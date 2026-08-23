<script lang="ts">
import type { TimelineLabels } from "@ecoma-io/loom-labels";

/**
 * Timeline — a chronological spine: markers down a line, each carrying a
 * moment (title, description, timestamp) and where it sits relative to now.
 *
 * **Vertical is the only axis.** A horizontal timeline is a Stepper wearing
 * different clothes: ordered stages a reader moves through, which Stepper
 * already models with a state machine, reachability rules and keyboard
 * traversal. A timeline's moments are *records* the reader scans, and the
 * scan runs top-to-bottom at every viewport this library targets. If a
 * design reaches for horizontal, it is asking for Stepper.
 *
 * Statuses are explicit — the host owns the truth about what has happened —
 * and every item states its status in words beside the marker, because a
 * dot's colour alone is not a state.
 */
export const TIMELINE_LABELS: TimelineLabels = {
  region: "Timeline",
  complete: "Completed",
  current: "Current",
  upcoming: "Upcoming",
};

/** Where a moment sits relative to now. The host owns the truth. */
export type TimelineStatus = "complete" | "current" | "upcoming";
</script>

<script setup lang="ts">
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";

defineProps<{
  /** Names the timeline when surrounding prose does not already say it. */
  labels?: LabelOverrides<TimelineLabels>;
}>();

// `text`, not `labels`: one of three sources, resolved key by key.
const text = useLabels("timeline", TIMELINE_LABELS);
</script>

<template>
  <!-- An ordered list, because a timeline IS ordered. Items draw their own
       connector stub; the last one's is retired here so the line stops where
       the story does. -->
  <!-- A div carrying explicit list roles rather than a styled ol: the docs
       site's own unlayered `ol` rules beat every utility here (the failure
       AvatarGroup recorded first), and explicit roles also survive engines
       that drop list semantics once `list-style: none` lands. -->
  <div
    role="list"
    :aria-label="text.region"
    class="m-0 p-0 [&>*:last-child_.loom-timeline-line]:hidden"
  >
    <!-- @slot The entries: one `TimelineItem` per moment, in order. -->
    <slot />
  </div>
</template>
