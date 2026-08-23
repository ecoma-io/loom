<script setup lang="ts">
import { ref } from "vue";
import { TimePicker } from "@ecoma-io/loom";

const standup = ref("09:30");
const shift = ref("22:00");
// Unset rather than an empty string, because that is what a form starts with:
// the field shows its segment placeholders until someone fills them.
const reminder = ref<string>();
const lapse = ref("00:01:30");
const doorsOpen = ref("19:00");
const closed = ref("17:00");
// Deliberately outside the bookable hours the label names, so the invalid
// example is showing a real error rather than a painted one.
const overrun = ref("23:15");
// Midnight and noon, kept side by side: the two values a 12-hour field is
// easiest to get wrong, and the pair a reader can check at a glance.
const midnight = ref("00:00");
const noon = ref("12:00");
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span id="time-picker-demo-standup" class="text-xs text-muted-foreground">
        stand-up — twelve-hour display
      </span>
      <TimePicker v-model="standup" :hour-cycle="12" aria-labelledby="time-picker-demo-standup" />
      <p class="text-xs text-muted-foreground">
        v-model: <span class="tabular">{{ standup }}</span> — always 24-hour.
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <span id="time-picker-demo-shift" class="text-xs text-muted-foreground">
        shift start — twenty-four-hour display
      </span>
      <TimePicker v-model="shift" :hour-cycle="24" aria-labelledby="time-picker-demo-shift" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="time-picker-demo-midnight" class="text-xs text-muted-foreground">
        midnight and noon — 00:00 is 12 AM, 12:00 is 12 PM
      </span>
      <TimePicker v-model="midnight" :hour-cycle="12" aria-labelledby="time-picker-demo-midnight" />
      <TimePicker v-model="noon" :hour-cycle="12" aria-label="Noon" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="time-picker-demo-reminder" class="text-xs text-muted-foreground">
        reminder — nothing chosen yet
      </span>
      <TimePicker v-model="reminder" aria-labelledby="time-picker-demo-reminder" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="time-picker-demo-lapse" class="text-xs text-muted-foreground"> to the second </span>
      <TimePicker
        v-model="lapse"
        granularity="second"
        :hour-cycle="24"
        aria-labelledby="time-picker-demo-lapse"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="time-picker-demo-doors" class="text-xs text-muted-foreground">
        on the hour, and only the hour
      </span>
      <TimePicker
        v-model="doorsOpen"
        granularity="hour"
        :hour-cycle="12"
        aria-labelledby="time-picker-demo-doors"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="time-picker-demo-closed" class="text-xs text-muted-foreground">disabled</span>
      <TimePicker v-model="closed" disabled aria-labelledby="time-picker-demo-closed" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="time-picker-demo-invalid" class="text-xs text-muted-foreground">
        invalid — outside the hours this room is bookable
      </span>
      <TimePicker v-model="overrun" invalid aria-labelledby="time-picker-demo-invalid" />
    </div>
  </div>
</template>
