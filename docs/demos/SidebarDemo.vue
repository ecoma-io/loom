<script setup lang="ts">
import { Sidebar as SidebarComponent } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Sidebar on the left</div>
      <div class="text-xs text-muted-foreground">
        Content fills the remaining space. Below the content minimum the layout wraps by line: the
        sidebar keeps its declared width, the content takes the full one.
      </div>
    </div>

    <SidebarComponent side-width="14rem">
      <template #side>
        <!-- Real navigation, not lorem panels: a sidebar's keyboard contract is
             the passage through the links it hosts, which a static div can
             never witness. -->
        <nav class="rounded border border-border bg-muted p-3 text-xs" aria-label="Demo sidebar">
          <ul class="flex flex-col gap-1">
            <li>
              <a href="#" class="block rounded px-2 py-1 hover:bg-background">Overview</a>
            </li>
            <li>
              <a href="#" class="block rounded px-2 py-1 hover:bg-background">Projects</a>
            </li>
          </ul>
        </nav>
      </template>
      <div class="rounded border border-border bg-card p-3 text-xs">
        Main content — grows to fill the remaining space.
        <a href="#" class="mt-2 block font-medium text-primary-text hover:underline">
          Release notes
        </a>
      </div>
    </SidebarComponent>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Sidebar on the right</div>
    </div>

    <SidebarComponent side="right" side-width="14rem">
      <template #side>
        <div class="rounded border border-border bg-muted p-3 text-xs">Aside panel</div>
      </template>
      <div class="rounded border border-border bg-card p-3 text-xs">
        Main content — the sidebar sits to the right.
      </div>
    </SidebarComponent>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Narrow sidebar</div>
    </div>

    <SidebarComponent side-width="10rem">
      <template #side>
        <div class="rounded border border-border bg-muted p-3 text-xs">10rem</div>
      </template>
      <div class="rounded border border-border bg-card p-3 text-xs">
        Wider content area when the sidebar is narrower.
      </div>
    </SidebarComponent>
  </div>
</template>
