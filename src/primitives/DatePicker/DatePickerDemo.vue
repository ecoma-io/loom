<script setup lang="ts">
import { ref } from "vue";
import DatePicker from "./DatePicker.vue";

const due = ref("2026-03-14");
// Unset rather than an empty string, because that is what a form starts with:
// the field shows its segment placeholders until someone fills them.
const start = ref<string>();
const shipped = ref("2026-03-18");
const sprint = ref("2026-03-16");
const locked = ref("2026-01-01");
// Deliberately outside the sprint window below, so the invalid example is
// showing a real error rather than a painted one.
const overdue = ref("2026-04-02");
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span id="date-picker-demo-due" class="text-xs text-muted-foreground">
        due date — type it or pick it
      </span>
      <DatePicker v-model="due" aria-labelledby="date-picker-demo-due" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-picker-demo-start" class="text-xs text-muted-foreground">
        start date — nothing chosen yet
      </span>
      <DatePicker v-model="start" aria-labelledby="date-picker-demo-start" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-picker-demo-sprint" class="text-xs text-muted-foreground">
        inside one sprint — 2 to 27 March only
      </span>
      <DatePicker
        v-model="sprint"
        min="2026-03-02"
        max="2026-03-27"
        aria-labelledby="date-picker-demo-sprint"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-picker-demo-locale" class="text-xs text-muted-foreground">
        the same day, written the way each locale writes it
      </span>
      <DatePicker v-model="shipped" locale="en-GB" aria-labelledby="date-picker-demo-locale" />
      <DatePicker v-model="shipped" locale="vi-VN" aria-label="Shipped on, Vietnamese" />
      <DatePicker v-model="shipped" locale="ja-JP" aria-label="Shipped on, Japanese" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-picker-demo-locked" class="text-xs text-muted-foreground">disabled</span>
      <DatePicker v-model="locked" disabled aria-labelledby="date-picker-demo-locked" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-picker-demo-invalid" class="text-xs text-muted-foreground">
        invalid — past the sprint it belongs to
      </span>
      <DatePicker
        v-model="overdue"
        max="2026-03-27"
        invalid
        aria-labelledby="date-picker-demo-invalid"
      />
    </div>

    <p class="text-xs text-muted-foreground">
      Due: <span class="tabular">{{ due || "—" }}</span> — an ISO string, not a date object.
    </p>
  </div>
</template>
