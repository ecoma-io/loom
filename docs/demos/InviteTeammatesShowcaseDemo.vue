<script setup lang="ts">
import { ref } from "vue";
import { UserPlus } from "@lucide/vue";
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  EmptyState,
  Field,
  List,
  ListItem,
  LiveRegion,
  optional,
  Select,
  TextField,
  ToastStack,
  useAnnounce,
  type BadgeVariant,
  type SelectOption,
  type ToastStackItem,
} from "@ecoma-io/loom";

// The announcement seam, mounted before anything happens: one polite region
// beside the surface, written to on submit (the mount LiveRegion's page
// recommends).
const announce = useAnnounce();

const roleOptions: SelectOption[] = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

type RoleValue = (typeof roleOptions)[number]["value"];

// The badge text carries the role; the tint is a second signal for a reader
// who sees colour, never the only one.
const roleTone: Record<RoleValue, BadgeVariant> = {
  admin: "accent",
  editor: "info",
  viewer: "outline",
};

function roleLabel(value: string): string {
  return roleOptions.find((option) => option.value === value)?.label ?? value;
}

function initialsOf(address: string): string {
  return address.slice(0, 2).toUpperCase();
}

interface Member {
  id: number;
  email: string;
  role: RoleValue;
}

// The state the reader drives: the list starts empty, and every member in it
// arrived through the dialog below.
const members = ref<Member[]>([]);
let nextMemberId = 1;

const inviteOpen = ref(false);
const email = ref("");
const role = ref("");
const emailError = ref("");
const roleError = ref("");

function openInvite() {
  // A fresh draft each time — a form that reopens holding the rejected
  // values of the last attempt is its own small defect.
  email.value = "";
  role.value = "";
  emailError.value = "";
  roleError.value = "";
  inviteOpen.value = true;
}

function sendInvite() {
  const address = email.value.trim();
  emailError.value = !address
    ? "An email address is required."
    : /^\S+@\S+\.\S+$/.test(address)
      ? ""
      : "That address does not look complete.";
  roleError.value = role.value ? "" : "Choose the role they start with.";
  if (emailError.value || roleError.value) return;

  members.value = [
    ...members.value,
    { id: nextMemberId++, email: address, role: role.value as RoleValue },
  ];

  // Feedback in two registers: the live region says it in words, the toast
  // puts it on screen where it can be dismissed. The queue is the host's —
  // this demo is the host.
  announce(`Invitation sent to ${address}`);
  toasts.value = [
    ...toasts.value,
    {
      id: nextToastId++,
      title: "Invitation sent",
      description: `${address} · ${roleLabel(role.value)}`,
      variant: "success",
    },
  ];

  inviteOpen.value = false;
}

const toasts = ref<ToastStackItem[]>([]);
let nextToastId = 1;

function dismissToast(id: string | number) {
  toasts.value = toasts.value.filter((toast) => toast.id !== id);
}
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <LiveRegion politeness="polite" />

    <div class="rounded-lg border border-border bg-card">
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"
      >
        <h3 id="showcase-invite-members" class="text-title">Team members</h3>
        <Dialog
          v-model:open="inviteOpen"
          title="Invite a teammate"
          description="They will get an email with a link to join this workspace."
        >
          <template #trigger>
            <Button variant="primary" size="sm">Invite a teammate</Button>
          </template>
          <form class="flex flex-col gap-4" novalidate @submit.prevent="sendInvite">
            <Field
              v-bind="
                optional({
                  label: 'Email',
                  name: 'invite-email',
                  error: emailError || undefined,
                  required: true,
                })
              "
            >
              <TextField v-model="email" type="email" placeholder="teammate@company.com" />
            </Field>
            <Field
              v-bind="
                optional({
                  label: 'Role',
                  name: 'invite-role',
                  hint: 'You can change this later.',
                  error: roleError || undefined,
                  required: true,
                })
              "
            >
              <!-- Like `<Textarea>` in the Field demo: the a11y rule
                   lowercases the tag, so `<Select>` reads to it as a bare
                   native `<select>` and cannot follow a name that arrives
                   through Field context at runtime. -->
              <!-- eslint-disable-next-line vuejs-accessibility/form-control-has-label -->
              <Select v-model="role" :options="roleOptions" placeholder="Choose a role" />
            </Field>
          </form>
          <template #footer>
            <Button variant="subtle" @click="inviteOpen = false">Cancel</Button>
            <Button variant="primary" @click="sendInvite">Send invite</Button>
          </template>
        </Dialog>
      </div>

      <!-- Empty is the welcome: the block explains the region and invites
           exactly one next step — the same dialog the header button opens. -->
      <EmptyState
        v-if="members.length === 0"
        title="No teammates yet"
        description="Invite your first collaborator and this list becomes your team."
      >
        <template #icon><UserPlus /></template>
        <template #action>
          <Button variant="primary" @click="openInvite">Invite a teammate</Button>
        </template>
      </EmptyState>

      <List v-else aria-labelledby="showcase-invite-members">
        <ListItem
          v-for="member in members"
          :key="member.id"
          :title="member.email"
          description="Invite pending"
        >
          <template #leading>
            <Avatar :fallback="initialsOf(member.email)" size="sm" />
          </template>
          <template #trailing>
            <Badge v-bind="optional({ variant: roleTone[member.role] })">
              {{ roleLabel(member.role) }}
            </Badge>
          </template>
        </ListItem>
      </List>
    </div>

    <ToastStack :items="toasts" @dismiss="dismissToast" />
  </div>
</template>
