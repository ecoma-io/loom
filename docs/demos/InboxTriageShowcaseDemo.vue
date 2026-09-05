<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Archive, Inbox, MoreHorizontal, Search, Star, Trash2 } from "@lucide/vue";
import {
  AlertDialog,
  Avatar,
  Badge,
  Button,
  Command,
  Dialog,
  Drawer,
  DropdownMenu,
  EmptyState,
  Field,
  IconButton,
  Kbd,
  List,
  ListItem,
  LiveRegion,
  MasterDetail,
  RowActions,
  SegmentedControl,
  Separator,
  Tabs,
  Textarea,
  ToastStack,
  Tooltip,
  VisuallyHidden,
  optional,
  useAnnounce,
  type BadgeVariant,
  type CommandGroup,
  type CommandItem,
  type DropdownMenuEntry,
  type SegmentedControlOption,
  type ToastStackItem,
} from "@ecoma-io/loom";

// The announcement seam, mounted before anything happens: one polite region
// beside the surface, written to on every triage action.
const announce = useAnnounce();

interface Thread {
  id: number;
  subject: string;
  from: string;
  initials: string;
  time: string;
  status: "new" | "open" | "waiting";
  flagged: boolean;
  body: string[];
}

// The host owns everything: five conversations arrive preloaded (an inbox
// that starts empty cannot demonstrate triage), and every action below
// mutates this array — no component holds list state.
const conversations = ref<Thread[]>([
  {
    id: 1,
    subject: "Invoice 4218 has the wrong billing address",
    from: "dana@northwind.example",
    initials: "DN",
    time: "09:12",
    status: "new",
    flagged: true,
    body: [
      "Hi — invoice 4218 lists our old address in Berlin, but we moved to Hamburg in March. Our finance system rejected the payment because the address on the invoice no longer matches our records.",
      "Could you reissue it with the current address? I can send the corrected details if that helps.",
    ],
  },
  {
    id: 2,
    subject: "Cannot sign in after the password reset",
    from: "kai@lumenlabs.example",
    initials: "KL",
    time: "09:58",
    status: "new",
    flagged: false,
    body: [
      "I reset my password this morning and now neither the old nor the new one works. The reset email links back to the same form and the loop repeats.",
      "I have a demo with a customer at 14:00 and really need access before then.",
    ],
  },
  {
    id: 3,
    subject: "Export to CSV is missing the tags column",
    from: "priya@atlasworks.example",
    initials: "PA",
    time: "11:30",
    status: "waiting",
    flagged: false,
    body: [
      "Following up on last week's report: the CSV export includes every column except tags, which is the one our reporting depends on.",
      "The JSON export has them, so it looks like the CSV writer skips the field.",
    ],
  },
  {
    id: 4,
    subject: "Two seats were added without an owner",
    from: "sam@brightside.example",
    initials: "SB",
    time: "12:04",
    status: "open",
    flagged: false,
    body: [
      "Our seat count jumped from 12 to 14 this morning but nobody here added anyone. Both extra seats show as active.",
      "We are billed per seat, so we would like them removed or assigned to real teammates — either works.",
    ],
  },
  {
    id: 5,
    subject: "Feature request: keyboard shortcuts for triage",
    from: "jules@ferndale.example",
    initials: "JF",
    time: "13:47",
    status: "open",
    flagged: false,
    body: [
      "We triage a few hundred conversations a day and do most of it from the keyboard. Archive, flag and reply as single keys would save our team real time.",
      "Happy to describe our current keymap if it is useful.",
    ],
  },
]);

// The badge text carries the status; the tint is a second signal for a
// reader who sees colour, never the only one.
const statusTone: Record<Thread["status"], BadgeVariant> = {
  new: "accent",
  open: "info",
  waiting: "warning",
};
const statusLabel: Record<Thread["status"], string> = {
  new: "New",
  open: "Open",
  waiting: "Waiting",
};

const filter = ref<"all" | "unread" | "flagged">("all");
const filterOptions: SegmentedControlOption[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "flagged", label: "Flagged" },
];

const visible = computed(() =>
  conversations.value.filter((c) =>
    filter.value === "all" ? true : filter.value === "unread" ? c.status === "new" : c.flagged,
  ),
);

const currentId = ref<number | null>(null);
const current = computed(() => conversations.value.find((c) => c.id === currentId.value) ?? null);

// The visible audit trail behind the detail pane's Activity tab: the host
// appends a line for every triage action, so the log is real state the
// reader produced — not a static list of fake events.
const activityLog = ref<string[]>(["Inbox opened with five conversations."]);
function activity(line: string) {
  activityLog.value = [line, ...activityLog.value];
}

function select(thread: Thread) {
  currentId.value = thread.id;
  detailTab.value = "conversation";
  // Reading clears "new" — under the Unread filter the list shrinks as the
  // reader works, which is the behaviour triage lives in.
  if (thread.status === "new") thread.status = "open";
}

function focusFirstVisible() {
  currentId.value = visible.value[0]?.id ?? null;
  detailTab.value = "conversation";
}

// The surface root, for re-seating focus after a removal took the focused
// element with it.
const demoRoot = ref<HTMLElement | null>(null);

function afterRemoval(id: number) {
  if (currentId.value === id) focusFirstVisible();
  // Re-seat DOM focus after the flush: the row's menu trigger (or the
  // toolbar verb) that held focus is gone with the row, and a restore to a
  // detached node lands on <body>, sending the next Tab to the page top.
  void nextTick(() => {
    const root = demoRoot.value;
    const active = document.activeElement;
    if (!root) return;
    if (active instanceof HTMLElement && root.contains(active)) return;
    const next = visible.value.find((c) => c.id === currentId.value);
    const target =
      (next && root.querySelector<HTMLElement>(`[data-open-thread="${next.id}"]`)) ||
      root.querySelector<HTMLElement>("[data-inbox-empty-action]") ||
      root.querySelector<HTMLElement>("[data-inbox-commands]");
    target?.focus();
  });
}

function toggleFlag(thread: Thread) {
  thread.flagged = !thread.flagged;
  announce(
    thread.flagged ? `Flagged ${thread.subject}` : `Removed the flag from ${thread.subject}`,
  );
  activity(thread.flagged ? `Flagged “${thread.subject}”` : `Unflagged “${thread.subject}”`);
}

function archive(thread: Thread) {
  conversations.value = conversations.value.filter((c) => c.id !== thread.id);
  afterRemoval(thread.id);
  announce(`Archived ${thread.subject}`);
  activity(`Archived “${thread.subject}”`);
  toasts.value = [
    ...toasts.value,
    {
      id: nextToastId++,
      title: "Conversation archived",
      description: thread.subject,
      variant: "info",
    },
  ];
}

const deleteOpen = ref(false);
const pending = ref<Thread | null>(null);

function requestDelete(thread: Thread) {
  pending.value = thread;
  deleteOpen.value = true;
}

function confirmDelete() {
  const thread = pending.value;
  if (!thread) return;
  conversations.value = conversations.value.filter((c) => c.id !== thread.id);
  afterRemoval(thread.id);
  deleteOpen.value = false;
  pending.value = null;
  announce(`Deleted ${thread.subject}`);
  activity(`Deleted “${thread.subject}”`);
  toasts.value = [
    ...toasts.value,
    {
      id: nextToastId++,
      title: "Conversation deleted",
      description: `${thread.subject} · this was permanent`,
      variant: "destructive",
    },
  ];
}

// Feedback in two registers on every state change: the live region says it
// in words, the toast puts it on screen where it can be dismissed. The
// queue is the host's — this demo is the host.
const toasts = ref<ToastStackItem[]>([]);
let nextToastId = 1;

function dismissToast(id: string | number) {
  toasts.value = toasts.value.filter((toast) => toast.id !== id);
}

const replyOpen = ref(false);
const replyDraft = ref("");
const replyError = ref("");

function openReply() {
  if (!current.value) return;
  // A fresh draft each time — a form that reopens holding the rejected
  // values of the last attempt is its own small defect.
  replyDraft.value = "";
  replyError.value = "";
  replyOpen.value = true;
}

function sendReply() {
  const thread = current.value;
  if (!thread) return;
  const text = replyDraft.value.trim();
  replyError.value = text ? "" : "Write a reply before sending.";
  if (replyError.value) return;
  replyOpen.value = false;
  announce(`Reply sent to ${thread.from}`);
  activity(`Replied to “${thread.subject}”`);
  toasts.value = [
    ...toasts.value,
    {
      id: nextToastId++,
      title: "Reply sent",
      description: `${thread.from} · ${text.slice(0, 48)}${text.length > 48 ? "…" : ""}`,
      variant: "success",
    },
  ];
}

// The palette is host-assembled: Command renders an inline listbox, so the
// ⌘K surface is this host's Dialog around it and this host's keydown.
const commandOpen = ref(false);

function onGlobalKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    // One overlay at a time: a palette stacked over the reply drawer or
    // the delete confirmation lets a command remove the conversation the
    // confirmation still holds — and confirming then reports a deletion
    // that already happened. ⌘K is ignored while either is open.
    if (replyOpen.value || deleteOpen.value) return;
    event.preventDefault();
    commandOpen.value = !commandOpen.value;
  }
}

onMounted(() => window.addEventListener("keydown", onGlobalKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onGlobalKeydown));

const commandItems = computed<CommandItem[]>(() => [
  { value: "next-unread", label: "Go to the next unread conversation", group: "Navigate" },
  {
    value: "toggle-flag",
    label: current.value?.flagged ? "Remove the flag" : "Flag the open conversation",
    group: "Navigate",
    disabled: !current.value,
  },
  {
    value: "reply",
    label: "Reply to the open conversation",
    group: "Current conversation",
    disabled: !current.value,
  },
  {
    value: "archive",
    label: "Archive the open conversation",
    group: "Current conversation",
    disabled: !current.value,
  },
  {
    value: "delete",
    label: "Delete the open conversation…",
    group: "Current conversation",
    disabled: !current.value,
  },
]);
const commandGroups: CommandGroup[] = [
  { heading: "Navigate" },
  { heading: "Current conversation" },
];

function runCommand(value: string) {
  commandOpen.value = false;
  switch (value) {
    case "next-unread": {
      const next = visible.value.find((c) => c.status === "new");
      if (next) {
        select(next);
        announce(`Opened ${next.subject}`);
      } else {
        announce("No unread conversations are left");
      }
      break;
    }
    case "toggle-flag":
      if (current.value) toggleFlag(current.value);
      break;
    case "reply":
      openReply();
      break;
    case "archive":
      if (current.value) archive(current.value);
      break;
    case "delete":
      if (current.value) requestDelete(current.value);
      break;
  }
}

// The per-row menu: one row type, discriminated by fields — heading,
// separator, then the three triage verbs.
function rowMenu(thread: Thread): DropdownMenuEntry[] {
  return [
    { heading: true, label: thread.subject },
    { label: thread.flagged ? "Remove flag" : "Flag", value: "flag" },
    { label: "Archive", value: "archive" },
    { separator: true },
    { label: "Delete…", value: "delete", danger: true },
  ];
}

function runRowCommand(value: string, thread: Thread) {
  if (value === "flag") toggleFlag(thread);
  else if (value === "archive") archive(thread);
  else if (value === "delete") requestDelete(thread);
}

// The filter announces what it produced: the count paragraph is not in a
// live region, so without this a screen reader hears the radio check but
// not that the list shrank from five to two (or to the empty state).
watch(filter, (value) => {
  const label = filterOptions.find((option) => option.value === value)?.label ?? value;
  const count = visible.value.length;
  announce(
    count === 0
      ? `No conversations under ${label}`
      : `${String(count)} ${count === 1 ? "conversation" : "conversations"} under ${label}`,
  );
});

const detailTab = ref("conversation");
const detailTabs = [
  { value: "conversation", label: "Conversation" },
  { value: "activity", label: "Activity" },
];
</script>

<template>
  <div ref="demoRoot" class="flex w-full flex-col gap-4">
    <LiveRegion politeness="polite" />

    <div class="overflow-hidden rounded-lg border border-border bg-card">
      <!-- The header row is the host's, like every showcase: a heading that
           names the region, the count the filter produces, and the one
           affordance that has no row of its own — the palette. -->
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"
      >
        <h3 id="showcase-inbox-title" class="text-title">Support inbox</h3>
        <Button variant="outline" size="sm" data-inbox-commands @click="commandOpen = true">
          <Search class="mr-1.5 size-4" />
          Commands
          <span role="img" aria-label="Command K" class="ml-1.5 flex items-center gap-0.5">
            <Kbd size="sm">⌘</Kbd>
            <span aria-hidden="true">+</span>
            <Kbd size="sm">K</Kbd>
          </span>
        </Button>
      </div>

      <div class="h-[520px]">
        <MasterDetail gap="md">
          <template #master>
            <div class="flex h-full flex-col">
              <div class="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <SegmentedControl
                  v-model="filter"
                  :options="filterOptions"
                  aria-label="Filter conversations"
                  size="sm"
                />
                <p class="text-xs text-muted-foreground">{{ visible.length }} shown</p>
              </div>
              <div class="min-h-0 flex-1 overflow-y-auto">
                <!-- Two honest empties, kept distinct: an inbox with
                     nothing left to show is triage finished — not a filter
                     that matched nothing, which has a next step to offer. -->
                <EmptyState
                  v-if="conversations.length === 0"
                  title="The inbox is empty"
                  description="Every conversation has been archived or deleted. Triage finished."
                >
                  <template #icon><Inbox /></template>
                </EmptyState>
                <EmptyState
                  v-else-if="visible.length === 0"
                  title="Nothing matches this filter"
                  description="Every conversation is either archived or sits outside the filter you picked."
                >
                  <template #icon><Inbox /></template>
                  <template #action>
                    <Button variant="primary" data-inbox-empty-action @click="filter = 'all'">
                      Show every conversation
                    </Button>
                  </template>
                </EmptyState>
                <List v-else label="Conversations">
                  <!-- The row is deliberately NOT an interactive ListItem: a
                       row that is itself a control cannot legally hold the
                       row menu too (nested interactive controls — the exact
                       violation the a11y sweep reports). The sanctioned
                       shape is the RowActions demo's: a plain row whose
                       affordances are siblings. The open button is the
                       row's one selection control; the menu sits in the
                       trailing slot beside it. -->
                  <ListItem
                    v-for="thread in visible"
                    :key="thread.id"
                    :selected="thread.id === currentId"
                  >
                    <template #leading>
                      <Avatar :fallback="thread.initials" size="sm" />
                    </template>
                    <button
                      type="button"
                      class="min-w-0 flex-1 py-1 text-left"
                      :data-open-thread="thread.id"
                      @click="select(thread)"
                    >
                      <span class="block truncate text-body font-medium text-foreground">
                        {{ thread.subject }}
                      </span>
                      <span class="block truncate text-small text-muted-foreground">
                        {{ thread.from }} · {{ thread.time }}
                      </span>
                    </button>
                    <template #trailing>
                      <div class="flex items-center gap-1">
                        <Badge v-bind="optional({ variant: statusTone[thread.status] })">
                          {{ statusLabel[thread.status] }}
                        </Badge>
                        <DropdownMenu
                          :items="rowMenu(thread)"
                          @select="(v) => runRowCommand(v, thread)"
                        >
                          <template #trigger>
                            <IconButton
                              variant="ghost"
                              size="sm"
                              :label="`More actions for ${thread.subject}`"
                            >
                              <MoreHorizontal />
                            </IconButton>
                          </template>
                        </DropdownMenu>
                      </div>
                    </template>
                  </ListItem>
                </List>
              </div>
            </div>
          </template>

          <!-- The detail pane: the selected conversation, or the invitation
               to select one. -->
          <EmptyState
            v-if="!current"
            title="No conversation selected"
            description="Choose a conversation from the list, or open the command palette with the button above."
          >
            <template #icon><Inbox /></template>
            <template #action>
              <Button variant="primary" @click="focusFirstVisible">Open the first one</Button>
            </template>
          </EmptyState>

          <Tabs v-else-if="current" v-model="detailTab" :tabs="detailTabs">
            <template #conversation>
              <div class="flex flex-col gap-3 px-4 py-3">
                <h4 class="text-small font-medium">{{ current.subject }}</h4>
                <div class="group flex flex-wrap items-center gap-2">
                  <Badge v-bind="optional({ variant: statusTone[current.status] })">
                    {{ statusLabel[current.status] }}
                  </Badge>
                  <span class="text-small text-muted-foreground">
                    {{ current.from }} · {{ current.time }}
                  </span>
                  <span class="flex-1" aria-hidden="true"></span>
                  <Button variant="primary" size="sm" @click="openReply">Reply</Button>
                  <!-- The triage verbs arrive on hover and on focus-within;
                       the tooltip names each one's icon in prose beside the
                       accessible name the icon button already carries. -->
                  <RowActions>
                    <Tooltip
                      :content="current.flagged ? 'Remove the flag' : 'Flag conversation'"
                      side="bottom"
                    >
                      <template #trigger>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          :label="current.flagged ? 'Remove the flag' : 'Flag conversation'"
                          @click="toggleFlag(current)"
                        >
                          <Star :class="current.flagged ? 'fill-current' : undefined" />
                        </IconButton>
                      </template>
                    </Tooltip>
                    <Tooltip content="Archive conversation" side="bottom">
                      <template #trigger>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          :label="`Archive ${current.subject}`"
                          @click="archive(current)"
                        >
                          <Archive />
                        </IconButton>
                      </template>
                    </Tooltip>
                    <Tooltip content="Delete conversation" side="bottom">
                      <template #trigger>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          :label="`Delete ${current.subject}`"
                          @click="requestDelete(current)"
                        >
                          <Trash2 />
                        </IconButton>
                      </template>
                    </Tooltip>
                  </RowActions>
                </div>
                <Separator />
                <div class="flex flex-col gap-3">
                  <p v-for="(paragraph, i) in current.body" :key="i" class="text-small">
                    {{ paragraph }}
                  </p>
                </div>
              </div>
            </template>
            <template #activity>
              <ol class="flex flex-col gap-1.5 px-4 py-3 text-small text-muted-foreground">
                <li v-for="(line, i) in activityLog" :key="i">{{ line }}</li>
              </ol>
            </template>
          </Tabs>
        </MasterDetail>
      </div>
    </div>

    <!-- The palette: a host Dialog around the inline Command. The hidden
         heading gives the listbox its accessible name, since the palette is
         not one of Command's own props. -->
    <Dialog
      v-model:open="commandOpen"
      title="Command palette"
      description="Type to filter, Enter to run. Actions that need a conversation are off while none is open."
    >
      <VisuallyHidden>
        <h2 id="showcase-inbox-palette-label">Command palette</h2>
      </VisuallyHidden>
      <!-- Command in controlled mode: uncontrolled, its own Escape handling
           clears the query first and then collapses the listbox while the
           dialog swallows the key — Escape never closes the palette. Bound
           to the same ref the dialog opens on, the second Escape lands here
           as an update and closes the surface the reader meant to leave. -->
      <Command
        v-model:open="commandOpen"
        aria-labelledby="showcase-inbox-palette-label"
        :items="commandItems"
        :groups="commandGroups"
        @select="runCommand"
      />
    </Dialog>

    <Drawer
      v-model:open="replyOpen"
      title="Reply"
      v-bind="optional({ description: current?.subject })"
      side="right"
      size="md"
    >
      <form class="flex flex-col gap-4" novalidate @submit.prevent="sendReply">
        <Field
          v-bind="
            optional({
              label: 'Your reply',
              name: 'showcase-inbox-reply',
              error: replyError || undefined,
              required: true,
            })
          "
        >
          <!-- Like `<Select>` in the invite-teammates demo: the a11y rule
               lowercases the tag, so `<Textarea>` reads to it as a bare
               native `<textarea>` and cannot follow a name that arrives
               through Field context at runtime. -->
          <!-- eslint-disable-next-line vuejs-accessibility/form-control-has-label -->
          <Textarea
            v-model="replyDraft"
            :rows="5"
            resize="none"
            :max-length="500"
            placeholder="Write a reply…"
          />
        </Field>
      </form>
      <template #footer>
        <Button variant="subtle" @click="replyOpen = false">Cancel</Button>
        <Button variant="primary" @click="sendReply">Send reply</Button>
      </template>
    </Drawer>

    <!-- The destructive confirmation: title, consequence, two verbs — and
         the initial focus lands on Keep it, never on the delete. -->
    <AlertDialog
      v-model:open="deleteOpen"
      :title="pending ? `Delete “${pending.subject}”?` : 'Delete conversation?'"
      description="The conversation and its thread are gone for good. This cannot be undone."
      destructive
      :labels="{ confirm: 'Delete permanently', cancel: 'Keep it' }"
      @confirm="confirmDelete"
    />

    <ToastStack :items="toasts" @dismiss="dismissToast" />
  </div>
</template>
