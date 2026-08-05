<script lang="ts">
/**
 * Menubar — the classic desktop-app menu strip (File · View · Help …).
 *
 * Data-driven: pass a `menus` array; the component owns open/close, hover-to-switch,
 * keyboard nav and click-outside. Selecting an item emits `select` with its `command`
 * id — the host maps that id to an action (keeps the primitive free of app logic).
 *
 * A11y: WAI-ARIA menubar semantics (roles + aria-expanded/haspopup) with Escape,
 * Arrow, Home/End and Enter/Space handling. When richer focus-trapping is needed we
 * can later delegate to Reka UI without changing this call-site contract.
 */
export interface MenubarItem {
  /** Visible label. */
  label: string;
  /** Command id emitted on select. Omit for a non-actionable row. */
  command?: string;
  /** Right-aligned accelerator hint, e.g. "Ctrl+S". */
  shortcut?: string;
  /** Render a divider instead of an item (label ignored). */
  separator?: boolean;
  disabled?: boolean;
}

export interface MenubarMenu {
  id: string;
  label: string;
  items: MenubarItem[];
}
</script>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick } from "vue";
import { listStaggerDelay } from "../../lib/motion";

const props = defineProps<{
  /** The top-level menus, left to right, each carrying its own item list. */
  menus: MenubarMenu[];
}>();
const emit = defineEmits<{ (e: "select", command: string): void }>();

const openId = ref<string | null>(null);
const activeIndex = ref(-1); // highlighted item within the open menu

const openMenu = (menu: MenubarMenu | undefined) => menu?.items ?? [];
const firstEnabled = (items: MenubarItem[], from = 0, dir = 1): number => {
  for (let i = from; i >= 0 && i < items.length; i += dir) {
    const item = items[i];
    if (item && !item.separator && !item.disabled) return i;
  }
  return -1;
};

function toggle(id: string): void {
  openId.value = openId.value === id ? null : id;
  activeIndex.value = -1;
}
function hover(id: string): void {
  if (openId.value !== null && openId.value !== id) {
    openId.value = id;
    activeIndex.value = -1;
  }
}
function choose(item: MenubarItem): void {
  if (item.separator || item.disabled) return;
  close();
  if (item.command) emit("select", item.command);
}
function close(): void {
  openId.value = null;
  activeIndex.value = -1;
}

function moveMenu(dir: 1 | -1): void {
  const ids = props.menus.map((m) => m.id);
  const cur = openId.value ? ids.indexOf(openId.value) : 0;
  const next = (cur + dir + ids.length) % ids.length;
  openId.value = ids[next] ?? null;
  activeIndex.value = -1;
}

async function onTriggerKeydown(e: KeyboardEvent, menu: MenubarMenu): Promise<void> {
  switch (e.key) {
    case "ArrowDown":
    case "Enter":
    case " ":
      e.preventDefault();
      openId.value = menu.id;
      await nextTick();
      activeIndex.value = firstEnabled(menu.items);
      break;
    case "ArrowRight":
      e.preventDefault();
      if (openId.value) moveMenu(1);
      break;
    case "ArrowLeft":
      e.preventDefault();
      if (openId.value) moveMenu(-1);
      break;
    case "Escape":
      close();
      break;
  }
}

function onMenuKeydown(e: KeyboardEvent, menu: MenubarMenu): void {
  const items = menu.items;
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      activeIndex.value = firstEnabled(items, Math.max(activeIndex.value, -1) + 1, 1);
      if (activeIndex.value === -1) activeIndex.value = firstEnabled(items, 0, 1);
      break;
    case "ArrowUp":
      e.preventDefault();
      activeIndex.value =
        activeIndex.value <= 0
          ? firstEnabled(items, items.length - 1, -1)
          : firstEnabled(items, activeIndex.value - 1, -1);
      break;
    case "Home":
      e.preventDefault();
      activeIndex.value = firstEnabled(items, 0, 1);
      break;
    case "End":
      e.preventDefault();
      activeIndex.value = firstEnabled(items, items.length - 1, -1);
      break;
    case "ArrowRight":
      e.preventDefault();
      moveMenu(1);
      break;
    case "ArrowLeft":
      e.preventDefault();
      moveMenu(-1);
      break;
    case "Enter":
    case " ": {
      e.preventDefault();
      const item = activeIndex.value >= 0 ? items[activeIndex.value] : undefined;
      if (item) choose(item);
      break;
    }
    case "Escape":
      e.preventDefault();
      close();
      break;
  }
}

onMounted(() => window.addEventListener("click", close));
onBeforeUnmount(() => window.removeEventListener("click", close));
</script>

<template>
  <div
    role="menubar"
    class="flex items-center gap-0.5"
    style="-webkit-app-region: no-drag"
    @click.stop
  >
    <div v-for="menu in menus" :key="menu.id" class="relative">
      <button
        :id="`menubar-trigger-${menu.id}`"
        type="button"
        role="menuitem"
        :aria-haspopup="true"
        :aria-expanded="openId === menu.id"
        class="rounded-sm px-2 py-1 text-xs text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:bg-subtle focus-visible:text-foreground"
        :class="openId === menu.id && 'bg-subtle text-foreground'"
        @click.stop="toggle(menu.id)"
        @mouseenter="hover(menu.id)"
        @focus="hover(menu.id)"
        @keydown="onTriggerKeydown($event, menu)"
      >
        {{ menu.label }}
      </button>

      <div
        v-if="openId === menu.id"
        role="menu"
        :aria-label="menu.label"
        tabindex="-1"
        class="absolute left-0 top-full z-50 mt-1 min-w-[13rem] origin-top-left rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-scale-in"
        @click.stop
        @keydown="onMenuKeydown($event, menu)"
      >
        <template v-for="(item, i) in openMenu(menu)" :key="i">
          <div v-if="item.separator" role="separator" class="my-1 h-px bg-border" />
          <button
            v-else
            type="button"
            role="menuitem"
            :disabled="item.disabled"
            :data-highlighted="activeIndex === i || undefined"
            :style="{ animationDelay: listStaggerDelay(i) }"
            class="flex w-full items-center justify-between gap-6 rounded-sm px-2 py-1.5 text-left text-xs text-foreground transition-colors duration-fast ease-out hover:bg-subtle disabled:pointer-events-none disabled:opacity-40 data-[highlighted]:bg-subtle animate-fade-rise"
            @click="choose(item)"
            @mouseenter="activeIndex = i"
            @focus="activeIndex = i"
          >
            <span>{{ item.label }}</span>
            <span v-if="item.shortcut" class="tabular text-[0.6875rem] text-muted-foreground">
              {{ item.shortcut }}
            </span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
