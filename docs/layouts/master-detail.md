---
composition: "A master list panel beside a detail pane that fills the rest; pick from the list, read the detail, stack when narrow."
---

# MasterDetail

A master list panel and a detail panel side by side, collapsing to a stacked
layout below tablet width. The pattern behind mail clients, file browsers, and
settings pages: pick from a list, read the content.

<script setup lang="ts">
import { MasterDetail } from "@ecoma-io/loom";
import MasterDetailDemo from "../demos/MasterDetailDemo.vue";
import masterDetailDemoSource from "../demos/MasterDetailDemo.vue?raw";
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

## Master width

The `minMasterWidth` prop sets the master panel's minimum. Where the stack
happens is intrinsic, not a fixed breakpoint: the pair gives up on one line
when the container can no longer fit the master panel plus the detail's half
— roughly twice `minMasterWidth` (28rem at the default).

## Obligations

<!-- @layout-obligations MasterDetail -->

## API

<!-- @api MasterDetail -->
