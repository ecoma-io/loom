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
export interface DropdownMenuEntry {
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
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "reka-ui";
import { cn } from "@ecoma-io/loom-core";
import { listStaggerDelay } from "@ecoma-io/loom-core";
import { optional } from "@ecoma-io/loom-core";

/**
 * DropdownMenu — one button that opens a list of commands, with roving focus,
 * typeahead and arrow-key navigation.
 *
 * The escape contract: opening by keyboard moves focus into the menu and onto
 * the first command; Esc and an outside click both close it; closing returns
 * focus to the trigger. The menu is modal, so while it is open the page behind
 * does not scroll and the rest of the page is hidden from assistive technology
 * — a command list is never scrolled out from under the pointer mid-choice.
 * Focus stays in the menu while it is open, but not the way `Dialog` traps it: a
 * menu has no internal tab order at all. Tab is inert, and the arrow keys plus
 * typeahead are how a row is reached.
 *
 * Selecting an entry emits `select` with its `value`; the host maps that id to
 * an action, which is what keeps the primitive free of app logic.
 *
 * Reach for `Popover` when the panel is interactive content rather than a
 * command list, and for a select control when the list *is* a field's value.
 */
withDefaults(
  defineProps<{
    /** The rows, in order. Three kinds, told apart by which fields are set. */
    items: DropdownMenuEntry[];
    /**
     * Let the arrow keys wrap at the ends of the list. Off by default — a
     * cursor that stops at the last row reads as "there is nothing further",
     * which is the honest answer for most command lists; long lists are where
     * cycling back to the top pays for itself.
     */
    loop?: boolean;
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
function choose(item: DropdownMenuEntry): void {
  if (item.disabled || item.value === undefined) return;
  emit("select", item.value);
}

/**
 * Whether the open now arriving was asked for by the keyboard. Reka's trigger
 * opens on a click and on Enter, Space and Arrow Down, and the two arrivals
 * want different seats: a reader who opened by keyboard belongs on the first
 * command, while a pointer that already sits where it aimed is not moved by the
 * menu appearing — and Reka highlights whatever the roving group focuses, so an
 * unconditional seat would paint the first row for a click that never asked for
 * it. Armed by exactly the keys Reka opens on, and disarmed by the click it
 * opens on, so an arm that never became an open — a disabled trigger, or a host
 * that refuses `open` — cannot seat a row for the pointer arrival that follows.
 *
 * Reka cancels the keydown, which is what keeps a keyboard open from also
 * firing the click that would disarm it; and the arm is read once, when the
 * content mounts, so a click arriving after that is a no-op rather than a race.
 */
let keyboardOpen = false;

function onTriggerKeydown(event: KeyboardEvent): void {
  if (["Enter", " ", "ArrowDown"].includes(event.key)) keyboardOpen = true;
}

function onTriggerClick(): void {
  keyboardOpen = false;
}

/**
 * Reka spends the mount focus on the menu's own content element and everything
 * a keyboard can do inside a menu hangs off that one focus: `RovingFocusGroup`
 * seats a row only when the group element itself receives it, and the arrows,
 * Home/End and typeahead all read the document's active element. In a browser
 * that focus lands nowhere, so every one of those keys fired at the trigger
 * outside the menu and no command was reachable (#462). Loom seats the first
 * enabled command instead — the arrival the contract above promises, and where
 * the ARIA menu pattern expects a reader who opened with the keyboard.
 *
 * A pointer-opened menu keeps the seat Reka gives it: the gate leaves that path
 * exactly as it was. A menu of nothing but headings and disabled rows has no
 * seat to take on either path, so that case falls through to Reka as well.
 */
function onOpenAutoFocus(event: Event): void {
  const fromKeyboard = keyboardOpen;
  keyboardOpen = false;
  if (!fromKeyboard) return;
  const menu = event.target as HTMLElement | null;
  const first = menu?.querySelector<HTMLElement>('[role="menuitem"]:not([data-disabled])');
  if (!first) return;
  event.preventDefault();
  first.focus();
}
</script>

<template>
  <DropdownMenuRoot v-bind="optional({ open, dir })" @update:open="$emit('update:open', $event)">
    <!-- @slot The button that opens the menu. Rendered `as-child`, so the
         caller's own element *is* the trigger. -->
    <DropdownMenuTrigger as-child @keydown="onTriggerKeydown" @click="onTriggerClick">
      <slot name="trigger" />
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent
        :side-offset="6"
        align="start"
        :loop="loop ?? false"
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
            // out of its trigger rather than out of its own centre — on the
            // way out as well as in.
            'data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out',
          )
        "
        style="transform-origin: var(--reka-popper-transform-origin)"
        @open-auto-focus="onOpenAutoFocus"
      >
        <template v-for="(item, i) in items" :key="i">
          <DropdownMenuSeparator v-if="item.separator" class="my-1 h-px bg-border" />
          <DropdownMenuLabel
            v-else-if="item.heading"
            class="px-2 py-1.5 text-micro font-medium uppercase tracking-wide text-muted-foreground"
          >
            {{ item.label }}
          </DropdownMenuLabel>
          <!-- The reveal delay comes from the shared stagger vocabulary, capped
               there so a long menu does not tail off, rather than from a
               per-menu number written by hand.

               `disabled` is coerced rather than forwarded raw: an entry that
               simply omits the field is not disabled, and Reka's own prop does
               not accept `undefined` as a way of saying so. -->
          <DropdownMenuItem
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
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
