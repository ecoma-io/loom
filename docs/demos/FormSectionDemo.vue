<script setup lang="ts">
import { FormSection } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex flex-col gap-8">
    <FormSection
      legend="Shipping address"
      description="Where the order will be delivered."
      gap="md"
    >
      <!-- Real fields in the first section: the group's keyboard contract is
           Tab walking its fields in slot order, which painted placeholders
           cannot witness. Each input is nested in its label and bound by
           for/id. The later sections keep the placeholder shape — they
           demonstrate the gap steps, not traversal. -->
      <label for="fs-street" class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Street address
        <input
          id="fs-street"
          type="text"
          class="h-8 w-full rounded-md border border-border bg-card px-3 text-sm font-normal text-foreground"
        />
      </label>
      <label for="fs-city" class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        City
        <input
          id="fs-city"
          type="text"
          class="h-8 w-full rounded-md border border-border bg-card px-3 text-sm font-normal text-foreground"
        />
      </label>
      <label for="fs-postal" class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Postal code
        <input
          id="fs-postal"
          type="text"
          class="h-8 w-full rounded-md border border-border bg-card px-3 text-sm font-normal text-foreground"
        />
      </label>
    </FormSection>

    <FormSection legend="Contact preferences" gap="sm">
      <div class="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        Email notifications
      </div>
      <div class="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        SMS alerts
      </div>
    </FormSection>

    <FormSection
      legend="Payment details"
      description="Your billing information on file."
      hint="All transactions are encrypted."
      gap="lg"
    >
      <div class="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        Card number
      </div>
      <div class="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        Expiry date
      </div>
    </FormSection>
  </div>
</template>
