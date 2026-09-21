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
              <div class="h-full bg-sunken p-4 text-xs">
                <p class="font-medium">Sidebar nav</p>
                <!-- Real links in the sm instance: the shell's keyboard contract
                     is the passage from the sidebar's navigation into the
                     content area, which static panels cannot witness. The md
                     and lg instances keep the plain panel — the width steps are
                     what they demonstrate. -->
                <ul v-if="size === 'sm'" class="mt-2 flex flex-col gap-1">
                  <li>
                    <a href="#" class="block rounded px-2 py-1 hover:bg-background">Overview</a>
                  </li>
                  <li>
                    <a href="#" class="block rounded px-2 py-1 hover:bg-background">Projects</a>
                  </li>
                </ul>
              </div>
            </template>
            <template #header>
              <div class="bg-card px-4 py-2 text-xs">Header</div>
            </template>
            <p class="text-xs">Content area</p>
            <a
              v-if="size === 'sm'"
              href="#"
              class="mt-2 block py-1.5 text-xs font-medium text-primary-text hover:underline"
            >
              Release notes
            </a>
          </AppShell>
        </div>
      </div>
    </div>
  </div>
</template>
