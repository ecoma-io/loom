<script lang="ts">
import type { AvatarShape, AvatarSize, AvatarVariant } from "../Avatar/Avatar.vue";
import type { LabelOf } from "../../lib/labels";

/** One face in the row. */
export interface AvatarGroupItem {
  /** Image URL. Omit it and this face renders `fallback` instead. */
  src?: string;
  /** Who this face is. It is what a screen reader reads for this member, whether or not the image ever loads — so it is the field to fill in even when there is no photo. */
  alt?: string;
  /** Initials shown while there is no image, or once one has failed. */
  fallback?: string;
  /** Which variant this member uses. Defaults to the group's own `variant`, so a row that mixes members states it per member and a row of one kind states it once. */
  variant?: AvatarVariant;
}

/** The surface the row sits on, which the separating ring matches. */
export type AvatarGroupSurface = "background" | "card" | "sunken" | "popover";

/**
 * The two sentences the row says that are not a member's own name.
 *
 * **`accent` is one key and not a name, a comma and a qualifier.** Where the
 * qualifier sits relative to the name, and whether a comma is what separates
 * them at all, is a property of the language — Loom joining `${who}, ${what}`
 * has already answered both, in English, for every host that translates the
 * two halves. The name arrives raw because it is the caller's own data rather
 * than anything Loom formatted, and the empty case arrives too: a face with no
 * `alt` and no `fallback` still carries the accent variant, and the accent
 * label alone is the honest reading of it.
 *
 * `overflow` takes the count for the reason every counted message here does —
 * "3 more" is a plural category English collapses and Russian does not.
 */
export interface AvatarGroupLabels {
  /** The counter tile at the end of the row, named for how many faces it stands in for. */
  readonly overflow: LabelOf<{ count: number }>;
  /** One member's whole name, with the accent qualifier already worked into it. `name` is empty when the member gave neither an `alt` nor a `fallback`. */
  readonly accent: LabelOf<{ name: string }>;
}

/**
 * Loom's English, co-located with the component so it tree-shakes with it, and
 * exported so a host can build a partial vocabulary against the real thing.
 */
export const AVATAR_GROUP_LABELS: AvatarGroupLabels = {
  overflow: ({ count }) => `${String(count)} more`,
  accent: ({ name }) => (name ? `${name}, Accent` : "Accent"),
};

/**
 * How far each face tucks under the one before it — a quarter of its own width
 * at every size, so a row of `xs` avatars reads at the same density as a row of
 * `xl` ones. A fixed offset would look like a badly spaced flex row at the top
 * of the scale and swallow the initials at the bottom of it.
 */
const OVERLAP = {
  xs: "-ml-1.5",
  sm: "-ml-2",
  md: "-ml-2.5",
  lg: "-ml-3",
  xl: "-ml-4",
} satisfies Record<AvatarSize, string>;

/**
 * The ring that cuts each face out of the one it overlaps. Without it two
 * portraits of similar tone merge into one shape, so it is structural rather
 * than decorative — which is also why it has to be the colour of whatever
 * surrounds the row, something only the caller knows. The names are
 * Indicator's, for the same reason and with the same meaning.
 */
const SURFACE_RING = {
  background: "ring-background",
  card: "ring-card",
  sunken: "ring-sunken",
  popover: "ring-popover",
} satisfies Record<AvatarGroupSurface, string>;
</script>

<script setup lang="ts">
import { computed } from "vue";
import Avatar from "../Avatar/Avatar.vue";
import { cn } from "../../lib/cn";
import { optional } from "../../lib/props";
import { useSplitAttrs } from "../../lib/attrs";
import { useLabels, type LabelOverrides } from "../../lib/labels";

/**
 * AvatarGroup — the faces on one thing, overlapped into a single row: the
 * people assigned to a task, the agents on a run, the members of a workspace.
 * Past `max` of them the rest collapse into a counter, so the row's width is
 * bounded by the layout rather than by how many people happen to be involved.
 *
 * Reach for a plain `Avatar` when there is one subject, and for a real list of
 * rows when the reader needs to *act* on the members — a stack of overlapping
 * portraits is an at-a-glance summary, not a control. Nothing here is
 * focusable or clickable on purpose: the moment a face has to be pressable it
 * wants a row, a menu or a set of chips, each of which can carry a name and a
 * keyboard path that a 40px circle cannot.
 *
 * To a screen reader the row is one object — a labelled list of members ending
 * in "3 more" — rather than N unrelated images. Each face is announced by its
 * `alt` and nothing else: the portrait itself is hidden from assistive
 * technology and the name supplied beside it, which is what keeps the reading
 * identical whether the photo loaded, failed, or was never given.
 */
const props = withDefaults(
  defineProps<{
    /** The members, in the order they are shown. The first is the one painted on top. */
    avatars: AvatarGroupItem[];
    /** How many faces render before the rest collapse into the counter. Values below 1 are treated as 1 — a row of nothing but "+5" identifies nobody. */
    max?: number;
    /** Height of every face in the row, and of the counter — one of `Avatar`'s five sizes, `xs` through `xl`. */
    size?: AvatarSize;
    /** `circle` or `square`, forwarded to every face so the row reads as one shape. */
    shape?: AvatarShape;
    /** `default` or `accent`, for members that do not name their own — set it to `accent` for a row where every member uses the accent variant. */
    variant?: AvatarVariant;
    /** The group's accessible name: "Assignees", "Reviewers", "Members". */
    label?: string;
    /** The surface the row sits on, so the ring separating the faces matches what surrounds them. */
    surface?: AvatarGroupSurface;
    /**
     * Names for the counter and for an accent member, as any subset of
     * `AvatarGroupLabels` — the rest stay as the host's `provideLoomLabels`
     * vocabulary left them, and then as Loom's English.
     *
     * The per-instance case is a row where "more" is the wrong word for what
     * was left out: three reviewers, three members, three files.
     */
    labels?: LabelOverrides<AvatarGroupLabels>;
  }>(),
  {
    max: 4,
    size: "md",
    shape: "circle",
    variant: "default",
    surface: "background",
  },
);

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves, and a template reading the raw prop would be reading the overrides
// rather than the answer.
const text = useLabels("avatarGroup", AVATAR_GROUP_LABELS, () => props.labels);

// One rendered node, and it takes every fallthrough attribute — but `class`
// goes through `cn()`, so a caller's `gap-1` can beat the row's own layout
// utilities instead of tying with them on stylesheet order.
defineOptions({ inheritAttrs: false });
const { attrs, rest } = useSplitAttrs();

/**
 * At least one face always renders. `max = 0` is the boundary that decides
 * this: a group collapsed to nothing but "+5" has spent an avatar row saying
 * only that some people exist, which is strictly less than one face and a
 * count would have said.
 */
const shown = computed(() => props.avatars.slice(0, Math.max(1, Math.trunc(props.max))));

/** How many members the row did not have room for. Zero renders no counter at all. */
const hidden = computed(() => props.avatars.length - shown.value.length);

/** What the counter prints. `+3` is the layout; the sentence below is the information. */
const printed = computed(() => `+${String(hidden.value)}`);

const overlap = computed(() => OVERLAP[props.size]);

/** `ring-2` in the surface colour, on every face including the counter. */
const ring = computed(() => cn("ring-2", SURFACE_RING[props.surface]));

/**
 * What a screen reader reads for one member. The accent qualifier is composed
 * here rather than left to `Avatar`'s own hidden label, because the portrait
 * inside each item is `aria-hidden` — the item says the name once, in one
 * voice, whichever state the image is in.
 */
function memberName(item: AvatarGroupItem): string {
  const who = (item.alt ?? item.fallback ?? "").trim();
  if ((item.variant ?? props.variant) !== "accent") return who;
  return text.value.accent({ name: who });
}
</script>

<template>
  <!-- `role="list"` on a div rather than a real `<ul>`, and the reason is the
       page this is documented on. VitePress styles `.vp-doc li + li` with a top
       margin and `.vp-doc ul` with a disc marker and a left indent, unlayered —
       and unlayered CSS beats every Tailwind utility, which all live in
       `@layer utilities`. A genuine list element here arrives bulleted, indented
       and stepping 8px downhill per face. The roles are the semantics; the
       elements were only ever carrying them.

       The explicit attributes sit before `v-bind`, so a caller who names the
       group with `aria-labelledby` instead of `label` keeps their own value
       rather than having an unset prop overwrite it. -->
  <div
    v-if="avatars.length > 0"
    role="list"
    :aria-label="label"
    v-bind="rest"
    :class="cn('flex items-center', attrs.class as string)"
  >
    <!-- The first face on top, each later one tucked under it. `z-index` is not
         automatic on a flex row — painting order alone puts the *last* sibling
         over its neighbours, which reads as a stack dealt backwards — and it
         needs the positioned parent this span provides. -->
    <span
      v-for="(item, index) in shown"
      :key="`${String(index)}-${item.src ?? item.fallback ?? ''}`"
      role="listitem"
      :style="{ zIndex: shown.length - index }"
      :class="cn('relative', index > 0 && overlap)"
    >
      <!-- `accent-label` is cleared because the item beside it has already
           worked the qualifier into one name; left at its default the row would
           carry two copies of the accent label per accent member. -->
      <Avatar
        aria-hidden="true"
        accent-label=""
        v-bind="optional({ src: item.src, alt: item.alt, fallback: item.fallback })"
        :size="size"
        :shape="shape"
        :variant="item.variant ?? variant"
        :class="ring"
      />
      <span class="sr-only">{{ memberName(item) }}</span>
    </span>

    <!-- The counter is a face-shaped tile rather than a shape of its own, so
         the row keeps one rhythm: same size, same corner, same ring, and the
         neutral well instead of a portrait's fill so it never reads as a
         person. It sits under everything, at the back of the stack. -->
    <span v-if="hidden > 0" role="listitem" :style="{ zIndex: 0 }" :class="cn('relative', overlap)">
      <Avatar
        aria-hidden="true"
        :fallback="printed"
        :size="size"
        :shape="shape"
        :class="cn(ring, 'bg-subtle text-subtle-foreground tabular')"
      />
      <span class="sr-only">{{ text.overflow({ count: hidden }) }}</span>
    </span>
  </div>
</template>
