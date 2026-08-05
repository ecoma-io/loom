<script setup lang="ts">
import { ref } from "vue";
import NumberField from "./NumberField.vue";

const x = ref(120);
const rotation = ref(45);
const opacity = ref(80);
const locked = ref(50);

// The last committed value of each field, so the transient/committed split is
// visible on the page rather than only described by it.
const committed = ref<string[]>([]);
function record(label: string, value: number) {
  committed.value = [`${label} → ${String(value)}`, ...committed.value].slice(0, 4);
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span id="number-field-demo-x" class="text-xs text-muted-foreground">x — the default</span>
      <NumberField
        v-model="x"
        unit="px"
        aria-labelledby="number-field-demo-x"
        @commit="(value) => record('x', value)"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="number-field-demo-rotation" class="text-xs text-muted-foreground">
        rotation — clamped to -180…180
      </span>
      <NumberField
        v-model="rotation"
        :min="-180"
        :max="180"
        unit="deg"
        aria-labelledby="number-field-demo-rotation"
        @commit="(value) => record('rotation', value)"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="number-field-demo-opacity" class="text-xs text-muted-foreground">
        opacity — no unit, step 5
      </span>
      <NumberField
        v-model="opacity"
        :min="0"
        :max="100"
        :step="5"
        aria-labelledby="number-field-demo-opacity"
        @commit="(value) => record('opacity', value)"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="number-field-demo-locked" class="text-xs text-muted-foreground">
        width — disabled
      </span>
      <NumberField
        :model-value="locked"
        unit="px"
        disabled
        aria-labelledby="number-field-demo-locked"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="number-field-demo-invalid" class="text-xs text-muted-foreground">
        duration — invalid, in conflict with another field
      </span>
      <NumberField :model-value="0" unit="s" invalid aria-labelledby="number-field-demo-invalid" />
    </div>

    <div class="flex flex-col gap-1 text-xs text-muted-foreground">
      <span>Committed values — one entry per gesture, not one per tick:</span>
      <span v-if="committed.length === 0" class="tabular">drag or type in a field above</span>
      <span v-for="entry in committed" :key="entry" class="tabular">{{ entry }}</span>
    </div>
  </div>
</template>
