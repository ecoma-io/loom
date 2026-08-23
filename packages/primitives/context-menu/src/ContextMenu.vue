<script lang="ts">
/**
 * One row of the menu, and the three kinds a menu is built from are told apart
 * by which fields are set rather than by a `kind` discriminator: a `separator`
 * is a rule, a `heading` is a non-interactive group label, and anything else
 * is a command.
 *
 * The list is data rather than markup because the primitive stays free of app
 * logic — selecting a row emits its `value` and the host decides what that
 * command means.
 */
export interface ContextMenuEntry {
  /** The visible text of a command or a heading. */
  label?: string;
  /** The command id emitted on select. An entry without one is not selectable. */
  value?: string;
  /** Accelerator hint shown at the trailing edge, e.g. `⌘S`. Display only — the primitive binds no keys. */
  shortcut?: string;
  /** Render a divider. Every other field is ignored. */
  separator?: boolean;
  /** Render a non-interactive section heading rather than a command. */
  heading?: boolean;
  /** A destructive command — painted in the destructive token so it is not one indistinguishable row. */
  danger?: boolean;
  /** Visible but inert: announced as disabled, and selecting it emits nothing. */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import {
  ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuPortal,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from "reka-ui";
import { cn } from "@ecoma-io/loom-core";
import { listStaggerDelay } from "@ecoma-io/loom-core";
import { optional } from "@ecoma-io/loom-core";

/**
 * ContextMenu — a right-click command list, with roving focus, typeahead and
 * arrow-key navigation.
 *
 * The escape contract mirrors DropdownMenu: opening moves focus into the menu
 * and onto the first command; Esc and an outside click both close it; closing
 * returns focus to the trigger's element. The menu is modal, so while it is
 * open the page behind does not scroll and the rest of the page is hidden from
 * assistive technology.
 *
 * Selecting an entry emits `select` with its `value`; the host maps that id to
 * an action, which is what keeps the primitive free of app logic.
 *
 * Reach for `DropdownMenu` when the trigger should be a visible button rather
 * than a right-click, and for a select control when the list *is* a field's
 * value.
 */
withDefaults(
  defineProps<{
    /** The rows, in order. Three kinds, told apart by which fields are set. */
    items: ContextMenuEntry[];
    /** Drive the menu from the host with `v-model:open`; omit it and the menu owns its own state. */
    open?: boolean | undefined;
    /**
     * Reading direction for the menu and its arrow-key navigation. Reka
     * mirrors traversal from this; without forwarding it a right-to-left
     * host gets left-to-right menus no matter what the page declares.
     */
    dir?: "ltr" | "rtl";
  }>(),
  // `open: undefined` is load-bearing, not a redundant default — it is what
  // keeps the uncontrolled third state reachable past Vue's absent-Boolean
  // casting. `optional()` in the template is the other half; its docblock
  // carries the reasoning for both.
  { open: undefined },
);
const emit = defineEmits<{ select: [value: string]; "update:open": [value: boolean] }>();

/**
 * A disabled entry, and an entry with no command id, select nothing. Reka
 * already blocks pointer events on the disabled row; this is the second half,
 * for the keyboard path that reaches it anyway.
 */
function choose(item: ContextMenuEntry): void {
  if (item.disabled || item.value === undefined) return;
  emit("select", item.value);
}
</script>

<template>
  <ContextMenuRoot v-bind="optional({ open, dir })" @update:open="$emit('update:open', $event)">
    <!-- @slot The element that receives the right-click. Rendered `as-child`,
         so the caller's own element *is* the trigger. -->
    <ContextMenuTrigger as-child>
      <slot name="trigger" />
    </ContextMenuTrigger>

    <ContextMenuPortal>
      <ContextMenuContent
        :side-offset="6"
        align="start"
        :class="
          cn(
            'z-overlay min-w-[12rem] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none',
            // Both states scoped, never unconditional. Reka's Presence
            // keeps closed content mounted until an animationend arrives, and a
            // mount-only animation never fires a second one — so an
            // unconditional animation class strands an invisible menu over the
            // page, catching clicks meant for what is behind it. Scoped, the
            // closed element computes `animation-name: none` and Presence
            // unmounts it at once; the paired exit is precisely what Presence
            // is waiting to hold it for. The origin below makes the menu grow
            // out of the click point rather than out of its own centre — on
            // the way out as well as in.
            'data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out',
          )
        "
        style="transform-origin: var(--reka-popper-transform-origin)"
      >
        <template v-for="(item, i) in items" :key="i">
          <ContextMenuSeparator v-if="item.separator" class="my-1 h-px bg-border" />
          <ContextMenuLabel
            v-else-if="item.heading"
            class="px-2 py-1.5 text-micro font-medium uppercase tracking-wide text-muted-foreground"
          >
            {{ item.label }}
          </ContextMenuLabel>
          <!-- The reveal delay comes from the shared stagger vocabulary, capped
               there so a long menu does not tail off, rather than from a
               per-menu number written by hand.

               `disabled` is coerced rather than forwarded raw: an entry that
               simply omits the field is not disabled, and Reka's own prop does
               not accept `undefined` as a way of saying so. -->
          <ContextMenuItem
            v-else
            :disabled="item.disabled ?? false"
            :class="
              cn(
                'flex cursor-pointer items-center justify-between gap-6 rounded-sm px-2 py-1.5 text-sm text-foreground outline-none',
                'transition-colors duration-fast ease-out',
                // The rows reveal in sequence as the menu opens, which reads as
                // a list arriving rather than a block appearing. The hover
                // colour transition above is a separate channel, so a row
                // highlighted mid-reveal still responds at once.
                'animate-fade-rise',
                'data-[highlighted]:bg-subtle',
                // The row's colour, not its alpha. A menu row is nothing but
                // its label, and `data-[disabled]:opacity-40` composited that
                // label to 2.40:1 on the popover and its shortcut to 1.79:1 —
                // a disabled row a reader cannot make out tells them nothing
                // about what is unavailable, which is the only thing it is
                // there to say. Muted instead: 5.76:1, and a clear drop from
                // the 15.46:1 an available row wears.
                //
                // It takes the danger colour with it, deliberately. An
                // attribute selector outranks the plain `text-destructive-text`
                // below whatever order Tailwind emits them in, and that is the
                // right way round: red is a warning about an action, and there
                // is no action here to warn about.
                'data-[disabled]:pointer-events-none data-[disabled]:text-muted-foreground',
                item.danger &&
                  'text-destructive-text data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive-text',
              )
            "
            :style="{ animationDelay: listStaggerDelay(i) }"
            @select="choose(item)"
          >
            <span>{{ item.label }}</span>
            <span v-if="item.shortcut" class="tabular text-micro text-muted-foreground">
              {{ item.shortcut }}
            </span>
          </ContextMenuItem>
        </template>
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>
