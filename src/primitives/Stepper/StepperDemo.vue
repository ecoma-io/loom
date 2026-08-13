<script setup lang="ts">
import { ref } from "vue";
import Stepper, { type StepperStep } from "./Stepper.vue";

const checkout: StepperStep[] = [
  { title: "Cart", description: "Two items" },
  { title: "Shipping", description: "Where it goes" },
  { title: "Payment", description: "How it is paid" },
  { title: "Review", description: "One last look" },
];

const onboarding: StepperStep[] = [
  { title: "Workspace", description: "Name it and pick a region" },
  { title: "Invite the team", description: "Anyone with an address" },
  { title: "Connect a service", description: "Optional, and reversible" },
];

const publishing: StepperStep[] = [
  { title: "Draft" },
  { title: "Review" },
  { title: "Approval", description: "Owner permission required", disabled: true },
  { title: "Publish" },
];

const step = ref(2);
const guided = ref(1);
const stage = ref(2);
</script>

<template>
  <div class="flex w-full max-w-2xl flex-col gap-8">
    <div class="flex flex-col gap-3">
      <span id="stepper-demo-checkout" class="text-xs text-muted-foreground">
        checkout — step 1 is done, step 2 is where you are, and any step is reachable
      </span>
      <Stepper v-model="step" :steps="checkout" aria-labelledby="stepper-demo-checkout" />
      <p class="text-xs text-muted-foreground">
        Current step: <span class="tabular">{{ step }}</span> — the number, not the title.
      </p>
    </div>

    <div class="flex flex-col gap-3">
      <span id="stepper-demo-linear" class="text-xs text-muted-foreground">
        linear — the steps past the next one refuse both the pointer and the keyboard
      </span>
      <Stepper v-model="guided" :steps="onboarding" linear aria-labelledby="stepper-demo-linear" />
    </div>

    <div class="flex flex-col gap-3">
      <span id="stepper-demo-vertical" class="text-xs text-muted-foreground">
        vertical — the connector runs down the page and each title sits beside its indicator
      </span>
      <Stepper
        v-model="guided"
        :steps="onboarding"
        orientation="vertical"
        aria-labelledby="stepper-demo-vertical"
      />
    </div>

    <div class="flex flex-col gap-3">
      <span id="stepper-demo-disabled" class="text-xs text-muted-foreground">
        a disabled step — present, greyed, still readable, and skipped by the arrow keys
      </span>
      <Stepper v-model="stage" :steps="publishing" aria-labelledby="stepper-demo-disabled" />
    </div>
  </div>
</template>
