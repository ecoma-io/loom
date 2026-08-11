<script setup lang="ts">
import { ref } from "vue";
import Pagination from "./Pagination.vue";

const invoices = ref(4);
// Deep into a hundred-page set, which is where both ellipses appear at once.
const wide = ref(37);
const feed = ref(1);
const single = ref(1);
const locked = ref(3);
</script>

<template>
  <div class="flex w-full max-w-2xl flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">
        full — numbered pages, first/prev/next/last
      </span>
      <!-- Every instance on this page names itself, because a screen reader
           listing landmarks would otherwise offer seven navigations called
           "Pagination" and no way to tell them apart. -->
      <Pagination v-model:page="invoices" :total="120" label="Invoices" />
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">
        full, deep in a 100-page set — an ellipsis stands either side of the window
      </span>
      <Pagination v-model:page="wide" :total="1000" label="Search results" />
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">
        compact — the position as text, for a toolbar with no room for a row of numbers
      </span>
      <Pagination
        v-model:page="invoices"
        variant="compact"
        :total="120"
        label="Invoices, compact"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">
        simple — prev and next alone; the position is still announced
      </span>
      <Pagination
        v-model:page="feed"
        variant="simple"
        :total="60"
        :items-per-page="20"
        label="Activity feed"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">
        one page — the chrome stays, and every direction is genuinely disabled rather than dimmed
      </span>
      <Pagination v-model:page="single" :total="6" label="Attachments" />
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">
        nothing to page through — the count floors at one page
      </span>
      <Pagination :page="1" :total="0" variant="compact" label="Archived invoices" />
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">
        disabled — while the page behind it is still loading
      </span>
      <Pagination v-model:page="locked" disabled :total="120" label="Invoices, loading" />
    </div>

    <p class="text-xs text-muted-foreground">
      Invoices page: <span class="tabular">{{ invoices }}</span> — the full and compact controls
      above share one model, so moving either moves both.
    </p>
  </div>
</template>
