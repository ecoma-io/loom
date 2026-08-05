<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import { applyLoomIconDefaults } from "@ecoma-io/loom";

// Loom's icon defaults resolve to Vue's `provide()`, so they have to be
// installed from inside a component's setup — which is the whole reason this
// wrapper exists rather than a line in `enhanceApp`. Being the outermost
// component of the theme, everything the site renders is below it, demos
// included.
applyLoomIconDefaults();

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout />
</template>
