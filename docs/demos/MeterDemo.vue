<script setup lang="ts">
import { Meter } from "@ecoma-io/loom";
</script>

<template>
  <!-- The `form-control-has-label` rule lowercases the tag name, so `<Meter>`
       reads to it as a native `<meter>`; it cannot follow the name that the
       `label` prop wires through `aria-labelledby` at render time. -->
  <div class="grid gap-8">
    <!-- A plain gauge: visible label that also names it, value read out by the role. -->
    <div class="grid gap-2">
      <!-- eslint-disable-next-line vuejs-accessibility/form-control-has-label -->
      <Meter :value="17" :max="40" label="Seats used" show-value />
    </div>

    <!-- Threshold bands: a low optimum means a high fill reads as critical.
         The band always carries a word and an icon, never colour alone. -->
    <div class="grid gap-2">
      <!-- eslint-disable-next-line vuejs-accessibility/form-control-has-label -->
      <Meter
        :value="82"
        :low="60"
        :high="85"
        :optimum="10"
        label="Disk usage"
        threshold
        show-value
      />
      <!-- eslint-disable-next-line vuejs-accessibility/form-control-has-label -->
      <Meter
        :value="45"
        :low="60"
        :high="85"
        :optimum="10"
        label="Disk usage (healthy)"
        threshold
        show-value
      />
    </div>

    <!-- A host wording the announcement its own way: the seat count as words. -->
    <div class="grid gap-2">
      <!-- eslint-disable-next-line vuejs-accessibility/form-control-has-label -->
      <Meter
        :value="17"
        :max="40"
        label="Seats"
        show-value
        :labels="{ valueText: ({ value, max }) => `${value} of ${max} seats` }"
      />
    </div>
  </div>
</template>
