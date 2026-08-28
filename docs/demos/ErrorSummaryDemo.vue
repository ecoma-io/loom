<script setup lang="ts">
import { ref } from "vue";
import { Button, ErrorSummary, Field, TextField } from "@ecoma-io/loom";
import type { ErrorSummaryEntry } from "@ecoma-io/loom";

const email = ref("");
const errors = ref<ErrorSummaryEntry[]>([]);

function submit() {
  errors.value = [];
  if (!email.value.includes("@")) {
    errors.value.push({
      id: "demo-email",
      fieldLabel: "Email",
      message: "Enter an email address in the standard format, like name@example.com.",
    });
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <ErrorSummary :errors="errors" />
    <form class="flex flex-col items-start gap-3" @submit.prevent="submit">
      <Field for="demo-email" label="Email">
        <TextField v-model="email" tabindex="-1" />
      </Field>
      <Button type="submit" size="sm">Submit</Button>
    </form>
    <p class="text-sm text-muted-foreground">
      Submit with a malformed address: focus jumps to the summary, and each entry returns focus to
      the field that needs attention.
    </p>
  </div>
</template>
