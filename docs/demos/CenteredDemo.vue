<script setup lang="ts">
import Centered from "./Centered.vue";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Max-width steps</div>
      <div class="text-xs text-muted-foreground">
        Each step caps the content column at a readable width — extra viewport goes to whitespace.
        Header and footer always span the full width.
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <div
        v-for="size in ['sm', 'md', 'lg', 'xl', 'prose']"
        :key="size"
        class="flex flex-col gap-1"
      >
        <code class="text-xs">maxWidth="{{ size }}"</code>
        <div class="h-64 overflow-hidden rounded border border-border">
          <Centered :max-width="size">
            <template #header>
              <div class="bg-sunken px-4 py-2 text-xs">Header — full width</div>
            </template>
            <div class="rounded border border-border bg-card p-3 text-xs">
              Content constrained to
              <template v-if="size === 'sm'">24rem</template>
              <template v-else-if="size === 'md'">28rem</template>
              <template v-else-if="size === 'lg'">32rem</template>
              <template v-else-if="size === 'xl'">36rem</template>
              <template v-else>~65ch</template>
            </div>
            <template #footer>
              <div class="bg-sunken px-4 py-2 text-xs">Footer — full width</div>
            </template>
          </Centered>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Without gutters</div>
      <div class="text-xs text-muted-foreground">
        Set <code>:gutter="false"</code> when the content manages its own padding.
      </div>
    </div>

    <div class="h-48 overflow-hidden rounded border border-border">
      <Centered max-width="md" :gutter="false">
        <template #header>
          <div class="bg-sunken px-4 py-2 text-xs">Header</div>
        </template>
        <div class="rounded border border-border bg-card p-3 text-xs">
          No gutters — content touches the column edges.
        </div>
      </Centered>
    </div>
  </div>
</template>
