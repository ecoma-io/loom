<script lang="ts">
import { cva } from "class-variance-authority";

/**
 * How much of the paging apparatus is rendered. All three drive the same
 * model and carry the same semantics — they differ only in how much room the
 * navigation is worth on the surface it sits on.
 *
 *   • `full` — the numbered row with ellipses, plus first/prev/next/last.
 *     For a table where jumping to a known page is a real task.
 *   • `compact` — prev, "Page 3 of 12", next. The position stays legible
 *     without spending a whole row on it.
 *   • `simple` — prev and next alone, for a feed nobody navigates by index.
 */
export type PaginationVariant = "full" | "compact" | "simple";

export const paginationVariants = cva("inline-flex items-center", {
  // `satisfies` keeps the two halves honest: the union above is the name a
  // consumer imports and the documentation prints, the map below is the
  // classes. Adding a member to one and not the other stops compiling.
  variants: {
    variant: {
      // The numbered row is a run of same-size squares and reads as one strip
      // at gap-1; the compact form is a sentence between two controls and
      // needs the wider gap to stop reading as a third button.
      full: "gap-1",
      compact: "gap-2",
      simple: "gap-1",
    } satisfies Record<PaginationVariant, string>,
  },
  defaultVariants: { variant: "full" },
});
</script>

<script setup lang="ts">
import { nextTick } from "vue";
import {
  PaginationRoot,
  PaginationList,
  PaginationListItem,
  PaginationFirst,
  PaginationPrev,
  PaginationNext,
  PaginationLast,
  PaginationEllipsis,
} from "reka-ui";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "@lucide/vue";
import { buttonVariants } from "../Button/Button.vue";
import { cn } from "../../lib/cn";
import { optional } from "../../lib/props";
import { useSplitAttrs } from "../../lib/attrs";

/**
 * Pagination — moving through a paged result set, one page at a time or by
 * jumping to a numbered one.
 *
 * It renders **buttons, never links**. Loom cannot know whether a consumer's
 * pages are addressable URLs, and an `<a>` with no `href` is not a link at
 * all — it is a div that lies to a screen reader and drops out of the tab
 * order. A product whose pages are real, crawlable URLs wants its own
 * `<a href>` row instead of this component; nothing here can be made to
 * produce one.
 *
 * Reach for a different control when the list is not paged: an infinite feed
 * wants a "load more" button, and a long list a reader scans rather than
 * indexes wants a virtualised scroller.
 *
 * Built on Reka UI's Pagination, which owns the arithmetic — the page count,
 * the sliding window of numbers around the current page, and where the
 * ellipses fall. That window is fiddly enough at the boundaries that
 * recomputing it here would only be a second, subtly different answer.
 */
withDefaults(
  defineProps<{
    /**
     * The current page, 1-based. Leave it unset to let the component keep its
     * own page and simply report changes.
     */
    page?: number;
    /** How many items exist in total, across every page. */
    total: number;
    /** How many items one page holds. With `total`, this is what fixes the page count. */
    itemsPerPage?: number;
    /** How much of the control renders: the numbered row, a position readout, or arrows alone. */
    variant?: PaginationVariant;
    /** How many numbers sit either side of the current page, in the `full` variant. */
    siblingCount?: number;
    /** Pins page 1 and the last page into the numbered row, with ellipses standing in for the gap. */
    showEdges?: boolean;
    /** Unavailable: every control dims and refuses to move the page. */
    disabled?: boolean;
    /**
     * The navigation's accessible name. A page commonly carries two of these —
     * above and below a table — and two `<nav>`s named the same thing are as
     * confusing to a screen reader as two named nothing, so give each one a
     * name that says which it is.
     */
    label?: string;
  }>(),
  {
    itemsPerPage: 10,
    variant: "full",
    siblingCount: 1,
    // Reka defaults this off, which drops the ellipses entirely and lets the
    // numbered row float free of both ends. The anchored form is what people
    // mean by a full pagination, so Loom turns it on.
    showEdges: true,
    disabled: false,
    label: "Pagination",
  },
);

const emit = defineEmits<{
  /** The 1-based page the reader asked for. A controlled host decides whether to honour it. */
  "update:page": [page: number];
}>();

// The root renders the `<nav>`, so every fallthrough attribute belongs on it —
// there is no second node they could sensibly describe. `class` is pulled out
// of that spread and merged through `cn()` instead: spreading it alongside the
// nav's own `:class` only concatenates the two lists, so a caller's `gap-2`
// would win or lose depending on which utility Tailwind happened to emit last.
defineOptions({ inheritAttrs: false });
const { attrs, rest: navAttrs } = useSplitAttrs();

const edgeClass = cn(
  buttonVariants({ variant: "ghost", size: "icon-sm" }),
  "disabled:cursor-not-allowed disabled:opacity-50",
);

// The page buttons borrow Button's own variants rather than restating its
// press language, so the row cannot drift from every other pressable thing in
// the library. `min-w-8` with tabular figures is what keeps the row from
// reflowing as the numbers under it grow a digit.
function pageClass(selected: boolean): string {
  return cn(
    buttonVariants({ variant: selected ? "primary" : "ghost", size: "sm" }),
    "min-w-8 px-2 tabular",
    "disabled:cursor-not-allowed disabled:opacity-50",
  );
}

/** Which edge control stands in for which, when the one that was pressed goes away. */
const MIRROR: Record<string, string | undefined> = {
  first: "last",
  prev: "next",
  next: "prev",
  last: "first",
};

// Reka disables Prev/First at page 1 and Next/Last at the last page, and that
// is the honest state: a control that looks unavailable and still fires is
// worse than one that is not there at all. The cost is real, though — a
// browser blurs a button the instant it becomes disabled, so a reader holding
// Enter on Next arrives at the last page with focus dumped on `<body>` and
// their place in the document gone.
//
// So the control that fired the change hands focus on: to the current page
// button where the variant has one — which announces "Page 12, current page",
// the very thing the reader was trying to find out — and to its mirror control
// otherwise, which is the nearest thing still able to move the page.
//
// Only for a keyboard activation. `detail === 0` is what separates a click
// synthesised by Enter or Space from a pointer click, and a pointer user has
// no focus position to lose; moving focus for them would raise a ring nobody
// asked for.
let pressed: HTMLButtonElement | null = null;

function rememberKeyboardPress(event: MouseEvent): void {
  const target = event.target as HTMLElement | null;
  pressed = event.detail === 0 ? (target?.closest<HTMLButtonElement>("button") ?? null) : null;
}

function handOffFocus(): void {
  const origin = pressed;
  pressed = null;
  if (!origin?.disabled) return;

  // Only rescue focus that was actually lost. A browser leaves `<body>`
  // focused after disabling the button; jsdom leaves the button itself. Any
  // other active element means the reader has already moved on, and stealing
  // focus back from them would be the worse bug.
  const active = document.activeElement;
  if (active !== origin && active !== document.body) return;

  const nav = origin.closest("nav");
  if (!nav) return;

  const mirror = MIRROR[origin.getAttribute("data-edge") ?? ""];
  const target =
    nav.querySelector<HTMLButtonElement>('[aria-current="page"]:not([disabled])') ??
    (mirror
      ? nav.querySelector<HTMLButtonElement>(`[data-edge="${mirror}"]:not([disabled])`)
      : null);
  target?.focus();
}

function onPageChange(value: number): void {
  emit("update:page", value);
  // After the re-render rather than before it: the button that was pressed
  // only becomes disabled once the new page has been applied.
  void nextTick(handOffFocus);
}
</script>

<template>
  <PaginationRoot
    v-slot="{ page: current, pageCount }"
    v-bind="{ ...navAttrs, ...optional({ page }) }"
    :total="total"
    :items-per-page="itemsPerPage"
    :sibling-count="siblingCount"
    :show-edges="showEdges"
    :disabled="disabled"
    :aria-label="label"
    :class="cn(paginationVariants({ variant }), attrs.class as string)"
    @click="rememberKeyboardPress"
    @update:page="onPageChange"
  >
    <PaginationFirst v-if="variant === 'full'" data-edge="first" :class="edgeClass">
      <ChevronsLeft class="h-4 w-4" aria-hidden="true" />
    </PaginationFirst>

    <PaginationPrev data-edge="prev" :class="edgeClass">
      <ChevronLeft class="h-4 w-4" aria-hidden="true" />
    </PaginationPrev>

    <PaginationList v-if="variant === 'full'" v-slot="{ items }" class="flex items-center gap-1">
      <!-- Keyed by page number, never by index. The row is furniture: a page
           that stays inside the window across a change keeps its own DOM node,
           so nothing remounts, nothing re-animates, and the numbers do not
           shuffle under a reader who has just pressed Next. -->
      <template
        v-for="(item, index) in items"
        :key="item.type === 'page' ? `page-${item.value}` : `ellipsis-${index}`"
      >
        <PaginationListItem
          v-if="item.type === 'page'"
          :value="item.value"
          :class="pageClass(item.value === current)"
        />
        <!-- The ellipsis is not a control, so it renders as a span rather than
             Reka's default div-with-a-glyph inside a row of buttons: nothing to
             focus, nothing that looks pressable, and the glyph itself hidden
             from assistive technology because "horizontal ellipsis" is not what
             it means. The words are what it means. -->
        <PaginationEllipsis
          v-else
          as="span"
          class="inline-flex h-8 min-w-8 select-none items-center justify-center text-sm text-muted-foreground"
        >
          <span aria-hidden="true">…</span>
          <span class="sr-only">More pages</span>
        </PaginationEllipsis>
      </template>
    </PaginationList>

    <!-- The position, for the two variants that have no numbered row to read it
         off. `role="status"` because pressing Next in those variants otherwise
         changes nothing a screen reader would notice — focus stays put and no
         `aria-current` moves. The `full` variant deliberately has no live
         region: its number row already carries the state, and announcing it
         again on top of the focus hand-off below would say everything twice. -->
    <span
      v-if="variant !== 'full'"
      role="status"
      :class="variant === 'compact' ? 'px-1 text-sm text-muted-foreground' : 'sr-only'"
    >
      Page <span class="tabular">{{ current }}</span> of
      <span class="tabular">{{ pageCount }}</span>
    </span>

    <PaginationNext data-edge="next" :class="edgeClass">
      <ChevronRight class="h-4 w-4" aria-hidden="true" />
    </PaginationNext>

    <PaginationLast v-if="variant === 'full'" data-edge="last" :class="edgeClass">
      <ChevronsRight class="h-4 w-4" aria-hidden="true" />
    </PaginationLast>
  </PaginationRoot>
</template>
