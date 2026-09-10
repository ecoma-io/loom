---
composition: "A section navigation beside an independently scrolling content area, with an optional header above both."
---

# Settings

A settings/preferences page layout: a navigation sidebar for sections and a
content area that scrolls independently. The nav collapses intrinsically below
tablet width, stacking above the content so mobile users reach both without
scrolling past one to find the other.

<script setup lang="ts">
import { Settings } from "@ecoma-io/loom";
import SettingsDemo from "../demos/SettingsDemo.vue";
import settingsDemoSource from "../demos/SettingsDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Settings } from "@ecoma-io/loom";
</script>

<template>
  <Settings>
    <template #nav>
      <!-- section navigation -->
    </template>
    <template #header>
      <!-- optional page header -->
    </template>
    <!-- content sections -->
  </Settings>
</template>
```

<Demo title="Settings" :source="settingsDemoSource">
  <SettingsDemo />
</Demo>

## Nav width

The `navWidth` prop sets the navigation panel's preferred width. The panel
does not shrink — when the container is too narrow for both panels, the nav
wraps onto its own line at this width above the content instead of
compressing.

## Obligations

<!-- @layout-obligations Settings -->

## API

<!-- @api Settings -->
