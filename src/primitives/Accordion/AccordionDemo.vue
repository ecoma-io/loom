<script setup lang="ts">
import Accordion, { type AccordionItem } from "./Accordion.vue";

const sections: AccordionItem[] = [
  { value: "overview", label: "Overview" },
  { value: "features", label: "Features" },
  { value: "pricing", label: "Pricing" },
  { value: "faq", label: "FAQ", disabled: true },
];

const multiSections: AccordionItem[] = [
  { value: "account", label: "Account settings" },
  { value: "notifications", label: "Notifications" },
  { value: "privacy", label: "Privacy" },
  { value: "security", label: "Security" },
];
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Single accordion: only one panel open at a time. -->
    <div>
      <div class="text-sm font-medium text-foreground">Single accordion</div>
      <div class="text-xs text-muted-foreground">
        One panel open at a time. Collapsible, so the open item can close too.
      </div>
      <div class="rounded border border-border mt-2 p-2">
        <Accordion :items="sections">
          <template #default="{ item }">
            <div>{{ item.label }} — this is the panel content for the single accordion.</div>
          </template>
        </Accordion>
      </div>
    </div>

    <!-- Multiple accordion: several panels open at once. -->
    <div>
      <div class="text-sm font-medium text-foreground">Multiple accordion</div>
      <div class="text-xs text-muted-foreground">Several panels can be open at the same time.</div>
      <div class="rounded border border-border mt-2 p-2">
        <Accordion :items="multiSections" type="multiple">
          <template #default="{ item }">
            <div>{{ item.label }} — this is the panel content for the multiple accordion.</div>
          </template>
        </Accordion>
      </div>
    </div>

    <!-- Gap sizes. -->
    <div>
      <div class="text-sm font-medium text-foreground">Gap sizes</div>
      <div class="text-xs text-muted-foreground">
        sm, md and lg tighten below the sm breakpoint.
      </div>
      <div class="flex flex-col gap-4 mt-2">
        <div class="rounded border border-border p-2">
          <div class="text-xs text-muted-foreground mb-1">sm</div>
          <Accordion :items="sections.slice(0, 2)" gap="sm">
            <template #default="{ item }">
              <div>{{ item.label }} content</div>
            </template>
          </Accordion>
        </div>
        <div class="rounded border border-border p-2">
          <div class="text-xs text-muted-foreground mb-1">md (default)</div>
          <Accordion :items="sections.slice(0, 2)" gap="md">
            <template #default="{ item }">
              <div>{{ item.label }} content</div>
            </template>
          </Accordion>
        </div>
        <div class="rounded border border-border p-2">
          <div class="text-xs text-muted-foreground mb-1">lg</div>
          <Accordion :items="sections.slice(0, 2)" gap="lg">
            <template #default="{ item }">
              <div>{{ item.label }} content</div>
            </template>
          </Accordion>
        </div>
      </div>
    </div>
  </div>
</template>
