<script setup lang="ts">
import { ref } from "vue";
import { Bell, Bot } from "@lucide/vue";
import Indicator from "./Indicator.vue";
import Avatar from "../Avatar/Avatar.vue";
import Button from "../Button/Button.vue";

const unread = ref(3);

function poll() {
  unread.value = unread.value >= 132 ? 0 : unread.value + 43;
}
</script>

<template>
  <div class="flex max-w-md flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">presence, pinned to an avatar</span>
      <div class="flex items-center gap-4">
        <Indicator status="online" placement="bottom-right">
          <Avatar fallback="HM" />
        </Indicator>
        <Indicator status="away" placement="bottom-right">
          <Avatar fallback="LT" />
        </Indicator>
        <Indicator status="busy" placement="bottom-right">
          <Avatar fallback="DP" />
        </Indicator>
        <Indicator status="offline" placement="bottom-right">
          <Avatar fallback="NV" />
        </Indicator>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">
        a count over a control — `labelId` describes the button, so focusing it announces the count
        once
      </span>
      <div class="flex items-center gap-4">
        <Indicator v-slot="{ labelId }" variant="count" :count="unread">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            :aria-describedby="labelId"
          >
            <Bell />
          </Button>
        </Indicator>

        <Indicator
          v-slot="{ labelId }"
          variant="count"
          :count="7"
          tone="ai"
          label="7 agent runs finished"
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label="Agent activity"
            :aria-describedby="labelId"
          >
            <Bot />
          </Button>
        </Indicator>

        <Button variant="outline" size="sm" @click="poll">Poll ({{ unread }})</Button>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">
        one digit is a circle, more is a pill, and anything over `max` prints clamped while the
        hidden text keeps the real figure
      </span>
      <div class="flex items-center gap-5">
        <Indicator variant="count" :count="1">
          <span class="block h-9 w-9 rounded-md bg-muted" aria-hidden="true" />
        </Indicator>
        <Indicator variant="count" :count="12">
          <span class="block h-9 w-9 rounded-md bg-muted" aria-hidden="true" />
        </Indicator>
        <Indicator variant="count" :count="132">
          <span class="block h-9 w-9 rounded-md bg-muted" aria-hidden="true" />
        </Indicator>
        <Indicator variant="count" :count="0" show-zero label="Inbox clear">
          <span class="block h-9 w-9 rounded-md bg-muted" aria-hidden="true" />
        </Indicator>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">the four corners, on a statusless dot</span>
      <div class="flex items-center gap-5">
        <Indicator placement="top-left" label="Draft has unsaved edits">
          <span class="block h-9 w-9 rounded-md bg-muted" aria-hidden="true" />
        </Indicator>
        <Indicator placement="top-right" label="Draft has unsaved edits">
          <span class="block h-9 w-9 rounded-md bg-muted" aria-hidden="true" />
        </Indicator>
        <Indicator placement="bottom-left" label="Draft has unsaved edits">
          <span class="block h-9 w-9 rounded-md bg-muted" aria-hidden="true" />
        </Indicator>
        <Indicator placement="bottom-right" label="Draft has unsaved edits">
          <span class="block h-9 w-9 rounded-md bg-muted" aria-hidden="true" />
        </Indicator>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">
        the ring takes the colour of what surrounds the pair — `surface="card"` inside a card
      </span>
      <div class="flex items-center gap-5 rounded-md border border-border bg-card p-4">
        <Indicator status="online" surface="card" placement="bottom-right">
          <Avatar fallback="HM" size="sm" />
        </Indicator>
        <Indicator variant="count" :count="9" surface="card">
          <span class="block h-8 w-8 rounded-md bg-muted" aria-hidden="true" />
        </Indicator>
      </div>
    </div>
  </div>
</template>
