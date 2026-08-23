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

import { type Ref, EffectScope, computed, getCurrentScope, onScopeDispose, ref, watch } from "vue";

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
  /** Consumers that can be released — see `useTheme` for who does not count. */
  scopeCount: number;
  /**
   * The detached scope that owns the apply/persist watcher below. The side
   * effects are the shared state's, not the first consumer's: owned by a
   * consumer's scope they would die the day that component unmounted while
   * later ones stayed mounted, leaving an app whose theme button had gone
   * silent. Detached so creation inside a component setup does not link it
   * into that component's own scope.
   */
  owner: EffectScope;
  /**
   * The preference last written to `localStorage`. `"system"` resolves away,
   * so OS dark-mode flips fire the watcher with a preference that has not
   * changed — without this, every flip rewrites storage with the same value.
   */
  lastPersisted: ThemePreference;
}

/**
 * Reactive shared state, lazily initialised on the first `useTheme()` call
 * and torn down with the effect scope that owns it. Multiple components
 * calling `useTheme()` in the same app share the same refs and the same
 * `matchMedia` listener.
 */
let sharedState: ThemeState | null = null;

/** Fired once, at the first `useTheme()` call made outside any active effect scope. */
let warnedOutsideScope = false;

/**
 * Reset the shared state. Intended for test isolation only — a real app
 * never needs this because the state lives for the app's lifetime.
 */
export function _resetThemeState(): void {
  if (sharedState) {
    sharedState.owner.stop();
    if (sharedState.mediaQuery && sharedState.listener) {
      sharedState.mediaQuery.removeEventListener("change", sharedState.listener);
    }
  }
  sharedState = null;
  warnedOutsideScope = false;
}

function getSharedState(): ThemeState {
  // A consumer is released by the effect scope it was called from, so a call
  // from outside any scope is one that could never be released — counting it
  // would pin the matchMedia listener open forever. It still gets the state,
  // but it does not count toward teardown, and development is told once so
  // the eventual leak is attributed to a call site instead of discovered as
  // an immortal listener.
  const scoped = getCurrentScope() !== undefined;
  if (!scoped && !warnedOutsideScope) {
    warnedOutsideScope = true;
    console.warn(
      "[loom] useTheme() called outside an active effect scope; the shared theme state can never be released. Call it from setup() or inside an effectScope().",
    );
  }

  if (sharedState) {
    if (scoped) sharedState.scopeCount++;
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

  const owner = new EffectScope(true);
  const state: ThemeState = {
    preference,
    systemIsDark,
    mediaQuery,
    listener,
    scopeCount: scoped ? 1 : 0,
    owner,
    lastPersisted: stored,
  };
  sharedState = state;

  // The apply/persist watcher is created exactly once, here in the detached
  // scope that owns the shared state — never per consumer. N components
  // calling `useTheme()` must not mean N writes to `data-theme` and
  // `localStorage` on every change.
  owner.run(() => {
    watch([preference, systemIsDark], () => {
      // Applied even when the preference itself has not moved: an OS flip
      // under `"system"` resolves differently without any user action.
      applyToDOM(resolveTheme(preference.value, systemIsDark.value));
      if (preference.value !== state.lastPersisted) {
        state.lastPersisted = preference.value;
        persist(state.lastPersisted);
      }
    });
  });

  return state;
}

function releaseSharedState(): void {
  if (!sharedState) return;
  sharedState.scopeCount--;
  if (sharedState.scopeCount > 0) return;

  // Last counted consumer gone — stop the side effects, then the listener.
  sharedState.owner.stop();
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
 * Call it from a component `setup()` or inside an `effectScope()` — that
 * scope is what releases the shared state when its last real consumer
 * unmounts. A call from outside any effect scope still works, but it can
 * never be released, so it is not counted and development warns once; the
 * shared state simply lives as long as whatever creates it next counts for.
 * The DOM-apply and persistence side effects are created once per app in a
 * detached scope of their own — never once per consumer — and storage is
 * only written when the stored preference actually changes.
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

  // Clean up the shared state when the consuming scope disposes. Only a call
  // from inside an active scope is registered — and only such a call was
  // counted by `getSharedState()` in the first place; outside one,
  // `onScopeDispose` would silently do nothing and the count would never
  // come back down.
  if (getCurrentScope() !== undefined) onScopeDispose(releaseSharedState);

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
