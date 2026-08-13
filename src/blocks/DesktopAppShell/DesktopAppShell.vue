<script lang="ts">
/**
 * DesktopAppShell — the ready-made layout a desktop (Electron/Tauri) app
 * reaches for. It composes TitleBar, a sidebar, and a content area into a
 * single root so the host never hand-tunes the flex relationship between
 * window chrome and application body.
 *
 * The sidebar sits on the sunken plane (`bg-sunken`) and collapses below
 * tablet width, stacking above the content area instead of sitting beside it.
 * That mirrors SidebarNav's own intrinsic collapse: the nav drops to icon-only
 * at narrow widths, and the shell narrows its rail to match. Below tablet the
 * rail needs no width at all — the nav items stack vertically over the
 * content, which is the same thing a mobile user sees in any desktop app that
 * has a sidebar.
 *
 * Content sits on `bg-background` with gutters that step open at `sm` and
 * `3xl`, matching the same step scale AppHeader uses — a 16px gutter beside a
 * 1920px canvas reads as an accident.
 *
 * Every TitleBar event is re-emitted so the host wires its own window bridge;
 * the shell itself owns no IPC.
 */
import type { MenubarMenu } from "../../primitives/Menubar/Menubar.vue";
</script>

<script setup lang="ts">
import TitleBar from "../TitleBar/TitleBar.vue";
import { type WindowControlsLabels } from "../../primitives/WindowControls/WindowControls.vue";
import { optional } from "../../lib/props";

withDefaults(
  defineProps<{
    /** The host app's brand name — passed through to TitleBar, which has no identity of its own. */
    appName: string;
    /** Centered subtitle — usually the open project / composition. Passed through to TitleBar. */
    title?: string;
    /** Top-level menus for the TitleBar's Menubar. Omit for a menu-less app. */
    menus?: MenubarMenu[];
    /** Whether the window is maximized — controls the TitleBar's middle window-control glyph. */
    isMaximized?: boolean;
    /** Names for the window-control buttons, as any subset of `WindowControlsLabels`. */
    windowControlsLabels?: WindowControlsLabels;
    /** Sidebar rail width. Maps to 12/16/20 rem — the three widths SidebarNav's label/labelless
     *  modes were measured against. */
    sidebarWidth?: "sm" | "md" | "lg";
    /** Accessible name for the sidebar's `<aside>` landmark. */
    sidebarAriaLabel?: string;
  }>(),
  {
    title: "",
    menus: () => [],
    isMaximized: false,
    sidebarWidth: "md",
    sidebarAriaLabel: "Sidebar",
  },
);

const emit = defineEmits<{
  (e: "select", command: string): void;
  (e: "minimize"): void;
  (e: "maximize"): void;
  (e: "close"): void;
}>();

const SIDEBAR_WIDTH = {
  sm: "12rem",
  md: "16rem",
  lg: "20rem",
} as const;
</script>

<template>
  <div class="flex h-dvh flex-col">
    <TitleBar
      :app-name="appName"
      :title="title"
      :menus="menus"
      :is-maximized="isMaximized"
      v-bind="optional({ windowControlsLabels })"
      @select="emit('select', $event)"
      @minimize="emit('minimize')"
      @maximize="emit('maximize')"
      @close="emit('close')"
    >
      <template v-if="$slots.brandIcon" #brandIcon>
        <!-- @slot Brand icon — forwarded to TitleBar's own brandIcon slot. -->
        <slot name="brandIcon" />
      </template>
      <template v-if="$slots.brandMark" #brandMark>
        <!-- @slot Brand mark — forwarded to TitleBar's own brandMark slot. -->
        <slot name="brandMark" />
      </template>
    </TitleBar>

    <div class="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside
        :aria-label="sidebarAriaLabel"
        class="shrink-1 bg-sunken md:shrink-0 md:grow-0"
        :style="{ flexBasis: SIDEBAR_WIDTH[sidebarWidth] }"
      >
        <!-- @slot Sidebar navigation content — typically SidebarNav. Sits on the sunken plane. -->
        <slot name="sidebar" />
      </aside>

      <main class="min-w-1/2 grow-[999] overflow-y-auto bg-background px-4 sm:px-6 3xl:px-8">
        <!-- @slot Main content area. Sits on the background plane with stepped gutters. -->
        <slot />
      </main>
    </div>
  </div>
</template>
