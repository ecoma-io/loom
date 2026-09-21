<script setup lang="ts">
import { FormLayout } from "@ecoma-io/loom";
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

            <!-- Real fields and buttons, not painted placeholders: the layout's
                 keyboard contract is Tab walking label to field to submit in
                 document order, which inert boxes cannot witness. Each input is
                 nested in its label and bound by for/id, both carrying the size
                 step because the demo renders this column three times. -->
            <div class="flex flex-col gap-4 py-6">
              <label :for="`fl-${size}-name`" class="flex flex-col gap-1.5 text-xs font-medium">
                Full name
                <input
                  :id="`fl-${size}-name`"
                  type="text"
                  class="h-8 rounded border border-border bg-card px-2 text-sm font-normal"
                />
              </label>
              <label :for="`fl-${size}-email`" class="flex flex-col gap-1.5 text-xs font-medium">
                Email
                <input
                  :id="`fl-${size}-email`"
                  type="email"
                  class="h-8 rounded border border-border bg-card px-2 text-sm font-normal"
                />
              </label>
              <label :for="`fl-${size}-password`" class="flex flex-col gap-1.5 text-xs font-medium">
                Password
                <input
                  :id="`fl-${size}-password`"
                  type="password"
                  class="h-8 rounded border border-border bg-card px-2 text-sm font-normal"
                />
              </label>
            </div>

            <template #actions>
              <div class="flex gap-3">
                <button
                  type="submit"
                  class="h-8 w-20 rounded bg-primary text-xs text-primary-foreground flex items-center justify-center hover:opacity-90"
                >
                  Create
                </button>
                <button
                  type="button"
                  class="h-8 w-20 rounded border border-border text-xs flex items-center justify-center hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </template>
          </FormLayout>
        </div>
      </div>
    </div>
  </div>
</template>
