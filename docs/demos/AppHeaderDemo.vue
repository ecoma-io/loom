<script setup lang="ts">
import { ref } from "vue";
import { Bell, ChevronDown, Hexagon, Search } from "@lucide/vue";
import {
  AppHeader,
  Avatar,
  Button,
  DropdownMenu,
  Surface,
  TextField,
  type DropdownMenuEntry,
} from "@ecoma-io/loom";

const query = ref("");

/** Enough rows to scroll under the bar — the pinning is the point of the demo. */
const rows = ["Video digest", "Repo cleanup", "Blog roundup", "Comment summary"];

const orgItems: DropdownMenuEntry[] = [
  { label: "Acme Corp", value: "acme-corp" },
  { label: "North Peak Films", value: "north-peak-films" },
  { separator: true },
  { label: "Create workspace", value: "create-workspace" },
];

const notificationItems: DropdownMenuEntry[] = [
  { heading: true, label: "Notifications" },
  { label: 'Task "Repo cleanup" finished', value: "task-done" },
  { label: "2 new members awaiting approval", value: "members-pending" },
];

const userItems: DropdownMenuEntry[] = [
  { label: "Profile", value: "profile" },
  { label: "Settings", value: "settings" },
  { separator: true },
  { label: "Sign out", value: "logout", danger: true },
];
</script>

<template>
  <!-- The scroll container the bar pins against, framed like the top of an
       app shell — same "prove the pin with a scroll" idiom as PageHeader. -->
  <div class="h-80 overflow-y-auto rounded-lg border border-border">
    <AppHeader aria-label="Primary navigation">
      <template #brand>
        <span
          class="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <Hexagon :size="14" :stroke-width="2" />
        </span>
        <span class="text-sm font-semibold tracking-tight text-foreground">Acme</span>
      </template>

      <template #search>
        <TextField v-model="query" type="search" aria-label="Search" placeholder="Search…">
          <template #leading>
            <Search aria-hidden="true" />
          </template>
        </TextField>
      </template>

      <template #leading>
        <DropdownMenu :items="orgItems">
          <template #trigger>
            <Button variant="ghost" size="sm">
              Acme Corp
              <ChevronDown aria-hidden="true" />
            </Button>
          </template>
        </DropdownMenu>
      </template>

      <template #notifications>
        <DropdownMenu :items="notificationItems">
          <template #trigger>
            <Button variant="ghost" size="icon-sm" aria-label="Notifications">
              <Bell aria-hidden="true" />
            </Button>
          </template>
        </DropdownMenu>
      </template>

      <template #userMenu>
        <DropdownMenu :items="userItems">
          <template #trigger>
            <!-- The initials are this trigger's visible text, so the name has
                 to carry them: WCAG 2.5.3 (Label in Name) — a voice user
                 saying "TT" must land on the same button one saying
                 "Account" does. Measured 2026-08-26: `label-content-name-
                 mismatch` fired here until the initials joined the name. -->
            <Button
              variant="ghost"
              size="icon-sm"
              class="rounded-full p-0"
              aria-label="Account (TT)"
            >
              <Avatar size="sm" fallback="TT" />
            </Button>
          </template>
        </DropdownMenu>
      </template>
    </AppHeader>
    <div class="flex flex-col gap-2 p-6">
      <Surface v-for="(row, i) in [...rows, ...rows, ...rows]" :key="i" pad="sm">
        <p class="text-body text-foreground">{{ row }}</p>
      </Surface>
    </div>
  </div>
</template>
