<script lang="ts">
import type { CommandLabels, LabelOverrides } from "@ecoma-io/loom-labels";
/**
 * One searchable item in the command list. `value` is what the host receives on
 * select; `label` is what the reader sees and what the filter matches against.
 *
 * Deliberately not `ComboboxOption` or `DropdownMenuEntry`: those shapes carry
 * `modelValue` and `separator` fields respectively, and either would be
 * dead weight here — a command is an action, not a value or a menu row.
 */
export interface CommandItem {
  /** Unique key. */
  value: string;
  /** Visible label. */
  label: string;
  /** Optional description shown below the label. */
  description?: string;
  /** Group heading this item belongs to. */
  group?: string;
  /** Disabled state. */
  disabled?: boolean;
}

/**
 * A named section heading above a run of items. Only rendered when the group
 * contains at least one item that survived the current filter.
 */
export interface CommandGroup {
  /** Group heading text. */
  heading: string;
}

/**
 * Loom's English, co-located with the component so it tree-shakes with it.
 * Every string a Command actually says is the chrome around the host's items,
 * so the whole slot is here and none of it hides in the template.
 */
export const COMMAND_LABELS: CommandLabels = {
  placeholder: "Type to search…",
  emptyMessage: "No results found.",
  searchLabel: "Search",
  resultSingular: "{count} result available",
  resultPlural: "{count} results available",
};
</script>

<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from "vue";
import { cn } from "@ecoma-io/loom-core";
import { useLabels } from "@ecoma-io/loom-labels";

/**
 * Command — a keyboard-driven command search, the universal "Cmd+K" pattern.
 *
 * A text input that narrows a grouped list as you type, for executing actions
 * rather than selecting values. Its neighbour is `Combobox`, which selects a
 * value for a form field; this control runs an action and has no `modelValue`.
 *
 * The two are one family in the same way a Combobox and a Select are: the same
 * surface vocabulary, the same tokens, the same keyboard model. What differs is
 * intent — "open settings" is not a value you could submit in a form — and that
 * intent shapes the API: `onSelect` rather than `v-model`.
 *
 * Built from native ARIA roles rather than Reka UI, because Reka ships no
 * Command primitive. The semantics follow the WAI-ARIA combobox pattern with
 * `aria-activedescendant` navigation: focus stays in the input while the
 * highlighted item moves, which is the only model that keeps typing fluid.
 *
 * `aria-expanded` is deliberately absent. The input is a fixed searchbox, not
 * a popover trigger, so it has no collapsed state to announce: the listbox is
 * visible on mount and returns on any interaction after Escape closes it.
 */
const props = withDefaults(
  defineProps<{
    /** The items to search through. */
    items: CommandItem[];
    /** Optional group definitions for section headers. */
    groups?: CommandGroup[];
    /** Controlled search query. */
    query?: string | undefined;
    /** Whether the command menu is open. */
    open?: boolean | undefined;
    /** Names for the strings this control supplies itself. */
    labels?: LabelOverrides<CommandLabels> | undefined;
    /** Accessible label by reference for the search input. */
    ariaLabelledby?: string;
  }>(),
  {
    query: undefined,
    open: undefined,
    labels: undefined,
  },
);

const emit = defineEmits<{
  /** Fired when an item is selected. */
  select: [value: string];
  /** Fired when the query changes. */
  "update:query": [value: string];
  /** Fired when open state changes. */
  "update:open": [value: boolean];
}>();

const resolvedLabels = useLabels("command", COMMAND_LABELS, () => props.labels);

const inputId = useId();
const listboxId = useId();
const liveRegionId = useId();

/**
 * The controlled/uncontrolled query. When `query` is bound from outside, the
 * prop wins; otherwise the component owns its own state.
 */
const internalQuery = ref("");
const queryValue = computed(() => props.query ?? internalQuery.value);

function setQuery(value: string): void {
  internalQuery.value = value;
  emit("update:query", value);
}

/**
 * The controlled/uncontrolled open state. `true` when the listbox is visible.
 */
const internalOpen = ref(true);
const isOpen = computed(() => props.open ?? internalOpen.value);

function setOpen(value: boolean): void {
  if (props.open !== undefined) {
    emit("update:open", value);
  } else {
    internalOpen.value = value;
  }
}

/**
 * Bring the listbox back after Escape closed it. Focus never leaves the
 * search input, so without this a closed Command is a dead end — the only
 * escape, before this fix, was unmounting the component. Controlled mode is
 * untouched: the emit the host chose stays with the host, and this rewrites
 * only the fallback state a host never bound.
 */
function restoreOpen(): void {
  if (props.open === undefined) internalOpen.value = true;
}

/**
 * The index of the highlighted item within the filtered list. Reset to `0`
 * whenever the query changes so the first match is always ready to select.
 */
const highlightedIndex = ref(0);

const listboxRef = ref<HTMLElement | null>(null);

// Arrow-key focus never leaves the input (aria-activedescendant), so the
// scrollable listbox must be tab-reachable itself — an overflow container no
// keyboard can reach is the scrollable-region-focusable violation the harness
// axe gate exists to catch. Scrolling the highlighted option into view is the
// other half: an active item moved off-screen is navigation the user cannot
// see. jsdom has no scrollIntoView, hence the optional call.
watch([highlightedIndex, isOpen], async () => {
  if (!isOpen.value) return;
  await nextTick();
  listboxRef.value?.querySelector("[data-active]")?.scrollIntoView?.({ block: "nearest" });
});

/**
 * Items filtered by the current query. Case-insensitive substring match
 * across `label`, `description` and `value`.
 */
const filteredItems = computed(() => {
  const needle = queryValue.value.trim().toLowerCase();
  if (!needle) return props.items;
  return props.items.filter((item) => {
    const haystack = [item.label, item.description ?? "", item.value].join(" ").toLowerCase();
    return haystack.includes(needle);
  });
});

/**
 * Items grouped for rendering. Each entry is either a group heading or a flat
 * item. Groups with no matching items are omitted entirely.
 */
interface GroupedEntry {
  kind: "heading";
  heading: string;
  groupId: string;
}

interface GroupedItem {
  kind: "item";
  item: CommandItem;
  globalIndex: number;
}

type RenderEntry = GroupedEntry | GroupedItem;

const renderEntries = computed<RenderEntry[]>(() => {
  if (filteredItems.value.length === 0) return [];

  const groupDefs = props.groups;
  if (!groupDefs || groupDefs.length === 0) {
    return filteredItems.value.map((item, i) => ({ kind: "item", item, globalIndex: i }));
  }

  const ungrouped: CommandItem[] = [];
  const grouped = new Map<string, CommandItem[]>();

  for (const item of filteredItems.value) {
    if (item.group) {
      const list = grouped.get(item.group) ?? [];
      list.push(item);
      grouped.set(item.group, list);
    } else {
      ungrouped.push(item);
    }
  }

  const entries: RenderEntry[] = [];
  let globalIndex = 0;

  for (const def of groupDefs) {
    const items = grouped.get(def.heading);
    if (!items || items.length === 0) continue;
    entries.push({
      kind: "heading",
      heading: def.heading,
      groupId: `${inputId}-group-${def.heading}`,
    });
    for (const item of items) {
      entries.push({ kind: "item", item, globalIndex });
      globalIndex++;
    }
  }

  for (const item of ungrouped) {
    entries.push({ kind: "item", item, globalIndex });
    globalIndex++;
  }

  return entries;
});

/**
 * The item list for the non-grouped case, used by keyboard navigation. Derived
 * from `renderEntries` so the two are always in sync.
 */
const flatItems = computed(() =>
  renderEntries.value.filter((e): e is GroupedItem => e.kind === "item"),
);

/**
 * Keep the highlight within bounds. A filter that removes items can strand the
 * index past the end.
 */
watch(flatItems, (items) => {
  if (highlightedIndex.value >= items.length) {
    highlightedIndex.value = Math.max(0, items.length - 1);
  }
});

/**
 * The documented reset: the highlight returns to the first match whenever the
 * query changes — whether the query came from typing or from a parent updating
 * the controlled `query` prop. Typing reaches this watcher through `setQuery`,
 * which is why onInput no longer resets the highlight itself.
 */
watch(queryValue, () => {
  highlightedIndex.value = 0;
});

/**
 * The total number of results, announced to assistive technology through a live
 * region. Changes only when the filtered set changes, not on every keystroke.
 */
const resultCount = computed(() => filteredItems.value.length);
const announcement = ref("");
watch(resultCount, (count) => {
  const template =
    count === 1 ? resolvedLabels.value.resultSingular : resolvedLabels.value.resultPlural;
  announcement.value = template.replace("{count}", String(count));
});

/**
 * The currently highlighted item, or `undefined` when the list is empty.
 */
const highlightedItem = computed(() => flatItems.value[highlightedIndex.value]?.item);

function highlightUp(): void {
  if (flatItems.value.length === 0) return;
  highlightedIndex.value =
    highlightedIndex.value <= 0 ? flatItems.value.length - 1 : highlightedIndex.value - 1;
}

function highlightDown(): void {
  if (flatItems.value.length === 0) return;
  highlightedIndex.value =
    highlightedIndex.value >= flatItems.value.length - 1 ? 0 : highlightedIndex.value + 1;
}

function selectHighlighted(): void {
  const item = highlightedItem.value;
  if (!item || item.disabled) return;
  emit("select", item.value);
}

function onKeydown(event: KeyboardEvent): void {
  // A closed Command returns on any interaction except the two that leave it —
  // Escape (the key that closed it, still under the same finger) and Tab
  // (which moves focus elsewhere). Keydown fires before the input event, so
  // typing also lands on an open list.
  if (!isOpen.value && event.key !== "Escape" && event.key !== "Tab") restoreOpen();
  switch (event.key) {
    case "ArrowDown": {
      event.preventDefault();
      highlightDown();
      break;
    }
    case "ArrowUp": {
      event.preventDefault();
      highlightUp();
      break;
    }
    case "Enter": {
      event.preventDefault();
      selectHighlighted();
      break;
    }
    case "Escape": {
      event.preventDefault();
      if (queryValue.value.length > 0) {
        setQuery("");
      } else {
        setOpen(false);
      }
      break;
    }
    case "Home": {
      event.preventDefault();
      if (flatItems.value.length > 0) highlightedIndex.value = 0;
      break;
    }
    case "End": {
      event.preventDefault();
      if (flatItems.value.length > 0) highlightedIndex.value = flatItems.value.length - 1;
      break;
    }
  }
}

function onInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  setQuery(value);
}

function selectItem(item: CommandItem): void {
  if (item.disabled) return;
  emit("select", item.value);
}

function itemId(index: number): string {
  return `${inputId}-option-${String(index)}`;
}
</script>

<template>
  <div
    :data-state="isOpen ? 'open' : 'closed'"
    :class="
      cn(
        'rounded-md border border-border bg-popover text-popover-foreground shadow-md overflow-hidden',
        'outline-none',
      )
    "
  >
    <div class="flex items-center border-b border-border">
      <input
        :id="inputId"
        type="text"
        role="searchbox"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        aria-autocomplete="list"
        :aria-controls="listboxId"
        :aria-activedescendant="highlightedItem ? itemId(highlightedIndex) : undefined"
        :aria-labelledby="ariaLabelledby"
        :aria-label="ariaLabelledby ? undefined : resolvedLabels.searchLabel"
        :placeholder="resolvedLabels.placeholder"
        :value="queryValue"
        class="w-full px-3 py-2 text-sm bg-transparent text-foreground border-none outline-none placeholder:text-muted-foreground"
        @input="onInput"
        @keydown="onKeydown"
        @focus="restoreOpen"
        @click="restoreOpen"
      />
    </div>
    <div
      v-if="isOpen"
      :id="listboxId"
      ref="listboxRef"
      role="listbox"
      tabindex="0"
      :aria-labelledby="inputId"
      class="max-h-[300px] overflow-y-auto p-1"
    >
      <template
        v-for="entry in renderEntries"
        :key="entry.kind === 'heading' ? entry.groupId : entry.item.value"
      >
        <div
          v-if="entry.kind === 'heading'"
          :id="entry.groupId"
          role="presentation"
          class="px-2 py-1.5 text-micro font-medium uppercase tracking-wide text-muted-foreground"
        >
          {{ entry.heading }}
        </div>
        <!-- eslint-disable vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/interactive-supports-focus, vuejs-accessibility/mouse-events-have-key-events -->
        <div
          v-else
          :id="itemId(entry.globalIndex)"
          role="option"
          :aria-selected="highlightedIndex === entry.globalIndex"
          :aria-disabled="entry.item.disabled || undefined"
          :data-active="highlightedIndex === entry.globalIndex || undefined"
          class="flex flex-col gap-0.5 rounded-sm px-2 py-1.5 text-sm cursor-pointer outline-none transition-colors duration-fast ease-out data-[active]:bg-primary-muted data-[active]:text-primary-text"
          @mouseenter="highlightedIndex = entry.globalIndex"
          @click="selectItem(entry.item)"
        >
          <span>{{ entry.item.label }}</span>
          <span v-if="entry.item.description" class="text-xs text-muted-foreground">
            {{ entry.item.description }}
          </span>
        </div>
      </template>

      <div
        v-if="filteredItems.length === 0"
        role="option"
        aria-selected="false"
        aria-disabled="true"
        class="px-2 py-6 text-center text-sm text-muted-foreground"
      >
        {{ resolvedLabels.emptyMessage }}
      </div>
    </div>

    <span :id="liveRegionId" role="status" aria-live="polite" class="sr-only">
      {{ announcement }}
    </span>
  </div>
</template>
