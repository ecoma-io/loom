import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { Bell, Home, Settings } from "@lucide/vue";
import SidebarNav, { type SidebarNavItem, type SidebarNavSection } from "./SidebarNav.vue";
import Tooltip from "../../primitives/Tooltip/Tooltip.vue";

// Stubbed so the collapsed-mode test can pin the `content` prop SidebarNav
// hands to Tooltip without exercising Reka UI's real popper/portal behaviour
// (that belongs to Tooltip's own test) — a unit test isolates its collaborator.
//
// The stub's props are read from the real component at mock time, so a rename
// of Tooltip's `content` prop changes the shape the stub declares and the test
// that passes `content` to it breaks.
vi.mock("../../primitives/Tooltip/Tooltip.vue", async () => {
  const actual = await vi.importActual("../../primitives/Tooltip/Tooltip.vue");
  const c = (actual as { default: { props?: Record<string, unknown> } }).default;
  return {
    default: {
      name: "Tooltip",
      props: c.props ? Object.keys(c.props) : [],
      template: '<div><slot name="trigger" /></div>',
    },
  };
});

// Badge and Separator render in SidebarNav's own template, which the isolation
// convention cannot see without an explicit mock — stubbed so this stays a
// unit test. The Badge stub keeps its default slot, which is the seam the
// badge-text assertions below are defined against; Badge's own styling and
// variants belong to Badge's test.
vi.mock("../../primitives/Badge/Badge.vue", async () => {
  const actual = await vi.importActual("../../primitives/Badge/Badge.vue");
  const c = (actual as { default: { props?: Record<string, unknown> } }).default;
  return {
    default: {
      name: "Badge",
      props: c.props ? Object.keys(c.props) : [],
      template: "<span><slot /></span>",
    },
  };
});
vi.mock("../../primitives/Separator/Separator.vue", async () => {
  const actual = await vi.importActual("../../primitives/Separator/Separator.vue");
  const c = (actual as { default: { props?: Record<string, unknown> } }).default;
  return {
    default: {
      name: "Separator",
      props: c.props ? Object.keys(c.props) : [],
      template: "<hr />",
    },
  };
});

// jsdom has no ResizeObserver — Reka's Tooltip/Popper measure with one even
// while closed.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  },
);

// Named rather than reached by indexing `SECTIONS` later: `SidebarNavSection`
// resolves only through `vue-tsc` (this is a plain `.ts` file importing a
// type from a `.vue` module), and indexing a `noUncheckedIndexedAccess` array
// of that type is where the type-aware linter loses it.
const overviewItem: SidebarNavItem = {
  icon: Home,
  label: "Overview",
  active: true,
  href: "#overview",
};
const notificationsItem: SidebarNavItem = {
  icon: Bell,
  label: "Notifications",
  badge: 3,
  href: "#notifications",
};
const settingsItem: SidebarNavItem = { icon: Settings, label: "Settings" };

const SECTIONS: SidebarNavSection[] = [
  { items: [overviewItem, notificationsItem] },
  { label: "System", items: [settingsItem] },
];

describe("SidebarNav", () => {
  it("marks only the current destination with aria-current=page, leaving every other item unmarked", () => {
    const wrapper = mount(SidebarNav, { props: { sections: SECTIONS } });
    const links = wrapper.findAll("a");
    expect(links[0]!.attributes("aria-current")).toBe("page");
    expect(links[1]!.attributes("aria-current")).toBeUndefined();
  });

  it("paints the active item with the human/warp accent alone — a tinted fill, never the agent weft", () => {
    const wrapper = mount(SidebarNav, { props: { sections: SECTIONS } });
    const links = wrapper.findAll("a");
    expect(links[0]!.classes()).toContain("bg-primary/10");
    expect(links[0]!.classes()).toContain("text-primary");
    expect(links[0]!.classes().some((c) => c.includes("agent"))).toBe(false);
    expect(links[1]!.classes()).not.toContain("bg-primary/10");
  });

  it("renders an item without href as a real button, and one with href as a real anchor", () => {
    const wrapper = mount(SidebarNav, { props: { sections: SECTIONS } });
    const button = wrapper.get('button[type="button"]');
    expect(button.text()).toContain("Settings");
    expect(wrapper.get('a[href="#overview"]').text()).toContain("Overview");
  });

  it("emits select with the item on click — Enter/Space on a native <a>/<button> already produce a click per the HTML spec, so no bespoke key handling is required for keyboard activation", async () => {
    const wrapper = mount(SidebarNav, { props: { sections: SECTIONS } });

    await wrapper.get('a[href="#notifications"]').trigger("click");
    expect(wrapper.emitted("select")).toEqual([[notificationsItem]]);

    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("select")).toEqual([[notificationsItem], [settingsItem]]);
  });

  it("collapses to icon-only rows: visible label and badge text disappear, and the accessible name moves to aria-label since the label is no longer visible", () => {
    const wrapper = mount(SidebarNav, { props: { sections: SECTIONS, collapsed: true } });

    const overview = wrapper.get('a[href="#overview"]');
    expect(overview.text()).toBe("");
    expect(overview.attributes("aria-label")).toBe("Overview");

    const notifications = wrapper.get('a[href="#notifications"]');
    expect(notifications.text()).not.toContain("3"); // badge moves into the tooltip instead
    expect(notifications.attributes("aria-label")).toBe("Notifications");

    // Section heading text hides too — there is no room for it in the rail.
    expect(wrapper.text()).not.toContain("System");
  });

  it("folds a hidden badge into the collapsed item's Tooltip content, and leaves a badge-less item's tooltip as the bare label", () => {
    const wrapper = mount(SidebarNav, { props: { sections: SECTIONS, collapsed: true } });
    const tooltips = wrapper.findAllComponents(Tooltip);

    const overviewTooltip = tooltips.find((tooltip) =>
      tooltip.find('a[href="#overview"]').exists(),
    );
    const notificationsTooltip = tooltips.find((tooltip) =>
      tooltip.find('a[href="#notifications"]').exists(),
    );

    expect(overviewTooltip?.props("content")).toBe("Overview");
    expect(notificationsTooltip?.props("content")).toBe("Notifications · 3");
  });

  it("lifts a hovered item to the raised plane rather than tinting it with the subtle token, which is one percent of lightness from the sunken plane this nav sits on", () => {
    const wrapper = mount(SidebarNav, { props: { sections: SECTIONS } });
    const inactive = wrapper.get('a[href="#notifications"]');

    expect(inactive.classes()).toContain("hover:bg-card");
    // `--subtle` (94% L) is the neutral hover fill for surfaces on
    // `--background` (96% L). This nav is on `--sunken` (93% L), where the same
    // token is invisible — a hover state present in the markup and absent on
    // screen, which no rendering test would catch either.
    expect(inactive.classes()).not.toContain("hover:bg-subtle");
  });

  it("centers its rows when collapsed, so the icon rail reads correctly even at a container width the host has not narrowed yet", () => {
    const expanded = mount(SidebarNav, { props: { sections: SECTIONS } });
    expect(expanded.get("nav").classes()).not.toContain("items-center");

    // Collapsed rows are square, not full-width, so without this the rail is a
    // column of icons hugging the left edge of a wide empty panel for as long
    // as the host takes to animate the width down (or forever, if it does not).
    const collapsed = mount(SidebarNav, { props: { sections: SECTIONS, collapsed: true } });
    expect(collapsed.get("nav").classes()).toContain("items-center");
  });

  it("shows the visible label (and keeps aria-label off) once expanded, since the text itself is the accessible name", () => {
    const wrapper = mount(SidebarNav, { props: { sections: SECTIONS, collapsed: false } });
    const overview = wrapper.get('a[href="#overview"]');
    expect(overview.text()).toContain("Overview");
    expect(overview.attributes("aria-label")).toBeUndefined();
    expect(wrapper.text()).toContain("System");
  });

  // The per-item names are pinned above; the nav's OWN name was not —
  // measured: deleting `:aria-label="ariaLabel"` from the `<nav>` left this
  // file green. A page with more than one navigation landmark needs each of
  // them named to be told apart, and this prop is a host's only way to do it.
  it("names the navigation landmark itself from ariaLabel, so a page with several navs stays distinguishable", () => {
    const named = mount(SidebarNav, { props: { sections: SECTIONS, ariaLabel: "Workspace" } });
    expect(named.get("nav").attributes("aria-label")).toBe("Workspace");

    const unnamed = mount(SidebarNav, { props: { sections: SECTIONS } });
    expect(unnamed.get("nav").attributes("aria-label")).toBeUndefined();
  });

  // Icons and the active rail marker are decoration beside text that already
  // says the same thing — measured: deleting every `aria-hidden` here left the
  // file green, which is how a rail starts announcing "Home Overview, Bell
  // Notifications" and every row reads twice.
  it("hides the decorative icon and the active-row marker from assistive tech while the label text stays announced", () => {
    const wrapper = mount(SidebarNav, { props: { sections: SECTIONS } });
    const overview = wrapper.get('a[href="#overview"]');

    expect(overview.get("svg").attributes("aria-hidden")).toBe("true");
    expect(overview.get("span.bg-primary").attributes("aria-hidden")).toBe("true");
    expect(overview.get("span.truncate").attributes("aria-hidden")).toBeUndefined();
  });
});
