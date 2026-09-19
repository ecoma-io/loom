<script setup lang="ts" generic="T">
/**
 * VirtualList — windowed rendering for long lists.
 *
 * Only the rows that fit the viewport (plus an `overscan` buffer) are in the
 * DOM at any moment; the scrollbar is provided by a full-height spacer, so a
 * list of a hundred thousand rows costs the layout engine a hundred thousand
 * computed styles instead of a hundred thousand vnodes.
 *
 * ## Accessibility model
 *
 * The list is a single Tab stop. `role="list"` rows (`role="listitem"`) use
 * roving `tabindex`: the active row carries `tabindex="0"` and every other
 * rendered row `tabindex="-1"`. Arrow keys, Home/End and Page Up/Page Down
 * move the active row, which the list scrolls into view before focusing;
 * Enter and Space activate it (`activate`). Exactly one tab stop means a
 * screen-reader user meets an unbounded list exactly once, not once per
 * painted row.
 *
 * The scroll container deliberately takes no tabindex of its own — focus
 * roves across the rows, so the container never needs one — and the rows
 * report their position within the full set via `aria-setsize`/`aria-posinset`
 * (a virtualized DOM can never announce its own extent).
 *
 * ## Row contract
 *
 * Every row must fit `itemHeight` exactly: the component sizes the row and
 * clips overflow, so consumers render truncating content (one line of text,
 * a fixed-height media tile). Each row is one logical element with a single
 * tab stop — children that reach for keyboard input (buttons, inputs) are
 * reached with Tab from the row, and keys typed inside them are left to them:
 * the list only acts on events whose target is a row or the list itself.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { virtualWindow } from "./virtual-window";

const props = withDefaults(
  defineProps<{
    /** The logical rows; the component owns none of their shape. */
    items: T[];
    /** Fixed row height in px — the windowing contract every row must fit. */
    itemHeight: number;
    /** Rows rendered above and below the viewport to cover scroll lag. */
    overscan?: number;
    /** Names the list for assistive technology when surrounding prose does not already. */
    label?: string;
    /** The active (focused) row index; -1 means none active yet. */
    activeIndex?: number;
  }>(),
  { overscan: 8, activeIndex: -1 },
);

const emit = defineEmits<{
  "update:activeIndex": [index: number];
  /** The active row was activated with Enter/Space. */
  activate: [index: number];
}>();

defineSlots<{
  // The slot parameter's name is part of the function type's signature —
  // there is no body to consume it, so the unused-variable rule must look
  // away. The type still drives the template's typed slot props.
  // eslint-disable-next-line no-unused-vars
  default: (slotProps: { item: T; index: number; active: boolean }) => unknown;
}>();

const rootEl = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const viewportHeight = ref(0);

const rendered = computed(() =>
  virtualWindow(
    scrollTop.value,
    viewportHeight.value,
    props.itemHeight,
    props.items.length,
    props.overscan,
  ),
);

const visibleItems = computed(() => props.items.slice(rendered.value.start, rendered.value.end));

const totalHeight = computed(() => props.items.length * props.itemHeight);

/**
 * The row carrying `tabindex="0"`: the active row when it is rendered, else
 * the visible row nearest it, else the first visible row while none is
 * active. The fallback is what keeps the list a single reachable Tab stop —
 * an active row that the scroll container has moved out of the window is
 * still a real position, and a list whose stop vanished under it would be a
 * list a Tab key could never enter.
 */
const tabStopIndex = computed(() => {
  const { start, end } = rendered.value;
  if (end <= start) return -1;
  if (props.activeIndex >= 0) return Math.min(Math.max(props.activeIndex, start), end - 1);
  return start;
});

function measure(): void {
  const el = rootEl.value;
  if (!el) return;
  scrollTop.value = el.scrollTop;
  viewportHeight.value = el.clientHeight;
}

let observer: ResizeObserver | undefined;
onMounted(() => {
  measure();
  if (typeof ResizeObserver !== "undefined" && rootEl.value) {
    observer = new ResizeObserver(measure);
    observer.observe(rootEl.value);
  }
});
onBeforeUnmount(() => observer?.disconnect());

// A list that shrank past the active row cannot keep it active.
watch(
  () => props.items.length,
  (count) => {
    if (props.activeIndex >= count && count > 0) {
      emit("update:activeIndex", count - 1);
    } else if (count === 0 && props.activeIndex !== -1) {
      emit("update:activeIndex", -1);
    }
  },
);

function rowElement(index: number): HTMLElement | null {
  const root = rootEl.value;
  if (!root) return null;
  return root.querySelector<HTMLElement>(`[data-virtual-index="${CSS.escape(String(index))}"]`);
}

/** Scroll the container so the row at `index` is fully visible, then re-sync the window. */
function reveal(index: number): void {
  const el = rootEl.value;
  if (!el) return;
  const top = index * props.itemHeight;
  const bottom = top + props.itemHeight;
  if (top < el.scrollTop) {
    el.scrollTop = top;
  } else if (bottom > el.scrollTop + el.clientHeight) {
    el.scrollTop = bottom - el.clientHeight;
  }
  measure();
}

/** Move the active row to `index`, revealing and focusing it. */
function moveTo(index: number): void {
  if (index < 0 || index >= props.items.length) return;
  const changed = index !== props.activeIndex;
  emit("update:activeIndex", index);
  reveal(index);
  if (changed) {
    // Re-render the window first so the freshly revealed row exists to focus.
    void nextTick(() => rowElement(index)?.focus());
  }
}

function onRowFocus(index: number): void {
  if (props.activeIndex !== index) emit("update:activeIndex", index);
}

function onKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  // Keys typed inside a nested control such as a row button belong to it.
  if (
    target !== rootEl.value &&
    !(target instanceof HTMLElement && target.hasAttribute("data-virtual-index"))
  ) {
    return;
  }
  const count = props.items.length;
  if (count === 0) return;
  const visible = Math.max(
    1,
    Math.floor((viewportHeight.value || props.itemHeight) / props.itemHeight),
  );
  const active = props.activeIndex >= 0 ? props.activeIndex : 0;
  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      moveTo(Math.min(count - 1, active + 1));
      break;
    case "ArrowUp":
      event.preventDefault();
      moveTo(Math.max(0, active - 1));
      break;
    case "Home":
      event.preventDefault();
      moveTo(0);
      break;
    case "End":
      event.preventDefault();
      moveTo(count - 1);
      break;
    case "PageDown":
      event.preventDefault();
      moveTo(Math.min(count - 1, active + visible));
      break;
    case "PageUp":
      event.preventDefault();
      moveTo(Math.max(0, active - visible));
      break;
    case "Enter":
    case " ":
      event.preventDefault();
      emit("activate", active);
      break;
  }
}
</script>

<template>
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- The container holds the roving-row keydown listener; focus never lands on it (rows own the tab stop), but keys pressed on a row bubble up to it as their closest keydown owner. -->
  <div
    ref="rootEl"
    role="list"
    :aria-label="label || undefined"
    class="relative overflow-y-auto"
    data-loom-virtual-list
    @scroll="measure"
    @keydown="onKeydown"
  >
    <div class="relative" :style="{ height: `${totalHeight}px` }">
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- The row is the roving tab stop; its focus handler records keyboard moves and clicks into activeIndex, the list's one-tab-stop contract. -->
      <div
        v-for="(item, i) in visibleItems"
        :key="rendered.start + i"
        :data-virtual-index="rendered.start + i"
        role="listitem"
        :aria-setsize="items.length"
        :aria-posinset="rendered.start + i + 1"
        :tabindex="rendered.start + i === tabStopIndex ? 0 : -1"
        class="absolute inset-x-0 box-border overflow-hidden"
        :style="{ top: `${(rendered.start + i) * itemHeight}px`, height: `${itemHeight}px` }"
        @focus="onRowFocus(rendered.start + i)"
      >
        <slot
          :item="item"
          :index="rendered.start + i"
          :active="rendered.start + i === activeIndex"
        />
      </div>
    </div>
  </div>
</template>
