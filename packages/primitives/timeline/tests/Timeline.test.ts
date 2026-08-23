import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import Timeline from "../src/Timeline.vue";
import TimelineItem from "../src/TimelineItem.vue";

enableAutoUnmount(afterEach);

function mountTimeline(itemProps: ItemProps[]) {
  const Wrapper = defineComponent(() => {
    return () =>
      h(Timeline, null, {
        default: () => itemProps.map((p) => h(TimelineItem, p)),
      });
  });
  return { wrapper: mount(Wrapper) };
}

interface ItemProps {
  title: string;
  description?: string;
  timestamp?: string;
  datetime?: string;
  status?: "complete" | "current" | "upcoming";
}

const ITEMS: ItemProps[] = [
  {
    title: "Ordered",
    timestamp: "2026-08-01 09:00",
    datetime: "2026-08-01T09:00",
    status: "complete",
  },
  { title: "Packed", status: "current" },
  { title: "Shipped", description: "Carrier pickup", status: "upcoming" },
];

describe("Timeline", () => {
  it("is an explicit list named through the labels seam", () => {
    const { wrapper } = mountTimeline(ITEMS);
    const list = wrapper.get('[role="list"]');
    expect(list.attributes("aria-label")).toBe("Timeline");
    // Explicit roles, not a styled ol: engines drop list semantics under
    // list-style:none, and the docs site's own ol rules beat utilities.
    expect(list.attributes("role")).toBe("list");
    expect(wrapper.findAll('[role="listitem"]')).toHaveLength(3);
  });

  it("marks the current moment with aria-current=step and nowhere else", () => {
    const { wrapper } = mountTimeline(ITEMS);
    const items = wrapper.findAll('[role="listitem"]');
    expect(items[0]!.attributes("aria-current")).toBeUndefined();
    expect(items[1]!.attributes("aria-current")).toBe("step");
    expect(items[2]!.attributes("aria-current")).toBeUndefined();
  });

  it("states every status in words beside the marker — a dot's colour alone is not a state", () => {
    const { wrapper } = mountTimeline(ITEMS);
    const words = wrapper.findAll(".sr-only").map((sr) => sr.text());
    expect(words).toEqual(["Completed", "Current", "Upcoming"]);
  });

  it("renders timestamps as real <time> elements carrying the machine value", () => {
    const { wrapper } = mountTimeline(ITEMS);
    const time = wrapper.find("time");
    expect(time.exists()).toBe(true);
    expect(time.attributes("datetime")).toBe("2026-08-01T09:00");
  });

  it("draws the connector on every item but the last — the line stops where the story does", () => {
    const { wrapper } = mountTimeline(ITEMS);
    expect(wrapper.findAll(".loom-timeline-line")).toHaveLength(3);
    // The wrapper owns the retirement rule; the class list on the list root
    // is what carries it (descendant styling is invisible to jsdom styles).
    const listClass = wrapper.get('[role="list"]').attributes("class") ?? "";
    expect(listClass).toContain("[&>*:last-child_.loom-timeline-line]:hidden");
  });

  it("distinguishes markers by status: complete fills, current haloes, upcoming hollows", () => {
    const { wrapper } = mountTimeline(ITEMS);
    const markers = wrapper
      .findAll('[role="listitem"] > span[aria-hidden]')
      .filter((marker) => marker.classes().some((c) => c.startsWith("z-raised")));
    expect(markers).toHaveLength(3);
    const [complete, current, upcoming] = markers;
    expect(complete!.classes()).toContain("bg-success");
    expect(current!.classes().join(" ")).toContain("ring-4");
    expect(upcoming!.classes()).toContain("bg-background");
  });

  it("keeps extra content per moment through the default slot", () => {
    const wrapper = mount(Timeline, {
      slots: {
        default: () => [
          h(TimelineItem, { title: "T" }, { default: () => h("a", { href: "#x" }, "Details") }),
        ],
      },
    });
    expect(wrapper.find("a[href='#x']").exists()).toBe(true);
  });
});
