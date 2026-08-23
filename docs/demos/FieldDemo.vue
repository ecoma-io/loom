<script setup lang="ts">
import { ref } from "vue";
import { Field, Textarea, TextField } from "@ecoma-io/loom";

const name = ref("Ada Lovelace");
const email = ref("not-an-email");
const bio = ref("");
const legacy = ref("");
</script>

<template>
  <div class="flex flex-col gap-6" style="max-width: 24rem">
    <!-- No id, no aria-describedby, no invalid, no required on the control:
         the row publishes all four and the control picks them up. -->
    <Field label="Full name" name="name" hint="Shown publicly" required>
      <TextField v-model="name" placeholder="Enter your name" />
    </Field>

    <Field label="Email" name="email" error="That address is not valid" required>
      <TextField v-model="email" type="email" placeholder="you@example.com" />
    </Field>

    <Field label="Bio" name="bio" hint="Up to 200 characters">
      <!-- The a11y rule lowercases the tag, so `<Textarea>` reads to it as a
           bare native `<textarea>`; it cannot follow a name that arrives
           through a slot from the Field above. Giving this one an id to quiet
           it would undo exactly what the row demonstrates. -->
      <!-- eslint-disable-next-line vuejs-accessibility/form-control-has-label -->
      <Textarea v-model="bio" placeholder="A short introduction" />
    </Field>

    <!-- Read-only, not disabled: the value is on show, still a Tab stop and
         still submitted. -->
    <Field label="Workspace" name="workspace" hint="Set by your administrator" readonly>
      <TextField model-value="Loom Studio" />
    </Field>

    <!-- The row says the whole form is in error; this one control says it is
         individually fine. An explicit prop beats the row in both directions. -->
    <Field label="Postcode" name="postcode" error="Check the address below">
      <TextField model-value="SW1A 1AA" :invalid="false" />
    </Field>

    <!-- `for` is what a control that cannot inject still needs: a bare input, a
         product's own control, a third-party widget. -->
    <Field label="Account number" for="field-demo-legacy" hint="From your last invoice">
      <input
        id="field-demo-legacy"
        v-model="legacy"
        aria-describedby="field-demo-legacy-description"
        class="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        placeholder="00-00-00"
      />
    </Field>
  </div>
</template>
