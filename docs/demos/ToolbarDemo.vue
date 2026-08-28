<script setup lang="ts">
import { Bold, Italic, Underline } from "@lucide/vue";
import { ref } from "vue";
import { IconButton, Select, TextField, Toolbar, ToolbarSeparator } from "@ecoma-io/loom";
import type { SelectOption } from "@ecoma-io/loom";

const active = ref({ bold: false, italic: false });
const fontSize = ref("14");
const find = ref("");

const FONT_SIZES: SelectOption[] = [
  { value: "12", label: "12 px" },
  { value: "14", label: "14 px" },
  { value: "16", label: "16 px" },
];
</script>

<template>
  <div class="max-w-xl">
    <Toolbar label="Document tools">
      <IconButton
        label="Bold"
        variant="ghost"
        :class="active.bold ? 'bg-subtle' : ''"
        @click="active.bold = !active.bold"
      >
        <Bold class="size-4" />
      </IconButton>
      <IconButton
        label="Italic"
        variant="ghost"
        :class="active.italic ? 'bg-subtle' : ''"
        @click="active.italic = !active.italic"
      >
        <Italic class="size-4" />
      </IconButton>
      <!-- A disabled control keeps its slot in the walk order but is never a
           stop — the arrow keys hop over it, as the pattern prescribes. -->
      <IconButton label="Underline" variant="ghost" disabled>
        <Underline class="size-4" />
      </IconButton>
      <ToolbarSeparator />
      <Select v-model="fontSize" :options="FONT_SIZES" aria-label="Font size" class="w-24" />
      <ToolbarSeparator />
      <TextField v-model="find" aria-label="Find" placeholder="Find" class="w-32" />
    </Toolbar>
    <p aria-live="polite" class="mt-2 text-small text-muted-foreground">
      Font size {{ fontSize }} px · {{ active.bold ? "bold" : "regular"
      }}{{ active.italic ? ", italic" : "" }} · Find: {{ find || "—" }}
    </p>
  </div>
</template>
