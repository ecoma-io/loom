<script setup lang="ts">
import { ref } from "vue";
import Drawer from "@ecoma-io/loom-drawer";
import Button from "@ecoma-io/loom-button";
import Checkbox from "@ecoma-io/loom-checkbox";

const filtersOpen = ref(false);
const navigationOpen = ref(false);
const detailOpen = ref(false);
const draftOpen = ref(false);

const includeDrafts = ref(true);
const includeArchived = ref(false);

const scenes = [
  "Opening titles",
  "Establishing shot",
  "Interview — first pass",
  "Interview — second pass",
  "B-roll, exterior",
  "B-roll, interior",
  "Product close-up",
  "Testimonial one",
  "Testimonial two",
  "Data montage",
  "Call to action",
  "End card",
];
</script>

<template>
  <div class="flex w-full max-w-2xl flex-wrap items-center gap-3">
    <!-- The canonical case: a filter rail on the trailing edge, tuned while the
         table it filters stays visible beside it. -->
    <Drawer
      v-model:open="filtersOpen"
      size="sm"
      title="Filters"
      description="Narrow the scene list without leaving it."
    >
      <template #trigger><Button variant="outline">Filters (right, sm)</Button></template>
      <div class="flex flex-col gap-4">
        <Checkbox v-model="includeDrafts" label="Include drafts" />
        <Checkbox v-model="includeArchived" label="Include archived" />
      </div>
      <template #footer>
        <Button variant="subtle" @click="filtersOpen = false">Reset</Button>
        <Button variant="primary" @click="filtersOpen = false">Apply</Button>
      </template>
    </Drawer>

    <!-- Navigation belongs on the leading edge, which is where a reader already
         looks for it. -->
    <Drawer v-model:open="navigationOpen" side="left" size="sm" title="Sections">
      <template #trigger><Button variant="outline">Sections (left, sm)</Button></template>
      <nav class="flex flex-col gap-1" aria-label="Sections">
        <a
          v-for="section in ['Overview', 'Scenes', 'Assets', 'Exports']"
          :key="section"
          href="#"
          class="rounded-md px-2 py-1.5 text-sm hover:bg-subtle"
          @click.prevent="navigationOpen = false"
          >{{ section }}</a
        >
      </nav>
    </Drawer>

    <!-- Long enough to overflow: the list scrolls, the title and the footer do
         not move with it. -->
    <Drawer
      v-model:open="detailOpen"
      title="Composition detail"
      description="A body taller than the panel scrolls on its own."
    >
      <template #trigger><Button variant="outline">Detail (right, md)</Button></template>
      <ol class="flex flex-col gap-2 text-sm">
        <li
          v-for="(scene, index) in scenes"
          :key="scene"
          class="rounded-md border border-border px-3 py-2"
        >
          <span class="tabular text-muted-foreground">{{ index + 1 }}</span>
          — {{ scene }}
        </li>
      </ol>
      <template #footer>
        <Button variant="subtle" @click="detailOpen = false">Close</Button>
      </template>
    </Drawer>

    <!-- `dismissible` off: a stray click on the page cannot throw away an
         unsaved edit, and no drag handle is drawn because there is nothing to
         drag towards. Esc and the corner control still close it, so the panel
         is never a trap. -->
    <Drawer
      v-model:open="draftOpen"
      side="bottom"
      size="sm"
      title="Unsaved caption"
      description="Dismissible is off — a click outside will not discard this."
      :dismissible="false"
    >
      <template #trigger><Button variant="outline">Edit caption (bottom sheet)</Button></template>
      <p class="text-sm text-muted-foreground">
        A sheet is the narrow-screen shape of the same panel. Press Esc, or the control in the
        corner, to leave.
      </p>
      <template #footer>
        <Button variant="subtle" @click="draftOpen = false">Discard</Button>
        <Button variant="primary" @click="draftOpen = false">Save caption</Button>
      </template>
    </Drawer>
  </div>
</template>
