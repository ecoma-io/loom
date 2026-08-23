export { default, SCROLL_REEL_LABELS } from "./ScrollReel.vue";
// The label *type* is the registry's — re-exported here so a consumer reaching
// for the component package finds it beside the component, the way every
// primitive's own index carries its slot type.
export type { ScrollReelGap, ScrollReelSnap } from "./ScrollReel.vue";
export type { ScrollReelLabels } from "@ecoma-io/loom-labels";
