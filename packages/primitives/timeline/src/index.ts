export { default, TIMELINE_LABELS } from "./Timeline.vue";
export { default as TimelineItem, timelineMarkerVariants } from "./TimelineItem.vue";
// The label *type* is the registry's — re-exported here so a consumer reaching
// for the component package finds it beside the component.
export type { TimelineLabels } from "@ecoma-io/loom-labels";
export type { TimelineStatus } from "./Timeline.vue";
