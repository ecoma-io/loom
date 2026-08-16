<script setup lang="ts">
import { ref } from "vue";
import ToastStack, { type ToastStackItem } from "@ecoma-io/loom-toast-stack";
import Button from "@ecoma-io/loom-button";
import { optional } from "@ecoma-io/loom-core";

// A miniature host queue — the real one lives host-side (e.g. a host app's
// own toast.ts); the block only renders whatever the host says is visible.
let nextId = 1;
const items = ref<ToastStackItem[]>([]);

function push(variant: ToastStackItem["variant"], title: string, description?: string) {
  items.value = [
    ...items.value,
    { id: nextId++, title, ...optional({ description, variant }) },
  ].slice(-4);
}

function dismiss(id: string | number) {
  items.value = items.value.filter((item) => item.id !== id);
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <Button variant="outline" size="sm" @click="push('success', 'Workflow saved', 'Weekly SEO')">
      Toast success
    </Button>
    <Button variant="outline" size="sm" @click="push('info', 'Member removed', 'Scriptwriting')">
      Toast info
    </Button>
    <Button
      variant="outline"
      size="sm"
      @click="
        push('success', 'Member added', 'John');
        push('info', 'Workflow updated', 'Weekly SEO');
      "
    >
      Two at once — stacked with a gap
    </Button>

    <ToastStack :items="items" @dismiss="dismiss" />
  </div>
</template>
