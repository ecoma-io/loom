<script setup lang="ts">
import { ref } from "vue";
import AlertDialog from "./AlertDialog.vue";
import Button from "../Button/Button.vue";

const deleteOpen = ref(false);
const discardOpen = ref(false);
const publishOpen = ref(false);

// The demo reports what each alert resolved to, because "focus opens on
// Cancel" is only visible as an outcome: open one from the keyboard, press
// Enter without reading, and watch it come back cancelled.
const outcome = ref("Nothing decided yet.");
function settle(what: string, decision: string) {
  outcome.value = `${what} — ${decision}.`;
}
</script>

<template>
  <div class="flex max-w-xl flex-col gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <!-- The label is a verb, and it is what says this button destroys
           something. The destructive paint only adds emphasis to it. -->
      <AlertDialog
        v-model:open="deleteOpen"
        title="Delete workflow?"
        description="Every scene in it goes too, and this cannot be undone."
        :labels="{ confirm: 'Delete permanently', cancel: 'Keep it' }"
        destructive
        @confirm="settle('Delete workflow', 'deleted')"
        @cancel="settle('Delete workflow', 'kept')"
      >
        <template #trigger><Button variant="destructive">Delete workflow</Button></template>
      </AlertDialog>

      <AlertDialog
        v-model:open="discardOpen"
        title="Discard unsaved changes?"
        description="Four edits made since the last save will be lost."
        :labels="{ confirm: 'Discard changes', cancel: 'Keep editing' }"
        destructive
        @confirm="settle('Unsaved changes', 'discarded')"
        @cancel="settle('Unsaved changes', 'still editing')"
      >
        <template #trigger><Button variant="outline">Leave the editor</Button></template>
      </AlertDialog>

      <!-- Not every alert is destructive. This one is irreversible rather than
           damaging, so the action keeps the primary paint and the verb still
           does the work. -->
      <AlertDialog
        v-model:open="publishOpen"
        title="Publish to every subscriber?"
        description="Eleven thousand people receive this immediately, and a published run cannot be recalled."
        :labels="{ confirm: 'Publish now', cancel: 'Not yet' }"
        @confirm="settle('Publish', 'sent')"
        @cancel="settle('Publish', 'held back')"
      >
        <template #trigger><Button variant="primary">Publish</Button></template>
      </AlertDialog>
    </div>

    <p class="text-sm text-muted-foreground" role="status">{{ outcome }}</p>
  </div>
</template>
