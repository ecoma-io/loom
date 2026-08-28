<script lang="ts">
import type { CopyButtonLabels } from "@ecoma-io/loom-labels";
import type { IconButtonSize, IconButtonVariant } from "@ecoma-io/loom-icon-button";

/**
 * The visual weights and hit areas are IconButton's, verbatim — a copy button
 * is an icon button that happens to own a clipboard contract, and there is no
 * second press language to maintain.
 */
export type CopyButtonVariant = IconButtonVariant;
export type CopyButtonSize = IconButtonSize;

export const COPY_BUTTON_LABELS: CopyButtonLabels = {
  copy: "Copy to clipboard",
  copied: "Copied to clipboard",
  failed: "Could not copy to clipboard",
};

/** How long the copied/failed feedback holds before the button returns to its resting glyph. */
export const COPY_REVERT_MS = 2000;
</script>

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { Check, Copy, X } from "@lucide/vue";
import IconButton from "@ecoma-io/loom-icon-button";
import { useAnnounce } from "@ecoma-io/loom-live-region";
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";

const props = withDefaults(
  defineProps<{
    /** The text to copy. Provide `value` or `getText` — a `CopyButton` with neither has nothing to do. */
    value?: string;
    /** Resolved at click time instead of a static `value` — for text the host computes on demand, possibly asynchronously. */
    getText?: () => string | Promise<string>;
    /**
     * Names for what the button says, as any subset of `CopyButtonLabels` —
     * the per-instance correction over `COPY_BUTTON_LABELS`, in the same
     * shape every component's `labels` prop takes. `copy` is the button's
     * accessible name and never changes with the state; `copied` and
     * `failed` are what assistive technology hears.
     */
    labels?: LabelOverrides<CopyButtonLabels>;
    /** Visual weight, shared with IconButton. */
    variant?: CopyButtonVariant;
    /** Square hit area, shared with IconButton. */
    size?: CopyButtonSize;
    /** Unavailable rather than dimmed — drains to the neutral well and blocks pointer events. */
    disabled?: boolean;
    /** The native button type. Defaults to `button`, never an accidental submit. */
    type?: "button" | "submit" | "reset";
  }>(),
  { variant: "default", size: "md", disabled: false, type: "button" },
);

/**
 * The outcome is announced through the shared LiveRegion seam, not a
 * region of this component's own: a region must pre-exist the messages it
 * announces, and the seam's standalone pair on `document.body` guarantees
 * that without every copy button mounting its own.
 */
const announce = useAnnounce();

// `text`, not `labels`: the prop of that name is one of the three sources
// this resolves (own prop, then the host vocabulary from
// `provideLoomLabels`, then these English defaults), and a template reading
// the raw prop would be reading the overrides rather than the answer.
const text = useLabels("copyButton", COPY_BUTTON_LABELS, () => props.labels);

/**
 * idle → copied | failed → idle, on a two-second revert timer. The guard
 * covers only the await window: a click during the feedback window is a
 * legitimate "copy again", not a duplicate — the announcement seam re-adds
 * the message, so a repeat is heard.
 */
type CopyState = "idle" | "copied" | "failed";
const state = ref<CopyState>("idle");
let pending = false;
let revertTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRevert(): void {
  if (revertTimer !== null) clearTimeout(revertTimer);
  revertTimer = setTimeout(() => {
    state.value = "idle";
    revertTimer = null;
  }, COPY_REVERT_MS);
}

onBeforeUnmount(() => {
  // The timer holds the only writer into `state`; firing after unmount
  // would write into a dead component. Cleared, not waited out.
  if (revertTimer !== null) clearTimeout(revertTimer);
  revertTimer = null;
});

async function copy(): Promise<void> {
  if (props.disabled || pending) return;
  pending = true;
  try {
    // A throwing `getText` and a refusing clipboard take the same road:
    // the failed state is announced, the glyph says so, and the button
    // stays operable so the very next click retries the whole attempt.
    const value = props.getText ? await props.getText() : (props.value ?? "");
    await navigator.clipboard.writeText(value);
    state.value = "copied";
    announce(text.value.copied);
  } catch {
    state.value = "failed";
    announce(text.value.failed);
  } finally {
    pending = false;
    scheduleRevert();
  }
}
</script>

<template>
  <IconButton
    :label="text.copy"
    :variant="variant"
    :size="size"
    :disabled="disabled"
    :type="type"
    @click="copy"
  >
    <!-- The glyph swap is the feedback's visual half only — never its only
         carrier. The announcement carries the state to assistive technology,
         and the accessible name stays `copy` throughout: a button whose name
         changes under a screen reader's cursor is its own confusion. -->
    <Check v-if="state === 'copied'" class="h-4 w-4" aria-hidden="true" />
    <X v-else-if="state === 'failed'" class="h-4 w-4" aria-hidden="true" />
    <Copy v-else class="h-4 w-4" aria-hidden="true" />
  </IconButton>
</template>
