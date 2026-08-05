import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Demo from "./Demo.vue";
import Layout from "./Layout.vue";
import "./theme.css";

/**
 * VitePress's default theme, re-skinned in Loom's tokens by `theme.css`, plus
 * the one component every page needs. `Demo` is registered globally rather
 * than imported per page because a markdown file has no import statement of
 * its own — a page-local registration would mean an `<script setup>` block at
 * the top of every component page whose only job is to import a frame.
 */
export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component("Demo", Demo);
  },
} satisfies Theme;
