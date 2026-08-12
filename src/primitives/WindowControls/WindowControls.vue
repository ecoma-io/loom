<script lang="ts">
/**
 * WindowControls — the minimize / maximize / close cluster for a frameless
 * (custom-chrome) window. Presentational only: it emits intents; the host wires
 * them to the platform (the desktop shell's window bridge). Windows-style layout —
 * on macOS the OS draws native traffic-lights, so hide this there.
 *
 * The close button is the one place `destructive` is allowed without a confirm:
 * OS window-close is an expected, reversible-by-reopen affordance.
 */

/**
 * The three buttons' accessible names. There are four, because the middle
 * button is one control in two states and a language may well name them with
 * unrelated words.
 *
 * Every glyph here is an inline SVG marked `aria-hidden`, so these names are
 * the only thing a screen reader has to go on — a missing one is not a degraded
 * label but an unnamed button.
 */
export interface WindowControlsLabels {
  /** Send the window to the taskbar. */
  readonly minimize: string;
  /** Fill the screen. The middle button's name while the window is restored. */
  readonly maximize: string;
  /** Return to the previous size. The same button's name while maximized. */
  readonly restore: string;
  /** Close the window. */
  readonly close: string;
}

/**
 * Loom's English, co-located with the component so it tree-shakes with it, and
 * exported so a host can build a partial vocabulary against the real thing.
 */
export const WINDOW_CONTROLS_LABELS: WindowControlsLabels = {
  minimize: "Minimize",
  maximize: "Maximize",
  restore: "Restore",
  close: "Close",
};
</script>

<script setup lang="ts">
import { useLabels, type LabelOverrides } from "../../lib/labels";

const props = withDefaults(
  defineProps<{
    /** Swaps the middle button between its Maximize and Restore glyph and label. */
    isMaximized?: boolean;
    /**
     * Names for the three buttons, as any subset of `WindowControlsLabels` —
     * the rest stay as the host's `provideLoomLabels` vocabulary left them, and
     * then as Loom's English.
     *
     * This took a whole object before the seam existed, which meant a host that
     * wanted one word in their own language had to restate the other three in
     * English and keep them in step by hand.
     */
    labels?: LabelOverrides<WindowControlsLabels>;
  }>(),
  { isMaximized: false },
);

const emit = defineEmits<{
  (e: "minimize"): void;
  (e: "maximize"): void;
  (e: "close"): void;
}>();

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves, and a template reading the raw prop would be reading the overrides
// rather than the answer.
const text = useLabels("windowControls", WINDOW_CONTROLS_LABELS, () => props.labels);
</script>

<template>
  <div class="flex h-full items-stretch" style="-webkit-app-region: no-drag">
    <button
      type="button"
      class="flex w-11 items-center justify-center text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground active:brightness-90 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      :aria-label="text.minimize"
      data-testid="win-minimize"
      @click="emit('minimize')"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <rect y="4.5" width="10" height="1" fill="currentColor" />
      </svg>
    </button>

    <button
      type="button"
      class="flex w-11 items-center justify-center text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground active:brightness-90 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      :aria-label="isMaximized ? text.restore : text.maximize"
      data-testid="win-maximize"
      @click="emit('maximize')"
    >
      <svg v-if="!isMaximized" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" />
      </svg>
      <svg v-else width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <rect x="0.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" />
        <path d="M2.5 2.5 V0.5 H9.5 V7.5 H7.5" fill="none" stroke="currentColor" />
      </svg>
    </button>

    <button
      type="button"
      class="flex w-11 items-center justify-center text-muted-foreground transition-colors duration-fast ease-out hover:bg-destructive hover:text-destructive-foreground active:brightness-90 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      :aria-label="text.close"
      data-testid="win-close"
      @click="emit('close')"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M0 0 L10 10 M10 0 L0 10" stroke="currentColor" />
      </svg>
    </button>
  </div>
</template>
