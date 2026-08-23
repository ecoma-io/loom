export { default, ALERT_LABELS } from "./Alert.vue";
// The label *type* is the registry's — re-exported here so a consumer reaching
// for the component package finds it beside the component.
export type { AlertVariant } from "./Alert.vue";
export type { AlertLabels } from "@ecoma-io/loom-labels";
