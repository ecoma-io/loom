<script setup lang="ts">
import { ref } from "vue";
import Toast, { type ToastVariant } from "@ecoma-io/loom-toast";
import Button from "@ecoma-io/loom-button";

const open = ref(false);
const variant = ref<ToastVariant>("success");
const title = ref("Composition saved");
const description = ref("Synced at 14:32.");

function show(v: ToastVariant, t: string, d: string) {
  variant.value = v;
  title.value = t;
  description.value = d;
  // Re-open cleanly so the enter animation replays on each click.
  open.value = false;
  window.setTimeout(() => (open.value = true), 0);
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <Button variant="outline" @click="show('success', 'Composition saved', 'Synced at 14:32.')">
      Success
    </Button>
    <Button
      variant="outline"
      @click="show('destructive', 'Render failed', 'Missing H.264 codec on this machine.')"
    >
      Error
    </Button>
    <Button
      variant="outline"
      @click="show('accent', 'Background task finished', 'Review it before rendering.')"
    >
      Accent
    </Button>

    <Toast
      v-model:open="open"
      :variant="variant"
      :title="title"
      :description="description"
      action-label="Undo"
    />
  </div>
</template>
