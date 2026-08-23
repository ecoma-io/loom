<script setup lang="ts">
import { Frame as FrameComponent } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Named ratios</div>
      <div class="text-xs text-muted-foreground">Common aspect ratios with readable names.</div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <div class="mb-1 text-xs text-muted-foreground">16:9</div>
        <FrameComponent ratio="16:9">
          <div
            class="flex h-full items-center justify-center rounded border border-border bg-muted text-xs"
          >
            16:9
          </div>
        </FrameComponent>
      </div>

      <div>
        <div class="mb-1 text-xs text-muted-foreground">4:3</div>
        <FrameComponent ratio="4:3">
          <div
            class="flex h-full items-center justify-center rounded border border-border bg-muted text-xs"
          >
            4:3
          </div>
        </FrameComponent>
      </div>

      <div>
        <div class="mb-1 text-xs text-muted-foreground">1:1</div>
        <FrameComponent ratio="1:1">
          <div
            class="flex h-full items-center justify-center rounded border border-border bg-muted text-xs"
          >
            1:1
          </div>
        </FrameComponent>
      </div>

      <div>
        <div class="mb-1 text-xs text-muted-foreground">3:4</div>
        <FrameComponent ratio="3:4">
          <div
            class="flex h-full items-center justify-center rounded border border-border bg-muted text-xs"
          >
            3:4
          </div>
        </FrameComponent>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Custom ratio</div>
      <div class="text-xs text-muted-foreground">
        Any valid CSS <code>aspect-ratio</code> value, e.g. <code>"21 / 9"</code>.
      </div>
    </div>

    <FrameComponent ratio="21 / 9">
      <div
        class="flex h-full items-center justify-center rounded border border-border bg-muted text-xs"
      >
        21:9 ultrawide
      </div>
    </FrameComponent>
  </div>
</template>
