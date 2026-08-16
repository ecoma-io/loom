<script setup lang="ts">
import { ref } from "vue";
import Fieldset from "@ecoma-io/loom-fieldset";
import Field from "@ecoma-io/loom-field";
import Checkbox from "@ecoma-io/loom-checkbox";
import TextField from "@ecoma-io/loom-text-field";

const street = ref("12 Oak Lane");
const city = ref("");
const digest = ref(true);
const mentions = ref(false);
</script>

<template>
  <div class="flex w-full flex-col gap-8" style="max-width: 26rem">
    <Fieldset
      id="fieldset-demo-address"
      legend="Shipping address"
      hint="We only use this for delivery"
      required
    >
      <Field label="Street" name="street">
        <TextField v-model="street" placeholder="12 Oak Lane" />
      </Field>
      <Field label="City" name="city">
        <TextField v-model="city" placeholder="Hanoi" />
      </Field>
    </Fieldset>

    <!-- The group's error, not any one row's: the pair is incomplete, and no
         single control is the one at fault. It stays the group's — no control
         inside is marked invalid, because none of them individually is. -->
    <Fieldset
      id="fieldset-demo-billing"
      legend="Billing address"
      error="Enter both a street and a city, or copy the shipping address"
      required
    >
      <Field label="Street" name="billing-street">
        <TextField placeholder="12 Oak Lane" />
      </Field>
      <Field label="City" name="billing-city">
        <TextField placeholder="Hanoi" />
      </Field>
    </Fieldset>

    <!-- Read-only, not disabled: every value is on show, every field is still a
         Tab stop and still submitted. This is the one state the native
         `<fieldset>` cannot carry, so the group hands it down. -->
    <Fieldset
      id="fieldset-demo-filed"
      legend="Filed return"
      hint="Locked once the return was submitted"
      readonly
    >
      <Field label="Reference" name="filed-reference">
        <TextField model-value="LM-2024-0117" />
      </Field>
      <Field label="Filed by" name="filed-by">
        <TextField model-value="Ada Lovelace" />
      </Field>
    </Fieldset>

    <!-- Nothing below is disabled in its own right. The group is, and every
         control inside inherits it from the native <fieldset>. -->
    <Fieldset
      id="fieldset-demo-notifications"
      legend="Email notifications"
      hint="Available once a workspace owner enables email delivery"
      disabled
    >
      <Checkbox v-model="digest" label="Weekly digest" />
      <Checkbox v-model="mentions" label="When someone mentions me" />
      <Field label="Send to" name="notify-to">
        <TextField type="email" placeholder="you@example.com" />
      </Field>
    </Fieldset>
  </div>
</template>
