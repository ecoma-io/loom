<script setup lang="ts">
import Settings from "./Settings.vue";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">With header</div>
      <div class="text-xs text-muted-foreground">
        A header bar above the nav+content row for a page title or breadcrumbs.
      </div>
    </div>

    <div class="h-80 overflow-hidden rounded border border-border">
      <Settings>
        <template #header>
          <div class="bg-card px-4 py-2 text-xs">Settings header</div>
        </template>
        <template #nav>
          <ul class="flex flex-col gap-1 text-xs">
            <li class="rounded px-2 py-1.5 font-medium">General</li>
            <li class="rounded px-2 py-1.5">Account</li>
            <li class="rounded px-2 py-1.5">Security</li>
            <li class="rounded px-2 py-1.5">Notifications</li>
            <li class="rounded px-2 py-1.5">Billing</li>
          </ul>
        </template>
        <div class="flex flex-col gap-6 py-6">
          <section>
            <h3 class="text-sm font-medium">Profile</h3>
            <p class="text-xs text-muted-foreground">Manage your display name and avatar.</p>
          </section>
          <section>
            <h3 class="text-sm font-medium">Language</h3>
            <p class="text-xs text-muted-foreground">Choose the interface language.</p>
          </section>
          <section>
            <h3 class="text-sm font-medium">Theme</h3>
            <p class="text-xs text-muted-foreground">Switch between light and dark appearance.</p>
          </section>
        </div>
      </Settings>
    </div>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Without header</div>
      <div class="text-xs text-muted-foreground">
        The header slot is optional — omit it when the page title lives outside the layout.
      </div>
    </div>

    <div class="h-80 overflow-hidden rounded border border-border">
      <Settings>
        <template #nav>
          <ul class="flex flex-col gap-1 text-xs">
            <li class="rounded px-2 py-1.5 font-medium">General</li>
            <li class="rounded px-2 py-1.5">Account</li>
            <li class="rounded px-2 py-1.5">Security</li>
          </ul>
        </template>
        <div class="flex flex-col gap-6 py-6">
          <section>
            <h3 class="text-sm font-medium">Profile</h3>
            <p class="text-xs text-muted-foreground">Manage your display name and avatar.</p>
          </section>
          <section>
            <h3 class="text-sm font-medium">Language</h3>
            <p class="text-xs text-muted-foreground">Choose the interface language.</p>
          </section>
        </div>
      </Settings>
    </div>
  </div>
</template>
