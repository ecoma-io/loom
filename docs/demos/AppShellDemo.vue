<script setup lang="ts">
import { AppShell } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Sidebar width steps</div>
      <div class="text-xs text-muted-foreground">
        Each step sets the sidebar panel width — the content area fills the remaining space.
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <div v-for="size in ['sm', 'md', 'lg']" :key="size" class="flex flex-col gap-1">
        <code class="text-xs">sidebarWidth="{{ size }}"</code>
        <div class="h-64 overflow-hidden rounded border border-border">
          <AppShell :sidebar-width="size">
            <template #sidebar>
              <div class="flex h-full items-center justify-center bg-sunken p-4 text-xs">
                Sidebar nav
              </div>
            </template>
            <template #header>
              <div class="bg-card px-4 py-2 text-xs">Header</div>
            </template>
            <p class="text-xs">Content area</p>
          </AppShell>
        </div>
      </div>
    </div>
  </div>
</template>
