<script setup lang="ts">
import { ref } from "vue";
import DateRangePicker, { type DateRange } from "./DateRangePicker.vue";

const report = ref<DateRange>({ start: "2026-03-01", end: "2026-03-31" });
// Unset rather than an empty object, because that is what a filter starts
// with: both halves show their placeholders until someone fills them.
const filter = ref<DateRange>();
// The state between the two clicks, bound deliberately: a start with no end is
// a range the model can hold and the control can show.
const booking = ref<DateRange>({ start: "2026-03-16" });
const sprint = ref<DateRange>({ start: "2026-03-09", end: "2026-03-20" });
const trip = ref<DateRange>({ start: "2026-04-02", end: "2026-04-09" });
const locked = ref<DateRange>({ start: "2026-01-01", end: "2026-01-31" });
// Deliberately past the window below, so the invalid example shows a real
// error rather than a painted one.
const overrun = ref<DateRange>({ start: "2026-03-09", end: "2026-04-06" });
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span id="date-range-picker-demo-report" class="text-xs text-muted-foreground">
        report window — type both ends or pick them
      </span>
      <DateRangePicker v-model="report" aria-labelledby="date-range-picker-demo-report" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-range-picker-demo-filter" class="text-xs text-muted-foreground">
        filter — nothing chosen yet
      </span>
      <DateRangePicker v-model="filter" aria-labelledby="date-range-picker-demo-filter" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-range-picker-demo-booking" class="text-xs text-muted-foreground">
        half made — a start, and no end yet
      </span>
      <DateRangePicker v-model="booking" aria-labelledby="date-range-picker-demo-booking" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-range-picker-demo-sprint" class="text-xs text-muted-foreground">
        inside one sprint — 2 to 27 March only
      </span>
      <DateRangePicker
        v-model="sprint"
        min="2026-03-02"
        max="2026-03-27"
        aria-labelledby="date-range-picker-demo-sprint"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-range-picker-demo-locale" class="text-xs text-muted-foreground">
        the same span, written the way each locale writes it
      </span>
      <DateRangePicker
        v-model="trip"
        locale="en-GB"
        aria-labelledby="date-range-picker-demo-locale"
      />
      <DateRangePicker v-model="trip" locale="vi-VN" aria-label="Trip, Vietnamese" />
      <DateRangePicker v-model="trip" locale="ja-JP" aria-label="Trip, Japanese" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-range-picker-demo-one" class="text-xs text-muted-foreground">
        one month, for a control in a narrow shell
      </span>
      <DateRangePicker v-model="trip" :months="1" aria-labelledby="date-range-picker-demo-one" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-range-picker-demo-locked" class="text-xs text-muted-foreground">disabled</span>
      <DateRangePicker v-model="locked" disabled aria-labelledby="date-range-picker-demo-locked" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-range-picker-demo-invalid" class="text-xs text-muted-foreground">
        invalid — running past the sprint it belongs to
      </span>
      <DateRangePicker
        v-model="overrun"
        max="2026-03-27"
        invalid
        aria-labelledby="date-range-picker-demo-invalid"
      />
    </div>

    <p class="text-xs text-muted-foreground">
      Report:
      <span class="tabular">{{ report.start ?? "—" }} → {{ report.end ?? "—" }}</span>
      — two ISO strings, either one able to be missing.
    </p>
  </div>
</template>
