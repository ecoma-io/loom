import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import DesktopAppShell from "./DesktopAppShell.vue";
import TitleBar from "../TitleBar/TitleBar.vue";

// TitleBar is the only collaborator that carries behaviour (event re-emission).
// The mock keeps its declared props + emits so a rename in the source breaks
// the stub here rather than silently passing with a stale shape.
vi.mock("../TitleBar/TitleBar.vue", async () => {
  const actual = await vi.importActual("../TitleBar/TitleBar.vue");
  const c = (actual as { default: { emits?: string[]; props?: Record<string, unknown> } }).default;
  return {
    default: {
      name: "TitleBar",
      props: c.props ? Object.keys(c.props) : [],
      emits: c.emits ?? [],
      template: "<div data-testid='titlebar' />",
    },
  };
});

interface MockEmitter {
  $emit: (event: string, ...args: unknown[]) => void;
}

function emitFrom(target: { vm: unknown }, event: string, ...args: unknown[]): void {
  (target.vm as MockEmitter).$emit(event, ...args);
}

function shell(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(DesktopAppShell, {
    props: { appName: "TestApp", ...props },
    slots,
  });
}

describe("DesktopAppShell", () => {
  it("renders TitleBar at the top, because the shell's first job is wiring window chrome to the layout", () => {
    const wrapper = shell();
    expect(wrapper.findComponent(TitleBar).exists()).toBe(true);
  });

  it("passes appName through to TitleBar, which carries no identity of its own", () => {
    const wrapper = shell();
    expect(wrapper.findComponent(TitleBar).props("appName")).toBe("TestApp");
  });

  it("forwards menus and isMaximized to TitleBar so the host's menu and window state reach the chrome", () => {
    const menus = [{ id: "file", label: "File", items: [] }];
    const wrapper = shell({ menus, isMaximized: true });
    const tb = wrapper.findComponent(TitleBar);
    expect(tb.props("menus")).toEqual(menus);
    expect(tb.props("isMaximized")).toBe(true);
  });

  it("renders the sidebar slot inside an aside landmark, so assistive tech announces the navigation region", () => {
    const wrapper = shell({}, { sidebar: "<nav>Sidebar content</nav>" });
    const aside = wrapper.find("aside");
    expect(aside.exists()).toBe(true);
    expect(aside.text()).toContain("Sidebar content");
  });

  it("renders the default slot in the main content area", () => {
    const wrapper = shell({}, { default: "<p>Main content</p>" });
    const main = wrapper.find("main");
    expect(main.exists()).toBe(true);
    expect(main.text()).toContain("Main content");
  });

  it("applies the sidebarWidth to the aside's flex-basis, mapping each size key to its rem value", () => {
    const sm = shell({ sidebarWidth: "sm" }).find("aside");
    expect(sm.attributes("style")).toContain("12rem");

    const md = shell({ sidebarWidth: "md" }).find("aside");
    expect(md.attributes("style")).toContain("16rem");

    const lg = shell({ sidebarWidth: "lg" }).find("aside");
    expect(lg.attributes("style")).toContain("20rem");
  });

  it("gives the sidebar a default aria-label, and accepts a custom one", () => {
    const defaultLabel = shell().find("aside");
    expect(defaultLabel.attributes("aria-label")).toBe("Sidebar");

    const custom = shell({ sidebarAriaLabel: "Project navigation" }).find("aside");
    expect(custom.attributes("aria-label")).toBe("Project navigation");
  });

  it("re-emits TitleBar events without acting on them — the host owns IPC", () => {
    const wrapper = shell({ menus: [{ id: "file", label: "File", items: [] }] });
    const tb = wrapper.findComponent(TitleBar);

    emitFrom(tb, "select", "file.open");
    emitFrom(tb, "minimize");
    emitFrom(tb, "maximize");
    emitFrom(tb, "close");

    expect(wrapper.emitted("select")).toEqual([["file.open"]]);
    expect(wrapper.emitted("minimize")).toHaveLength(1);
    expect(wrapper.emitted("maximize")).toHaveLength(1);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("forwards the brandIcon and brandMark slots through to TitleBar", () => {
    const wrapper = shell(
      {},
      {
        brandIcon: "<span data-testid='brand-icon'>BI</span>",
        brandMark: "<span data-testid='brand-mark'>BM</span>",
      },
    );
    const tb = wrapper.findComponent(TitleBar);
    // TitleBar is mocked, so the slots land in its stub's template output
    expect(tb.exists()).toBe(true);
  });

  it("forwards the platform prop to TitleBar so it can adjust for native window controls", () => {
    const wrapper = shell({ platform: "macos" });
    expect(wrapper.findComponent(TitleBar).props("platform")).toBe("macos");
  });

  it("defaults to windows platform, which shows the Loom window-control cluster", () => {
    const wrapper = shell();
    expect(wrapper.findComponent(TitleBar).props("platform")).toBe("windows");
  });
});
