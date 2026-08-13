<script lang="ts">
/**
 * TitleBar — a desktop app's custom window chrome (a block: composed from
 * primitives, domain-aware, but still presentational). Layout:
 *
 *   [ ⬡ brand ] [ File View Help ]  ····· drag / title ····· [ – ▢ ✕ ]
 *
 * The whole bar is a drag region (`-webkit-app-region: drag`); the interactive
 * clusters (Menubar, WindowControls) opt back out. It owns NO app logic — it
 * re-emits `select` from the menu and the window intents, so the desktop host
 * wires the window bridge around it.
 */
import type { MenubarMenu } from "../../primitives/Menubar/Menubar.vue";
</script>

<script setup lang="ts">
import Menubar from "../../primitives/Menubar/Menubar.vue";
import WindowControls, {
  type WindowControlsLabels,
} from "../../primitives/WindowControls/WindowControls.vue";
import { optional } from "../../lib/props";

withDefaults(
  defineProps<{
    /** The host app's brand name — required: this block has no identity of its own. */
    appName: string;
    /** Centered subtitle — usually the open project / composition. */
    title?: string;
    menus?: MenubarMenu[];
    isMaximized?: boolean;
    /** Passed through to WindowControls (host-side i18n); omit for its English defaults. */
    windowControlsLabels?: WindowControlsLabels;
  }>(),
  {
    title: "",
    menus: () => [],
    isMaximized: false,
  },
);

const emit = defineEmits<{
  (e: "select", command: string): void;
  (e: "minimize"): void;
  (e: "maximize"): void;
  (e: "close"): void;
}>();
</script>

<template>
  <header
    class="flex h-9 select-none items-center border-b border-border bg-card text-foreground"
    style="-webkit-app-region: drag"
  >
    <!-- Brand. Deliberately NOT `no-drag`: nothing here is interactive, and the
         logo corner is the spot people reach for to move a window — opting it
         out of the drag region would take that away and give nothing back.
         Only the clusters that actually take clicks (Menubar, WindowControls)
         opt out. -->
    <div class="flex shrink-0 items-center gap-2 pl-3 pr-1.5">
      <!-- @slot Brand icon — the consumer provides their own mark. Rendered
           inside a 16px coloured tile, `aria-hidden` by the container. -->
      <slot name="brandIcon">
        <span
          class="grid h-4 w-4 place-items-center rounded-[5px] bg-primary text-primary-foreground shadow-sm"
          aria-hidden="true"
        >
          <!-- stroke bumped for optical balance at tiny size -->
          <slot name="brandMark" />
        </span>
      </slot>
      <span class="text-xs font-semibold tracking-tight">{{ appName }}</span>
    </div>

    <!-- Menu bar -->
    <Menubar v-if="menus.length" :menus="menus" @select="emit('select', $event)" />

    <!-- Draggable spacer + centered title -->
    <div class="flex min-w-0 flex-1 items-center justify-center overflow-hidden px-4">
      <span v-if="title" class="truncate text-xs text-muted-foreground">{{ title }}</span>
    </div>

    <!-- Window controls -->
    <WindowControls
      :is-maximized="isMaximized"
      v-bind="optional({ labels: windowControlsLabels })"
      @minimize="emit('minimize')"
      @maximize="emit('maximize')"
      @close="emit('close')"
    />
  </header>
</template>
