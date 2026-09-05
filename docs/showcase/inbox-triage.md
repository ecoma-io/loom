# Triage the inbox

The second canonical composition. One realistic surface — a support inbox
that starts loaded and shrinks as the reader works it — assembled from the
same components the [component pages](/components/button) demonstrate one at
a time and the [blocks](/blocks/row-actions) package into units. Read it to
see what the parts produce when they are composed with care; it is a
demonstration, not a starting point.

<script setup lang="ts">
import InboxTriageShowcaseDemo from "../demos/InboxTriageShowcaseDemo.vue";
import inboxTriageShowcaseSource from "../demos/InboxTriageShowcaseDemo.vue?raw";
</script>

## The flow

Drive it: open a conversation and read it in the detail pane, work the
filter down to an honest empty state, reply from the drawer (submit it
empty to see the field report what is missing), archive or delete through
the row menu or the detail toolbar — deleting asks before it destroys — and
open the command palette with the **Commands** button or `⌘K` / `Ctrl+K`.
Every triage action is answered: the live region speaks it, and the
actions that change the list also leave a toast on screen. The filter
announces the count it produced, and the flag is spoken and logged without
a toast — it has not changed the list.

<Demo title="The inbox triage surface" :source="inboxTriageShowcaseSource">
  <InboxTriageShowcaseDemo />
</Demo>

## Every region, traced

| Region                                                                                     | Provided by                                                                                                      |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| The two panes — list beside detail, stacking below their collapse width                    | [MasterDetail](/layouts/master-detail)                                                                           |
| The filter row and its `All` / `Unread` / `Flagged` segments — one Tab stop, arrow keys    | [SegmentedControl](/components/segmented-control)                                                                |
| The conversation rows — avatars, status badges, the selected row's `aria-current`          | [List](/components/list), [ListItem](/components/list), [Avatar](/components/avatar), [Badge](/components/badge) |
| The per-row menu — flag, archive, the destructive delete held behind an ellipsis           | [DropdownMenu](/components/dropdown-menu)                                                                        |
| The conversation / activity tabs in the detail pane                                        | [Tabs](/components/tabs)                                                                                         |
| The triage toolbar — hover- and focus-revealed verbs on the open conversation              | [RowActions](/blocks/row-actions)                                                                                |
| The named icon buttons and their prose hints                                               | [IconButton](/components/icon-button), [Tooltip](/components/tooltip)                                            |
| The confirmation before destruction — title, consequence, two verbs, focus landing on Keep | [AlertDialog](/components/alert-dialog)                                                                          |
| The reply surface — a labelled field whose error the submit produces                       | [Drawer](/components/drawer), [Field](/components/field), [Textarea](/components/textarea)                       |
| The spoken confirmation                                                                    | [LiveRegion](/components/live-region)                                                                            |
| The on-screen confirmation                                                                 | [ToastStack](/blocks/toast-stack)                                                                                |
| The command palette — a host `Dialog` around the inline `Command`, `⌘K` wired by the host  | [Command](/components/command), [Dialog](/components/dialog), [Kbd](/components/kbd)                             |
| The two empty states — a filter matching nothing, and no selection yet                     | [EmptyState](/blocks/empty-state)                                                                                |
| The rule between the message body and the triage toolbar                                   | [Separator](/components/separator)                                                                               |

Everything else in the demo is the host's: the conversations, the filter,
the selection, the reply draft, the activity log, the toast queue handed to
`ToastStack`, and the `⌘K` keydown itself — Command renders an inline
listbox, so a palette is a host surface, not a component mode. That is the
composition — the components own their behaviour, the host owns the state
and the wiring, which is exactly the division the demo's source shows.

## What this page is not

Not a template. There is no routing, no auth, no backend — nothing is sent,
archived or deleted anywhere but in this page's own memory, because a
showcase runs where it is written, in this site. When you want a starting
point to take rather than a demonstration to read, that is what
[Templates](/templates/) are for.
