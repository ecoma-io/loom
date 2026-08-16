<script setup lang="ts">
import { ref } from "vue";
import Popover from "./Popover.vue";
import Button from "../Button/Button.vue";

const filtersOpen = ref(false);
const showDrafts = ref(true);
const showArchived = ref(false);
</script>

<template>
  <div class="flex flex-wrap items-start gap-4">
    <!-- Controlled: the host owns the open state through v-model. -->
    <Popover v-model:open="filtersOpen">
      <template #trigger>
        <Button variant="outline">Filters</Button>
      </template>
      <div class="flex flex-col gap-3">
        <div class="text-sm font-medium">Show</div>
        <label
          for="popover-demo-drafts"
          class="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <input id="popover-demo-drafts" v-model="showDrafts" type="checkbox" />
          Drafts
        </label>
        <label
          for="popover-demo-archived"
          class="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <input id="popover-demo-archived" v-model="showArchived" type="checkbox" />
          Archived
        </label>
      </div>
    </Popover>

    <!-- Uncontrolled: no open prop, so the popover owns its own state. -->
    <Popover side="right">
      <template #trigger>
        <Button variant="subtle" size="icon" aria-label="Help">?</Button>
      </template>
      <div class="max-w-[16rem]">
        <div class="text-sm font-medium">Tip</div>
        <p class="mt-1 text-xs text-muted-foreground">
          A popover carries secondary content the user opts into — unlike a tooltip, which only
          hints, and a dialog, which blocks the screen.
        </p>
      </div>
    </Popover>

    <Popover side="top" align="start">
      <template #trigger>
        <Button variant="ghost">Anchored top, aligned start</Button>
      </template>
      <p class="text-xs text-muted-foreground">
        The side is a preference: near a viewport edge the panel flips to the opposite one.
      </p>
    </Popover>

    <Popover :arrow="false">
      <template #trigger>
        <Button variant="ghost">No notch</Button>
      </template>
      <p class="text-xs text-muted-foreground">
        Drop the pointer notch where the panel reads better flush.
      </p>
    </Popover>
  </div>
</template>
