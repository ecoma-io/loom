<script setup lang="ts">
import FormLayout from "@ecoma-io/loom-form-layout";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Max-width steps</div>
      <div class="text-xs text-muted-foreground">
        Each step caps the form at a narrower width than general content would use.
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <div v-for="size in ['sm', 'md', 'lg'] as const" :key="size" class="flex flex-col gap-1">
        <code class="text-xs">maxWidth="{{ size }}"</code>
        <div class="h-80 overflow-hidden rounded border border-border">
          <FormLayout :max-width="size">
            <template #header>
              <div class="border-b border-border py-3">
                <p class="text-sm font-medium">Create account</p>
                <p class="text-xs text-muted-foreground">Enter your details below</p>
              </div>
            </template>

            <div class="flex flex-col gap-4 py-6">
              <div class="flex flex-col gap-1.5">
                <div class="text-xs font-medium">Full name</div>
                <div class="h-8 rounded border border-border bg-card" />
              </div>
              <div class="flex flex-col gap-1.5">
                <div class="text-xs font-medium">Email</div>
                <div class="h-8 rounded border border-border bg-card" />
              </div>
              <div class="flex flex-col gap-1.5">
                <div class="text-xs font-medium">Password</div>
                <div class="h-8 rounded border border-border bg-card" />
              </div>
            </div>

            <template #actions>
              <div class="flex gap-3">
                <div
                  class="h-8 w-20 rounded bg-primary text-xs text-primary-foreground flex items-center justify-center"
                >
                  Create
                </div>
                <div
                  class="h-8 w-20 rounded border border-border text-xs flex items-center justify-center"
                >
                  Cancel
                </div>
              </div>
            </template>
          </FormLayout>
        </div>
      </div>
    </div>
  </div>
</template>
