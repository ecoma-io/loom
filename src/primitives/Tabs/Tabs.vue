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
import { optional } from "../../lib/props";

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
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.value"
        :value="tab.value"
        v-bind="optional({ disabled: tab.disabled })"
        class="relative px-3 py-2 text-sm text-muted-foreground transition-colors duration-fast ease-out data-[state=active]:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
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
