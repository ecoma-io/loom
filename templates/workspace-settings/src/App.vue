<script setup lang="ts">
// Every import here is a published specifier — that is the whole point of a
// template. An internal `@ecoma-io/loom-*` import would fail the dev server
// (this template's Vite config aliases only the named published specifiers)
// and redden `archkeep check` (the layer-templates row judges the resolved
// target). If the surface cannot express something, file the gap rather than
// reach past it.
import {
  Button,
  Field,
  FormActions,
  FormLayout,
  FormSection,
  PageHeader,
  Select,
  Switch,
  TextField,
} from "@ecoma-io/loom";
import { ref } from "vue";

// A template owns one page. The shell around it — sidebar, header, routing,
// theme switching — is application territory the consumer's own app provides;
// this file is the page they build on, and stops there.
// ---------------------------------------------------------------------------
// Settings. A form layout, two fieldsets' worth of fields, and actions that
// a real project wires to its API. The submit button sits inside the <form>,
// so it submits natively — no click handler needed.
// ---------------------------------------------------------------------------
const workspaceName = ref("Acme Inc");
const supportEmail = ref("support@acme.example");
const defaultRange = ref("30");
const emailDigest = ref(true);

function save(): void {
  // Wire your API call here. The template stops at the boundary a real app
  // owns: what "saved" means is your backend's answer, not the template's.
}

function resetForm(): void {
  workspaceName.value = "Acme Inc";
  supportEmail.value = "support@acme.example";
  defaultRange.value = "30";
  emailDigest.value = true;
}

const rangeOptions = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];
</script>

<template>
  <main class="focus:outline-none">
    <div class="py-8">
      <!-- The form owns submission: Save renders inside it, so the native
           submit path fires and @submit.prevent keeps the page from
           reloading. Cancel resets the fields to their initial values. -->
      <form @submit.prevent="save">
        <FormLayout max-width="lg">
          <template #header>
            <PageHeader
              title="Settings"
              description="Workspace profile and delivery preferences."
            />
          </template>

          <FormSection
            legend="Workspace profile"
            description="How your workspace appears to teammates."
          >
            <Field label="Workspace name" name="workspace-name" required>
              <TextField v-model="workspaceName" placeholder="Your company" />
            </Field>
            <Field
              label="Support email"
              name="support-email"
              hint="Shown to customers on billing emails."
            >
              <TextField
                v-model="supportEmail"
                type="email"
                placeholder="support@yourcompany.com"
              />
            </Field>
          </FormSection>

          <FormSection
            legend="Delivery preferences"
            description="How often Loom reports activity to your inbox."
          >
            <Field label="Default report range" name="default-range">
              <!-- The a11y rule reads `<Select>` as a bare native `<select>`
                   and cannot follow a label arriving through the Field's
                   slot — the same false positive FieldDemo quiets. -->
              <!-- eslint-disable-next-line vuejs-accessibility/form-control-has-label -->
              <Select v-model="defaultRange" :options="rangeOptions" />
            </Field>
            <div class="flex items-center justify-between gap-4">
              <span id="email-digest-label" class="text-sm">Weekly email digest</span>
              <Switch v-model="emailDigest" aria-labelledby="email-digest-label" />
            </div>
          </FormSection>

          <template #actions>
            <FormActions>
              <template #cancel>
                <Button variant="subtle" type="button" @click="resetForm">Cancel</Button>
              </template>
              <Button variant="primary" type="submit">Save changes</Button>
            </FormActions>
          </template>
        </FormLayout>
      </form>
    </div>
  </main>
</template>
