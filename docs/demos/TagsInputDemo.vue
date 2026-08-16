<script setup lang="ts">
import { ref } from "vue";
import TagsInput, { type TagsInputRejection } from "./TagsInput.vue";
import Field from "../Field/Field.vue";

const keywords = ref<string[]>(["design systems", "accessibility"]);
const recipients = ref<string[]>(["ada@example.com"]);
const shortlist = ref<string[]>(["blue", "green"]);
const aliases = ref<string[]>(["ux", "ux"]);
const locked = ref<string[]>(["invoice", "q3"]);
const labels = ref<string[]>([]);

// What a refusal means is the host's decision. Here it is only printed; in a
// real application this is where a suggestion, a limit upgrade or a link to
// whoever owns the list goes.
const lastRefusal = ref("");
function onReject(rejections: TagsInputRejection[]): void {
  lastRefusal.value = rejections.map(({ value, reason }) => `${value} (${reason})`).join(", ");
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-8">
    <div class="flex flex-col gap-2">
      <p class="text-xs text-muted-foreground">
        Type and press Enter, or type a comma. Backspace on an empty box lifts the last token back
        in to be edited rather than deleting it.
      </p>
      <TagsInput v-model="keywords" aria-label="Keywords" placeholder="Add a keyword" />
    </div>

    <div class="flex flex-col gap-2">
      <p class="text-xs text-muted-foreground">
        Tokens that are people. Every remove control is named for the person it removes, which is
        what <code>labels.remove</code> is for.
      </p>
      <TagsInput
        v-model="recipients"
        clearable
        aria-label="Recipients"
        placeholder="Add a recipient"
        :labels="{
          remove: ({ value }) => `Remove ${value} from the recipients`,
          count: ({ count }) => (count === 1 ? '1 recipient' : `${String(count)} recipients`),
          clear: 'Remove every recipient',
        }"
      />
    </div>

    <div class="flex flex-col gap-2">
      <p class="text-xs text-muted-foreground">
        Three at most, and no repeats. A refused value is announced, said on screen, handed back to
        the box and reported through <code>reject</code>.
      </p>
      <TagsInput
        v-model="shortlist"
        :max="3"
        aria-label="Shortlist"
        placeholder="Add a colour"
        @reject="onReject"
      />
      <p v-if="lastRefusal" class="text-xs text-muted-foreground">Refused: {{ lastRefusal }}</p>
    </div>

    <div class="flex flex-col gap-2">
      <p class="text-xs text-muted-foreground">
        <code>duplicates</code> allows the same value twice, for a list where a repeat means
        something — a tally rather than a set.
      </p>
      <TagsInput v-model="aliases" duplicates aria-label="Aliases" placeholder="Add an alias" />
    </div>

    <div class="flex flex-col gap-2">
      <p class="text-xs text-muted-foreground">
        Three resting appearances, each parting from the last on the fill, the text colour and the
        border weight rather than on hue alone. Read-only shows the tokens and takes nothing: still
        focusable, still submitted, with no remove control at all. Disabled is unavailable — not a
        tab stop, and drained a step further.
      </p>
      <TagsInput :model-value="locked" aria-label="Editable filters" />
      <TagsInput :model-value="locked" readonly aria-label="Applied filters" />
      <TagsInput :model-value="locked" disabled aria-label="Archived filters" />
    </div>

    <!-- Nothing is passed to the field here: the row publishes its own id, its
         error, its name and `required`, and the field reads all four. -->
    <Field
      label="Labels"
      error="Add at least one label"
      hint="Press Enter or type a comma"
      name="labels"
      required
    >
      <TagsInput v-model="labels" placeholder="Add a label" />
    </Field>
  </div>
</template>
