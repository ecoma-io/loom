<script setup lang="ts">
import Link from "@ecoma-io/loom-link";
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-3">
      <div>
        <div class="text-sm font-medium text-foreground">Variants</div>
        <div class="text-sm text-muted-foreground">
          Choose an emphasis that matches the link's role in its surrounding content.
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-4">
        <Link href="#default">Default link</Link>
        <Link href="#muted" variant="muted">Muted link</Link>
        <Link href="#accent" variant="accent">Accent link</Link>
        <Link href="#subtle" variant="subtle">Subtle link</Link>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <div>
        <div class="text-sm font-medium text-foreground">Without underline</div>
        <div class="text-sm text-muted-foreground">
          Remove the underline when context already makes the navigation affordance clear.
        </div>
      </div>
      <div>
        <Link href="#plain" :underline="false">Plain link</Link>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <div>
        <div class="text-sm font-medium text-foreground">External destination</div>
        <div class="text-sm text-muted-foreground">
          External links open in a protected new tab and carry a visual indicator.
        </div>
      </div>
      <div>
        <Link href="https://example.com" external>Visit example.com</Link>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <div>
        <div class="text-sm font-medium text-foreground">Disabled state</div>
        <div class="text-sm text-muted-foreground">
          An unavailable destination is exposed as disabled and cannot be followed.
        </div>
      </div>
      <div>
        <Link href="#unavailable" disabled>Unavailable link</Link>
      </div>
    </div>
  </div>
</template>
