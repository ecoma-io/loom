# Invite your team

The first canonical composition. One realistic flow — a member list that
starts empty and becomes a team — assembled from the same components the
[component pages](/components/button) demonstrate one at a time and the
[blocks](/blocks/empty-state) package into units. Read it to see what the
parts produce when they are composed with care; it is a demonstration, not a
starting point.

<script setup lang="ts">
import InviteTeammatesShowcaseDemo from "../demos/InviteTeammatesShowcaseDemo.vue";
import inviteTeammatesShowcaseSource from "../demos/InviteTeammatesShowcaseDemo.vue?raw";
</script>

## The flow

Drive it: open the dialog from either invite action, submit it empty to see
the fields report what is missing, then send an invitation and watch the
announcement, the toast and the list.

<Demo title="The invite-teammates flow" :source="inviteTeammatesShowcaseSource">
  <InviteTeammatesShowcaseDemo />
</Demo>

## Every region, traced

| Region                                                                             | Provided by                                                                        |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| The empty member region, and its single next step                                  | [EmptyState](/blocks/empty-state)                                                  |
| The overlay, its focus trap and focus restoration on close                         | [Dialog](/components/dialog)                                                       |
| The labelled form rows — label, hint, error and required, published to the control | [Field](/components/field)                                                         |
| The address row                                                                    | [TextField](/components/text-field)                                                |
| The role row                                                                       | [Select](/components/select)                                                       |
| The spoken confirmation                                                            | [LiveRegion](/components/live-region)                                              |
| The on-screen confirmation                                                         | [ToastStack](/blocks/toast-stack)                                                  |
| The list, its avatars and role badges                                              | [List](/components/list), [Avatar](/components/avatar), [Badge](/components/badge) |

Everything else in the demo is the host's: the member state, the draft being
validated, the toast queue handed to `ToastStack`. That is the composition —
the components own their behaviour, the host owns the state and the wiring,
which is exactly the division the demo's source shows.

## What this page is not

Not a template. There is no routing, no auth, no backend — the invitation
goes nowhere, because a showcase runs where it is written, in this site. When
you want a starting point to take rather than a demonstration to read, that
is what [Templates](/templates/) are for.
