<script setup lang="ts">
import { ref } from "vue";
import { FilePlus, Pencil, Share2, Trash2, Upload, UserPlus } from "@lucide/vue";
import SpeedDial, { type SpeedDialAction } from "@ecoma-io/loom-speed-dial";
import Button from "@ecoma-io/loom-button";

const chosen = ref("—");

const create: SpeedDialAction[] = [
  { label: "New document", icon: FilePlus },
  { label: "Invite a teammate", icon: UserPlus },
  { label: "Upload a file", icon: Upload },
];

const scene: SpeedDialAction[] = [
  { label: "Share", icon: Share2 },
  { label: "Rename", icon: Pencil },
  // Present but out of reach here, which is the honest way to show that the
  // action exists and this scene cannot take it.
  { label: "Delete", icon: Trash2, disabled: true },
];

// A host driving the fan itself, so the page can report the state it is in.
const sceneOpen = ref(false);

function onSelect(action: SpeedDialAction, index: number) {
  chosen.value = `${action.label} (index ${String(index)})`;
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-8">
    <div class="flex flex-col gap-2">
      <p class="text-xs font-medium text-muted-foreground">Upward, the default</p>
      <SpeedDial :actions="create" label="Create" @select="onSelect" />
    </div>

    <div class="flex flex-col gap-2">
      <p class="text-xs font-medium text-muted-foreground">
        Rightward — the arrow keys follow the axis
      </p>
      <SpeedDial :actions="create" label="Create, opening rightward" direction="right" />
    </div>

    <div class="flex flex-col gap-2">
      <p class="text-xs font-medium text-muted-foreground">
        Host-driven, with its own glyph and one action out of reach
      </p>
      <div class="flex items-center gap-4">
        <SpeedDial
          v-model:open="sceneOpen"
          :actions="scene"
          label="Scene actions"
          direction="right"
          @select="onSelect"
        >
          <Pencil class="h-6 w-6" />
        </SpeedDial>
        <Button variant="outline" size="sm" @click="sceneOpen = !sceneOpen">
          {{ sceneOpen ? "Close" : "Open" }} the scene fan
        </Button>
      </div>
    </div>

    <p class="text-xs text-muted-foreground">Last action: {{ chosen }}</p>
  </div>
</template>
