<script setup lang="ts">
import AvatarGroup, { type AvatarGroupItem } from "./AvatarGroup.vue";

// An inline data-URI rather than a fetched photo, so the loaded-image path is
// demonstrated without the page depending on a network request.
const photo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%23e85d3f'/%3E%3C/svg%3E";

const team: AvatarGroupItem[] = [
  { src: photo, alt: "Ada Lovelace", fallback: "AL" },
  { alt: "Grace Hopper", fallback: "GH" },
  { alt: "Katherine Johnson", fallback: "KJ" },
  { alt: "Ana Duarte", fallback: "AD" },
  { alt: "Mai Trần", fallback: "MT" },
  { alt: "Rosa Peña", fallback: "RP" },
];

// A group may mix default and accent members, which is the case the
// per-member `variant` exists for.
const run: AvatarGroupItem[] = [
  { src: photo, alt: "Ada Lovelace", fallback: "AL" },
  { alt: "Weaver", fallback: "WV", variant: "accent" },
  { alt: "Scheduled task", fallback: "ST", variant: "accent" },
  { alt: "Grace Hopper", fallback: "GH" },
];

const workspaces: AvatarGroupItem[] = [
  { alt: "Loom", fallback: "LO" },
  { alt: "North", fallback: "NO" },
  { alt: "South", fallback: "SO" },
];
</script>

<template>
  <div class="flex max-w-md flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">
        Six members, four faces — the counter carries the rest
      </span>
      <AvatarGroup :avatars="team" label="Assignees" />
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">Every member, when max is past the list</span>
      <AvatarGroup :avatars="team" :max="10" label="Assignees, all shown" />
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">
        One face and a count — the densest the row is allowed to get
      </span>
      <AvatarGroup :avatars="team" :max="1" label="Assignees, collapsed" />
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">
        People and accent members on one row — the rimmed faces are the accent items
      </span>
      <AvatarGroup :avatars="run" label="Working on this run" />
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">Square, for workspaces rather than people</span>
      <AvatarGroup :avatars="workspaces" shape="square" label="Workspaces" />
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">
        The three sizes a row is usually built at — a table cell, a card header, a detail page
      </span>
      <div class="flex flex-col items-start gap-3">
        <AvatarGroup :avatars="team" size="xs" :max="4" label="Assignees, extra small" />
        <AvatarGroup :avatars="team" size="md" :max="4" label="Assignees, medium" />
        <AvatarGroup :avatars="team" size="lg" :max="4" label="Assignees, large" />
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">
        On a card, where the separating ring has to be the card's colour rather than the page's
      </span>
      <div class="rounded-lg border border-border bg-card p-4">
        <AvatarGroup :avatars="team" surface="card" label="Assignees, on a card" />
      </div>
    </div>
  </div>
</template>
