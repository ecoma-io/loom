<script lang="ts">
/**
 * Collapse — one disclosure: a trigger that shows and hides a single region
 * of content. The generic primitive under Accordion's row-group; the state
 * machinery is Reka's Collapsible, so controlled and uncontrolled use,
 * aria-expanded/aria-controls wiring and rapid open/close are all owned
 * there rather than reimplemented here.
 *
 * Expansion animates on the shared height pair (`--animate-expand` /
 * `--animate-collapse`) keyed to Reka's measured
 * `--reka-collapsible-content-height`; padding lives on an inner wrapper
 * because a padded outer box would pop at both ends of the animation while
 * its height interpolated.
 */
</script>

<script setup lang="ts">
import { ChevronDown } from "@lucide/vue";
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from "reka-ui";
import { cn, optional } from "@ecoma-io/loom-core";
import { useId } from "vue";

withDefaults(
  defineProps<{
    /**
     * Controls visibility; pair with `v-model:open`. Omit it and the collapse
     * owns its own state, seeded by `defaultOpen`.
     */
    open?: boolean | undefined;
    /** The uncontrolled starting state. */
    defaultOpen?: boolean;
    /** Unavailable rather than hidden: the trigger stays put and inert. */
    disabled?: boolean;
  }>(),
  {
    // `undefined` is the uncontrolled state, and only an explicit default
    // keeps it reachable past Vue's Boolean casting.
    open: undefined,
    defaultOpen: false,
    disabled: false,
  },
);

defineEmits<{ "update:open": [value: boolean] }>();

// Reka leaves the trigger's aria-controls pointing at an id its Content only
// registers non-reactively, so a closed-first render ships an empty IDREF.
// Both halves get explicit ids here instead; fallthrough attributes merge
// after Reka's own, which is the same mechanism AlertDialog uses to clear
// its dangling describedby.
const triggerId = useId();
const contentId = useId();
</script>

<template>
  <CollapsibleRoot
    v-slot="{ open: state }"
    v-bind="optional({ open })"
    :default-open="defaultOpen"
    :disabled="disabled"
    :unmount-on-hide="false"
    @update:open="$emit('update:open', $event)"
  >
    <CollapsibleTrigger
      :id="triggerId"
      :aria-controls="contentId"
      :class="
        cn(
          'group flex w-full items-center justify-between gap-3 rounded-md px-4 py-3 text-left text-sm font-medium',
          'transition-colors duration-fast ease-out hover:bg-subtle',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo',
          'disabled:pointer-events-none disabled:bg-transparent disabled:text-muted-foreground',
        )
      "
    >
      <!-- @slot The control's visible face, inside a real `<button>` carrying
           aria-expanded/aria-controls and the canonical focus ring. `open`
           mirrors the real state, controlled or not. -->
      <slot name="trigger" :open="state" />
      <ChevronDown
        class="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-fast ease-out group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </CollapsibleTrigger>
    <!-- Mounted even while closed: the region id in aria-controls has to
         resolve for a screen reader before the first expansion, and a
         persistent element is what lets the collapse animation actually play
         instead of being unmounted mid-frame. Reka conceals the closed
         region with hidden="until-found". -->
    <CollapsibleContent
      data-loom-collapse=""
      class="overflow-hidden data-[state=open]:animate-expand data-[state=closed]:animate-collapse"
    >
      <!-- The animated box carries no padding of its own: interpolating
           height around fixed padding pops at both ends of the film. This
           inner div also carries the id the trigger references: Reka writes
           its own content id after any we pass, so the reference lands here
           where it actually resolves. -->
      <div :id="contentId" class="px-4 pb-4">
        <!-- @slot The region's content. Nested collapses work unchanged —
             each owns its own region. -->
        <slot />
      </div>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
