<script lang="ts">
import { cva } from "class-variance-authority";

/**
 * One row of the list. `value` is what the model carries; `label` is what a
 * reader sees, what the filter matches, and what the input shows once the row
 * is chosen.
 *
 * Identical to `SelectOption` today, and deliberately not the same
 * declaration: the two surfaces are independent, and the first field either
 * one grows — a secondary line here, a group key there — is a field the other
 * should not inherit by accident. A shared alias would make that change look
 * free when it is not.
 */
export interface ComboboxOption {
  /** The value bound to `v-model` when this row is chosen. Unique within the list. */
  value: string;
  /** The text shown on the row, matched by the filter, and put in the input once chosen. */
  label: string;
  /** Present but unchoosable — visible, skipped by the keyboard, unclickable. */
  disabled?: boolean;
}

/**
 * The control's height scale. It matches the text input and Select scales
 * exactly, so a form row mixing a Combobox beside either never comes out
 * uneven — which is why reaching past `size` for an `h-*` class is always the
 * wrong fix.
 */
export type ComboboxSize = "sm" | "md" | "lg";

export const comboboxVariants = cva(
  [
    "flex w-full items-center gap-2 rounded-md border border-input bg-background text-foreground",
    "transition-[color,background-color,border-color,box-shadow] duration-fast ease-out",
    // The focusable node is the input *inside* this box, so the ring is drawn
    // with `focus-within` rather than `focus-visible` — the same choice
    // TextField makes for the same reason, and what keeps the two controls
    // lighting up identically in a form row.
    "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
  ],
  {
    // `satisfies` keeps the two halves honest: the union above is the name a
    // consumer imports and the documentation prints, the map below is the
    // classes. Adding a member to one and not the other stops compiling.
    variants: {
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-9 px-3 text-sm",
        lg: "h-11 px-4 text-base",
      } satisfies Record<ComboboxSize, string>,
    },
    defaultVariants: { size: "md" },
  },
);
</script>

<script setup lang="ts">
import { ref } from "vue";
import {
  ComboboxRoot,
  ComboboxAnchor,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxPortal,
  ComboboxContent,
  ComboboxViewport,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxEmpty,
} from "reka-ui";
import { Check, ChevronDown } from "@lucide/vue";
import { cn } from "../../lib/cn";
import { listStaggerDelay } from "../../lib/motion";
import { useSplitAttrs } from "../../lib/attrs";
import { optional } from "../../lib/props";

/**
 * Combobox — a text input that narrows a list as you type, for the list too
 * long to scan. Countries, currencies, repositories, people: anywhere a reader
 * knows roughly what they are looking for and would rather type three letters
 * than scroll past two hundred rows.
 *
 * Its neighbour is `Select`, and the boundary is the length of the list rather
 * than the shape of the control. Three to fifteen rows a reader can read
 * through belong in a Select — a search box over eight options is a keystroke
 * charged for nothing. Two to five options that should all be visible at once
 * belong in a segmented control. Past roughly fifteen, searching beats
 * scrolling and this is the control that offers it.
 *
 * Built on Reka UI's Combobox, which supplies the editable-combobox semantics:
 * the `role="combobox"` input wired to the listbox by `aria-expanded` and
 * `aria-controls`, `aria-autocomplete="list"`, and the active row tracked by
 * `aria-activedescendant` while real focus stays in the input. That last part
 * is the one genuine behavioural difference from Select, which moves focus
 * onto the row itself — a combobox cannot, because the reader is still typing.
 */
const props = withDefaults(
  defineProps<{
    /** The chosen option's `value`. Leave it unset and the combobox owns its own choice. */
    modelValue?: string | undefined;
    /** The rows, in the order they are shown. */
    options: ComboboxOption[];
    /** Shown in the empty input, before anything is typed or chosen. */
    placeholder?: string;
    /** Shown as a row of its own when the filter matches nothing. */
    emptyMessage?: string;
    /** Unavailable: dims the control, refuses to open and refuses to take text. */
    disabled?: boolean;
    /** Error state: paints the destructive border and ring, and sets `aria-invalid`. */
    invalid?: boolean;
    /** Control height. It shares the text input scale so mixed form rows stay aligned. */
    size?: ComboboxSize;
    /**
     * Filter `options` against the typed text. Turn it off when the host is
     * producing the list itself — from a server, in response to
     * `update:query` — so a result that does not literally contain what was
     * typed is not then hidden a second time by a filter running underneath it.
     */
    filter?: boolean;
  }>(),
  {
    // `modelValue: undefined` is load-bearing rather than redundant: paired
    // with `optional()` below it is what keeps the uncontrolled third state
    // reachable, instead of pinning the control to a value nobody chose.
    modelValue: undefined,
    emptyMessage: "No results",
    disabled: false,
    invalid: false,
    size: "md",
    filter: true,
  },
);

const emit = defineEmits<{
  /** The chosen option's `value`. Fires once per choice; the list closes with it. */
  "update:modelValue": [value: string];
  /** The text now in the input — as the reader types, and again when a choice puts its label there. */
  "update:query": [query: string];
}>();

const query = ref("");

/**
 * The stagger is the list's *reveal*, and re-filtering is not a reveal. This
 * is true from the moment the list opens until the first keystroke, after
 * which every row arrives immediately.
 *
 * Two things go wrong without it. A delay recomputed per keystroke makes the
 * list feel like it is rebuilding under the reader's fingers — the opposite of
 * what a filter is for. And raising `animation-delay` on a row that survived
 * the keystroke rewinds its entrance: the row is still mounted, so the
 * animation is not restarted, it is re-timed, and a row that had finished
 * fading in drops back to half-opacity. Going the other way — stagger to `0ms`
 * — only ever fast-forwards, which is why this flag falls and does not rise
 * again until the content has unmounted and remounted with the next open.
 */
const revealing = ref(true);

/**
 * What the input shows once a row is chosen. Without this Reka falls back to
 * the model value's own `toString()`, which would leave `en` in the box where
 * the reader picked "English".
 */
function displayValue(value: unknown): string {
  return props.options.find((option) => option.value === value)?.label ?? "";
}

function onQuery(text: string): void {
  // Reka rewrites the input's text on its own account — once as the component
  // mounts, and again when a choice puts the chosen label back in the box —
  // and each of those arrives here as an update. Reporting a query that did
  // not change would have a host running the same search twice on mount, so
  // only a real change is passed on.
  if (text === query.value) return;
  query.value = text;
  revealing.value = false;
  emit("update:query", text);
}

// The root renders no DOM node of its own, so fallthrough attributes would be
// dropped on the floor. They go to the input, which is the element they
// describe and the only one a name can land on — the chevron trigger already
// carries Reka's own `aria-label`, and naming the control means naming the
// `role="combobox"` node.
//
// `class` is pulled out of that spread and merged through `cn()` onto the
// anchor instead, because the anchor is the box a caller means when they pass
// `w-64`. Spreading it alongside the anchor's own `:class` would only
// concatenate the two lists — Vue's merge is generic, not Tailwind-aware — so
// a caller's width would win or lose depending on which utility Tailwind
// happened to emit last.
defineOptions({ inheritAttrs: false });
const { attrs, rest: inputAttrs } = useSplitAttrs();
</script>

<template>
  <!-- `open-on-click` and not `open-on-focus`: clicking the box is a reader
       asking to see the list, while focus arrives by Tab as often as by
       intent, and a list that unfolds over the next field every time someone
       tabs through a form is an obstruction. Typing opens it either way. -->
  <ComboboxRoot
    v-bind="optional({ modelValue })"
    :disabled="disabled"
    :ignore-filter="!filter"
    open-on-click
    @update:model-value="$emit('update:modelValue', String($event))"
    @update:open="revealing = true"
  >
    <ComboboxAnchor
      :data-disabled="disabled || undefined"
      :data-invalid="invalid || undefined"
      :class="
        cn(
          comboboxVariants({ size }),
          !invalid && 'focus-within:shadow-halo',
          invalid && 'border-destructive focus-within:outline-destructive',
          disabled && 'cursor-not-allowed opacity-50',
          attrs.class as string,
        )
      "
    >
      <ComboboxInput
        v-bind="inputAttrs"
        :model-value="query"
        :display-value="displayValue"
        :placeholder="placeholder"
        :aria-invalid="invalid || undefined"
        class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        @update:model-value="onQuery"
      />
      <!-- Reka names this button and takes it out of the tab order itself, so
           the whole control is one Tab stop: the input. -->
      <ComboboxTrigger class="group shrink-0 text-muted-foreground disabled:cursor-not-allowed">
        <ChevronDown
          class="h-4 w-4 transition-transform duration-fast ease-out group-data-[state=open]:rotate-180"
        />
      </ComboboxTrigger>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent
        position="popper"
        :side-offset="6"
        :class="
          cn(
            'z-50 max-h-72 min-w-[var(--reka-combobox-trigger-width)] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md',
            // Scoped to the open state, never unconditional. Reka keeps the
            // closed content mounted while it waits for an animationend that a
            // mount-only animation never fires again — an invisible overlay
            // eating clicks. Scoping it makes the closed element compute
            // `animation-name: none`, which is the immediate-unmount branch.
            'data-[state=open]:animate-fade-rise',
          )
        "
      >
        <ComboboxViewport class="p-1">
          <!-- A filter that matches nothing has to say so. An empty popover
               reads as a broken one, and a screen reader is told nothing at
               all — so the message is a row inside the listbox rather than a
               caption beside it. `role="option"` because a bare div is not a
               legitimate child of `role="listbox"` and is skipped; disabled
               because it is a statement, not a choice. -->
          <ComboboxEmpty
            role="option"
            aria-disabled="true"
            class="animate-fade-rise px-3 py-1.5 text-sm text-muted-foreground"
          >
            {{ emptyMessage }}
          </ComboboxEmpty>

          <!-- Keyed by value rather than by index: a row that survives a
               keystroke keeps its DOM node, so its entrance animation is not
               re-run and the list settles instead of flashing. Keyed by index,
               every row below a filtered-out one would be reused for different
               content while the tail remounted — an animation playing on the
               wrong rows.

               `text-value` pins the filter to the label. Left off, Reka falls
               back to whatever the row happens to render, which is the label
               today and the label plus a badge, a hint or a count the first
               time a row grows one. -->
          <ComboboxItem
            v-for="(option, index) in options"
            :key="option.value"
            :value="option.value"
            :text-value="option.label"
            :disabled="option.disabled ?? false"
            :style="{ animationDelay: revealing ? listStaggerDelay(index) : '0ms' }"
            :class="
              cn(
                'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-1.5 pr-8 text-sm text-foreground outline-none',
                'transition-colors duration-fast ease-out',
                'animate-fade-rise',
                'data-[highlighted]:bg-subtle',
                'data-[state=checked]:bg-primary-muted data-[state=checked]:text-primary',
                'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
              )
            "
          >
            {{ option.label }}
            <ComboboxItemIndicator class="absolute right-2 inline-flex items-center">
              <Check class="h-4 w-4" />
            </ComboboxItemIndicator>
          </ComboboxItem>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
