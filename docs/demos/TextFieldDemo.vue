<script setup lang="ts">
import { ref } from "vue";
import { Search } from "@lucide/vue";
import { TextField } from "@ecoma-io/loom";

const name = ref("Ada Lovelace");
const query = ref("");
const email = ref("not-an-email");
const password = ref("correct horse battery staple");
const headline = ref("Weaving interfaces that hold together");
const overrun = ref("A headline written before anyone mentioned the limit");
</script>

<template>
  <div class="flex flex-col gap-6" style="max-width: 24rem">
    <div class="flex flex-col gap-2">
      <span id="tf-demo-name" class="text-xs text-muted-foreground">Full name</span>
      <TextField v-model="name" aria-labelledby="tf-demo-name" placeholder="Enter your name" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="tf-demo-search" class="text-xs text-muted-foreground">Search</span>
      <TextField
        v-model="query"
        type="search"
        aria-labelledby="tf-demo-search"
        placeholder="Search assets, scenes…"
      >
        <template #leading><Search class="h-4 w-4" /></template>
      </TextField>
    </div>

    <!-- The reveal toggle rides in the adornment row, after the input in both
         document and tab order, and it appears only because the type is
         `password`. -->
    <div class="flex flex-col gap-2">
      <span id="tf-demo-password" class="text-xs text-muted-foreground">Password</span>
      <TextField
        v-model="password"
        type="password"
        revealable
        aria-labelledby="tf-demo-password"
        placeholder="Your passphrase"
      />
    </div>

    <!-- `maxLength` alone turns the counter on: a limit the reader is never
         shown is one they can only find by exceeding it. -->
    <div class="flex flex-col gap-2">
      <span id="tf-demo-headline" class="text-xs text-muted-foreground">Headline</span>
      <TextField
        v-model="headline"
        :max-length="48"
        aria-labelledby="tf-demo-headline"
        placeholder="One line about your work"
      />
    </div>

    <!-- Seeded past the limit, which is how a field arrives holding a value
         written before the limit existed. The counter says "over limit" as well
         as turning red. -->
    <div class="flex flex-col gap-2">
      <span id="tf-demo-overrun" class="text-xs text-muted-foreground"
        >Headline (over the limit)</span
      >
      <TextField v-model="overrun" :max-length="48" aria-labelledby="tf-demo-overrun" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="tf-demo-email" class="text-xs text-muted-foreground">Email (error state)</span>
      <TextField
        v-model="email"
        type="email"
        invalid
        aria-labelledby="tf-demo-email"
        placeholder="you@example.com"
      />
    </div>

    <div class="flex items-center gap-3">
      <TextField aria-label="Small" size="sm" placeholder="sm" />
      <TextField aria-label="Medium" size="md" placeholder="md" />
      <TextField aria-label="Large" size="lg" placeholder="lg" />
    </div>

    <!-- Read-only and disabled are different states, and they look different:
         the first is a value on show — still a Tab stop, still submitted — and
         the second is unavailable. -->
    <TextField
      aria-label="Workspace (read-only)"
      name="workspace"
      readonly
      model-value="Loom Studio"
    />

    <TextField aria-label="Disabled" disabled placeholder="Cannot be edited" />
  </div>
</template>
