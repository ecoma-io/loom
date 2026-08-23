import { beforeEach, describe, expect, it, vi } from "vitest";
import { EffectScope, nextTick } from "vue";
import { useTheme, _resetThemeState } from "./theme";

// The composable writes `data-theme` on `document.documentElement` and reads
// from `localStorage`, so both need a clean slate per test. The shared state
// is a module-level singleton, so it must be reset between tests too.
beforeEach(() => {
  _resetThemeState();
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
});

describe("useTheme", () => {
  it("applies the resolved theme to data-theme on init", () => {
    localStorage.setItem("loom:theme", "light");
    const { resolvedTheme } = useTheme();
    expect(resolvedTheme.value).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("applies a stored dark preference on init", () => {
    localStorage.setItem("loom:theme", "dark");
    const { resolvedTheme } = useTheme();
    expect(resolvedTheme.value).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("setTheme updates the preference, the DOM, and localStorage", async () => {
    localStorage.setItem("loom:theme", "light");
    const { theme, resolvedTheme, setTheme } = useTheme();
    setTheme("dark");
    await nextTick();
    expect(theme.value).toBe("dark");
    expect(resolvedTheme.value).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("loom:theme")).toBe("dark");
  });

  it("toggleTheme flips between light and dark", async () => {
    localStorage.setItem("loom:theme", "light");
    const { resolvedTheme, toggleTheme } = useTheme();
    expect(resolvedTheme.value).toBe("light");
    toggleTheme();
    await nextTick();
    expect(resolvedTheme.value).toBe("dark");
    toggleTheme();
    await nextTick();
    expect(resolvedTheme.value).toBe("light");
  });

  it("resolves system to light in jsdom (which has no dark preference)", () => {
    localStorage.setItem("loom:theme", "system");
    const { theme, resolvedTheme } = useTheme();
    // jsdom's matchMedia always returns matches: false
    expect(theme.value).toBe("system");
    expect(resolvedTheme.value).toBe("light");
  });
});

describe("themeScript", () => {
  it("exports a non-empty self-executing string that references the storage key and data attribute", async () => {
    const { themeScript } = await import("./theme");
    expect(typeof themeScript).toBe("string");
    expect(themeScript.length).toBeGreaterThan(0);
    expect(themeScript).toMatch(/^\(\(\) =>/);
    expect(themeScript).toContain("loom:theme");
    expect(themeScript).toContain("data-theme");
  });
});

describe("useTheme outside an effect scope", () => {
  it("warns once and does not count the consumer, so the state can still be released", async () => {
    localStorage.setItem("loom:theme", "light");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const orphan = useTheme(); // a bare test body has no active effect scope
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toContain("effect scope");

      // Once, not per call.
      useTheme();
      expect(warn).toHaveBeenCalledTimes(1);

      // Not counting the orphan is what keeps the state releasable: the one
      // countable consumer's scope disposing must tear the side effects down
      // even though the orphan still holds refs. Counting the orphan instead
      // would keep the matchMedia listener alive for the rest of the process.
      const scope = new EffectScope();
      scope.run(() => useTheme());
      scope.stop();

      orphan.setTheme("dark");
      await nextTick();
      // The detached apply/persist watcher died with the counted scope, so
      // the orphaned caller's write stops at the ref and reaches nothing.
      expect(localStorage.getItem("loom:theme")).toBe("light");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    } finally {
      warn.mockRestore();
    }
  });
});

describe("apply/persist side effects", () => {
  it("run once per change, not once per consumer", async () => {
    localStorage.setItem("loom:theme", "light");
    const first = new EffectScope();
    const second = new EffectScope();
    const consumer = first.run(() => useTheme());
    second.run(() => useTheme());

    const setItem = vi.spyOn(Storage.prototype, "setItem");
    try {
      consumer!.setTheme("dark");
      await nextTick();
      // Per-consumer watchers would each persist, doubling the write.
      expect(setItem).toHaveBeenCalledTimes(1);
    } finally {
      setItem.mockRestore();
      second.stop();
      first.stop();
    }
  });

  it("survive one consumer unmounting while another stays mounted", async () => {
    localStorage.setItem("loom:theme", "light");
    const first = new EffectScope();
    const second = new EffectScope();
    const survivor = second.run(() => useTheme());
    first.run(() => useTheme());
    first.stop();

    survivor!.setTheme("dark");
    await nextTick();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    second.stop();
  });

  it("skip storage when only the OS signal moves under 'system'", async () => {
    localStorage.setItem("loom:theme", "system");

    // A controllable stand-in for the OS dark-mode query — jsdom's real one
    // never flips, which is exactly the case under test.
    const listeners = new Set<(event: { matches: boolean }) => void>();
    const media = {
      matches: false,
      addEventListener: (_: string, listener: (event: { matches: boolean }) => void) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: (event: { matches: boolean }) => void) =>
        listeners.delete(listener),
    };
    // This jsdom ships no `matchMedia` at all — theme.ts reads its absence as
    // "no OS signal" — so the stand-in is assigned rather than spied on.
    const withoutMatchMedia = window.matchMedia;
    window.matchMedia = (() => media) as unknown as typeof window.matchMedia;

    try {
      const { resolvedTheme } = useTheme();
      expect(resolvedTheme.value).toBe("light");

      const setItem = vi.spyOn(Storage.prototype, "setItem");
      try {
        media.matches = true;
        for (const listener of listeners) listener({ matches: true });
        await nextTick();

        expect(resolvedTheme.value).toBe("dark");
        expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
        // The user's stored preference never changed, so neither should what
        // is in storage — "system" churn with every OS flip is what
        // lastPersisted exists to stop.
        expect(setItem).not.toHaveBeenCalled();
        expect(localStorage.getItem("loom:theme")).toBe("system");
      } finally {
        setItem.mockRestore();
      }
    } finally {
      window.matchMedia = withoutMatchMedia;
    }
  });
});
