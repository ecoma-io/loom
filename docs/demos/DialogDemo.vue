<script setup lang="ts">
import { ref } from "vue";
import Dialog from "@ecoma-io/loom-dialog";
import Button from "@ecoma-io/loom-button";

const renameOpen = ref(false);
const confirmOpen = ref(false);
const authoringOpen = ref(false);
const settingsOpen = ref(false);
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <Dialog
      v-model:open="renameOpen"
      title="Rename composition"
      description="The new name applies to every scene at once."
    >
      <template #trigger><Button variant="outline">Rename</Button></template>
      <p class="text-sm text-muted-foreground">
        Pick something memorable — this is what the library search matches on.
      </p>
      <template #footer>
        <Button variant="subtle" @click="renameOpen = false">Cancel</Button>
        <Button variant="primary" @click="renameOpen = false">Save</Button>
      </template>
    </Dialog>

    <Dialog v-model:open="confirmOpen" title="Delete scene?" description="This cannot be undone.">
      <template #trigger><Button variant="destructive">Delete scene</Button></template>
      <template #footer>
        <Button variant="subtle" @click="confirmOpen = false">Keep it</Button>
        <Button variant="destructive" @click="confirmOpen = false">Delete permanently</Button>
      </template>
    </Dialog>

    <!-- hideTitle: the panel's own heading carries the visual name, so the
         dialog's title would be a second one. It stays as the accessible name. -->
    <Dialog v-model:open="settingsOpen" size="lg" title="Export settings" hide-title>
      <template #trigger><Button variant="subtle">Export settings (lg)</Button></template>
      <h3 class="text-title">Export settings</h3>
      <p class="mt-2 text-sm text-muted-foreground">
        A form with several sections has room at this width without becoming an authoring surface.
      </p>
      <template #footer>
        <Button variant="primary" @click="settingsOpen = false">Done</Button>
      </template>
    </Dialog>

    <!-- size="xl": an authoring surface living in a dialog. The panel widens,
         and the width stays the primitive's decision. -->
    <Dialog
      v-model:open="authoringOpen"
      size="xl"
      title="Compose workflow"
      description="An authoring surface — size xl, 64rem."
      :closable="false"
    >
      <template #trigger><Button variant="outline">Open editor (xl)</Button></template>
      <p class="text-sm text-muted-foreground">
        A long, multi-section form has room at this width instead of scrolling inside a confirm box.
        With <code>closable</code> off there is no corner button, and Esc or the overlay is the way
        out.
      </p>
      <template #footer>
        <Button variant="subtle" @click="authoringOpen = false">Close</Button>
      </template>
    </Dialog>
  </div>
</template>
