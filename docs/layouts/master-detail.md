# MasterDetail

A master list panel and a detail panel side by side, collapsing to a stacked
layout below tablet width. The pattern behind mail clients, file browsers, and
settings pages: pick from a list, read the content.

<script setup lang="ts">
import { MasterDetail } from "@ecoma-io/loom";
import MasterDetailDemo from "../../src/layouts/MasterDetail/MasterDetailDemo.vue";
import masterDetailDemoSource from "../../src/layouts/MasterDetail/MasterDetailDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { MasterDetail } from "@ecoma-io/loom";
</script>

<template>
  <MasterDetail>
    <template #master>
      <!-- selectable list -->
    </template>
    <!-- detail content -->
  </MasterDetail>
</template>
```

<Demo title="MasterDetail" :source="masterDetailDemoSource">
  <MasterDetailDemo />
</Demo>

## Responsive behavior

- **Below 48rem:** master and detail stack vertically — master on top, detail below
- **48rem and up:** master sits alongside detail; detail fills remaining space
- **Ultrawide:** detail gutters widen (`3xl`), extra viewport goes to whitespace

## API

<!-- @api MasterDetail -->
