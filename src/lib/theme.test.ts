import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
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
