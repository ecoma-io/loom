<script setup lang="ts">
import { h, ref } from "vue";
import { ToggleGroup, type ToggleGroupItem } from "@ecoma-io/loom";

// Demo glyphs, not library exports: the icon slot accepts any component.
const BoldIcon = () =>
  h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2.5 }, [
    h("path", { d: "M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" }),
  ]);
const ItalicIcon = () =>
  h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2 }, [
    h("path", { d: "M19 5h-9M14 19H5M15 5L9 19" }),
  ]);
const UnderlineIcon = () =>
  h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2 }, [
    h("path", { d: "M7 4v6a5 5 0 0 0 10 0V4M5 20h14" }),
  ]);

const formatItems: ToggleGroupItem[] = [
  { value: "bold", label: "Bold", icon: BoldIcon },
  { value: "italic", label: "Italic", icon: ItalicIcon },
  { value: "underline", label: "Underline", icon: UnderlineIcon, disabled: true },
];

const viewItems: ToggleGroupItem[] = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
  { value: "board", label: "Board" },
];

// Nothing pressed initially, so the e2e that clicks Bold pins a toggle ON —
// the pressed state is the host's to seed, and a pre-pressed Bold would make
// that first click a toggle OFF.
const formats = ref<string[]>([]);

const view = ref<string | null>("list");
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">Formatting (multiple)</span>
      <ToggleGroup v-model="formats" type="multiple" :items="formatItems" aria-label="Formatting" />
    </div>
    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">View (single)</span>
      <ToggleGroup
        v-model="view"
        :items="viewItems"
        aria-label="View"
        size="sm"
        variant="outline"
      />
    </div>
  </div>
</template>
