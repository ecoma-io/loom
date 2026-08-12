# AvatarGroup

The faces on one thing, overlapped into a single row: the people assigned to a
task, the agents on a run, the members of a workspace. Past `max` of them the
rest collapse into a counter, so the row's width is decided by the layout
rather than by how many people happen to be involved.

Reach for a plain [Avatar](./avatar) when there is one subject, and for a real
list of rows when the reader needs to _act_ on the members. A stack of
overlapping portraits is an at-a-glance summary, not a control: nothing in it
is focusable or clickable, on purpose. The moment a face has to be pressable it
wants a row, a menu, or a set of [chips](./chip) — each of which can carry a
name and a keyboard path that a 40px circle cannot.

<script setup lang="ts">
import { AvatarGroup } from "@ecoma-io/loom";
import AvatarGroupDemo from "../../src/primitives/AvatarGroup/AvatarGroupDemo.vue";
import avatarGroupDemoSource from "../../src/primitives/AvatarGroup/AvatarGroupDemo.vue?raw";

const team = [
  { alt: "Ada Lovelace", fallback: "AL" },
  { alt: "Grace Hopper", fallback: "GH" },
  { alt: "Katherine Johnson", fallback: "KJ" },
  { alt: "Ana Duarte", fallback: "AD" },
  { alt: "Mai Trần", fallback: "MT" },
  { alt: "Rosa Peña", fallback: "RP" },
];

const run = [
  { alt: "Ada Lovelace", fallback: "AL" },
  { alt: "Weaver", fallback: "WV", force: "ai" },
  { alt: "Nightly digest", fallback: "ND", force: "ai" },
  { alt: "Grace Hopper", fallback: "GH" },
];
</script>

## Usage

```vue
<script setup lang="ts">
import { AvatarGroup, type AvatarGroupItem } from "@ecoma-io/loom";

const assignees: AvatarGroupItem[] = [
  { src: "/ada.jpg", alt: "Ada Lovelace", fallback: "AL" },
  { alt: "Grace Hopper", fallback: "GH" },
  { alt: "Weaver", fallback: "WV", force: "ai" },
];
</script>

<template>
  <AvatarGroup :avatars="assignees" label="Assignees" />
</template>
```

## Members

A member is `src`, `alt`, `fallback` and an optional `force` — the same four
things an `Avatar` takes, because that is what each one becomes.

`alt` is the field to fill in even when there is no photo. It is what a screen
reader reads for that member, whichever state the image is in: the portrait
itself is hidden from assistive technology and the name supplied beside it, so
the row reads identically whether the picture loaded, failed, or was never
given. Initials alone stand in when there is no `alt`, and "A L" read aloud is
a poor substitute for a name.

<Demo title="Members">
  <AvatarGroup :avatars="team" label="Assignees" />
</Demo>

## Overflow

`max` is how many faces render before the rest collapse; it defaults to 4.
Three boundaries are worth knowing, and all three behave the obvious way:
`max` below the number of members shows `max` faces and a counter, `max` equal
to it shows every face and no counter, and `max` above it does the same.

`max` of 0 — or any number below 1 — renders one face and a counter rather
than a counter alone. A row collapsed to nothing but "+5" has spent an avatar
row saying only that some people exist, which is strictly less than one face
and a count would have said.

The counter is information rather than decoration, so it does not announce
itself as "plus three". What a reader sees is `+3`; what a screen reader is
told is "3 more". Where "more" is not the right word for what was left out —
"3 more reviewers", say — [`labels.overflow`](#labels) is what changes it.

<Demo title="Overflow">
  <AvatarGroup :avatars="team" :max="3" label="Assignees, three shown" />
  <AvatarGroup :avatars="team" :max="6" label="Assignees, all shown" />
  <AvatarGroup :avatars="team" :max="0" label="Assignees, collapsed" />
</Demo>

## People and agents

`force` is forwarded to every face, and a member may name its own — which is
the case worth designing for, because a run worked by a person and two agents
is one row, not two. An agent's face wears the weft rim described on the
[Avatar](./avatar) page, and its name is announced with the agent qualifier
worked into it: "Weaver, AI agent". [`labels.agent`](#labels) is what changes
that — both the word and where in the sentence it sits.

<Demo title="People and agents">
  <AvatarGroup :avatars="run" label="Working on this run" />
</Demo>

## Size, shape and surface

`size` and `shape` are forwarded to every face including the counter, so the
row is one shape throughout. The overlap steps with the size — always a quarter
of a face's own width — which is what keeps a row of `xs` avatars reading at
the same density as a row of `xl` ones.

`surface` names what the row sits on: `background`, `card`, `sunken` or
`popover`. The ring separating each face from the one it overlaps has to be the
colour of what surrounds them, and only the caller knows which surface that is
— the same reason [Indicator](./indicator) asks, in the same vocabulary. Get it
wrong and two portraits of similar tone merge into one shape, so the ring is
structural rather than ornamental.

<Demo title="Size, shape and surface">
  <div class="flex flex-col gap-4">
    <AvatarGroup :avatars="team" size="xs" label="Assignees, extra small" />
    <AvatarGroup :avatars="team" size="lg" label="Assignees, large" />
    <AvatarGroup :avatars="team" shape="square" label="Workspaces" />
  </div>
</Demo>

## Keyboard and screen readers

There is no keyboard path, because there is nothing to operate: no face takes
focus, and the row never appears in the Tab order. That is the design, not an
omission — a summary a reader tabs through is a set of controls that do
nothing.

To a screen reader the row is one object: a list, named by `label`, whose items
are the members in order and whose last item is the counter. So it reads as
"Assignees, list, 4 items — Ada Lovelace, Grace Hopper, Katherine Johnson, 2
more" rather than as four unrelated images.

The list is a `role="list"` element with `role="listitem"` children rather than
a `<ul>`. The roles are the semantics either way; the elements were only
carrying them, and a real list element inherits whatever a host page's prose
styles say about lists — a marker, an indent, a margin between items that
visibly steps an overlapped row downhill.

## Motion

None, and that is a decision rather than an oversight. Each face keeps
`Avatar`'s own settle as its photo swaps in, and the row adds nothing on top of
it.

The obvious idea is a hover that spreads the stack apart. It is decoration: the
question a reader has at an overlapped row is "who are these people?", and
motion does not answer it — the names do, which is why they are in the
accessibility tree at every moment rather than on the far side of a gesture.
Anything that did answer it — the remaining names, a link to the full list —
belongs in a tooltip or a page the consumer supplies, not in an animation.

<Demo title="Every state" :source="avatarGroupDemoSource">
  <AvatarGroupDemo />
</Demo>

## Labels

The row says two things that are not a member's own name: the counter at the
end of it, and the qualifier on an agent's face. Both are keys rather than
props, so a whole application sets them once.

```ts
interface AvatarGroupLabels {
  overflow: (args: { count: number }) => string;
  agent: (args: { name: string }) => string;
}
```

`overflow` receives the count and not a written number, because "3 more" is a
plural category English collapses and Russian does not — `Intl.PluralRules` and
`Intl.NumberFormat` are yours to reach for.

`agent` is one key rather than a name, a comma and a word. Where the qualifier
sits relative to the name, and whether a comma separates them at all, is a
property of the language; a `${name}, ${qualifier}` join inside the component
has already answered both in English. `name` arrives empty for a member that
gave neither an `alt` nor a `fallback`, which is still an agent and still needs
naming.

```ts
provideLoomLabels(() => ({
  avatarGroup: {
    overflow: ({ count }) => `còn ${count} người`,
    agent: ({ name }) => (name ? `Tác nhân AI ${name}` : "Tác nhân AI"),
  },
}));
```

The per-instance case is a row where the noun is wrong however well the
application is translated:

```vue
<AvatarGroup
  :avatars="reviewers"
  label="Reviewers"
  :labels="{ overflow: ({ count }) => `${count} more reviewers` }"
/>
```

Annotate a bag of your own with `LabelOverrides<AvatarGroupLabels>` rather than
with `AvatarGroupLabels` itself: the override type is partial, so a key added in
a later release is one your bag may ignore, where the bag interface is total and
would stop compiling.

For a whole application set this once with `provideLoomLabels` rather than at
every call site. See [Localisation](/foundations/localisation).

## API

<!-- @api AvatarGroup -->
