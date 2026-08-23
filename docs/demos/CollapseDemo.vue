<script setup lang="ts">
import { ref } from "vue";
import { Collapse } from "@ecoma-io/loom";

const controlled = ref(true);
</script>

<template>
  <div class="flex max-w-xl flex-col gap-4">
    <Collapse>
      <template #trigger>What ships in the box?</template>
      <p>
        The component, its barrel and five artifacts' worth of evidence — unit, browser and
        documentation.
      </p>
    </Collapse>

    <Collapse default-open>
      <template #trigger>Opened by default</template>
      <p>
        <code>defaultOpen</code> seeds the uncontrolled state; the reader still closes it whenever
        they like.
      </p>
    </Collapse>

    <Collapse v-model:open="controlled">
      <template #trigger="{ open }">
        Host-controlled — currently {{ open ? "open" : "closed" }}
      </template>
      <div class="flex items-center gap-3">
        <p class="flex-1">The host owns this one through <code>v-model:open</code>.</p>
      </div>
    </Collapse>

    <Collapse>
      <template #trigger>Nested disclosures work unchanged</template>
      <div class="flex flex-col gap-2">
        <p>The inner collapse owns its own region and state.</p>
        <Collapse>
          <template #trigger>Inner level</template>
          <p class="text-small text-muted-foreground">Deep content lives here.</p>
        </Collapse>
      </div>
    </Collapse>
  </div>
</template>
