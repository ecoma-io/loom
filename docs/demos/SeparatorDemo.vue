<script setup lang="ts">
import { Separator } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex flex-col gap-6" style="max-width: 24rem">
    <div class="flex flex-col gap-3">
      <div>
        <p class="text-sm font-medium text-foreground">Profile</p>
        <p class="text-xs text-muted-foreground">Personal details and account settings.</p>
      </div>
      <Separator />
      <div>
        <p class="text-sm font-medium text-foreground">Security</p>
        <p class="text-xs text-muted-foreground">Password, two-factor authentication.</p>
      </div>
    </div>

    <div class="flex h-5 items-center gap-3 text-sm text-muted-foreground">
      <span>Cut</span>
      <Separator orientation="vertical" />
      <span>Copy</span>
      <Separator orientation="vertical" />
      <span>Paste</span>
    </div>
  </div>
</template>
