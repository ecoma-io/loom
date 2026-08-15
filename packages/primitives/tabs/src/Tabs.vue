<script lang="ts">
export interface TabItem {
  /** Selects this tab, and names the slot that carries its panel. */
  value: string;
  /** The trigger's visible text. */
  label: string;
  /** Skips this tab in pointer, click and roving-tabindex arrow navigation. */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from "reka-ui";
import { optional } from "@ecoma-io/loom-core";

/**
 * Tabs — switch between panels/views, with the active panel's content shown
 * below. For picking one value of a setting with no panel underneath, reach
 * for SegmentedControl instead. Built on Reka UI's Tabs (roving tabindex,
 * arrow-key navigation, a11y sourced from the `tab`/`tabpanel` pattern).
 * Panels are supplied by the host via named slots keyed by each tab's
 * `value` — `<Tabs :tabs="tabs"><template #overview>…</template></Tabs>`.
 */
defineProps<{
  /** The selected tab's value. Omit it and Tabs owns its own selection. */
  modelValue?: string;
  /** The ordered set of tabs; each entry needs a like-named slot for its panel. */
  tabs: TabItem[];
}>();

defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <TabsRoot
    v-bind="optional({ modelValue })"
    orientation="horizontal"
    @update:model-value="$emit('update:modelValue', String($event))"
  >
    <TabsList class="relative inline-flex items-center gap-1 border-b border-border">
      <!-- A drained plate rather than a dim, and the trigger is the awkward
           case that makes the reason clear. Its whole content is the tab's
           label, so `disabled:opacity-50` took that label from 5.25:1 to
           2.05:1 — but the label is *already* `text-muted-foreground` when the
           tab is merely unselected, so simply dropping the alpha would leave an
           unavailable tab painted exactly like an available one. The fill is
           what carries "unavailable" instead: `bg-muted` under the same
           measured text holds 4.67:1, and the plate is visible where a second
           grey would not have been. `rounded-t-sm` is the control radius less
           the list's own padding, and it shapes the focus outline too — the
           plate stops at the list's bottom rule rather than crossing it. -->
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.value"
        :value="tab.value"
        v-bind="optional({ disabled: tab.disabled })"
        class="relative rounded-t-sm px-3 py-2 text-sm text-muted-foreground transition-colors duration-fast ease-out data-[state=active]:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground"
      >
        {{ tab.label }}
      </TabsTrigger>
      <TabsIndicator
        class="absolute bottom-0 left-0 h-0.5 bg-primary"
        style="
          width: var(--reka-tabs-indicator-size);
          transform: translateX(var(--reka-tabs-indicator-position));
          transition:
            width var(--duration-fast) var(--ease-spring),
            transform var(--duration-fast) var(--ease-spring);
        "
      />
    </TabsList>
    <TabsContent
      v-for="tab in tabs"
      :key="tab.value"
      :value="tab.value"
      class="animate-fade-rise pt-4 focus-visible:outline-none"
    >
      <slot :name="tab.value" />
    </TabsContent>
  </TabsRoot>
</template>
