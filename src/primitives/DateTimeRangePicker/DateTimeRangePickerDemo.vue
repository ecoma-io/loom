<script setup lang="ts">
import { ref } from "vue";
import DateTimeRangePicker, { type DateTimeRange } from "./DateTimeRangePicker.vue";

// One day, two times — the commonest thing anyone binds to this control, and
// the reason it is first.
const meeting = ref<DateTimeRange>({ start: "2026-03-16T09:00", end: "2026-03-16T10:00" });
// Unset rather than an empty object, because that is what a form starts with:
// every segment of both halves shows its placeholder until someone fills it.
const query = ref<DateTimeRange>();
// The state between the two clicks, bound deliberately: a start with no end is
// a span the model can hold and the control can show.
const shift = ref<DateTimeRange>({ start: "2026-03-16T22:00" });
const maintenance = ref<DateTimeRange>({ start: "2026-03-14T01:00", end: "2026-03-16T05:30" });
const lapse = ref<DateTimeRange>({ start: "2026-03-16T09:00:15", end: "2026-03-16T09:45:30" });
const trip = ref<DateTimeRange>({ start: "2026-04-02T18:40", end: "2026-04-09T07:15" });
const audit = ref<DateTimeRange>({ start: "2026-01-01T00:00", end: "2026-01-31T23:59" });
// Deliberately an hour past the window below, so the invalid example shows a
// real error rather than a painted one — and past it by an hour on a day the
// calendar allows, which is the whole reason this control derives that state.
const overrun = ref<DateTimeRange>({ start: "2026-03-16T09:00", end: "2026-03-16T18:30" });
// Backwards by an hour inside one day, which is the failure a span of whole
// days cannot even express.
const reversed = ref<DateTimeRange>({ start: "2026-03-16T10:00", end: "2026-03-16T09:00" });
</script>

<template>
  <div class="flex w-full max-w-xl flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span id="date-time-range-picker-demo-meeting" class="text-xs text-muted-foreground">
        a meeting — one day, 09:00 to 10:00
      </span>
      <DateTimeRangePicker
        v-model="meeting"
        :hour-cycle="24"
        aria-labelledby="date-time-range-picker-demo-meeting"
      />
      <p class="text-xs text-muted-foreground">
        v-model:
        <span class="tabular">{{ meeting.start ?? "—" }} → {{ meeting.end ?? "—" }}</span>
        — two local ISO strings, either one able to be missing.
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-time-range-picker-demo-query" class="text-xs text-muted-foreground">
        log query — nothing chosen yet
      </span>
      <DateTimeRangePicker v-model="query" aria-labelledby="date-time-range-picker-demo-query" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-time-range-picker-demo-shift" class="text-xs text-muted-foreground">
        half made — a night shift that has started and has no end yet
      </span>
      <DateTimeRangePicker
        v-model="shift"
        :hour-cycle="24"
        aria-labelledby="date-time-range-picker-demo-shift"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-time-range-picker-demo-maintenance" class="text-xs text-muted-foreground">
        across days — a maintenance window
      </span>
      <DateTimeRangePicker
        v-model="maintenance"
        :hour-cycle="12"
        aria-labelledby="date-time-range-picker-demo-maintenance"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-time-range-picker-demo-lapse" class="text-xs text-muted-foreground">
        to the second
      </span>
      <DateTimeRangePicker
        v-model="lapse"
        granularity="second"
        :hour-cycle="24"
        aria-labelledby="date-time-range-picker-demo-lapse"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-time-range-picker-demo-locale" class="text-xs text-muted-foreground">
        the same span, written the way each locale writes it
      </span>
      <DateTimeRangePicker
        v-model="trip"
        locale="en-GB"
        aria-labelledby="date-time-range-picker-demo-locale"
      />
      <DateTimeRangePicker v-model="trip" locale="vi-VN" aria-label="Trip, Vietnamese" />
      <DateTimeRangePicker v-model="trip" locale="ja-JP" aria-label="Trip, Japanese" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-time-range-picker-demo-one" class="text-xs text-muted-foreground">
        one month, for a control in a narrow shell
      </span>
      <DateTimeRangePicker
        v-model="trip"
        :months="1"
        aria-labelledby="date-time-range-picker-demo-one"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-time-range-picker-demo-audit" class="text-xs text-muted-foreground"
        >disabled</span
      >
      <DateTimeRangePicker
        v-model="audit"
        disabled
        aria-labelledby="date-time-range-picker-demo-audit"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-time-range-picker-demo-overrun" class="text-xs text-muted-foreground">
        the right day, an hour past the window — flagged without the host saying so
      </span>
      <DateTimeRangePicker
        v-model="overrun"
        min="2026-03-16T09:00"
        max="2026-03-16T17:00"
        :hour-cycle="24"
        aria-labelledby="date-time-range-picker-demo-overrun"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="date-time-range-picker-demo-reversed" class="text-xs text-muted-foreground">
        backwards by an hour inside one day — announced, never silently swapped
      </span>
      <DateTimeRangePicker
        v-model="reversed"
        :hour-cycle="24"
        aria-labelledby="date-time-range-picker-demo-reversed"
      />
    </div>
  </div>
</template>
