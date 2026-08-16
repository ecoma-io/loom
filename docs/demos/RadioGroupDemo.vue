<script setup lang="ts">
import { ref } from "vue";
import RadioGroup, { type RadioOption } from "@ecoma-io/loom-radio-group";

const options: RadioOption[] = [
  { value: "free", label: "Free", description: "One project, watermarked exports." },
  { value: "pro", label: "Pro", description: "Unlimited projects, no watermark." },
  { value: "enterprise", label: "Enterprise", description: "SSO, priority support." },
  { value: "legacy", label: "Legacy plan (discontinued)", disabled: true },
];

const plan = ref("pro");
</script>

<template>
  <div style="max-width: 24rem">
    <RadioGroup v-model="plan" :options="options" name="plan" />
  </div>
</template>
