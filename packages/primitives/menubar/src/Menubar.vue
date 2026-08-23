<script lang="ts">
/**
 * Menubar — the classic desktop-app menu strip (File · View · Help …).
 *
 * Data-driven: pass a `menus` array; the component owns open/close, hover-to-switch,
 * keyboard nav and click-outside. Selecting an item emits `select` with its `command`
 * id — the host maps that id to an action (keeps the primitive free of app logic).
 *
 * A11y: WAI-ARIA menubar semantics over real DOM focus, not aria-activedescendant.
 * Opening a menu moves focus onto its first enabled row and the arrows walk it from
 * there, so "the highlighted row" and "the focused row" are the same thing by
 * construction and a screen reader announces each walked row natively — no
 * bookkeeping that could drift out of sync with what is actually announced.
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
import { computed, onBeforeUnmount, onMounted, ref, nextTick } from "vue";
import { listStaggerDelay } from "@ecoma-io/loom-core";

const props = defineProps<{
  /** The top-level menus; their reading order follows `dir`. */
  menus: MenubarMenu[];
  /**
   * Reading direction. Right-to-left mirrors the strip's arrow keys —
   * ArrowRight travels toward the visual left — which a hand-rolled
   * handler must do itself, unlike its Reka siblings.
   */
  dir?: "ltr" | "rtl";
}>();
const emit = defineEmits<{ select: [command: string] }>();

// Horizontal arrows are visual, not logical: in right-to-left, ArrowRight
// moves toward the previous menu.
const horizontal = computed(() => (props.dir === "rtl" ? -1 : 1) as 1 | -1);

const openId = ref<string | null>(null);
const activeIndex = ref(-1); // the focused row within the open menu
// String refs would do here only outside a v-for; inside one Vue collects them
// into arrays. Function refs keyed BY MENU ID instead: during a menu switch the
// incoming panel can mount before the outgoing one unmounts, so a single
// latest-wins slot would let the outgoing null clobber the just-bound element.
const panelEls = new Map<string, HTMLElement>();
const triggerEls = new Map<string, HTMLButtonElement>();

function bindPanel(id: string, el: unknown): void {
  if (el instanceof HTMLElement) panelEls.set(id, el);
  else panelEls.delete(id);
}

function bindTrigger(id: string, el: unknown): void {
  if (el instanceof HTMLButtonElement) triggerEls.set(id, el);
  else triggerEls.delete(id);
}

function boundPanel(): HTMLElement | null {
  return openId.value ? (panelEls.get(openId.value) ?? null) : null;
}

const openMenu = (menu: MenubarMenu | undefined) => menu?.items ?? [];
const firstEnabled = (items: MenubarItem[], from = 0, dir = 1): number => {
  for (let i = from; i >= 0 && i < items.length; i += dir) {
    const item = items[i];
    if (item && !item.separator && !item.disabled) return i;
  }
  return -1;
};

/** One arrow-step away from `from`, wrapping through every slot exactly once. */
function neighborEnabled(items: MenubarItem[], from: number, dir: 1 | -1): number {
  const n = items.length;
  for (let step = 1; step <= n; step++) {
    const i = (((from + dir * step) % n) + n) % n;
    const item = items[i];
    if (item && !item.separator && !item.disabled) return i;
  }
  return -1;
}

/** Rows render only for non-separator items, so an item index maps to its button's ordinal among the rendered ones. */
function rowOrdinal(items: MenubarItem[], index: number): number {
  let ordinal = -1;
  for (let k = 0; k <= index && k < items.length; k++) {
    if (!items[k]?.separator) ordinal++;
  }
  return ordinal;
}

function rowButtons(): HTMLButtonElement[] {
  const panel = boundPanel();
  return panel
    ? Array.from(panel.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]'))
    : [];
}

function focusRow(items: MenubarItem[], index: number): void {
  rowButtons()[rowOrdinal(items, index)]?.focus();
}

function goTo(items: MenubarItem[], index: number): void {
  if (index < 0) return;
  activeIndex.value = index;
  focusRow(items, index);
}

async function openAndFocusFirst(id: string, items: MenubarItem[]): Promise<void> {
  await nextTick();
  // A hover or another key can supersede this open within the same tick; only
  // the menu that still owns `openId` may claim focus.
  if (openId.value !== id) return;
  goTo(items, firstEnabled(items));
}

async function toggle(id: string): Promise<void> {
  if (openId.value === id) {
    close(true);
    return;
  }
  const menu = props.menus.find((m) => m.id === id);
  if (!menu) return;
  openId.value = id;
  activeIndex.value = -1;
  await openAndFocusFirst(id, menu.items);
}

async function hover(id: string, via: "pointer" | "trigger-focus"): Promise<void> {
  if (openId.value === null || openId.value === id) return;
  const menu = props.menus.find((m) => m.id === id);
  if (!menu) return;
  openId.value = id;
  activeIndex.value = -1;
  // Pointer switching takes focus into the new menu like a desktop menubar.
  // A switch caused by tabbing between triggers must not yank focus out of
  // the tab order mid-Tab, so it switches the panel and leaves focus alone.
  if (via === "pointer") await openAndFocusFirst(id, menu.items);
}

function choose(item: MenubarItem): void {
  if (item.separator || item.disabled) return;
  close(true);
  if (item.command) emit("select", item.command);
}

function close(restoreFocus = false): void {
  const id = openId.value;
  openId.value = null;
  activeIndex.value = -1;
  // Escape and selection hand focus back to the owning trigger; Tab-out and
  // outside clicks do not — focus has already gone where the user sent it.
  if (restoreFocus && id) triggerEls.get(id)?.focus();
}

async function moveMenu(dir: 1 | -1): Promise<void> {
  const ids = props.menus.map((m) => m.id);
  const cur = openId.value ? ids.indexOf(openId.value) : 0;
  const id = ids[(cur + dir + ids.length) % ids.length];
  const menu = props.menus.find((m) => m.id === id);
  if (!menu) return;
  openId.value = menu.id;
  activeIndex.value = -1;
  await openAndFocusFirst(menu.id, menu.items);
}

/**
 * Pointer highlight of an enabled row moves focus with it — under the roving
 * model the highlighted row IS the focused row, and screen readers announce
 * focus changes, not CSS classes.
 */
function pointAtRow(items: MenubarItem[], item: MenubarItem, index: number): void {
  if (item.disabled || item.separator || activeIndex.value === index) return;
  activeIndex.value = index;
  focusRow(items, index);
}

/** Native focus landing on a row keeps `activeIndex` truthful about it. */
function noteFocus(item: MenubarItem, index: number): void {
  if (item.disabled || item.separator) return;
  activeIndex.value = index;
}

/**
 * The APG's closed-state traversal: Left/Right across the strip land on the
 * neighbouring trigger without opening anything — opening is ArrowDown,
 * Enter or Space's job.
 */
function moveTriggerFocus(from: string, dir: 1 | -1): void {
  const ids = props.menus.map((m) => m.id);
  const cur = ids.indexOf(from);
  if (cur === -1) return;
  triggerEls.get(ids[(cur + dir + ids.length) % ids.length] ?? "")?.focus();
}

async function onTriggerKeydown(e: KeyboardEvent, menu: MenubarMenu): Promise<void> {
  switch (e.key) {
    case "ArrowDown":
    case "Enter":
    case " ":
      e.preventDefault(); // suppresses the button's own activation click
      openId.value = menu.id;
      activeIndex.value = -1;
      await openAndFocusFirst(menu.id, menu.items);
      break;
    case "ArrowRight":
      e.preventDefault();
      if (openId.value) void moveMenu(horizontal.value);
      else moveTriggerFocus(menu.id, horizontal.value);
      break;
    case "ArrowLeft":
      e.preventDefault();
      if (openId.value) void moveMenu(-horizontal.value as 1 | -1);
      else moveTriggerFocus(menu.id, -horizontal.value as 1 | -1);
      break;
    case "Escape":
      e.preventDefault();
      close(true);
      break;
  }
}

function onMenuKeydown(e: KeyboardEvent, menu: MenubarMenu): void {
  const items = menu.items;
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      goTo(items, neighborEnabled(items, activeIndex.value, 1));
      break;
    case "ArrowUp":
      e.preventDefault();
      goTo(items, neighborEnabled(items, activeIndex.value, -1));
      break;
    case "Home":
      e.preventDefault();
      goTo(items, firstEnabled(items, 0, 1));
      break;
    case "End":
      e.preventDefault();
      goTo(items, firstEnabled(items, items.length - 1, -1));
      break;
    case "ArrowRight":
      e.preventDefault();
      void moveMenu(horizontal.value);
      break;
    case "ArrowLeft":
      e.preventDefault();
      void moveMenu(-horizontal.value as 1 | -1);
      break;
    // Handled here rather than left to the button's native activation:
    // preventDefault stops the browser's synthesized click, which would run
    // choose() a second time alongside this delegated handler.
    case "Enter":
    case " ": {
      e.preventDefault();
      const item = items[activeIndex.value];
      if (item) choose(item);
      break;
    }
    case "Escape":
      e.preventDefault();
      close(true);
      break;
  }
}

function onRootFocusout(e: FocusEvent): void {
  if (!openId.value) return;
  const root = e.currentTarget;
  const next = e.relatedTarget;
  // Tab out of the strip dismisses the menu and leaves focus where the browser
  // put it. Moves that stay inside the menubar (opening handing focus to a
  // row) keep it.
  if (!(root instanceof Element) || !(next instanceof Node) || !root.contains(next)) close();
}

// A wrapper, not `close` itself: the listener's event argument would otherwise
// arrive as `restoreFocus`, and an outside click would yank focus back to the
// trigger instead of leaving it where the press landed.
const onWindowClick = (): void => close();
onMounted(() => window.addEventListener("click", onWindowClick));
onBeforeUnmount(() => window.removeEventListener("click", onWindowClick));
</script>

<template>
  <!-- The attribute rides the strip itself, not just the prop: a host may
       pass dir without setting document direction, and both the flex order
       and the mirrored keys must agree with what is on screen. -->
  <div
    :dir="dir"
    role="menubar"
    class="flex items-center gap-0.5"
    style="-webkit-app-region: no-drag"
    @click.stop
    @focusout="onRootFocusout"
  >
    <div v-for="menu in menus" :key="menu.id" class="relative">
      <button
        :id="`menubar-trigger-${menu.id}`"
        :ref="(el) => bindTrigger(menu.id, el)"
        type="button"
        role="menuitem"
        :aria-haspopup="'menu'"
        :aria-expanded="openId === menu.id"
        class="min-h-6 rounded-sm px-2 py-1 text-xs text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:bg-subtle focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo"
        :class="openId === menu.id && 'bg-subtle text-foreground'"
        @click.stop="toggle(menu.id)"
        @mouseenter="hover(menu.id, 'pointer')"
        @focus="hover(menu.id, 'trigger-focus')"
        @keydown="onTriggerKeydown($event, menu)"
      >
        {{ menu.label }}
      </button>

      <!-- Scoped presence, matching every sibling overlay: enter animates in,
           leave answers with scale-out. The unconditional mount-only animation
           this used to carry never plays on close at all. In jsdom, with no
           stylesheet loaded, Vue computes zero animation duration and ends both
           phases immediately, so tests see plain unmount. -->
      <Transition enter-active-class="animate-scale-in" leave-active-class="animate-scale-out">
        <div
          v-if="openId === menu.id"
          :ref="(el) => bindPanel(menu.id, el)"
          role="menu"
          :aria-label="menu.label"
          tabindex="-1"
          class="absolute left-0 top-full z-overlay mt-1 min-w-[13rem] origin-top-left rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
          @click.stop
          @keydown="onMenuKeydown($event, menu)"
        >
          <template v-for="(item, i) in openMenu(menu)" :key="i">
            <div v-if="item.separator" role="separator" class="my-1 h-px bg-border" />
            <!-- The row's colour, not its alpha, says it is unavailable. A menu
                 row is nothing but its label, and `disabled:opacity-40` composited
                 that label to 2.40:1 on the popover — a disabled row a reader
                 cannot make out tells them nothing about what is unavailable,
                 which is the only thing it is there to say. Muted instead: 5.76:1
                 at rest, and a clear drop from the 15.46:1 an available row wears,
                 so the state still reads at a glance. The shortcut beside it
                 declares `text-muted-foreground` on its own element, so it lands
                 on the same colour rather than inheriting this one.

                 Rows sit at text-sm/py-1.5 like DropdownMenu's — one row grammar
                 across menus; the compact trigger above stays desktop chrome.
                 Every row carries tabindex -1: focus arrives programmatically,
                 never by tabbing through the strip. -->
            <button
              v-else
              type="button"
              role="menuitem"
              tabindex="-1"
              :disabled="item.disabled"
              :data-highlighted="activeIndex === i || undefined"
              :style="{ animationDelay: listStaggerDelay(i) }"
              class="flex w-full items-center justify-between gap-6 rounded-sm px-2 py-1.5 text-left text-sm text-foreground transition-colors duration-fast ease-out hover:bg-subtle disabled:pointer-events-none disabled:text-muted-foreground data-[highlighted]:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo animate-fade-rise"
              @click="choose(item)"
              @mouseenter="pointAtRow(openMenu(menu), item, i)"
              @focus="noteFocus(item, i)"
            >
              <span>{{ item.label }}</span>
              <span v-if="item.shortcut" class="tabular text-micro text-muted-foreground">
                {{ item.shortcut }}
              </span>
            </button>
          </template>
        </div>
      </Transition>
    </div>
  </div>
</template>
