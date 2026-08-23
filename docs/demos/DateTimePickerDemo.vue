<script setup lang="ts">
import { ref } from "vue";
import { DateTimePicker } from "@ecoma-io/loom";

const send = ref("2026-03-14T09:30");
// Unset rather than an empty string, because that is what a form starts with:
// the field shows its segment placeholders until someone fills them.
const reminder = ref<string>();
// Midnight, spelled out, because it is what a day chosen before any time means.
const deadline = ref("2026-03-20T00:00");
const window = ref("2026-03-16T13:00");
const lapse = ref("2026-03-16T13:00:45");
const created = ref("2026-01-01T08:00");
// Deliberately past the window below, so the invalid example is showing a real
// error rather than a painted one — and past it by an hour, not by a day, which
// is the whole reason this control exists.
const overrun = ref("2026-03-16T18:30");
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span id="date-time-picker-demo-send" class="text-xs text-muted-foreground">
        scheduled send — type it, or pick the day and keep the time
      </span>
      <DateTimePicker
        v-model="send"
        :hour-cycle="12"
        aria-labelledby="date-time-picker-demo-send"
      />
      <p class="text-xs text-muted-foreground">
        v-model: <span class="tabular">{{ send || "—" }}</span> — local, with no timezone.
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-time-picker-demo-reminder" class="text-xs text-muted-foreground">
        remind me — nothing chosen yet
      </span>
      <DateTimePicker v-model="reminder" aria-labelledby="date-time-picker-demo-reminder" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-time-picker-demo-deadline" class="text-xs text-muted-foreground">
        a deadline of "Friday" is Friday at 00:00, and says so
      </span>
      <DateTimePicker
        v-model="deadline"
        :hour-cycle="24"
        aria-labelledby="date-time-picker-demo-deadline"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-time-picker-demo-window" class="text-xs text-muted-foreground">
        inside one booking window — 16 March, 09:00 to 17:00
      </span>
      <DateTimePicker
        v-model="window"
        min="2026-03-16T09:00"
        max="2026-03-16T17:00"
        :hour-cycle="24"
        aria-labelledby="date-time-picker-demo-window"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-time-picker-demo-lapse" class="text-xs text-muted-foreground">
        to the second
      </span>
      <DateTimePicker
        v-model="lapse"
        granularity="second"
        :hour-cycle="24"
        aria-labelledby="date-time-picker-demo-lapse"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-time-picker-demo-locale" class="text-xs text-muted-foreground">
        the same instant, written the way each locale writes it
      </span>
      <DateTimePicker
        v-model="window"
        locale="en-GB"
        aria-labelledby="date-time-picker-demo-locale"
      />
      <DateTimePicker v-model="window" locale="vi-VN" aria-label="Booked for, Vietnamese" />
      <DateTimePicker v-model="window" locale="ja-JP" aria-label="Booked for, Japanese" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-time-picker-demo-created" class="text-xs text-muted-foreground">disabled</span>
      <DateTimePicker v-model="created" disabled aria-labelledby="date-time-picker-demo-created" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-time-picker-demo-invalid" class="text-xs text-muted-foreground">
        the right day, an hour past the window — flagged without the host saying so
      </span>
      <DateTimePicker
        v-model="overrun"
        min="2026-03-16T09:00"
        max="2026-03-16T17:00"
        :hour-cycle="24"
        aria-labelledby="date-time-picker-demo-invalid"
      />
    </div>
  </div>
</template>
