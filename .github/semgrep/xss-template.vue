<!-- Fixture for xss-template.yml, exercised by `semgrep --test --config .semgrep`. -->
<template>
  <div>
    <!-- ruleid: loom-v-html-directive -->
    <p v-html="body" />
    <!-- ruleid: loom-v-html-directive -->
    <p v-html="sanitized"></p>
    <!-- ok: loom-v-html-directive -->
    <p>{{ body }}</p>
    <!-- ok: loom-v-html-directive -->
    <p v-text="body"></p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ body: string; sanitized: string }>();
</script>
