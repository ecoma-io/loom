export { default } from "./Table.vue";
export { TABLE_LABELS } from "./Table.vue";
export { default as TableRow, tableRowVariants } from "./TableRow.vue";
export { default as TableHead, headAlignClass, nextSort } from "./TableHead.vue";
export { default as TableCell } from "./TableCell.vue";
// The label *type* is the registry's — re-exported here so a consumer reaching
// for the component package finds it beside the component.
export type { TableLabels } from "@ecoma-io/loom-labels";
export type { TableDensity, TableAlign } from "./Table.vue";
export type { TableRowState } from "./TableRow.vue";
export type { TableSort } from "./TableHead.vue";
