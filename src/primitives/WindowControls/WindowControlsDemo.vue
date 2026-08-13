<script setup lang="ts">
import { ref } from "vue";
import type { LabelOverrides } from "../../lib/labels";
import WindowControls, {
  type WindowControlsLabels,
  type WindowPlatform,
} from "./WindowControls.vue";

const isMaximized = ref(false);
const last = ref("—");
const platform = ref<WindowPlatform>("windows");

const onClose = () => (last.value = "close");

// A partial bag: the seam resolves key by key, so a host translating three of
// the four names keeps Loom's English for the fourth rather than blanking it.
// `satisfies` keeps the typo check alive once the bag leaves the template.
const french = {
  minimize: "Réduire",
  maximize: "Agrandir",
  restore: "Restaurer",
} satisfies LabelOverrides<WindowControlsLabels>;
</script>

<template>
  <div class="flex flex-col gap-4">
    <fieldset class="flex items-center gap-2 text-xs text-muted-foreground">
      <legend class="sr-only">Platform</legend>
      <label for="wc-platform-windows" class="flex items-center gap-1">
        <input
          id="wc-platform-windows"
          v-model="platform"
          type="radio"
          value="windows"
          class="accent-primary"
        />
        Windows
      </label>
      <label for="wc-platform-macos" class="flex items-center gap-1">
        <input
          id="wc-platform-macos"
          v-model="platform"
          type="radio"
          value="macos"
          class="accent-primary"
        />
        macOS
      </label>
      <label for="wc-platform-linux" class="flex items-center gap-1">
        <input
          id="wc-platform-linux"
          v-model="platform"
          type="radio"
          value="linux"
          class="accent-primary"
        />
        Linux
      </label>
    </fieldset>

    <!-- Shown on a title-bar-like strip so the hover targets read correctly. -->
    <div class="flex h-9 items-center justify-end rounded-lg border border-border bg-card">
      <WindowControls
        :platform="platform"
        :is-maximized="isMaximized"
        @minimize="last = 'minimize'"
        @maximize="((isMaximized = !isMaximized), (last = 'maximize'))"
        @close="onClose"
      />
    </div>
    <!-- The same cluster, named by a host's own vocabulary. Nothing about it
         changes except what a screen reader says. -->
    <div
      v-if="platform !== 'macos'"
      class="flex h-9 items-center justify-end rounded-lg border border-border bg-card"
    >
      <WindowControls
        :labels="french"
        @minimize="last = 'minimize'"
        @maximize="last = 'maximize'"
        @close="onClose"
      />
    </div>
    <p v-else class="text-xs text-muted-foreground">
      On macOS the cluster is hidden — the OS draws its own traffic-light buttons.
    </p>

    <div class="text-xs text-muted-foreground">
      Last intent: <code class="tabular text-foreground">{{ last }}</code> · maximized:
      <code class="tabular text-foreground">{{ isMaximized }}</code>
      <span v-if="platform !== 'macos'" class="ml-2"
        >— hover to see the fill; Close turns destructive red.</span
      >
    </div>
  </div>
</template>
