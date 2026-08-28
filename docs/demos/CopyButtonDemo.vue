<script setup lang="ts">
import { ref } from "vue";
import { CopyButton } from "@ecoma-io/loom";

const installCommand = "pnpm add @ecoma-io/loom";
const shareUrl = "https://loom.ecoma.io";

// A getText host: the snippet only exists once the consumer asks for it —
// here, when the button is clicked.
const dynamicSnippet = ref("(nothing generated yet)");
let generated = 0;
function generateSnippet(): string {
  generated += 1;
  dynamicSnippet.value = `loom.query({ take: ${generated * 10} })`;
  return dynamicSnippet.value;
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center gap-3">
      <code class="rounded-md bg-subtle px-3 py-1.5 font-mono text-sm text-foreground">
        {{ installCommand }}
      </code>
      <CopyButton :value="installCommand" />
    </div>

    <div class="flex items-center gap-3">
      <code class="rounded-md bg-subtle px-3 py-1.5 font-mono text-sm text-foreground">
        {{ shareUrl }}
      </code>
      <CopyButton
        :value="shareUrl"
        variant="ghost"
        size="sm"
        :labels="{
          copy: 'Copy page link',
          copied: 'Page link copied',
          failed: 'Could not copy the page link',
        }"
      />
    </div>

    <div class="flex items-center gap-3">
      <code class="rounded-md bg-subtle px-3 py-1.5 font-mono text-sm text-foreground">
        {{ dynamicSnippet }}
      </code>
      <CopyButton
        :get-text="generateSnippet"
        variant="secondary"
        size="sm"
        :labels="{
          copy: 'Copy the generated snippet',
          copied: 'Snippet copied',
          failed: 'Could not copy the snippet',
        }"
      />
    </div>
  </div>
</template>
