import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import TitleBar from "./TitleBar.vue";
import Menubar from "../../primitives/Menubar/Menubar.vue";
import WindowControls from "../../primitives/WindowControls/WindowControls.vue";

// The mock component options above carry no TS-declared emits, so a found
// wrapper's `.vm` type does not expose `$emit`. This names only the seam
// these tests drive — every real emit signature stays owned by the
// primitive's own component and test. The parameter is the structural
// minimum (`{ vm: unknown }`) rather than `VueWrapper` itself, since a
// mocked-component wrapper's own type does not resolve cleanly through this
// package's `.vue` imports.
interface MockEmitter {
  $emit: (event: string, ...args: unknown[]) => void;
}

function emitFrom(target: { vm: unknown }, event: string, ...args: unknown[]): void {
  (target.vm as MockEmitter).$emit(event, ...args);
}

// Unit tier: every project-internal collaborator is isolated. Each stub keeps
// only the seam this file's own behavior is defined against — the events
// TitleBar re-emits. The imports above resolve to these same mocks (Vitest
// intercepts every import of the path, this file's included), which is what
// lets `findComponent` below match by reference instead of by name string.
vi.mock("../../primitives/Menubar/Menubar.vue", () => ({
  default: { name: "Menubar", props: ["menus"], emits: ["select"], template: "<div />" },
}));
vi.mock("../../primitives/WindowControls/WindowControls.vue", () => ({
  default: {
    name: "WindowControls",
    props: ["isMaximized", "labels"],
    emits: ["minimize", "maximize", "close"],
    template: "<div />",
  },
}));
vi.mock("../../icons/BrandMark", () => ({ default: { name: "BrandMark", template: "<svg />" } }));

/**
 * NOT pinned here, deliberately and with the reason recorded: the window drag
 * region. Vue applies a static `style` attribute through `el.style.cssText`,
 * and jsdom's CSS parser drops `-webkit-app-region` outright — verified, the
 * style attribute comes back as the empty string. So an assertion about which
 * clusters are `drag` and which are `no-drag` would not be weak here, it would
 * be vacuous: `not.toContain("no-drag")` passes against markup that never had
 * a style at all. Pinning it needs an engine that keeps the property, and the
 * option that would make it testable at this tier — moving the declaration
 * into a utility class — trades a guarantee for it, since a host that has not
 * wired the stylesheet would then lose its drag region silently. That is a
 * call for the desktop host's own review, not a side effect of this file.
 */
describe("TitleBar", () => {
  it("renders the host's brand name, since the block carries no identity of its own", () => {
    const wrapper = mount(TitleBar, { props: { appName: "MyApp" } });
    const brand = wrapper.get("header").element.firstElementChild as HTMLElement;
    expect(brand.textContent).toContain("MyApp");
  });

  it("renders the menu bar only when the host supplies menus, so a menu-less app gets no empty cluster", () => {
    const without = mount(TitleBar, { props: { appName: "MyApp" } });
    expect(without.findComponent(Menubar).exists()).toBe(false);

    const withMenus = mount(TitleBar, {
      props: { appName: "MyApp", menus: [{ id: "file", label: "File", items: [] }] },
    });
    expect(withMenus.findComponent(Menubar).exists()).toBe(true);
  });

  it("re-emits window intents and menu commands without acting on them — the host owns IPC", () => {
    const wrapper = mount(TitleBar, {
      props: { appName: "MyApp", menus: [{ id: "file", label: "File", items: [] }] },
    });

    // `select`/`minimize`/`close` are re-emitted from a plain event handler
    // (`@select="emit(...)"`), not from state that needs a render to settle —
    // `emitted()` already reflects it synchronously, so no tick is awaited.
    emitFrom(wrapper.findComponent(Menubar), "select", "file.open");
    const controls = wrapper.findComponent(WindowControls);
    emitFrom(controls, "minimize");
    emitFrom(controls, "close");

    expect(wrapper.emitted("select")).toEqual([["file.open"]]);
    expect(wrapper.emitted("minimize")).toHaveLength(1);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});
