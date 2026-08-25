// The platform-independent layout core — one pure entry point plus the data
// types it speaks. Nothing in this barrel imports anything: no Vue, no DOM,
// not even `cn`. No consumer import path reaches it: no component render
// path imports it, the facade re-exports none of it, and the composition
// packages' barrels do not re-export their adapters — its only consumers are
// the per-package adapters (from their src/, never through a barrel) and the
// conformance harness, none of which the published build follows. Zero
// engine bytes in the published output is therefore an import-graph fact,
// not a tree-shaking result; the byte comparison against the pre-slice
// build is what proves it stays one.

// The single entry point.
export { layout, type ComputedNode } from "./layout";

// The style model: what a layout tree asks for.
export { type Align, type Axis, type Length, type LayoutNode, type LayoutStyle } from "./style";

// The constraint vocabulary: what a parent offers a node.
export { type AvailableSpace, type DimensionConstraint } from "./constraint";
