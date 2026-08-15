/**
 * Theme switching for Loom.
 *
 * The single source of truth is the `data-theme` attribute on `<html>`.
 * This composable reads and writes it, persists the preference to
 * `localStorage`, and resolves `"system"` mode from the OS preference.
 *
 * SSR-safe: every DOM access is guarded. On the server, `theme` returns
 * the persisted or default preference, `resolvedTheme` resolves `"system"`
 * to `"light"` (the only safe default without a DOM), and the setter and
 * toggler are no-ops.
 *
 * Flash prevention: `themeScript` is a string of inline JavaScript that
 * reads `localStorage` and sets `data-theme` before the first paint.
 * Consumers rendering SSR inject it into `<head>`:
 *
 *   <script>${themeScript}</script>
 */

import { type Ref, computed, onScopeDispose, ref, watch } from "vue";

/** The preference a user expresses — `"system"` defers to the OS. */
export type ThemePreference = "light" | "dark" | "system";

/** The actual theme applied — `"system"` is resolved away. */
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "loom:theme";
const DATA_ATTR = "data-theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

/** Default preference when nothing is stored and no OS signal exists. */
const DEFAULT_PREFERENCE: ThemePreference = "system";

// --- Shared state (one per Vue app, not one per composable call) ---------

interface ThemeState {
  preference: Ref<ThemePreference>;
  systemIsDark: Ref<boolean>;
  mediaQuery: MediaQueryList | null;
  listener: ((e: MediaQueryListEvent) => void) | null;
  scopeCount: number;
}

/**
 * Reactive shared state, lazily initialised on the first `useTheme()` call
 * and torn down with the effect scope that owns it. Multiple components
 * calling `useTheme()` in the same app share the same refs and the same
 * `matchMedia` listener.
 */
let sharedState: ThemeState | null = null;

/**
 * Reset the shared state. Intended for test isolation only — a real app
 * never needs this because the state lives for the app's lifetime.
 */
export function _resetThemeState(): void {
  if (sharedState?.mediaQuery && sharedState.listener) {
    sharedState.mediaQuery.removeEventListener("change", sharedState.listener);
  }
  sharedState = null;
}

function getSharedState(): ThemeState {
  if (sharedState) {
    sharedState.scopeCount++;
    return sharedState;
  }

  // Read the stored preference, defaulting to "system".
  let stored: ThemePreference = DEFAULT_PREFERENCE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") {
      stored = raw;
    }
  } catch {
    // localStorage may be unavailable (SSR, private browsing).
  }

  // Apply the initial theme to the DOM so the very first render is correct.
  const initial = resolveTheme(stored, getSystemIsDark());
  applyToDOM(initial);

  const preference = ref<ThemePreference>(stored);
  const systemIsDark = ref<boolean>(getSystemIsDark());

  // Listen for OS dark-mode changes.
  let mediaQuery: MediaQueryList | null = null;
  let listener: ((e: MediaQueryListEvent) => void) | null = null;

  try {
    mediaQuery = window.matchMedia(MEDIA_QUERY);
    listener = (e: MediaQueryListEvent) => {
      systemIsDark.value = e.matches;
    };
    mediaQuery.addEventListener("change", listener);
  } catch {
    // matchMedia may be unavailable.
  }

  sharedState = {
    preference,
    systemIsDark,
    mediaQuery,
    listener,
    scopeCount: 1,
  };

  return sharedState;
}

function releaseSharedState(): void {
  if (!sharedState) return;
  sharedState.scopeCount--;
  if (sharedState.scopeCount > 0) return;

  // Last consumer gone — tear down the listener.
  if (sharedState.mediaQuery && sharedState.listener) {
    sharedState.mediaQuery.removeEventListener("change", sharedState.listener);
  }
  sharedState = null;
}

// --- DOM helpers --------------------------------------------------------

function getSystemIsDark(): boolean {
  try {
    return window.matchMedia(MEDIA_QUERY).matches;
  } catch {
    return false;
  }
}

function resolveTheme(pref: ThemePreference, systemDark: boolean): ResolvedTheme {
  return pref === "system" ? (systemDark ? "dark" : "light") : pref;
}

function applyToDOM(theme: ResolvedTheme): void {
  try {
    document.documentElement.setAttribute(DATA_ATTR, theme);
  } catch {
    // document may be unavailable (SSR).
  }
}

function persist(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // localStorage may be unavailable.
  }
}

// --- Public API ---------------------------------------------------------

/**
 * Read and control the active Loom theme.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useTheme } from "@ecoma-io/loom/theme"
 * const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()
 * </script>
 *
 * <template>
 *   <button @click="toggleTheme">
 *     {{ resolvedTheme === "dark" ? "☀️" : "🌙" }}
 *   </button>
 * </template>
 * ```
 */
export function useTheme(): {
  readonly theme: Ref<ThemePreference>;
  readonly resolvedTheme: Readonly<Ref<ResolvedTheme>>;
  readonly setTheme: (preference: ThemePreference) => void;
  readonly toggleTheme: () => void;
} {
  const state = getSharedState();

  // Clean up the shared listener when the consuming scope disposes.
  onScopeDispose(releaseSharedState);

  /** The user's preference — `"system"` defers to the OS. */
  const theme = computed<ThemePreference>({
    get: () => state.preference.value,
    set: (value: ThemePreference) => {
      state.preference.value = value;
    },
  });

  /** The actual active theme, with `"system"` resolved to `"light"` or `"dark"`. */
  const resolvedTheme = computed<ResolvedTheme>(() =>
    resolveTheme(state.preference.value, state.systemIsDark.value),
  );

  // Whenever the preference or the OS signal changes, apply the resolved
  // theme to the DOM and persist the preference.
  watch([() => state.preference.value, () => state.systemIsDark.value], () => {
    applyToDOM(resolvedTheme.value);
    persist(state.preference.value);
  });

  /** Set the theme preference explicitly. */
  function setTheme(preference: ThemePreference): void {
    state.preference.value = preference;
  }

  /** Toggle between light and dark. System preference stays system. */
  function toggleTheme(): void {
    if (state.preference.value === "system") {
      // Toggle the resolved theme and lock to it, so the user can override
      // the OS preference with one click.
      state.preference.value = resolvedTheme.value === "dark" ? "light" : "dark";
    } else {
      state.preference.value = state.preference.value === "dark" ? "light" : "dark";
    }
  }

  return { theme, resolvedTheme, setTheme, toggleTheme } as const;
}

/**
 * Inline script to prevent flash-of-wrong-theme on SSR pages.
 *
 * Paste it into `<head>` before any stylesheet links:
 *
 * ```html
 * <script><%= themeScript %></script>
 * ```
 *
 * It reads `localStorage` and sets `data-theme` on `<html>` synchronously,
 * before the browser paints, so the first frame is already in the right
 * theme. When no preference is stored, it follows the OS preference.
 *
 * The script is deliberately tiny and has no dependencies.
 */
export const themeScript = `(() => {
  const t = localStorage.getItem("${STORAGE_KEY}");
  const d = window.matchMedia("${MEDIA_QUERY}").matches;
  document.documentElement.setAttribute("${DATA_ATTR}", (t === "dark" || (!t && d)) ? "dark" : "light");
})()`;
