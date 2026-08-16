<script setup lang="ts">
import { Plus, SlidersHorizontal } from "@lucide/vue";
import PageHeader from "@ecoma-io/loom-page-header";
import Button from "@ecoma-io/loom-button";
import Surface from "@ecoma-io/loom-surface";

/** Enough rows to scroll under the band — the pinning is the point of the demo. */
const rows = ["Video digest", "Repo cleanup", "Blog roundup", "Comment summary"];
</script>

<template>
  <!-- The scroll container the header pins against. A surface owns its own
       scrolling so the band stays put while only the work area moves. -->
  <div class="h-80 overflow-y-auto rounded-lg border border-border bg-background">
    <PageHeader
      title="Workflows"
      :count="12"
      description="Workflows you built — run, track and approve them when a person is needed."
    >
      <template #actions>
        <Button variant="outline" size="sm">
          <SlidersHorizontal aria-hidden="true" />
          Filter
        </Button>
        <Button size="sm">
          <Plus aria-hidden="true" />
          Create workflow
        </Button>
      </template>
    </PageHeader>
    <div class="flex flex-col gap-2 p-6">
      <Surface v-for="(row, i) in [...rows, ...rows, ...rows]" :key="i" pad="sm">
        <p class="text-body text-foreground">{{ row }}</p>
      </Surface>
    </div>
  </div>
</template>
