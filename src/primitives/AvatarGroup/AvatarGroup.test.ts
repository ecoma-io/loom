import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AvatarGroup, { type AvatarGroupItem } from "./AvatarGroup.vue";

const TEAM: AvatarGroupItem[] = [
  { src: "/ada.jpg", alt: "Ada Lovelace", fallback: "AL" },
  { alt: "Grace Hopper", fallback: "GH" },
  { alt: "Katherine Johnson", fallback: "KJ" },
  { alt: "Ana Duarte", fallback: "AD" },
  { alt: "Mai Trần", fallback: "MT" },
];

/** The list items, in row order — a face is one, and so is the counter. */
const ITEMS = '[role="listitem"]';

/** The portrait inside an item. Only `Avatar` emits `data-force`. */
const FACE = "[data-force]";

describe("AvatarGroup", () => {
  it("presents the row as one labelled list rather than as N unrelated images", () => {
    const wrapper = mount(AvatarGroup, {
      props: { avatars: TEAM.slice(0, 3), label: "Assignees" },
    });
    const list = wrapper.get('[role="list"]');
    expect(list.attributes("aria-label")).toBe("Assignees");
    expect(wrapper.findAll(ITEMS)).toHaveLength(3);
  });

  it("names every face by its alt and hides the portrait, so the reading never depends on the image loading", () => {
    const wrapper = mount(AvatarGroup, {
      props: { avatars: TEAM.slice(0, 2), label: "Assignees" },
    });
    const items = wrapper.findAll(ITEMS);
    expect(items.map((item) => item.get(".sr-only").text())).toEqual([
      "Ada Lovelace",
      "Grace Hopper",
    ]);
    for (const item of items) {
      expect(item.get(FACE).attributes("aria-hidden")).toBe("true");
    }
  });

  it("falls back to the initials for a member with no alt, rather than announcing an empty item", () => {
    const wrapper = mount(AvatarGroup, {
      props: { avatars: [{ fallback: "AL" }], label: "Assignees" },
    });
    expect(wrapper.get(ITEMS).get(".sr-only").text()).toBe("AL");
  });

  it("collapses the overflow into a counter that says how many, not '+3'", () => {
    const wrapper = mount(AvatarGroup, { props: { avatars: TEAM, max: 3, label: "Assignees" } });
    const items = wrapper.findAll(ITEMS);
    expect(items).toHaveLength(4);

    const counter = items[3];
    expect(counter?.get(".sr-only").text()).toBe("2 more");
    // The glyph a reader sees is the layout; it is hidden so the sentence is
    // announced once instead of being prefixed by "plus two".
    expect(counter?.get(FACE).text()).toContain("+2");
    expect(counter?.get(FACE).attributes("aria-hidden")).toBe("true");
  });

  it("renders every face and no counter when max equals the number of members", () => {
    const wrapper = mount(AvatarGroup, { props: { avatars: TEAM, max: 5, label: "Assignees" } });
    expect(wrapper.findAll(ITEMS)).toHaveLength(5);
    expect(wrapper.text()).not.toContain("more");
  });

  it("renders every face and no counter when max is larger than the list", () => {
    const wrapper = mount(AvatarGroup, { props: { avatars: TEAM, max: 99, label: "Assignees" } });
    expect(wrapper.findAll(ITEMS)).toHaveLength(5);
    expect(wrapper.text()).not.toContain("more");
  });

  it("keeps one face when max is zero, because a row of nothing but a counter identifies nobody", () => {
    const wrapper = mount(AvatarGroup, { props: { avatars: TEAM, max: 0, label: "Assignees" } });
    const items = wrapper.findAll(ITEMS);
    expect(items).toHaveLength(2);
    expect(items[0]?.get(".sr-only").text()).toBe("Ada Lovelace");
    expect(items[1]?.get(".sr-only").text()).toBe("4 more");
  });

  it("treats a negative max the same way, rather than slicing the list backwards", () => {
    const wrapper = mount(AvatarGroup, { props: { avatars: TEAM, max: -2, label: "Assignees" } });
    const items = wrapper.findAll(ITEMS);
    expect(items).toHaveLength(2);
    expect(items[1]?.get(".sr-only").text()).toBe("4 more");
  });

  it("renders nothing at all for an empty list, so no page carries an empty labelled row", () => {
    const wrapper = mount(AvatarGroup, { props: { avatars: [], label: "Assignees" } });
    expect(wrapper.find('[role="list"]').exists()).toBe(false);
    expect(wrapper.findAll(ITEMS)).toHaveLength(0);
  });

  it("paints the first face on top and the counter at the back of the stack", () => {
    const wrapper = mount(AvatarGroup, { props: { avatars: TEAM, max: 3, label: "Assignees" } });
    const zIndexes = wrapper.findAll(ITEMS).map((item) => item.attributes("style"));
    expect(zIndexes[0]).toContain("z-index: 3");
    expect(zIndexes[1]).toContain("z-index: 2");
    expect(zIndexes[2]).toContain("z-index: 1");
    expect(zIndexes[3]).toContain("z-index: 0");
  });

  it("overlaps every face but the first, by a quarter of that size's width", () => {
    const wrapper = mount(AvatarGroup, {
      props: { avatars: TEAM.slice(0, 3), size: "lg", label: "Assignees" },
    });
    const items = wrapper.findAll(ITEMS);
    expect(items[0]?.classes()).not.toContain("-ml-3");
    expect(items[1]?.classes()).toContain("-ml-3");
    expect(items[2]?.classes()).toContain("-ml-3");
  });

  it("matches the separating ring to the surface it is told the row sits on", () => {
    const onCard = mount(AvatarGroup, {
      props: { avatars: TEAM.slice(0, 2), surface: "card", label: "Assignees" },
    });
    expect(onCard.get(FACE).classes()).toEqual(expect.arrayContaining(["ring-2", "ring-card"]));

    const onPage = mount(AvatarGroup, { props: { avatars: TEAM.slice(0, 2), label: "Assignees" } });
    expect(onPage.get(FACE).classes()).toContain("ring-background");
  });

  it("lets a member declare its own force, so one row can hold both people and agents", () => {
    const wrapper = mount(AvatarGroup, {
      props: {
        avatars: [
          { alt: "Ada Lovelace", fallback: "AL" },
          { alt: "Weaver", fallback: "WV", force: "ai" },
        ],
        label: "On this run",
      },
    });
    const items = wrapper.findAll(ITEMS);
    expect(items[0]?.get(FACE).classes()).not.toContain("border-agent");
    expect(items[0]?.get(".sr-only").text()).toBe("Ada Lovelace");
    expect(items[1]?.get(FACE).classes()).toContain("border-agent");
    expect(items[1]?.get(".sr-only").text()).toBe("Weaver, AI agent");
  });

  it("applies the group's force to every member that does not name one", () => {
    const wrapper = mount(AvatarGroup, {
      props: { avatars: TEAM.slice(0, 2), force: "ai", label: "Agents" },
    });
    for (const item of wrapper.findAll(ITEMS)) {
      expect(item.get(FACE).classes()).toContain("border-agent");
      expect(item.get(".sr-only").text()).toContain("AI agent");
    }
  });

  it("takes a localised agent label", () => {
    const wrapper = mount(AvatarGroup, {
      props: {
        avatars: [{ alt: "Weaver", fallback: "WV" }],
        force: "ai",
        agentLabel: "Tác nhân AI",
        label: "Agents",
      },
    });
    expect(wrapper.get(ITEMS).get(".sr-only").text()).toBe("Weaver, Tác nhân AI");
  });

  it("prefers an explicit overflow label, since 'more' is not always the right word", () => {
    const wrapper = mount(AvatarGroup, {
      props: { avatars: TEAM, max: 2, overflowLabel: "3 more reviewers", label: "Reviewers" },
    });
    const items = wrapper.findAll(ITEMS);
    expect(items[2]?.get(".sr-only").text()).toBe("3 more reviewers");
  });

  it("falls back to the derived count when the overflow label is blank, so the counter is never silent", () => {
    for (const overflowLabel of ["", "   "]) {
      const wrapper = mount(AvatarGroup, {
        props: { avatars: TEAM, max: 2, overflowLabel, label: "Reviewers" },
      });
      const items = wrapper.findAll(ITEMS);
      expect(items[2]?.get(".sr-only").text()).toBe("3 more");
    }
  });

  it("forwards size and shape to every face, counter included, so the row is one shape", () => {
    const wrapper = mount(AvatarGroup, {
      props: { avatars: TEAM, max: 2, size: "xs", shape: "square", label: "Assignees" },
    });
    const faces = wrapper.findAll(FACE);
    expect(faces).toHaveLength(3);
    for (const face of faces) {
      expect(face.classes()).toEqual(expect.arrayContaining(["h-6", "w-6", "rounded-sm"]));
    }
  });

  it("paints the counter as a neutral tile rather than as one more portrait", () => {
    const wrapper = mount(AvatarGroup, { props: { avatars: TEAM, max: 2, label: "Assignees" } });
    const counter = wrapper.findAll(ITEMS)[2]?.get(FACE);
    expect(counter?.classes()).toContain("bg-subtle");
    expect(counter?.classes()).not.toContain("bg-muted");
  });

  it("merges a consumer class over its own layout utility instead of appending beside it", () => {
    const wrapper = mount(AvatarGroup, {
      props: { avatars: TEAM.slice(0, 2), label: "Assignees" },
      attrs: { class: "inline-flex" },
    });
    const list = wrapper.get('[role="list"]');
    expect(list.classes()).toContain("inline-flex");
    expect(list.classes()).not.toContain("flex");
  });

  it("keeps a caller's own aria-label when the row is named through an attribute instead of the prop", () => {
    const wrapper = mount(AvatarGroup, {
      props: { avatars: TEAM.slice(0, 2) },
      attrs: { "aria-label": "Reviewers", "data-testid": "reviewers" },
    });
    const list = wrapper.get('[role="list"]');
    expect(list.attributes("aria-label")).toBe("Reviewers");
    expect(list.attributes("data-testid")).toBe("reviewers");
  });
});
