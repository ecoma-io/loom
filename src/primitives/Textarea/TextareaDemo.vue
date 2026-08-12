<script setup lang="ts">
import { ref } from "vue";
import Textarea from "./Textarea.vue";

const bio = ref("Visual director, 8 years cutting ad films.");
const notes = ref("");
const feedback = ref("missing punctuation");
const summary = ref("A short account of what changed and why.");
const overrun = ref(
  "A short account of what changed and why, written well past the room the form allowed for it.",
);
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

    <!-- The counter sits below the box rather than inside it: a textarea's
         value fills its box, and the bottom-right corner belongs to the resize
         grabber. Dragging the field taller moves the counter down with it. -->
    <div class="flex flex-col gap-2">
      <span id="ta-demo-summary" class="text-xs text-muted-foreground"
        >Summary (80 characters)</span
      >
      <Textarea v-model="summary" :max-length="80" :rows="2" aria-labelledby="ta-demo-summary" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="ta-demo-overrun" class="text-xs text-muted-foreground">
        Summary, past its limit — the counter says so in words as well as in red
      </span>
      <Textarea v-model="overrun" :max-length="80" :rows="2" aria-labelledby="ta-demo-overrun" />
    </div>

    <!-- Read-only and disabled are different states, and they look different on
         three channels: the first is a value on show — the subtle fill, the
         text at full strength, still a Tab stop and still submitted — and the
         second is unavailable, on the deeper fill with the hairline receding
         behind it. -->
    <Textarea
      aria-label="Filed summary (read-only)"
      name="summary"
      readonly
      model-value="Submitted 17 January. Locked once the return was filed."
    />

    <Textarea aria-label="Disabled" disabled placeholder="Cannot be edited" />
  </div>
</template>
