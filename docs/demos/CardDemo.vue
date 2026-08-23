<script setup lang="ts">
import { Card, Button } from "@ecoma-io/loom";
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <Card title="Usage" description="Render minutes this month">
      <p class="text-2xl font-semibold tabular">6,420</p>
      <p class="mt-1 text-small text-muted-foreground">of 10,000 included</p>
      <template #footer>
        <Button variant="subtle" size="sm">Manage plan</Button>
      </template>
    </Card>

    <!-- Media clips to the card's corners; the sections keep their rhythm under it. -->
    <Card title="Aurora study" description="Gradient placeholder media">
      <template #media>
        <div
          class="h-24 bg-[linear-gradient(120deg,var(--color-primary),var(--color-accent))]"
          aria-hidden="true"
        />
      </template>
      <p class="text-small text-muted-foreground">Captured at dawn, 12 exposures stacked.</p>
    </Card>

    <!-- Whole-card link: one anchor, one action, nothing interactive inside. -->
    <Card href="#card-link" title="Open project" description="Loom — design system">
      <p class="text-small text-muted-foreground">Last opened 2 hours ago.</p>
    </Card>

    <!-- Interactive without navigation: the host owns role, tabindex and handler. -->
    <Card
      interactive
      title="Pickable card"
      description="Hover and press language only — semantics belong to the host."
    >
      <p class="text-small text-muted-foreground">Attach role, tabindex and click yourself.</p>
    </Card>
  </div>
</template>
