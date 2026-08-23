<script setup lang="ts">
import { Badge, Timeline, TimelineItem } from "@ecoma-io/loom";
</script>

<template>
  <div class="max-w-md">
    <Timeline>
      <TimelineItem
        title="Order placed"
        status="complete"
        timestamp="09:00"
        datetime="2026-08-01T09:00"
      />
      <TimelineItem
        title="Payment confirmed"
        status="complete"
        timestamp="09:02"
        datetime="2026-08-01T09:02"
      />
      <TimelineItem
        title="In production"
        status="current"
        timestamp="today"
        description="Three machines on the queue."
      >
        <Badge variant="primary">in progress</Badge>
      </TimelineItem>
      <TimelineItem title="Shipped" status="upcoming" description="Carrier pickup at 17:00." />
    </Timeline>
  </div>
</template>
