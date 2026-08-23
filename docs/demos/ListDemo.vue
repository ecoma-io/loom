<script setup lang="ts">
import { ref } from "vue";
import { Badge, List, ListItem } from "@ecoma-io/loom";
import { Scale, Sprout } from "@lucide/vue";

const picked = ref("balanced");
</script>

<template>
  <div class="flex max-w-xl flex-col gap-8">
    <List label="Workspace plans">
      <ListItem
        title="Hobby"
        description="1 project, community support"
        meta="Free"
        interactive
        :selected="picked === 'hobby'"
        @activate="picked = 'hobby'"
      >
        <template #leading>
          <Sprout class="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </template>
      </ListItem>
      <ListItem
        title="Balanced"
        description="10 projects, nightly backups"
        meta="$20/mo"
        interactive
        :selected="picked === 'balanced'"
        @activate="picked = 'balanced'"
      >
        <template #leading>
          <Scale class="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </template>
      </ListItem>
      <ListItem
        title="Scale"
        description="Unlimited projects, SSO"
        meta="$90/mo"
        interactive
        disabled
      />
    </List>

    <List label="Recent deployments" :divided="false">
      <ListItem href="#deploy-4821" title="#4821 · api" description="Shipped 2 hours ago">
        <template #trailing>
          <Badge variant="success">passing</Badge>
        </template>
      </ListItem>
      <ListItem href="#deploy-4820" title="#4820 · web" description="Shipped yesterday">
        <template #trailing>
          <Badge variant="warning">degraded</Badge>
        </template>
      </ListItem>
    </List>

    <List label="Plain summary">
      <ListItem title="Storage" meta="210 GB" />
      <ListItem title="Render minutes" meta="9,014" />
    </List>
  </div>
</template>
