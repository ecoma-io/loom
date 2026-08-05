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

/** Accessible names for the three buttons — overridable by the host for i18n. */
export interface WindowControlsLabels {
  minimize: string;
  maximize: string;
  restore: string;
  close: string;
}
</script>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Swaps the middle button between its Maximize and Restore glyph and label. */
    isMaximized?: boolean;
    /** Accessible names for the three buttons, for a host localising the chrome. */
    labels?: WindowControlsLabels;
  }>(),
  {
    isMaximized: false,
    labels: () => ({
      minimize: "Minimize",
      maximize: "Maximize",
      restore: "Restore",
      close: "Close",
    }),
  },
);

const emit = defineEmits<{
  (e: "minimize"): void;
  (e: "maximize"): void;
  (e: "close"): void;
}>();
</script>

<template>
  <div class="flex h-full items-stretch" style="-webkit-app-region: no-drag">
    <button
      type="button"
      class="flex w-11 items-center justify-center text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground active:brightness-90 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      :aria-label="labels.minimize"
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
      :aria-label="isMaximized ? labels.restore : labels.maximize"
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
      :aria-label="labels.close"
      data-testid="win-close"
      @click="emit('close')"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M0 0 L10 10 M10 0 L0 10" stroke="currentColor" />
      </svg>
    </button>
  </div>
</template>
