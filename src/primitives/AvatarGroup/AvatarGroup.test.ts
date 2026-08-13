import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref, type PropType } from "vue";
import AvatarGroup, { type AvatarGroupItem } from "./AvatarGroup.vue";
import { provideLoomLabels, type LoomLabelOverrides } from "../../lib/labels";

const TEAM: AvatarGroupItem[] = [
  { src: "/ada.jpg", alt: "Ada Lovelace", fallback: "AL" },
  { alt: "Grace Hopper", fallback: "GH" },
  { alt: "Katherine Johnson", fallback: "KJ" },
  { alt: "Ana Duarte", fallback: "AD" },
  { alt: "Mai Trần", fallback: "MT" },
];

/** The list items, in row order — a face is one, and so is the counter. */
const ITEMS = '[role="listitem"]';

/** The portrait inside an item. Only `Avatar` emits `data-variant`. */
const FACE = "[data-variant]";

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

  it("lets a member declare its own variant, so one row can hold both people and accent items", () => {
    const wrapper = mount(AvatarGroup, {
      props: {
        avatars: [
          { alt: "Ada Lovelace", fallback: "AL" },
          { alt: "Weaver", fallback: "WV", variant: "accent" },
        ],
        label: "On this run",
      },
    });
    const items = wrapper.findAll(ITEMS);
    expect(items[0]?.get(FACE).classes()).not.toContain("border-accent");
    expect(items[0]?.get(".sr-only").text()).toBe("Ada Lovelace");
    expect(items[1]?.get(FACE).classes()).toContain("border-accent");
    expect(items[1]?.get(".sr-only").text()).toBe("Weaver, Accent");
  });

  it("applies the group's variant to every member that does not name one", () => {
    const wrapper = mount(AvatarGroup, {
      props: { avatars: TEAM.slice(0, 2), variant: "accent", label: "Members" },
    });
    for (const item of wrapper.findAll(ITEMS)) {
      expect(item.get(FACE).classes()).toContain("border-accent");
      expect(item.get(".sr-only").text()).toContain("Accent");
    }
  });

  it("names a member with no alt and no fallback as the accent label alone rather than as a stray comma", () => {
    const wrapper = mount(AvatarGroup, {
      props: { avatars: [{ src: "/weaver.jpg" }], variant: "accent", label: "Members" },
    });
    expect(wrapper.get(ITEMS).get(".sr-only").text()).toBe("Accent");
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

/** A host declaring an application-wide vocabulary above the row. */
const LabelHost = defineComponent({
  props: {
    vocabulary: {
      type: Function as PropType<() => LoomLabelOverrides>,
      required: true,
    },
  },
  setup(props, { slots }) {
    provideLoomLabels(() => props.vocabulary());
    return () => h("div", slots.default?.());
  },
});

describe("AvatarGroup labels", () => {
  it("names the counter and an accent member from its own English by default", () => {
    const wrapper = mount(LabelHost, {
      props: { vocabulary: () => ({}) },
      slots: {
        default: () =>
          h(AvatarGroup, { avatars: TEAM, max: 2, variant: "accent", label: "Members" }),
      },
    });
    const items = wrapper.findAll(ITEMS);
    expect(items[0]?.get(".sr-only").text()).toBe("Ada Lovelace, Accent");
    expect(items[2]?.get(".sr-only").text()).toBe("3 more");
  });

  it("hands the overflow its count raw, so the plural category is the host's to pick", () => {
    // Russian has three categories where English has two, and no template with
    // a hole in it could reach the one for 3.
    const plural = new Intl.PluralRules("ru-RU");
    const forms: Record<string, string> = { one: "ещё", few: "ещё", many: "ещё" };
    const wrapper = mount(AvatarGroup, {
      props: {
        avatars: TEAM,
        max: 2,
        label: "Reviewers",
        labels: {
          overflow: ({ count }: { count: number }) =>
            `${forms[plural.select(count)] ?? ""} ${new Intl.NumberFormat("ru-RU").format(count)}`,
        },
      },
    });
    expect(wrapper.findAll(ITEMS)[2]?.get(".sr-only").text()).toBe("ещё 3");
  });

  it("lets the accent qualifier sit wherever the language puts it, joiner included", () => {
    // The whole reason this is one key rather than a name, a comma and a word:
    // Vietnamese leads with the qualifier, and a `${who}, ${what}` join in the
    // component has already ruled that out.
    const wrapper = mount(AvatarGroup, {
      props: {
        avatars: [{ alt: "Weaver", fallback: "WV" }],
        variant: "accent",
        label: "Members",
        labels: { accent: ({ name }: { name: string }) => `Nhấn mạnh ${name}` },
      },
    });
    expect(wrapper.get(ITEMS).get(".sr-only").text()).toBe("Nhấn mạnh Weaver");
  });

  it("takes its names from a host's vocabulary, and lets one instance correct them", () => {
    const wrapper = mount(LabelHost, {
      props: {
        vocabulary: () => ({
          avatarGroup: { overflow: ({ count }) => `còn ${String(count)}` },
        }),
      },
      slots: {
        default: () => [
          h(AvatarGroup, { avatars: TEAM, max: 2, label: "Assignees" }),
          h(AvatarGroup, {
            avatars: TEAM,
            max: 2,
            label: "Reviewers",
            // The per-instance case: "more" is the wrong noun for what was
            // left out of this particular row, in any language.
            labels: {
              overflow: ({ count }: { count: number }) => `${String(count)} more reviewers`,
            },
          }),
        ],
      },
    });
    const rows = wrapper.findAll('[role="list"]');
    expect(rows[0]!.findAll(ITEMS)[2]!.get(".sr-only").text()).toBe("còn 3");
    expect(rows[1]!.findAll(ITEMS)[2]!.get(".sr-only").text()).toBe("3 more reviewers");
  });

  it("repaints its names when the host switches language under it", async () => {
    const locale = ref("en");
    const wrapper = mount(LabelHost, {
      props: {
        vocabulary: () =>
          locale.value === "en"
            ? {}
            : { avatarGroup: { overflow: ({ count }) => `còn ${String(count)}` } },
      },
      slots: { default: () => h(AvatarGroup, { avatars: TEAM, max: 2, label: "Assignees" }) },
    });
    expect(wrapper.findAll(ITEMS)[2]?.get(".sr-only").text()).toBe("3 more");

    locale.value = "vi";
    await nextTick();

    // The assertion that fails the moment a label is read once in `setup`
    // instead of through `text.` inside the render.
    expect(wrapper.findAll(ITEMS)[2]?.get(".sr-only").text()).toBe("còn 3");
  });
});
