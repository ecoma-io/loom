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

## Responsive behavior

- **Narrow container:** master and detail stack vertically — master on top at its declared width, detail below
- **Wide enough container:** master sits alongside detail; detail fills remaining space
- **Ultrawide:** detail gutters widen (`3xl`), extra viewport goes to whitespace

Where the stack happens is intrinsic, not a fixed breakpoint: the pair gives
up on one line when the container can no longer fit the master panel plus the
detail's half — roughly twice `minMasterWidth` (28rem at the default).

## API

<!-- @api MasterDetail -->
