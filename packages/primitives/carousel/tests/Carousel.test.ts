import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick, defineComponent, h, ref } from "vue";
import Carousel, { CAROUSEL_LABELS } from "../src/Carousel.vue";

enableAutoUnmount(afterEach);

function mountCarousel(slots?: string[], props: Record<string, unknown> = {}) {
  const children = (slots ?? ["<p>One</p>", "<p>Two</p>", "<p>Three</p>"]).join("");
  return mount(Carousel, { props, slots: { default: children } });
}

// jsdom gives the track no layout, so every scroll call is spied rather than
// performed; the state machine under test is what these pins are for.
function spyScroll(wrapper: ReturnType<typeof mountCarousel>) {
  const track = wrapper.get('[tabindex="0"]');
  const scrollTo = vi.fn();
  (track.element as HTMLElement).scrollTo = scrollTo;
  Object.defineProperty(track.element, "clientWidth", { value: 320, configurable: true });
  return { track, scrollTo };
}

const prev = (w: ReturnType<typeof mountCarousel>) => w.findAll("button")[0]!;
const next = (w: ReturnType<typeof mountCarousel>) => w.findAll("button")[1]!;

describe("Carousel", () => {
  it("names the region and both controls through the labels seam", () => {
    const wrapper = mountCarousel();
    expect(wrapper.get('[role="region"]').attributes("aria-label")).toBe(CAROUSEL_LABELS.region);
    expect(prev(wrapper).attributes("aria-label")).toBe(CAROUSEL_LABELS.previous);
    expect(next(wrapper).attributes("aria-label")).toBe(CAROUSEL_LABELS.next);
  });

  it("labels each slide with its position from the seam's message function", () => {
    const wrapper = mountCarousel();
    const slides = wrapper.findAll('[aria-roledescription="slide"]');
    expect(slides.map((s) => s.attributes("aria-label"))).toEqual([
      "Slide 1 of 3",
      "Slide 2 of 3",
      "Slide 3 of 3",
    ]);
  });

  it("starts at the first slide with Previous disabled — a boundary is a stop, not a silent wrap", () => {
    const wrapper = mountCarousel(undefined, { loop: false });
    expect(prev(wrapper).attributes("disabled")).toBeDefined();
    expect(next(wrapper).attributes("disabled")).toBeUndefined();
  });

  it("pages forward and back, scrolling to the index times the page width", async () => {
    const wrapper = mountCarousel();
    const { scrollTo } = spyScroll(wrapper);

    await next(wrapper).trigger("click");
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 320, behavior: "smooth" });

    await next(wrapper).trigger("click");
    expect(next(wrapper).attributes("disabled")).toBeDefined(); // End without loop
    await prev(wrapper).trigger("click");
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 320, behavior: "smooth" });
  });

  it("wraps at both ends only when loop is asked for", async () => {
    const looping = mountCarousel(undefined, { loop: true });
    const { scrollTo } = spyScroll(looping);
    await prev(looping).trigger("click"); // backwards from first
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 640, behavior: "smooth" });
    expect(next(looping).attributes("disabled")).toBeUndefined();

    const stopped = mountCarousel();
    spyScroll(stopped);
    await next(stopped).trigger("click");
    await next(stopped).trigger("click");
    await next(stopped).trigger("click"); // would wrap if looped
    expect(stopped.findAll("button")[1]!.attributes("disabled")).toBeDefined();
  });

  it("walks pages by keyboard while the strip holds focus, Home and End included", async () => {
    const wrapper = mountCarousel();
    const { scrollTo } = spyScroll(wrapper);
    const track = wrapper.get('[tabindex="0"]');

    await track.trigger("keydown", { key: "ArrowRight" });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 320, behavior: "smooth" });
    await track.trigger("keydown", { key: "End" });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 640, behavior: "smooth" });
    await track.trigger("keydown", { key: "Home" });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: "smooth" });
  });

  it("keeps a live region present from first render so position changes are heard", async () => {
    const wrapper = mountCarousel();
    const live = wrapper.get('[aria-live="polite"]');
    expect(live.text()).toBe("Slide 1 of 3");

    spyScroll(wrapper);
    await next(wrapper).trigger("click");
    // The component's own index moved even though jsdom never scrolled.
    expect(live.text()).toBe("Slide 2 of 3");
  });

  it("follows native scrolling — a touch swipe decides the settled page", async () => {
    const wrapper = mountCarousel();
    const { track } = spyScroll(wrapper);
    const el = track.element as HTMLElement;
    Object.defineProperty(el, "scrollLeft", { value: 320, configurable: true, writable: true });

    el.dispatchEvent(new Event("scroll"));
    // The handler settles one rAF later; jsdom's rAF is immediate enough.
    await vi.waitFor(() => {
      expect(wrapper.find('[aria-live="polite"]').text()).toBe("Slide 2 of 3");
    });
  });

  it("flattens a fragment host — a bare v-for contributes each child as its own slide", () => {
    const items = [1, 2, 3, 4];
    const wrapper = mount(Carousel, {
      slots: { default: items.map((i) => `<p>Item ${String(i)}</p>`) },
    });
    expect(wrapper.findAll('[aria-roledescription="slide"]')).toHaveLength(4);
  });

  // The slot is invoked during render, never cached: a computed holding
  // vnodes froze the strip against exactly this host.
  it("follows a reactive slide list as the host adds and removes slides", async () => {
    const items = ref([1, 2]);
    const Host = defineComponent({
      setup() {
        return () =>
          h(Carousel, null, {
            default: () => items.value.map((i) => h("p", `Item ${String(i)}`)),
          });
      },
    });
    const wrapper = mount(Host);
    expect(wrapper.findAll('[aria-roledescription="slide"]')).toHaveLength(2);

    items.value.push(3);
    await nextTick();
    expect(wrapper.findAll('[aria-roledescription="slide"]')).toHaveLength(3);

    items.value.splice(0, 2);
    await nextTick();
    expect(wrapper.findAll('[aria-roledescription="slide"]')).toHaveLength(1);
  });

  it("mounts an empty strip without arithmetic ghosts — no NaN targets, no phantom labels", () => {
    const wrapper = mountCarousel([], { loop: true });
    expect(wrapper.find('[aria-live="polite"]').text()).toBe("Slide 1 of 0");
    expect(() => next(wrapper).trigger("click")).not.toThrow();
  });
});
