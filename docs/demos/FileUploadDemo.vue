<script setup lang="ts">
import { ref } from "vue";
import FileUpload, { type FileUploadRejection } from "./FileUpload.vue";

const attachments = ref<File[]>([]);
const avatar = ref<File[]>([]);
const spreadsheet = ref<File[]>([]);

// A stand-in for a file the host already had, so the disabled zone shows a
// list rather than an empty box.
const locked = ref<File[]>([
  new File(["signed"], "contract-2026.pdf", { type: "application/pdf" }),
]);

// What a refusal means is the host's decision. Here it is only printed; in a
// real application this is where a retry, a conversion offer or a support link
// goes.
const lastRefusal = ref("");
function onReject(rejections: FileUploadRejection[]): void {
  lastRefusal.value = rejections
    .map((rejection) => `${rejection.file.name} (${rejection.reason})`)
    .join(", ");
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-8">
    <div class="flex flex-col gap-2">
      <p class="text-xs text-muted-foreground">
        Several files: each new choice is added to the list, not swapped for it.
      </p>
      <!-- No aria-label anywhere on this page: the zone's own copy is inside
           the <label> that wraps the input, so it already is the accessible
           name. Adding one would replace that name with a worse one. -->
      <FileUpload v-model="attachments" multiple label="Choose attachments or drag them here" />
    </div>

    <div class="flex flex-col gap-2">
      <p class="text-xs text-muted-foreground">
        One file only: a second choice replaces the first, exactly as the native input does. The
        hint is derived from <code>maxSize</code> because none was written.
      </p>
      <FileUpload
        v-model="avatar"
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        :max-size="512 * 1024"
        label="Choose a profile picture"
      />
    </div>

    <div class="flex flex-col gap-2">
      <p class="text-xs text-muted-foreground">
        A narrow accept list and a small limit. Offer something else and the refusal is announced,
        named and handed to the host.
      </p>
      <FileUpload
        v-model="spreadsheet"
        multiple
        accept=".csv,text/csv"
        :max-size="64 * 1024"
        label="Choose a CSV export"
        hint="CSV only, up to 64 KB"
        @reject="onReject"
      />
      <p v-if="lastRefusal" class="text-xs text-muted-foreground">
        The host was told: <span class="tabular">{{ lastRefusal }}</span>
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <p class="text-xs text-muted-foreground">
        Invalid: the destructive border and <code>aria-invalid</code>, the same error language every
        other form control speaks. The message itself belongs to the field around it.
      </p>
      <FileUpload invalid label="Choose a signed copy" />
    </div>

    <div class="flex flex-col gap-2">
      <p class="text-xs text-muted-foreground">
        Disabled: the zone, the file dialog and every remove button refuse together.
      </p>
      <FileUpload v-model="locked" disabled multiple label="Choose a contract" />
    </div>

    <p class="text-xs text-muted-foreground">
      Chosen: <span class="tabular">{{ attachments.length }}</span> attachment(s) — the File objects
      themselves, ready for whatever uploads them.
    </p>
  </div>
</template>
