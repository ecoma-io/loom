# List

A generic composition of titled rows: leading content, title and
description, trailing metadata or actions. The presentational vocabulary for
row-shaped content — settings groups, pickers, summaries.

<script setup lang="ts">
import { List } from "@ecoma-io/loom";
import ListDemo from "../demos/ListDemo.vue";
import listDemoSource from "../demos/ListDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { List, ListItem } from "@ecoma-io/loom";
</script>

<template>
  <List label="Workspace plans">
    <ListItem title="Hobby" meta="Free" />
    <ListItem title="Balanced" meta="$20/mo" interactive />
  </List>
</template>
```

## Rows

A `ListItem` renders one of three shapes, the same honesty Card documents:
`href` makes the whole row one real anchor (nothing interactive inside),
`interactive` paints hover/press while the host owns the handler through
`@activate`, and plain rows are just rows. Selection states twice —
`aria-current` for technology, a check glyph for eyes; disabled rows drain to
the neutral well but stay announced.

Leading and trailing slots frame the body; `meta` is the common case of a
trailing figure in tabular digits. `dense` tightens rhythm for chrome-height
rows.

<Demo title="Plans, links and plain summary" :source="listDemoSource">
  <ListDemo />
</Demo>

## Difference from neighbours

- **SidebarNav** owns wayfinding; a selected List row means "this is my
  choice", never "you are here".
- **Menu** owns commands in an overlay.
- **Table** owns values under column headers.

## API

<!-- @api List -->

### ListItem

<!-- @api ListItem -->
