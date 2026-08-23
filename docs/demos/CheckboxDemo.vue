<script setup lang="ts">
import { ref } from "vue";
import { Checkbox } from "@ecoma-io/loom";

const unchecked = ref(false);
const checked = ref(true);
const indeterminate = ref<boolean | "indeterminate">("indeterminate");
</script>

<template>
  <div class="flex flex-col gap-3" style="max-width: 20rem">
    <Checkbox v-model="unchecked" label="Unchecked" />
    <Checkbox v-model="checked" label="Checked" />
    <Checkbox v-model="indeterminate" label="Indeterminate (parent of a partial group)" />
    <Checkbox v-model="checked" label="Disabled" disabled />
    <Checkbox aria-label="Accessible name only, no visible label" />
  </div>
</template>
