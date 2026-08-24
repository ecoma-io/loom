<script setup lang="ts">
import { HoverCard } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Basic: a user preview card on hover. -->
    <section>
      <h3 class="text-title mb-1">Basic</h3>
      <p class="text-small mb-3">Hover the link to see a preview card.</p>
      <HoverCard>
        <template #trigger>
          <a href="#" class="text-primary underline">@chelsea</a>
        </template>
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-small font-medium"
            >
              C
            </div>
            <div>
              <p class="text-body font-medium leading-none">Chelsea Arryn</p>
              <p class="text-small text-muted-foreground">@chelsea</p>
            </div>
          </div>
          <p class="text-small text-muted-foreground">
            Full-stack developer. Building tools for the web.
          </p>
        </div>
      </HoverCard>
    </section>

    <!-- Placement: each side, with the default being bottom. -->
    <section>
      <h3 class="text-title mb-1">Placement</h3>
      <p class="text-small mb-3">
        The card anchors to the preferred edge and flips when near a viewport boundary.
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <HoverCard side="top">
          <template #trigger>
            <button type="button" class="text-small underline min-h-6 min-w-6">Top</button>
          </template>
          <p class="text-small">Anchored above the trigger.</p>
        </HoverCard>

        <HoverCard side="bottom">
          <template #trigger>
            <button type="button" class="text-small underline min-h-6 min-w-6">Bottom</button>
          </template>
          <p class="text-small">Anchored below the trigger.</p>
        </HoverCard>

        <HoverCard side="left">
          <template #trigger>
            <button type="button" class="text-small underline min-h-6 min-w-6">Left</button>
          </template>
          <p class="text-small">Anchored to the left of the trigger.</p>
        </HoverCard>

        <HoverCard side="right">
          <template #trigger>
            <button type="button" class="text-small underline min-h-6 min-w-6">Right</button>
          </template>
          <p class="text-small">Anchored to the right of the trigger.</p>
        </HoverCard>
      </div>
    </section>

    <!-- Rich preview: everything in the card is there to be read, nothing to
         be operated. A keyboard user cannot reach inside a hover card (the
         content is stripped of tabbability and the card closes on blur), so
         any action the preview implies lives on the page itself — here, the
         trigger link. Interactive previews belong in a Popover. -->
    <section>
      <h3 class="text-title mb-1">Rich preview</h3>
      <p class="text-small mb-3">
        The card holds read-only detail; anything actionable stays outside it.
      </p>
      <HoverCard :open-delay="100" :close-delay="400">
        <template #trigger>
          <a href="#" class="text-primary underline">View profile</a>
        </template>
        <div class="flex flex-col gap-2">
          <p class="text-small font-medium">Chelsea Arryn</p>
          <p class="text-small text-muted-foreground">Building tools for the web.</p>
          <p class="text-small text-muted-foreground">Joined March 2019 · 214 repositories</p>
        </div>
      </HoverCard>
    </section>
  </div>
</template>
