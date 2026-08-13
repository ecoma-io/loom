<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import { useData } from "vitepress";
import { applyLoomIconDefaults } from "@ecoma-io/loom";
import { watchEffect } from "vue";

// Loom's icon defaults resolve to Vue's `provide()`, so they have to be
// installed from inside a component's setup — which is the whole reason this
// wrapper exists rather than a line in `enhanceApp`. Being the outermost
// component of the theme, everything the site renders is below it, demos
// included.
applyLoomIconDefaults();

const { Layout } = DefaultTheme;

// VitePress toggles dark by adding/removing a `.dark` class on `<html>`.
// Loom's tokens switch on `data-theme` instead. Watch VitePress's reactive
// `isDark` and mirror it onto Loom's attribute, so every demo on the page
// follows the same switch the chrome does.
const { isDark } = useData();

watchEffect(() => {
  // SSR guard: `document` is absent during VitePress's static generation.
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", isDark.value ? "dark" : "light");
});
</script>

<template>
  <Layout />
</template>
