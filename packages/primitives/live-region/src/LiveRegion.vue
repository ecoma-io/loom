<script lang="ts">
/**
 * LiveRegion — a permanently mounted, visually hidden `aria-live` region and
 * the seam (`useAnnounce()`) that writes into it. Screen readers announce a
 * live region only when its content *changes* after the region exists, so
 * the region renders empty and stays mounted for its whole lifetime: a
 * region added in the same tick as its message is announced unreliably, and
 * a region toggled into existence per message misses its first announcement.
 *
 * The hiding is the clip technique, delegated to VisuallyHidden — never
 * `display: none`, which removes the region from the accessibility tree
 * entirely. No `role="status"`/`role="alert"` is layered on top: the
 * politeness prop *is* the semantics, mapped straight onto `aria-live`, and
 * duplicating it in a role would only let the two disagree. The component
 * owns no strings, so there is nothing to localise and no labels prop.
 */
export type { LiveRegionContext, LiveRegionPoliteness } from "./context";
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
import type { PropType } from "vue";
import VisuallyHidden from "@ecoma-io/loom-visually-hidden";
import { LIVE_REGION_KEY, announce, mountingStandalone, registerWriter } from "./context";
import type { LiveRegionPoliteness } from "./context";

const props = defineProps({
  /** How urgent announcements through this region are — mapped to `aria-live` verbatim. */
  politeness: {
    type: String as PropType<LiveRegionPoliteness>,
    default: "polite",
  },
});

const node = ref<HTMLElement | null>(null);

let unregister: (() => void) | null = null;

function bind(politeness: LiveRegionPoliteness): () => void {
  const el = node.value;
  if (!el) return () => {};
  return registerWriter(
    politeness,
    (message) => {
      // Clear first: assistive tech compares region content, and rewriting
      // identical text in place announces nothing. Re-adding across the next
      // frame makes the repeat a real content addition, which
      // `aria-relevant="additions text"` then reads.
      el.textContent = "";
      requestAnimationFrame(() => {
        el.textContent = message;
      });
    },
    mountingStandalone,
  );
}

onMounted(() => {
  unregister = bind(props.politeness);
});

watch(
  () => props.politeness,
  (politeness) => {
    if (!unregister) return;
    unregister();
    unregister = bind(politeness);
  },
);

onBeforeUnmount(() => {
  unregister?.();
  unregister = null;
});

// Every region provides the seam for the subtree under it, so a component
// sitting beside a region reaches `useAnnounce()` through the tree; with no
// region mounted anywhere, `useAnnounce()` falls back to the standalone pair.
provide(LIVE_REGION_KEY, { announce });
</script>

<template>
  <VisuallyHidden as="div">
    <div ref="node" :aria-live="politeness" aria-relevant="additions text" aria-atomic="true" />
  </VisuallyHidden>
</template>
