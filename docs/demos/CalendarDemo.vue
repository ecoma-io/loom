<script setup lang="ts">
import { ref } from "vue";
import { Calendar } from "@ecoma-io/loom";

// Unset rather than an empty string, because that is what a surface starts
// with: nothing chosen, today marked, and the current month on show.
const chosen = ref<string>();

// An ISO date offset from today, built from local parts so it reads the same
// at either side of midnight. The bounded fence and its chosen day are
// computed rather than pinned: constants age into a grid where every day is
// struck through.
function iso(daysFromToday: number): string {
  const day = new Date();
  day.setDate(day.getDate() + daysFromToday);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

const sprint = ref(iso(0));
const min = iso(-7);
const max = iso(7);
const localized = ref(iso(0));
</script>

<template>
  <div class="flex flex-wrap items-start gap-8">
    <div class="flex flex-col gap-2">
      <span id="calendar-demo-chosen" class="text-xs text-muted-foreground">
        always visible — click a day to choose it, again to clear it
      </span>
      <Calendar v-model="chosen" aria-labelledby="calendar-demo-chosen" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="calendar-demo-bounded" class="text-xs text-muted-foreground">
        fenced to a week behind and a week ahead of today — outside is struck through
      </span>
      <Calendar v-model="sprint" :min="min" :max="max" aria-labelledby="calendar-demo-bounded" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="calendar-demo-vi" class="text-xs text-muted-foreground">
        the same surface, Vietnamese weeks and months
      </span>
      <Calendar v-model="localized" locale="vi-VN" aria-labelledby="calendar-demo-vi" />
    </div>
  </div>
</template>
