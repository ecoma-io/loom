import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import HoverCard from "../src/HoverCard.vue";

// jsdom ships no ResizeObserver, and Reka measures the arrow with one. Stubbing
// the browser API is the honest fix: mocking Reka would leave these tests
// asserting on nothing but this component's own template.
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});

let mounted: VueWrapper | undefined;

const TRIGGER = "<button>Hover me</button>";

async function mountHoverCard(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  mounted = mount(HoverCard, {
    props: { open: true, ...props },
    slots: { trigger: TRIGGER, default: "<p>Card content</p>", ...slots },
    attachTo: document.body,
  });
  await nextTick();
  await nextTick();
  return mounted;
}

/**
 * The card is portalled — query the document, never the mounted wrapper.
 * The content wrapper carries `data-side` from Reka's Popper, which is what
 * placement assertions should read.
 */
const card = () =>
  document.querySelector<HTMLElement>("[data-reka-popper-content-wrapper] [data-side]");

/** The arrow is an SVG child of the visible surface; Reka does not add a test-only marker. */
const arrow = () => card()?.querySelector<SVGElement>("svg.fill-popover") ?? null;

afterEach(() => {
  mounted?.unmount();
  mounted = undefined;
  document.body.innerHTML = "";
});

describe("HoverCard", () => {
  it("renders the trigger slot element, so the caller's own element is the hover target", async () => {
    const wrapper = await mountHoverCard();
    const trigger = wrapper.get("button");
    expect(trigger.text()).toBe("Hover me");
    // as-child: no wrapper element was added
    expect(document.querySelectorAll("button")).toHaveLength(1);
  });

  it("renders card content when open, portalled out of the caller's tree so no ancestor overflow clips it", async () => {
    await mountHoverCard();
    expect(card()).not.toBeNull();
    expect(card()!.textContent).toContain("Card content");
    // The card lives in a portal — its closest positioned ancestor is the body, not the trigger's tree.
    expect(card()!.closest("[data-reka-popper-content-wrapper]")?.parentElement).toBe(
      document.body,
    );
  });

  it("applies side and sideOffset to the content component, so placement follows the caller's preference", async () => {
    const wrapper = await mountHoverCard({ side: "right", sideOffset: 12 });
    const content = wrapper.findComponent({ name: "HoverCardContent" });
    expect(content.props("side")).toBe("right");
    expect(content.props("sideOffset")).toBe(12);
  });

  it("applies align and alignOffset to the content component, so cross-axis positioning is configurable", async () => {
    const wrapper = await mountHoverCard({ align: "center", alignOffset: 8 });
    const content = wrapper.findComponent({ name: "HoverCardContent" });
    expect(content.props("align")).toBe("center");
    expect(content.props("alignOffset")).toBe(8);
  });

  it("applies popover styling classes so the card uses the design token palette", async () => {
    await mountHoverCard();
    const el = card()!;
    expect(el.classList.contains("bg-popover")).toBe(true);
    expect(el.classList.contains("border-border")).toBe(true);
    expect(el.classList.contains("text-popover-foreground")).toBe(true);
  });

  it("renders the arrow element so the card has a directional pointer toward the trigger", async () => {
    await mountHoverCard();
    expect(arrow()).not.toBeNull();
  });

  it("scopes the animation class to the open data-state, so a closed card does not hold a stray mount-only animation", async () => {
    await mountHoverCard();
    const el = card()!;
    // The animation class is present in the class list
    expect(el.classList.contains("data-[state=open]:animate-scale-in")).toBe(true);
  });

  it("passes openDelay and closeDelay to the root, so the hover timing is configurable", async () => {
    const wrapper = await mountHoverCard({ openDelay: 100, closeDelay: 500 });
    const root = wrapper.findComponent({ name: "HoverCardRoot" });
    expect(root.props("openDelay")).toBe(100);
    expect(root.props("closeDelay")).toBe(500);
  });

  it("emits update:open when state changes, so the host can control the card with v-model", async () => {
    const wrapper = await mountHoverCard({ open: true });
    await wrapper.setValue(false, "open");
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
  });

  // The two tests below are the executable form of the component docblock's
  // keyboard contract (WCAG 2.1.1). Reka strips `tabindex="-1"` onto every
  // tabbable node in the content on mount, and the trigger closes the card on
  // blur after closeDelay — so interactive markup inside the card can never be
  // reached by keyboard, whatever it is. Callers must ship read-only content;
  // these tests pin both halves of that: nothing the caller adds becomes
  // reachable, and nothing we render is focusable to begin with.

  it("strips reachability from tabbable nodes a caller puts in the card anyway, which is why its docs require non-interactive content", async () => {
    await mountHoverCard({}, {
      default:
        '<div><a href="/profile">Open full profile</a><button type="button">Follow</button></div>',
    });
    expect(card()!.querySelector("a")!.getAttribute("tabindex")).toBe("-1");
    expect(card()!.querySelector("button")!.getAttribute("tabindex")).toBe("-1");
  });

  it("renders no focusable chrome of its own into the card, so read-only slot content stays the only content there is", async () => {
    await mountHoverCard();
    expect(
      card()!.querySelectorAll("a, button, input, select, textarea, [tabindex]"),
    ).toHaveLength(0);
  });
});
