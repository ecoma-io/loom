<script setup lang="ts">
import FormSection from "./FormSection.vue";
</script>

<template>
  <div class="flex flex-col gap-8">
    <FormSection
      legend="Shipping address"
      description="Where the order will be delivered."
      gap="md"
    >
      <div class="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        Street address
      </div>
      <div class="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        City
      </div>
      <div class="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        Postal code
      </div>
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
