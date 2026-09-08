<script lang="ts">
import type { ErrorSummaryLabels, LabelOverrides } from "@ecoma-io/loom-labels";

/** One invalid field the summary lists. */
export interface ErrorSummaryEntry {
  /** The id of the element the entry links to — the invalid field's control. Give it `tabindex="-1"` (or be natively focusable) so focus can land. */
  id: string;
  /** The error text for that field. */
  message: string;
  /** The field's visible label, spoken ahead of the message in the link text. */
  fieldLabel?: string;
}

/**
 * Loom's English, co-located with the component so it tree-shakes with it.
 * `heading` takes the count rather than a finished sentence for the reason
 * `LabelOf` in `@ecoma-io/loom-labels` records: plurals are a language
 * decision, and Loom's English has no right to make it for anyone else.
 */
export const ERROR_SUMMARY_LABELS: ErrorSummaryLabels = {
  heading: ({ count }) =>
    `There is a problem (${String(count)} ${count === 1 ? "error" : "errors"})`,
  description: () => "",
};
</script>

<script setup lang="ts">
import { nextTick, ref, useId, watch } from "vue";
import { TriangleAlert } from "@lucide/vue";
import { cn } from "@ecoma-io/loom-core";
import { useLabels } from "@ecoma-io/loom-labels";

/**
 * ErrorSummary — the GOV.UK error-summary pattern. On submit-failure, focus
 * moves to a summary listing every field error, each entry a link that moves
 * focus to the invalid field. The container takes `tabindex="-1"` and is
 * focused programmatically whenever the errors first render or change while
 * the form stays invalid.
 *
 * The announcement happens once. `role="alert"` exists only between the
 * summary's appearance and the focus this component immediately gives it —
 * a region that stayed alert would re-announce the whole list on every
 * later change, which is the failure the pattern exists to avoid. Where
 * InlineError annotates one field, this orients the reader across the whole
 * form.
 */
const props = defineProps<{
  /** Every invalid field, most important first. Give each `id` a focusable target. */
  errors: ErrorSummaryEntry[];
  /** Names for the summary's own copy — the heading takes the count, so a host owns its plural forms. */
  labels?: LabelOverrides<ErrorSummaryLabels> | undefined;
}>();

const text = useLabels("errorSummary", ERROR_SUMMARY_LABELS, () => props.labels);

const box = ref<HTMLElement | null>(null);
const headingId = useId();
const announcing = ref(false);
// True while the form is known to be invalid: the announcement belongs to
// the empty→invalid transition alone, not to any later change of detail.
let invalid = false;

watch(
  () => props.errors,
  async (errors) => {
    if (errors.length === 0) {
      invalid = false;
      return;
    }
    announcing.value = !invalid;
    invalid = true;
    await nextTick();
    box.value?.focus();
  },
  { deep: true, immediate: true },
);

function focusField(id: string): void {
  // The link's native jump is suppressed: focusing scrolls the field into
  // view, and a jump-to-anchor from a link moves no focus at all when the
  // target is a tabindex="-1" field — which is the documented host contract.
  document.getElementById(id)?.focus();
}
</script>

<template>
  <!-- Mounted only while invalid, like InlineError: `v-if`, never `v-show` —
       a summary that never leaves the DOM cannot announce its return. -->
  <div
    v-if="errors.length > 0"
    ref="box"
    tabindex="-1"
    :role="announcing ? 'alert' : undefined"
    :aria-labelledby="headingId"
    :class="
      cn(
        'rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive-text',
        'animate-fade-rise',
        'focus:outline-2 focus:outline-offset-2 focus:outline-destructive',
      )
    "
    @focus="announcing = false"
  >
    <div class="flex items-start gap-2">
      <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div class="min-w-0">
        <h2 :id="headingId" class="text-sm font-semibold">
          {{ text.heading({ count: errors.length }) }}
        </h2>
        <p v-if="text.description({ count: errors.length }) !== ''" class="mt-1 text-sm">
          {{ text.description({ count: errors.length }) }}
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5">
          <li v-for="error in errors" :key="error.id">
            <a
              :href="`#${error.id}`"
              class="font-medium underline underline-offset-2"
              @click.prevent="focusField(error.id)"
              >{{ error.fieldLabel ? `${error.fieldLabel}: ${error.message}` : error.message }}</a
            >
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
