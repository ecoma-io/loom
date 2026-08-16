<script setup lang="ts">
import { ref } from "vue";
import Editable from "@ecoma-io/loom-editable";
import Field from "@ecoma-io/loom-field";

const title = ref("Q3 operations review");
const owner = ref("Mai Phương");
const region = ref("Northern");
const nickname = ref("");
const sku = ref("LM-4471-A");
const rate = ref("18");

// What a host actually receives, shown rather than described: the model moves
// once per commit, and an abandoned edit reports itself instead.
const lastEvent = ref("nothing yet");
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span id="editable-demo-title" class="text-xs text-muted-foreground">
        a record title — click it, Enter commits, Escape restores
      </span>
      <div class="text-lg font-semibold">
        <Editable
          v-model="title"
          aria-labelledby="editable-demo-title"
          @submit="(value) => (lastEvent = `submit: ${value}`)"
          @cancel="lastEvent = 'cancel'"
        />
      </div>
      <p class="text-xs text-muted-foreground">
        last event: <span class="tabular">{{ lastEvent }}</span>
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <span id="editable-demo-owner" class="text-xs text-muted-foreground">
        a table cell — double click, because one click already picks the row
      </span>
      <Editable v-model="owner" activation-mode="dblclick" aria-labelledby="editable-demo-owner" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="editable-demo-region" class="text-xs text-muted-foreground">
        focus mode — Tab lands straight in the editor, Escape hands focus back
      </span>
      <Editable v-model="region" activation-mode="focus" aria-labelledby="editable-demo-region" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="editable-demo-nickname" class="text-xs text-muted-foreground">
        empty, with a placeholder — and this one may be cleared again
      </span>
      <Editable
        v-model="nickname"
        allow-empty
        placeholder="Add a nickname"
        aria-labelledby="editable-demo-nickname"
      />
    </div>

    <Field label="Rate" hint="Percent, whole numbers only" name="rate">
      <Editable v-model="rate" :max-length="3" />
    </Field>

    <Field label="Region" error="Pick a region this team actually covers">
      <Editable model-value="Southern" />
    </Field>

    <div class="flex flex-col gap-2">
      <span id="editable-demo-sku" class="text-xs text-muted-foreground">
        read-only — reachable and copyable, never editable, and lifted onto a fill of its own
      </span>
      <Editable v-model="sku" readonly aria-labelledby="editable-demo-sku" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="editable-demo-locked" class="text-xs text-muted-foreground">
        disabled — a step further down the fill, the text colour and the border weight together
      </span>
      <Editable model-value="Archived record" disabled aria-labelledby="editable-demo-locked" />
    </div>

    <p class="text-sm">
      Owner
      <Editable v-model="owner" auto-resize aria-label="Owner, inline" />
      signs off this review.
    </p>
  </div>
</template>
