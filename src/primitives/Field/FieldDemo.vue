<script setup lang="ts">
import { ref } from "vue";
import Field from "./Field.vue";
import TextField from "../TextField/TextField.vue";
import Textarea from "../Textarea/Textarea.vue";

const name = ref("Ada Lovelace");
const email = ref("not-an-email");
const bio = ref("");
</script>

<template>
  <div class="flex flex-col gap-6" style="max-width: 24rem">
    <Field label="Full name" for="field-demo-name" hint="Shown publicly" required>
      <TextField
        id="field-demo-name"
        v-model="name"
        aria-describedby="field-demo-name-description"
        placeholder="Enter your name"
      />
    </Field>

    <Field label="Email" for="field-demo-email" error="That address is not valid" required>
      <TextField
        id="field-demo-email"
        v-model="email"
        type="email"
        invalid
        aria-describedby="field-demo-email-description"
        placeholder="you@example.com"
      />
    </Field>

    <Field label="Bio" for="field-demo-bio" hint="Up to 200 characters">
      <Textarea
        id="field-demo-bio"
        v-model="bio"
        aria-describedby="field-demo-bio-description"
        placeholder="A short introduction"
      />
    </Field>

    <!-- No `for` passed: falls back to a plain <span>, still readable visually. -->
    <Field label="No control id">
      <TextField aria-label="No control id" placeholder="Not associated with a label" />
    </Field>
  </div>
</template>
