<script setup lang="ts">
import { Center as CenterComponent } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Max-width steps</div>
      <div class="text-xs text-muted-foreground">
        Each step caps content at a readable width — extra viewport goes to whitespace.
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <CenterComponent
        v-for="size in ['sm', 'md', 'lg', 'xl', 'prose']"
        :key="size"
        :max-width="size"
      >
        <div class="rounded border border-border bg-card p-3 text-xs">
          <code>maxWidth="{{ size }}"</code> — content constrained to
          <template v-if="size === 'sm'">24rem</template>
          <template v-else-if="size === 'md'">28rem</template>
          <template v-else-if="size === 'lg'">32rem</template>
          <template v-else-if="size === 'xl'">36rem</template>
          <template v-else>~65ch</template>
        </div>
      </CenterComponent>
    </div>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Without gutters</div>
      <div class="text-xs text-muted-foreground">
        Set <code>:gutter="false"</code> when the content manages its own padding.
      </div>
    </div>

    <CenterComponent max-width="md" :gutter="false">
      <div class="rounded border border-border bg-card p-3 text-xs">
        No gutters — content touches the Center's edges.
      </div>
    </CenterComponent>
  </div>
</template>
