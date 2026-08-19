// The `@ecoma-io/loom/theme` entry.
//
// `useTheme` and `themeScript` are re-exported from the main entry too, but a
// host that only wants the theme switch — no component weight — should not
// pay for the facade's re-export list at all. This entry is that surface: the
// composable, its script, and the two types it deals in.
export { useTheme, themeScript } from "@ecoma-io/loom-core";
export type { ThemePreference, ResolvedTheme } from "@ecoma-io/loom-core";
