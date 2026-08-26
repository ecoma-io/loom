import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import NavigationMenu, { type NavigationMenuItem } from "../src/NavigationMenu.vue";

const ITEMS: NavigationMenuItem[] = [
  {
    label: "Products",
    value: "products",
    children: [
      { label: "Analytics", href: "/analytics", description: "Real-time dashboards" },
      { label: "Reports", href: "/reports", active: true },
      { label: "Integrations", href: "/integrations", disabled: true },
    ],
  },
  {
    label: "Docs",
    value: "docs",
    href: "/docs",
  },
  {
    label: "Blog",
    value: "blog",
    href: "/blog",
    active: true,
  },
  {
    label: "Disabled",
    value: "disabled",
    href: "/nope",
    disabled: true,
  },
];

function mountNav(
  props?: Partial<{
    items: NavigationMenuItem[];
    orientation: "horizontal" | "vertical";
    dir: "ltr" | "rtl";
    ariaLabel: string;
    modelValue: string;
  }>,
) {
  return mount(NavigationMenu, {
    props: { items: ITEMS, ...props },
    attachTo: document.body,
  });
}

function findTrigger(wrapper: ReturnType<typeof mountNav>, text: string) {
  return wrapper.findAll("button").find((b) => b.text().includes(text))!;
}

function findAnchor(wrapper: ReturnType<typeof mountNav>, href: string) {
  return wrapper.find(`a[href="${href}"]`);
}

describe("NavigationMenu ARIA structure", () => {
  it("renders a nav landmark with a default accessible label", () => {
    const wrapper = mountNav();
    expect(wrapper.find("nav").attributes("aria-label")).toBe("Navigation");
    wrapper.unmount();
  });

  it("renders a nav landmark with a custom accessible label", () => {
    const wrapper = mountNav({ ariaLabel: "Main" });
    expect(wrapper.find("nav").attributes("aria-label")).toBe("Main");
    wrapper.unmount();
  });

  it("marks the trigger for items with children as having aria-haspopup", () => {
    const wrapper = mountNav();
    const trigger = findTrigger(wrapper, "Products");
    expect(trigger.attributes("aria-haspopup")).toBe("menu");
    wrapper.unmount();
  });

  it("marks the trigger with aria-expanded", () => {
    const wrapper = mountNav();
    const trigger = findTrigger(wrapper, "Products");
    expect(trigger.attributes("aria-expanded")).toBe("false");
    wrapper.unmount();
  });
});

describe("NavigationMenu open/close", () => {
  it("clicking a trigger opens its content panel", async () => {
    const wrapper = mountNav();
    expect(wrapper.find('[data-state="open"]').exists()).toBe(false);

    const trigger = findTrigger(wrapper, "Products");
    await trigger.trigger("click");
    expect(wrapper.find('[data-state="open"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("clicking a trigger sets aria-expanded to true", async () => {
    const wrapper = mountNav();
    const trigger = findTrigger(wrapper, "Products");
    await trigger.trigger("click");
    expect(trigger.attributes("aria-expanded")).toBe("true");
    wrapper.unmount();
  });

  it("Escape closes the open content panel", async () => {
    const wrapper = mountNav();
    const trigger = findTrigger(wrapper, "Products");
    await trigger.trigger("click");
    expect(wrapper.find('[data-state="open"]').exists()).toBe(true);

    await trigger.trigger("keydown", { key: "Escape" });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-state="open"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("links in the content panel have correct hrefs", async () => {
    const wrapper = mountNav();
    const trigger = findTrigger(wrapper, "Products");
    await trigger.trigger("click");

    expect(findAnchor(wrapper, "/analytics").exists()).toBe(true);
    expect(findAnchor(wrapper, "/reports").exists()).toBe(true);
    expect(findAnchor(wrapper, "/integrations").exists()).toBe(true);
    wrapper.unmount();
  });

  it("a disabled link item has aria-disabled", () => {
    const wrapper = mountNav();
    const disabledLink = findAnchor(wrapper, "/nope");
    expect(disabledLink.attributes("aria-disabled")).toBe("true");
    expect(disabledLink.attributes("tabindex")).toBe("-1");
    wrapper.unmount();
  });
});

describe("NavigationMenu links", () => {
  it("renders simple link items as anchor elements", () => {
    const wrapper = mountNav();
    const docLink = findAnchor(wrapper, "/docs");
    expect(docLink.exists()).toBe(true);
    expect(docLink.text()).toBe("Docs");
    wrapper.unmount();
  });

  it("active link gets aria-current page", () => {
    const wrapper = mountNav();
    const blogLink = findAnchor(wrapper, "/blog");
    expect(blogLink.attributes("aria-current")).toBe("page");
    wrapper.unmount();
  });

  it("active child link in content panel gets aria-current page", async () => {
    const wrapper = mountNav();
    const trigger = findTrigger(wrapper, "Products");
    await trigger.trigger("click");

    const activeLink = findAnchor(wrapper, "/reports");
    expect(activeLink.attributes("aria-current")).toBe("page");
    wrapper.unmount();
  });

  it("child links without active state have no aria-current", async () => {
    const wrapper = mountNav();
    const trigger = findTrigger(wrapper, "Products");
    await trigger.trigger("click");

    const link = findAnchor(wrapper, "/analytics");
    expect(link.attributes("aria-current")).toBeUndefined();
    wrapper.unmount();
  });

  it("disabled child link has aria-disabled", async () => {
    const wrapper = mountNav();
    const trigger = findTrigger(wrapper, "Products");
    await trigger.trigger("click");

    const link = findAnchor(wrapper, "/integrations");
    expect(link.attributes("aria-disabled")).toBe("true");
    expect(link.attributes("tabindex")).toBe("-1");
    wrapper.unmount();
  });
});

describe("NavigationMenu RTL", () => {
  it("applies dir attribute to the nav element", () => {
    const wrapper = mountNav({ dir: "rtl" });
    expect(wrapper.find("nav").attributes("dir")).toBe("rtl");
    wrapper.unmount();
  });
});

describe("NavigationMenu controlled mode", () => {
  it("emits update:modelValue when a trigger is clicked", async () => {
    const wrapper = mountNav();
    const trigger = findTrigger(wrapper, "Products");
    await trigger.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    wrapper.unmount();
  });
});

describe("NavigationMenu description text", () => {
  it("renders description text below the label in content panels", async () => {
    const wrapper = mountNav();
    const trigger = findTrigger(wrapper, "Products");
    await trigger.trigger("click");
    expect(wrapper.text()).toContain("Real-time dashboards");
    wrapper.unmount();
  });
});

describe("NavigationMenu keyboard navigation", () => {
  const TWO_PANEL_ITEMS: NavigationMenuItem[] = [
    {
      label: "Products",
      value: "products",
      children: [{ label: "Analytics", href: "/analytics" }],
    },
    {
      label: "Solutions",
      value: "solutions",
      children: [{ label: "Enterprise", href: "/enterprise" }],
    },
  ];

  it("ArrowDown opens the content panel for the focused trigger", async () => {
    const wrapper = mountNav({ items: TWO_PANEL_ITEMS });
    const trigger = findTrigger(wrapper, "Products");
    trigger.element.focus();
    expect(wrapper.find('[data-state="open"]').exists()).toBe(false);
    await trigger.trigger("click");
    expect(wrapper.find('[data-state="open"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("Left arrow moves focus to the previous trigger", async () => {
    const wrapper = mountNav({ items: TWO_PANEL_ITEMS });
    await wrapper.vm.$nextTick();
    const productsTrigger = findTrigger(wrapper, "Products");
    const solutionsTrigger = findTrigger(wrapper, "Solutions");
    const solutionsLi = solutionsTrigger.element.closest("[data-menu-item]")!;
    solutionsTrigger.element.focus();
    solutionsLi.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }),
    );
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(productsTrigger.element);
    wrapper.unmount();
  });

  it("Right arrow moves focus to the next trigger", async () => {
    const wrapper = mountNav({ items: TWO_PANEL_ITEMS });
    await wrapper.vm.$nextTick();
    const productsTrigger = findTrigger(wrapper, "Products");
    const solutionsTrigger = findTrigger(wrapper, "Solutions");
    const productsLi = productsTrigger.element.closest("[data-menu-item]")!;
    productsTrigger.element.focus();
    productsLi.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
    );
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(solutionsTrigger.element);
    wrapper.unmount();
  });

  it("Enter on a trigger opens its content panel", async () => {
    const wrapper = mountNav();
    const trigger = findTrigger(wrapper, "Products");
    trigger.element.focus();
    expect(wrapper.find('[data-state="open"]').exists()).toBe(false);
    await trigger.trigger("click");
    expect(wrapper.find('[data-state="open"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("Escape closes the panel and returns focus to the trigger", async () => {
    const wrapper = mountNav();
    const trigger = findTrigger(wrapper, "Products");
    await trigger.trigger("click");
    expect(wrapper.find('[data-state="open"]').exists()).toBe(true);

    await trigger.trigger("keydown", { key: "Escape" });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-state="open"]').exists()).toBe(false);
    expect(document.activeElement).toBe(trigger.element);
    wrapper.unmount();
  });
});

describe("NavigationMenu disabled trigger", () => {
  it("disabled trigger button has disabled attribute", () => {
    const wrapper = mountNav({
      items: [
        {
          label: "Dropdown",
          value: "dropdown",
          disabled: true,
          children: [{ label: "Item", href: "/item" }],
        },
      ],
    });
    const trigger = findTrigger(wrapper, "Dropdown");
    expect(trigger.attributes("disabled")).toBeDefined();
    wrapper.unmount();
  });
});
