<script setup lang="ts">
import { computed, ref } from "vue";
import Combobox, { type ComboboxOption } from "@ecoma-io/loom-combobox";

const countries: ComboboxOption[] = [
  { value: "au", label: "Australia" },
  { value: "br", label: "Brazil" },
  { value: "ca", label: "Canada" },
  { value: "de", label: "Germany" },
  { value: "es", label: "Spain" },
  { value: "fr", label: "France" },
  { value: "id", label: "Indonesia" },
  { value: "in", label: "India" },
  { value: "jp", label: "Japan" },
  { value: "kr", label: "South Korea" },
  { value: "mx", label: "Mexico" },
  { value: "ng", label: "Nigeria" },
  { value: "ph", label: "Philippines" },
  { value: "se", label: "Sweden" },
  { value: "th", label: "Thailand" },
  { value: "vn", label: "Viet Nam" },
  { value: "za", label: "South Africa", disabled: true },
];

const country = ref("vn");
const destination = ref("");
const size = ref("fr");
const locked = ref("jp");

// The host-driven half: this list is produced here rather than filtered by the
// component, so the search can reach the two-letter code as well as the name —
// "vn" finds Viet Nam. `filter` is off for exactly that reason; left on, the
// component would filter these results a second time against a string none of
// them contains.
const search = ref("");
const found = computed(() => {
  const needle = search.value.trim().toLowerCase();
  if (!needle) return countries;
  return countries.filter(
    (option) =>
      option.label.toLowerCase().includes(needle) || option.value.toLowerCase().includes(needle),
  );
});
const byCode = ref("");

// Multi-select. The model is an array here and a string above, which is the
// whole `multiple` contract: the mode decides which side of the union arrives.
const visited = ref<string[]>(["br", "jp", "se", "th", "vn"]);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span id="combobox-demo-country" class="text-xs text-muted-foreground">
        country — seventeen rows, one of them unavailable
      </span>
      <Combobox
        v-model="country"
        :options="countries"
        placeholder="Search countries"
        aria-labelledby="combobox-demo-country"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="combobox-demo-empty" class="text-xs text-muted-foreground">
        nothing chosen yet — type "zz" to see the empty row
      </span>
      <Combobox
        v-model="destination"
        :options="countries"
        placeholder="Where to?"
        empty-message="No country by that name"
        aria-labelledby="combobox-demo-empty"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="combobox-demo-search" class="text-xs text-muted-foreground">
        host-driven search — "vn" finds Viet Nam by its code
      </span>
      <Combobox
        v-model="byCode"
        :options="found"
        :filter="false"
        placeholder="Name or code"
        aria-labelledby="combobox-demo-search"
        @update:query="search = $event"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="combobox-demo-visited" class="text-xs text-muted-foreground">
        several at once — five chosen, three shown and a count for the rest
      </span>
      <Combobox
        v-model="visited"
        multiple
        :options="countries"
        placeholder="Add a country"
        aria-labelledby="combobox-demo-visited"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="combobox-demo-sizes" class="text-xs text-muted-foreground">
        the three heights, on the same scale as a text input
      </span>
      <Combobox
        v-model="size"
        :options="countries"
        size="sm"
        aria-labelledby="combobox-demo-sizes"
      />
      <Combobox v-model="size" :options="countries" size="md" aria-label="Country, medium" />
      <Combobox v-model="size" :options="countries" size="lg" aria-label="Country, large" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="combobox-demo-locked" class="text-xs text-muted-foreground">disabled</span>
      <Combobox
        v-model="locked"
        :options="countries"
        disabled
        aria-labelledby="combobox-demo-locked"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="combobox-demo-invalid" class="text-xs text-muted-foreground">invalid</span>
      <Combobox
        :options="countries"
        invalid
        placeholder="Pick one to continue"
        aria-labelledby="combobox-demo-invalid"
      />
    </div>

    <p class="text-xs text-muted-foreground">
      Chosen country: <span class="tabular">{{ country }}</span> — the value, not the label.
      Visited: <span class="tabular">{{ visited.join(", ") || "none" }}</span>
    </p>
  </div>
</template>
