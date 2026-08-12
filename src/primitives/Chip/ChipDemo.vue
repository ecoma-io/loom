<script setup lang="ts">
import { computed, ref } from "vue";
import Chip from "./Chip.vue";
import Button from "../Button/Button.vue";

const severities = [
  { value: "error", label: "Errors", variant: "destructive" },
  { value: "warn", label: "Warnings", variant: "warning" },
  { value: "ok", label: "Passing", variant: "success" },
  { value: "agent", label: "Agent runs", variant: "ai" },
] as const;

// Many-of-many, and none-of-them is a valid answer — which is what a row of
// chips says and a segmented control cannot.
const active = ref<string[]>(["error"]);

function setActive(value: string, selected: boolean) {
  active.value = selected ? [...active.value, value] : active.value.filter((v) => v !== value);
}

const ROSTER = ["Ana Duarte", "Minh Tran", "Priya Raman"];
const recipients = ref([...ROSTER]);
const dismissed = computed(() => ROSTER.filter((name) => !recipients.value.includes(name)));

const region = ref(true);
const plan = ref(false);
const shownFacets = ref(["region", "plan"]);

const small = ref(true);
const medium = ref(false);
</script>

<template>
  <div class="flex w-full max-w-lg flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span id="chip-demo-filters" class="text-xs text-muted-foreground">
        filters — toggleable, several at once
      </span>
      <div role="group" aria-labelledby="chip-demo-filters" class="flex flex-wrap gap-2">
        <Chip
          v-for="severity in severities"
          :key="severity.value"
          :variant="severity.variant"
          :selected="active.includes(severity.value)"
          @update:selected="setActive(severity.value, $event)"
        >
          {{ severity.label }}
        </Chip>
      </div>
      <p class="text-xs text-muted-foreground">
        Showing:
        <span class="tabular">{{ active.length ? active.join(", ") : "everything" }}</span>
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <span id="chip-demo-recipients" class="text-xs text-muted-foreground">
        recipients — dismissable only, so the label is not a press target
      </span>
      <div role="group" aria-labelledby="chip-demo-recipients" class="flex flex-wrap gap-2">
        <Chip
          v-for="name in recipients"
          :key="name"
          variant="outline"
          removable
          :remove-label="`Remove ${name}`"
          @remove="recipients = recipients.filter((r) => r !== name)"
        >
          {{ name }}
        </Chip>
        <Button
          v-if="dismissed.length"
          variant="subtle"
          size="sm"
          @click="recipients = [...ROSTER]"
        >
          Restore {{ dismissed.length }}
        </Button>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span id="chip-demo-both" class="text-xs text-muted-foreground">
        both — the toggle and the dismiss control are siblings, two Tab stops on one chip
      </span>
      <div role="group" aria-labelledby="chip-demo-both" class="flex flex-wrap gap-2">
        <Chip
          v-if="shownFacets.includes('region')"
          v-model:selected="region"
          variant="primary"
          removable
          remove-label="Remove the region facet"
          @remove="shownFacets = shownFacets.filter((f) => f !== 'region')"
        >
          Region: EU
        </Chip>
        <Chip
          v-if="shownFacets.includes('plan')"
          v-model:selected="plan"
          variant="info"
          removable
          remove-label="Remove the plan facet"
          @remove="shownFacets = shownFacets.filter((f) => f !== 'plan')"
        >
          Plan: Scale
        </Chip>
        <Button
          v-if="shownFacets.length < 2"
          variant="subtle"
          size="sm"
          @click="shownFacets = ['region', 'plan']"
        >
          Restore facets
        </Button>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span id="chip-demo-sizes" class="text-xs text-muted-foreground">
        the two heights, on the same scale as a text input
      </span>
      <div role="group" aria-labelledby="chip-demo-sizes" class="flex flex-wrap items-center gap-2">
        <Chip v-model:selected="small" size="sm">Small</Chip>
        <Chip v-model:selected="medium" size="md">Medium</Chip>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span id="chip-demo-disabled" class="text-xs text-muted-foreground">disabled</span>
      <div role="group" aria-labelledby="chip-demo-disabled" class="flex flex-wrap gap-2">
        <Chip :selected="true" disabled>Locked filter</Chip>
        <Chip removable disabled remove-label="Remove the locked recipient">ana@ecoma.io</Chip>
      </div>
    </div>
  </div>
</template>
