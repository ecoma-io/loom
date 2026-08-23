<script setup lang="ts">
import { ref } from "vue";
import { Tabs, type TabItem } from "@ecoma-io/loom";

const active = ref("overview");

const tabs: TabItem[] = [
  { value: "overview", label: "Overview" },
  { value: "activity", label: "Activity" },
  { value: "settings", label: "Settings", disabled: true },
];
</script>

<template>
  <div style="max-width: 24rem">
    <Tabs v-model="active" :tabs="tabs">
      <template #overview>
        <p class="text-sm text-foreground">Scene "Intro" — 3 assets, last updated 2 hours ago.</p>
      </template>
      <template #activity>
        <p class="text-sm text-foreground">Ada Lovelace rendered a preview at 14:32.</p>
      </template>
      <template #settings>
        <p class="text-sm text-muted-foreground">
          Owner permission is required to change settings.
        </p>
      </template>
    </Tabs>
  </div>
</template>
