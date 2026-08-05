<script setup lang="ts">
import { ref } from "vue";
import Textarea from "./Textarea.vue";

const bio = ref("Visual director, 8 years cutting ad films.");
const notes = ref("");
const feedback = ref("missing punctuation");
</script>

<template>
  <div class="flex flex-col gap-6" style="max-width: 24rem">
    <div class="flex flex-col gap-2">
      <span id="ta-demo-bio" class="text-xs text-muted-foreground">Bio</span>
      <Textarea v-model="bio" aria-labelledby="ta-demo-bio" placeholder="Introduce yourself" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="ta-demo-notes" class="text-xs text-muted-foreground">Notes (resize locked)</span>
      <Textarea
        v-model="notes"
        resize="none"
        :rows="5"
        aria-labelledby="ta-demo-notes"
        placeholder="Enter notes…"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="ta-demo-feedback" class="text-xs text-muted-foreground"
        >Feedback (error state)</span
      >
      <Textarea
        v-model="feedback"
        invalid
        aria-labelledby="ta-demo-feedback"
        placeholder="Enter feedback…"
      />
    </div>

    <Textarea aria-label="Disabled" disabled placeholder="Cannot be edited" />
  </div>
</template>
