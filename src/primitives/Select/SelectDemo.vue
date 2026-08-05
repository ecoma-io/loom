<script setup lang="ts">
import { ref } from "vue";
import Select, { type SelectOption } from "./Select.vue";

const languages: SelectOption[] = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語", disabled: true },
];

const qualities: SelectOption[] = [
  { value: "draft", label: "Draft" },
  { value: "preview", label: "Preview" },
  { value: "final", label: "Final" },
];

const language = ref("en");
// The empty string is what Reka reads as "nothing chosen", which is what
// puts the placeholder on the trigger.
const quality = ref("");
const locked = ref("final");
const format = ref("draft");
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span id="select-demo-language" class="text-xs text-muted-foreground">
        language — one row is unavailable
      </span>
      <Select v-model="language" :options="languages" aria-labelledby="select-demo-language" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="select-demo-quality" class="text-xs text-muted-foreground">
        quality — nothing chosen yet
      </span>
      <Select
        v-model="quality"
        :options="qualities"
        placeholder="Choose a quality"
        aria-labelledby="select-demo-quality"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="select-demo-sizes" class="text-xs text-muted-foreground">
        the three heights, on the same scale as a text input
      </span>
      <Select v-model="format" :options="qualities" size="sm" aria-labelledby="select-demo-sizes" />
      <Select v-model="format" :options="qualities" size="md" aria-label="Format, medium" />
      <Select v-model="format" :options="qualities" size="lg" aria-label="Format, large" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="select-demo-locked" class="text-xs text-muted-foreground">disabled</span>
      <Select v-model="locked" :options="qualities" disabled aria-labelledby="select-demo-locked" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="select-demo-invalid" class="text-xs text-muted-foreground">invalid</span>
      <Select
        :options="qualities"
        invalid
        placeholder="Pick one to continue"
        aria-labelledby="select-demo-invalid"
      />
    </div>

    <p class="text-xs text-muted-foreground">
      Chosen language: <span class="tabular">{{ language }}</span> — the value, not the label.
    </p>
  </div>
</template>
