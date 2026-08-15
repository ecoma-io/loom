import { setLucideProps } from "@lucide/vue";

/**
 * Apply the Loom icon defaults once at a host's root: size 16, stroke 1.5 —
 * hairline-first, matching the 1px border language. Every `@lucide/vue` icon
 * rendered after this call inherits them, so an individual icon declares
 * `size` or `strokeWidth` only where it deliberately diverges.
 *
 * The one standing divergence: a glyph rendered at 12px or below declares
 * `stroke-width` 2.5 exactly. Stroke lives on the 24 grid and scales with
 * size, so 1.5 at 12px renders 0.75 device pixels against 1.0 at 16px; 2.5
 * restores the optical weight.
 *
 * The numbers live here, not in each host.
 *
 * Call it from the `setup()` of the host's root component — `App.vue`, or the
 * component a documentation theme wraps its layout in. It resolves to Vue's
 * `provide()`, so it needs an active component instance: called from a plain
 * entry module it silently provides nothing, and every icon keeps Lucide's own
 * 24/2 defaults. There is no app-level alternative, because the injection key
 * Lucide provides under is not part of its public surface.
 */
export function applyLoomIconDefaults(): void {
  setLucideProps({ size: 16, strokeWidth: 1.5 });
}
