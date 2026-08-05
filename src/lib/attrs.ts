import { computed, useAttrs, type ComputedRef } from "vue";

/**
 * Split `useAttrs()` into the raw fallthrough attributes — read `.class` off
 * `attrs` for a `cn()` merge — and the same attributes minus `class` (`rest`,
 * for `v-bind` onto whichever node is not the `class` target).
 *
 * Every caller pairs this with `defineOptions({ inheritAttrs: false })`.
 * NumberField's input, Slider's thumb and Select's trigger each route `class`
 * onto one specific rendered node rather than taking Vue's default
 * single-root fallthrough, because `class` needs a Tailwind-aware merge while
 * the rest of the fallthrough — aria-*, data-testid — only needs to land
 * somewhere real.
 */
export function useSplitAttrs(): {
  attrs: Record<string, unknown>;
  rest: ComputedRef<Record<string, unknown>>;
} {
  const attrs = useAttrs();
  const rest = computed(() => {
    const { class: _class, ...others } = attrs;
    return others;
  });
  return { attrs, rest };
}
