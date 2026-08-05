# Tabs

Switches between panels or views, with the active panel's content shown
below. Reach for `SegmentedControl` instead when there is no panel underneath
— picking one value of a setting is a different job from switching views,
even though both look like "choose one of several."

<script setup lang="ts">
import { Tabs } from "@ecoma-io/loom";
import TabsDemo from "../../src/primitives/Tabs/TabsDemo.vue";
import tabsDemoSource from "../../src/primitives/Tabs/TabsDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { Tabs, type TabItem } from "@ecoma-io/loom";

const active = ref("overview");
const tabs: TabItem[] = [
  { value: "overview", label: "Overview" },
  { value: "activity", label: "Activity" },
];
</script>

<template>
  <Tabs v-model="active" :tabs="tabs">
    <template #overview>Overview content</template>
    <template #activity>Activity content</template>
  </Tabs>
</template>
```

## Panels through named slots

Each entry in `tabs` needs a slot of the same name carrying that panel's
content. A tab with no matching slot renders an empty panel rather than an
error — worth checking for when a `tabs` array is built dynamically.

<Demo title="Every tab, including a disabled one" :source="tabsDemoSource">
  <TabsDemo />
</Demo>

## Keyboard and roving tabindex

The trigger row is one tab stop, not several: `Tab` moves focus onto the row
once, and the arrow keys move the selection mark within it from there — the
WAI-ARIA `tab`/`tabpanel` pattern, sourced from Reka UI's roving-focus group
rather than hand-rolled here. A tab list where every trigger carries its own
`tabindex="0"` is a common but real defect: it forces `Tab` to walk each
trigger individually, and Tabs never does that. `Home`/`End` and disabled
tabs are handled the same way Reka handles them for any roving-tabindex
group.

## Motion

The underline indicator measures the active trigger's position and width
through Reka's own `--reka-tabs-indicator-*` CSS variables and slides to
match. Panel content plays a small rise-and-fade on activation.

## API

<!-- @api Tabs -->
