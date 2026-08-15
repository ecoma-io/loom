import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AppHeader from "../src/AppHeader.vue";

// AppHeader imports no primitive — it is pure layout over named slots — so
// there is no project-internal collaborator to mock here.
describe("AppHeader", () => {
  it("renders a <header> landmark", () => {
    const wrapper = mount(AppHeader);
    expect(wrapper.find("header").exists()).toBe(true);
  });

  it("exposes the aria-label prop on the landmark, so multiple headers on one page stay distinguishable", () => {
    const wrapper = mount(AppHeader, { props: { ariaLabel: "Primary navigation" } });
    expect(wrapper.get("header").attributes("aria-label")).toBe("Primary navigation");
  });

  it("renders brand, search, and every trailing named slot when the host provides them", () => {
    const wrapper = mount(AppHeader, {
      slots: {
        brand: "<span>Brand</span>",
        search: '<input aria-label="Search" />',
        leading: "<button>Workspace</button>",
        notifications: "<button>Bell</button>",
        userMenu: "<button>Me</button>",
      },
    });
    expect(wrapper.text()).toContain("Brand");
    expect(wrapper.find("input").exists()).toBe(true);
    expect(wrapper.text()).toContain("Workspace");
    expect(wrapper.text()).toContain("Bell");
    expect(wrapper.text()).toContain("Me");
  });

  it("renders no layout element beyond the slotted regions themselves, pushing the trailing cluster right from the cluster instead", () => {
    const wrapper = mount(AppHeader, {
      slots: { search: '<input aria-label="Search" />', userMenu: "<button>Me</button>" },
    });
    const header = wrapper.get("header");

    // The regression this guards: a `flex-1` spacer element reintroduced to
    // push the cluster right. It works, but it is a second growing box beside
    // the search field, so the two split the free space and the field silently
    // renders narrower than what is actually left for it. Two slotted regions
    // must produce exactly two children.
    expect(header.element.children).toHaveLength(2);
    const cluster = header.get('[class*="ml-auto"]');
    expect(cluster.find("button").exists()).toBe(true);
  });

  it("renders none of the optional regions when the host provides no slots", () => {
    const wrapper = mount(AppHeader);
    expect(wrapper.find("input").exists()).toBe(false);
    expect(wrapper.get("header").text()).toBe("");
  });
});
