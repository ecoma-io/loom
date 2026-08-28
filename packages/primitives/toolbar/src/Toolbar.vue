<script lang="ts">
import type { InjectionKey } from "vue";
/** Which axis the controls run along. */
export type ToolbarOrientation = "horizontal" | "vertical";

/** What the toolbar hands to its slotted children — only its axis. */
export interface ToolbarContext {
  orientation: ToolbarOrientation;
}

export const TOOLBAR_CONTEXT: InjectionKey<ToolbarContext> = Symbol("loom-toolbar");
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref } from "vue";
import { cn, useSplitAttrs } from "@ecoma-io/loom-core";

/**
 * WAI-ARIA APG toolbar pattern: Tab enters the toolbar and lands on its
 * active control, Tab again leaves it, and the arrow keys walk between the
 * controls inside. For a text-format strip, a view's zoom/filter row, a
 * table's bulk actions — anywhere seven individual Tab stops would stand
 * between a keyboard user and the rest of the page.
 *
 * **Participation needs no contract on the controls.** The toolbar does not
 * wrap its children in registration components and does not require them to
 * consume an injection: on mount, on every render, and on subtree mutations
 * it collects its own focusable descendants — `button`, `input`, `select`,
 * `textarea`, links with `href`, `summary`, and anything carrying a real
 * `tabindex` — and manages their `tabindex` itself. Any control, Loom or
 * native, participates by being slotted in; that is the point of the
 * pattern, and it is why the component ships no `items` prop.
 *
 * The roving index only lands on enabled, visible items: a control disabled
 * (`disabled` or `aria-disabled="true"`) or hidden (`[hidden]`,
 * `aria-hidden="true"`, `display: none`, `visibility: hidden`) is skipped by
 * the arrows but keeps its position, and focus never rests on it. Visibility
 * through `getComputedStyle` is exact in a real browser; under jsdom only
 * inline styles and attributes resolve, which the unit tests work within.
 *
 * Every walk key (both arrow pairs, Home, End) is left to the control when
 * focus rests inside an editable one (`input`, `select`, `textarea`,
 * `contenteditable`) — caret movement, native `select` value stepping and
 * text-field Home/End are not the toolbar's to hijack. Tab is the way out
 * of an editable stop, as it is everywhere else.
 *
 * Wrapping is ON: an arrow at either edge carries to the opposite end, the
 * way every editor's format strip behaves. Home/End jump to the first and
 * last enabled control. Both arrow pairs work in both orientations (each
 * key maps to one direction), so `orientation` is a layout and AT-announced
 * axis, not a key-availability switch.
 *
 * The accessible name is the consumer's to supply — `label` or a
 * pass-through `aria-label` — because a toolbar names its own purpose, and
 * the component owns no other string (separators carry no text). There is
 * deliberately no labels prop: zero localisable strings, nothing to seam.
 *
 * ```vue
 * <Toolbar label="Text formatting">
 *   <IconButton label="Bold"><BoldIcon class="size-4" /></IconButton>
 *   <IconButton label="Italic"><ItalicIcon class="size-4" /></IconButton>
 *   <ToolbarSeparator />
 *   <Select :options="zoomLevels" aria-label="Zoom" />
 * </Toolbar>
 * ```
 */
const props = withDefaults(
  defineProps<{
    /** Layout and announced axis of the control run. */
    orientation?: ToolbarOrientation;
    /** The toolbar's accessible name, for when no better label sits in the DOM. */
    label?: string;
  }>(),
  { orientation: "horizontal" },
);

defineOptions({ inheritAttrs: false });
const { attrs, rest } = useSplitAttrs();

// The consumer's own `aria-label` beats the `label` prop — an explicitly
// passed attribute is the more specific intent.
const ariaLabel = computed(() => (rest.value["aria-label"] as string | undefined) ?? props.label);

provide(TOOLBAR_CONTEXT, {
  get orientation() {
    return props.orientation;
  },
});

// One selector for every kind of control a toolbar can hold. `:not([disabled])`
// prunes natively disabled controls at query time; the property check in
// `participating` covers the ones an attribute cannot see — a control inside a
// disabled `<fieldset>` reports `.disabled === true` with no attribute of its
// own. `[tabindex]` catches custom controls that are none of the above; the
// root itself carries none, so it never collects itself.
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
  "[contenteditable='']",
].join(",");

const EDITABLE_SELECTOR = "input, select, textarea, [contenteditable='true'], [contenteditable='']";

const root = ref<HTMLElement | null>(null);
/** The enabled, visible controls, in DOM order — disabled and hidden ones are not in it, which is exactly "skipped but keeping their position". */
const items = ref<HTMLElement[]>([]);
const activeIndex = ref(0);

function participating(el: HTMLElement): boolean {
  const maybeDisableable = el as HTMLButtonElement;
  if (maybeDisableable.disabled || el.getAttribute("aria-disabled") === "true") return false;
  if (el.hasAttribute("hidden") || el.closest("[aria-hidden='true']") !== null) return false;
  // Exact in a browser; under jsdom only inline styles resolve, so the unit
  // tests drive this path with attributes and inline styles.
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
}

/** Re-collect the participating controls and re-apply the roving tab stops. */
function collect(): void {
  const rootEl = root.value;
  if (!rootEl) return;
  const next = Array.from(rootEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    participating,
  );
  // Anything that just left the set — it went disabled or hidden while
  // holding the roving stop — must give the stop back: an `aria-disabled`
  // control is still natively focusable, and a stale `tabindex="0"` would
  // leave it a standing Tab stop the walk can never land on.
  for (const el of items.value) {
    if (!next.includes(el)) el.removeAttribute("tabindex");
  }
  if (activeIndex.value >= next.length) activeIndex.value = 0;
  next.forEach((el, i) => {
    el.tabIndex = i === activeIndex.value ? 0 : -1;
  });
  items.value = next;
}

// Only structural and state attributes are watched — not `tabindex`, which
// `collect()` itself writes: an observer reacting to its own writes would
// loop. CSS-driven visibility changes are also missed; that limit is named in
// the docblock and covered by the real-browser e2e instead.
let observer: MutationObserver | undefined;
let scheduled = false;
function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    collect();
  });
}

onMounted(() => {
  collect();
  observer = new MutationObserver(schedule);
  observer.observe(root.value!, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden", "disabled", "aria-disabled", "aria-hidden", "href", "type"],
  });
});

onBeforeUnmount(() => observer?.disconnect());

function moveTo(index: number): void {
  if (!items.value.length) return;
  // Modulo makes both edges wrap: -1 lands on the last, `length` on the first.
  const next = items.value[(index + items.value.length) % items.value.length]!;
  activeIndex.value = items.value.indexOf(next);
  items.value.forEach((el, i) => {
    el.tabIndex = i === activeIndex.value ? 0 : -1;
  });
  next.focus();
}

/**
 * Pointer focus has to move the roving stop too — whoever actually holds
 * focus is the active control, whatever moved focus there.
 */
function onFocusin(event: FocusEvent): void {
  const target = event.target as Element;
  const item =
    items.value.indexOf(target as HTMLElement) >= 0
      ? (target as HTMLElement)
      : (target.closest(FOCUSABLE_SELECTOR) as HTMLElement | null);
  if (item) {
    activeIndex.value = items.value.indexOf(item);
    items.value.forEach((el, i) => {
      el.tabIndex = i === activeIndex.value ? 0 : -1;
    });
  }
}

function onKeydown(event: KeyboardEvent): void {
  // Arrows inside a control that consumes them — caret movement, `select`
  // value stepping — belong to that control. Tab is the exit, as always.
  if ((event.target as Element).closest(EDITABLE_SELECTOR)) return;
  collect(); // fresh on every keystroke: cheap at toolbar scale, never stale
  if (!items.value.length) return;
  const current = items.value.indexOf(document.activeElement as HTMLElement);
  const from = current === -1 ? 0 : current;
  switch (event.key) {
    case "ArrowLeft":
    case "ArrowUp":
      moveTo(from - 1);
      break;
    case "ArrowRight":
    case "ArrowDown":
      moveTo(from + 1);
      break;
    case "Home":
      moveTo(0);
      break;
    case "End":
      moveTo(items.value.length - 1);
      break;
    default:
      return; // Space, Enter and every other key are the control's own
  }
  event.preventDefault();
}
</script>

<template>
  <!-- `role="toolbar"` is the pattern's name for this container — not
       redundant on a `div`, which carries no role to repeat — and the two
       delegated handlers are the pattern's plumbing: focus and keys are
       handled once here for every control slotted inside. The rule models
       neither. The comments lead the template, which makes the component
       multi-root; attrs are bound explicitly below, so nothing is lost to
       fallthrough. -->
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions, vuejs-accessibility/no-redundant-roles -->
  <div
    v-bind="rest"
    ref="root"
    role="toolbar"
    :aria-label="ariaLabel"
    :aria-orientation="orientation"
    :class="
      cn(
        'inline-flex items-center gap-1 rounded-lg border border-border bg-background p-1',
        // A vertical toolbar stacks, and its separators stretch across it.
        orientation === 'vertical' ? 'flex-col items-stretch' : 'max-w-full flex-row',
        attrs.class as string,
      )
    "
    @focusin="onFocusin"
    @keydown="onKeydown"
  >
    <!-- @slot The controls — any focusable element participates, no wrapper required. -->
    <slot />
  </div>
</template>
