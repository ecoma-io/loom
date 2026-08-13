<script setup lang="ts">
import FormActions from "./FormActions.vue";
import Button from "../../primitives/Button/Button.vue";
</script>

<template>
  <div class="flex flex-col gap-8">
    <div>
      <p class="mb-2 text-small text-muted-foreground">Between (default)</p>
      <div class="rounded-lg border border-border bg-card p-6">
        <div
          class="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
        >
          Form fields would go here
        </div>
        <FormActions>
          <template #cancel>
            <Button variant="subtle">Cancel</Button>
          </template>
          <template #default>
            <Button variant="primary">Save changes</Button>
          </template>
        </FormActions>
      </div>
    </div>

    <div>
      <p class="mb-2 text-small text-muted-foreground">Right-aligned</p>
      <div class="rounded-lg border border-border bg-card p-6">
        <div
          class="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
        >
          Short form with a single action
        </div>
        <FormActions align="right">
          <Button variant="primary">Continue</Button>
        </FormActions>
      </div>
    </div>

    <div>
      <p class="mb-2 text-small text-muted-foreground">Left-aligned</p>
      <div class="rounded-lg border border-border bg-card p-6">
        <div
          class="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
        >
          Form for a left-aligned layout
        </div>
        <FormActions align="left">
          <Button variant="primary">Submit</Button>
        </FormActions>
      </div>
    </div>
  </div>
</template>
