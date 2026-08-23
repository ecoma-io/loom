import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import List from "../src/List.vue";
import ListItem from "../src/ListItem.vue";

enableAutoUnmount(afterEach);

function mountList(
  itemProps: Record<string, unknown> = {},
  listProps: Record<string, unknown> = {},
) {
  const activations = { count: 0 };
  const Wrapper = defineComponent(() => {
    return () =>
      h(List, listProps, {
        default: () => [
          h(ListItem, { title: "Read-only", meta: "4" }),
          h(ListItem, {
            title: "Actionable",
            description: "Emits on click",
            ...itemProps,
            onActivate: () => activations.count++,
          }),
        ],
      });
  });
  return { wrapper: mount(Wrapper), activations };
}

describe("List", () => {
  it("is a real list whose rows are list items", () => {
    const { wrapper } = mountList();
    expect(wrapper.find("ul").exists()).toBe(true);
    expect(wrapper.findAll("li")).toHaveLength(2);
  });

  it("divides rows by default and drops the hairlines when asked", () => {
    expect(mountList().wrapper.get("ul").classes()).toContain("divide-y");
    expect(mountList({}, { divided: false }).wrapper.get("ul").classes()).not.toContain("divide-y");
  });

  it("renders title, description and trailing metadata in tabular digits", () => {
    const { wrapper } = mountList();
    expect(wrapper.text()).toContain("Read-only");
    expect(wrapper.text()).toContain("Emits on click");
    expect(wrapper.text()).toContain("4");
    expect(wrapper.html()).toContain("tabular");
  });

  describe("shapes", () => {
    it("keeps a plain row a div — no cursor, no handler, no lies", () => {
      const { wrapper } = mountList();
      const row = wrapper.findAll("li")[0]!.find("div");
      expect(row.exists()).toBe(true);
      expect(row.classes().join(" ")).not.toContain("cursor-pointer");
    });

    it("activates an interactive row from one Tab stop, and drains when disabled", async () => {
      const { wrapper, activations } = mountList({ interactive: true });
      const button = wrapper.findAll("li")[1]!.get("button");
      expect(button.attributes("type")).toBe("button");

      await button.trigger("click");
      expect(activations.count).toBe(1);

      // Disabled is inert but announced — a missing row says nothing.
      const off = mountList({ interactive: true, disabled: true });
      await off.wrapper.findAll("li")[1]!.get("button").trigger("click");
      expect(off.activations.count).toBe(0);
      expect(off.wrapper.findAll("li")[1]!.text()).toContain("Actionable");
    });

    // A drained-but-navigating row is a lie in both directions; disabling a
    // link-shaped row removes the destination and states it.
    it("disables an href row by removing the destination while keeping it announced", () => {
      const wrapper = mount(List, {
        slots: {
          default: () => [h(ListItem, { href: "/x", title: "Locked plan", disabled: true })],
        },
      });
      const anchor = wrapper.get("a");
      expect(anchor.attributes("href")).toBeUndefined();
      expect(anchor.attributes("aria-disabled")).toBe("true");
      expect(anchor.text()).toContain("Locked plan");
    });

    it("renders href rows as real anchors carrying the content as their name", () => {
      const wrapper = mount(List, {
        slots: {
          default: () => [
            h(ListItem, { href: "/projects/loom", title: "Open project", description: "d" }),
          ],
        },
      });
      const anchor = wrapper.get("a");
      expect(anchor.attributes("href")).toBe("/projects/loom");
      expect(anchor.text()).toContain("Open project");
    });
  });

  it("states selection twice — aria-current for technology, a glyph for eyes", () => {
    const { wrapper } = mountList({ selected: true });
    const actionable = wrapper.findAll("li")[1]!;
    expect(actionable.find("[aria-current]").attributes("aria-current")).toBe("true");
    expect(actionable.find("svg").exists()).toBe(true);
  });

  it("exposes leading and trailing slots around the body", () => {
    const wrapper = mount(List, {
      slots: {
        default: () => [
          h(
            ListItem,
            { title: "T" },
            {
              leading: () => h("span", { "data-testid": "lead" }, "L"),
              trailing: () => h("span", { "data-testid": "tail" }, "R"),
            },
          ),
        ],
      },
    });
    expect(wrapper.find('[data-testid="lead"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tail"]').exists()).toBe(true);
  });

  it("tightens rhythm in dense mode without touching the list contract", () => {
    const { wrapper } = mountList({ dense: true });
    const inner = wrapper.findAll("li")[1]!.element.firstElementChild as HTMLElement;
    expect(inner.className).toContain("py-1.5");
  });
});
