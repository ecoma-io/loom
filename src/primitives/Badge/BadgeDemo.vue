<script setup lang="ts">
import Badge from "./Badge.vue";
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <Badge variant="ai">✦ Agent</Badge>
    <Badge variant="primary">Primary</Badge>
    <Badge variant="info">selection</Badge>
    <Badge variant="success">rendered</Badge>
    <Badge variant="warning">degraded</Badge>
    <Badge variant="destructive">error</Badge>
    <Badge variant="outline">draft</Badge>
    <Badge>neutral</Badge>
  </div>
</template>
