import { enableAutoUnmount, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { attachToBody } from "../../testing/attach-to-body";
import { provideLoomLabels, type LoomLabelOverrides } from "../../lib/labels";
import Drawer from "./Drawer.vue";

/** A host declaring an application-wide vocabulary above the drawer. */
function hostWith(vocabulary: () => LoomLabelOverrides) {
  return defineComponent({
    setup(_props, { slots }) {
      provideLoomLabels(vocabulary);
      return () => h("div", slots.default?.());
    },
  });
}

// Reka measures the panel with a ResizeObserver to publish its extent as a CSS
// custom property, and jsdom has none. Stubbed to the shape Reka reads rather
// than mocked away, so the library itself stays the real thing under test.
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

// The panel is portalled, so a test that only wipes `document.body` tears the
// nodes out from under a component that is still mounted and leaves Vue
// patching into a detached tree. Unmounting is what actually ends the test.
enableAutoUnmount(afterEach);

let mounted: VueWrapper | undefined;

/** Attached to the document, because Reka portals the panel out of the wrapper. */
async function mountDrawer(
  props: Record<string, unknown> = {},
  options: Record<string, unknown> = {},
) {
  mounted = mount(Drawer, {
    props: { open: true, title: "Scene 12", ...props },
    // Reka moves focus into the open panel, and focus only works for a tree
    // that is actually in the document.
    attachTo: document.body,
    ...options,
  });
  await settle();
  return mounted;
}

/** The panel — queried off the document, never the wrapper, because it is portalled. */
const panel = () => document.querySelector<HTMLElement>('[role="dialog"]')!;

const classesOf = (element: Element) => [...element.classList];

/**
 * Reka defers several steps past the render queue on purpose: the dismiss
 * layer registers its document listener on a `setTimeout(0)` so the very
 * pointerdown that opened the panel cannot immediately close it, and the focus
 * scope and the body lock each settle a tick later again.
 */
async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

function reset() {
  mounted?.unmount();
  mounted = undefined;
  document.body.innerHTML = "";
}

afterEach(reset);

/**
 * `@vue/test-utils`' `trigger` builds a plain `Event` and assigns the extra
 * keys onto it, which throws on `MouseEvent.button` — a getter with no setter.
 * Reka reads `button` to tell a primary press from any other, so the event has
 * to be a real `PointerEvent` constructed with it.
 */
function firePointer(el: Element, type: string, init: PointerEventInit = {}) {
  el.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: 1,
      pointerType: "mouse",
      ...init,
    }),
  );
}

describe("Drawer accessible name and description", () => {
  it("names the drawer by its title, so assistive tech announces what the panel holds rather than an unnamed dialog", async () => {
    await mountDrawer({ title: "Filters" });
    const labelId = panel().getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)?.textContent.trim()).toBe("Filters");
  });

  it("wires a description as the drawer's accessible description instead of loose body text", async () => {
    await mountDrawer({ description: "Narrow the scene list." });
    const describedBy = panel().getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent.trim()).toBe(
      "Narrow the scene list.",
    );
  });

  it("renders no description element when none was given, leaving nothing empty to announce", async () => {
    await mountDrawer();
    const describedBy = panel().getAttribute("aria-describedby")!;
    expect(document.getElementById(describedBy)).toBeNull();
  });

  it("portals the panel to the document body rather than leaving it inside the caller's tree, so no ancestor overflow or stacking context can clip it", async () => {
    const wrapper = await mountDrawer();
    expect((wrapper.element as HTMLElement).contains(panel())).toBe(false);
    expect(panel().closest("body")).toBe(document.body);
  });

  it("renders no panel at all while closed — a modal surface must not sit in the DOM swallowing clicks", async () => {
    await mountDrawer({ open: false });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe("Drawer side", () => {
  // The four things `side` decides at once, restated here rather than imported
  // from the component's own table: a test that read `SIDES` would agree with
  // any edit to it, including one that pins the panel to the left and slides it
  // in from the right.
  const EDGES = [
    {
      side: "left",
      anchored: "left-0",
      corners: "rounded-r-lg",
      slide: "starting:-translate-x-full",
      swipe: "left",
    },
    {
      side: "right",
      anchored: "right-0",
      corners: "rounded-l-lg",
      slide: "starting:translate-x-full",
      swipe: "right",
    },
    {
      side: "top",
      anchored: "top-0",
      corners: "rounded-b-lg",
      slide: "starting:-translate-y-full",
      swipe: "up",
    },
    {
      side: "bottom",
      anchored: "bottom-0",
      corners: "rounded-t-lg",
      slide: "starting:translate-y-full",
      swipe: "down",
    },
  ] as const;

  it.each(EDGES)(
    "anchors a $side drawer to that edge, rounds only its inner corners and slides it in along the same axis",
    async ({ side, anchored, corners, slide }) => {
      await mountDrawer({ side });
      const classes = classesOf(panel());
      expect(classes).toContain(anchored);
      expect(classes).toContain(corners);
      expect(classes).toContain(slide);
    },
  );

  it.each(EDGES)(
    "points a dismissing swipe on a $side drawer at the edge it is anchored to, so the gesture pushes the panel off screen rather than across it",
    async ({ side, swipe }) => {
      await mountDrawer({ side });
      expect(panel().getAttribute("data-swipe-direction")).toBe(swipe);
    },
  );

  it("anchors to the trailing edge when no side is asked for, which is where detail about the current row belongs", async () => {
    await mountDrawer();
    const classes = classesOf(panel());
    expect(classes).toContain("right-0");
    expect(classes).not.toContain("left-0");
    expect(panel().getAttribute("data-swipe-direction")).toBe("right");
  });
});

describe("Drawer size", () => {
  it.each([
    ["sm", "w-[min(90vw,20rem)]"],
    ["md", "w-[min(92vw,26rem)]"],
    ["lg", "w-[min(94vw,40rem)]"],
  ])("sets a side drawer's width at %s, because width is its own axis", async (size, extent) => {
    await mountDrawer({ side: "right", size });
    expect(classesOf(panel())).toContain(extent);
  });

  it.each([
    ["sm", "h-[min(90vh,16rem)]"],
    ["md", "h-[min(92vh,24rem)]"],
    ["lg", "h-[min(94vh,36rem)]"],
  ])(
    "sets a sheet's height at %s, because the anchored edge turned size into height",
    async (size, extent) => {
      await mountDrawer({ side: "bottom", size });
      expect(classesOf(panel())).toContain(extent);
    },
  );

  it("gives the same size two different meanings on two different edges, which is the whole reason side and size are read together", async () => {
    await mountDrawer({ side: "right", size: "lg" });
    expect(classesOf(panel())).toContain("w-[min(94vw,40rem)]");
    reset();

    await mountDrawer({ side: "bottom", size: "lg" });
    const sheet = classesOf(panel());
    expect(sheet).toContain("h-[min(94vh,36rem)]");
    expect(sheet).not.toContain("w-[min(94vw,40rem)]");
  });

  it("falls back to the middle of the scale, so a drawer opened with no size is never a working surface", async () => {
    await mountDrawer();
    expect(classesOf(panel())).toContain("w-[min(92vw,26rem)]");
  });
});

describe("Drawer motion", () => {
  it("slides on a transform at the unhurried duration, never on a layout property", async () => {
    await mountDrawer();
    const classes = classesOf(panel());
    expect(classes).toContain("transition-transform");
    expect(classes).toContain("duration-slow");
    // The closed position is a translate. Anything that moved the panel by
    // animating `right`, `inset` or `width` would relayout the document on
    // every frame of a full-height slide.
    expect(classes).toContain("starting:translate-x-full");
  });

  it("renders the live swipe offset as `transform` while the slide owns `translate`, so a half-finished gesture and the entry transition compose instead of overwriting each other", async () => {
    await mountDrawer();
    const classes = classesOf(panel());
    const swipe = classes.find((name) => name.startsWith("[transform:"));
    expect(swipe).toContain("--drawer-swipe-movement-x");
    expect(swipe).toContain("--drawer-swipe-movement-y");
    // The vars have no registered initial value where `CSS.registerProperty`
    // is unavailable, and an unresolvable var invalidates the declaration.
    expect(swipe).toContain("0px");
    expect(classes.every((name) => !name.startsWith("[translate:"))).toBe(true);
  });

  it("drops the transition while a finger is down, so the panel tracks the swipe instead of lagging a third of a second behind it", async () => {
    await mountDrawer();
    expect(classesOf(panel())).toContain("data-[swiping]:transition-none");
  });

  it("scopes the scrim's entrance to the open state, so a closed overlay computes no animation and is unmounted rather than left over the page eating clicks", async () => {
    await mountDrawer();
    const overlay = document.querySelector<HTMLElement>(".fixed.inset-0")!;
    expect(classesOf(overlay)).toContain("data-[state=open]:animate-fade");
    expect(classesOf(overlay)).not.toContain("animate-fade");
  });
});

describe("Drawer escape contract", () => {
  it("opens with focus inside the panel, so the keyboard is already in the drawer rather than behind it", async () => {
    await mountDrawer({}, { slots: { footer: '<button type="button" id="apply">Apply</button>' } });
    expect(panel().contains(document.activeElement)).toBe(true);
  });

  it("traps focus in the panel — focus reaching for the page behind is pulled back", async () => {
    await mountDrawer({}, { slots: { footer: '<button type="button" id="apply">Apply</button>' } });
    const apply = document.getElementById("apply")!;
    const outside = attachToBody(document.createElement("button"));

    // A trap is what happens when focus tries to leave: Reka watches focusin
    // and pulls it back. Driving the real event is the only way to exercise
    // that, because jsdom runs no default Tab behaviour of its own.
    apply.focus();
    outside.focus();
    outside.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    await settle();
    expect(panel().contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape and hands focus back to whatever opened it", async () => {
    mounted = mount(Drawer, {
      props: { title: "Filters" },
      slots: { trigger: '<button type="button" id="opener">Filters</button>' },
      attachTo: document.body,
    });
    await settle();
    const opener = document.getElementById("opener")!;
    opener.focus();
    opener.click();
    await settle();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes on the corner control and hands focus back to whatever opened it", async () => {
    mounted = mount(Drawer, {
      props: { title: "Filters" },
      slots: { trigger: '<button type="button" id="opener">Filters</button>' },
      attachTo: document.body,
    });
    await settle();
    const opener = document.getElementById("opener")!;
    opener.focus();
    opener.click();
    await settle();

    document.querySelector<HTMLButtonElement>("[aria-label='Close']")!.click();
    await settle();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("always offers the corner control — unlike Dialog there is no prop that removes it, because a drawer often has no footer to carry the exit instead", async () => {
    await mountDrawer({ dismissible: false });
    expect(document.querySelector("[aria-label='Close']")).not.toBeNull();
  });

  it("reports the close request upward instead of closing itself, so the host state stays the single source of truth", async () => {
    const wrapper = await mountDrawer();
    document.querySelector<HTMLButtonElement>("[aria-label='Close']")!.click();
    await nextTick();
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull(); // still open — the host decides
  });

  it("locks the page behind while it is open and releases it on close, so the drawer is the only thing that scrolls", async () => {
    await mountDrawer();
    expect(document.body.style.overflow).toBe("hidden");

    await mounted!.setProps({ open: false });
    await settle();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("hides the rest of the page from assistive tech while open, which is what makes the block real rather than visual", async () => {
    const sibling = attachToBody(document.createElement("main"));
    await mountDrawer();
    expect(sibling.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders no trigger when the host drives the drawer entirely through v-model", async () => {
    await mountDrawer({ open: false });
    expect(document.querySelectorAll("button")).toHaveLength(0);
  });
});

describe("Drawer dismissible", () => {
  /** The grab handle: Reka marks it `aria-hidden`, and it carries the drawer's state. */
  const handle = () => panel().querySelector('[aria-hidden="true"][data-state]');

  it("offers the drag handle by default", async () => {
    await mountDrawer();
    expect(handle()).not.toBeNull();
  });

  it("keeps the handle off the keyboard's path entirely, so it can never become the only way out", async () => {
    await mountDrawer();
    const grip = handle()!;
    expect(grip.getAttribute("aria-hidden")).toBe("true");
    expect(grip.hasAttribute("tabindex")).toBe(false);
    expect(grip.tagName).toBe("DIV");
  });

  it("draws no handle when dismissible is off, because there is nothing to drag towards", async () => {
    await mountDrawer({ dismissible: false });
    expect(handle()).toBeNull();
  });

  it("closes on a press outside the panel by default", async () => {
    const wrapper = await mountDrawer();
    const outside = attachToBody(document.createElement("button"));
    firePointer(outside, "pointerdown");
    await settle();
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
  });

  it("absorbs a press outside the panel when dismissible is off, so a stray click cannot discard unsaved work", async () => {
    const wrapper = await mountDrawer({ dismissible: false });
    const outside = attachToBody(document.createElement("button"));
    firePointer(outside, "pointerdown");
    await settle();
    expect(wrapper.emitted("update:open")).toBeUndefined();
  });

  // The two swipes below drive the same event path Reka really listens on —
  // `firePointer` dispatches real `PointerEvent`s, and the panel carries
  // Reka's own listeners — so they exercise the veto rather than a mock of
  // it. jsdom can supply no TouchEvent, which is what the second half of the
  // gesture (a real finger, in a real browser) needs; `drawer.e2e.ts` drives
  // that as an actual drag. The pointer half is still worth pinning here:
  // it is the same veto listener as the touch half, and it fails loudly if
  // the veto's registration or removal is ever disturbed.
  it("closes on a drag on the panel body toward the anchored edge, by default", async () => {
    const wrapper = await mountDrawer({ side: "right" });
    firePointer(panel(), "pointerdown", { clientX: 100, clientY: 100 });
    // `buttons: 1` is load-bearing: Reka reads it to tell a press that is
    // still held from one that already ended, and a move with no buttons set
    // is a move no swipe ever follows.
    firePointer(panel(), "pointermove", { clientX: 240, clientY: 100, buttons: 1 });
    firePointer(panel(), "pointerup", { clientX: 240, clientY: 100 });
    await settle();
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
  });

  it("declines the same drag when dismissible is off — the veto covers the swipe, not only the press outside", async () => {
    const wrapper = await mountDrawer({ dismissible: false, side: "right" });
    firePointer(panel(), "pointerdown", { clientX: 100, clientY: 100 });
    firePointer(panel(), "pointermove", { clientX: 240, clientY: 100, buttons: 1 });
    firePointer(panel(), "pointerup", { clientX: 240, clientY: 100 });
    await settle();
    expect(wrapper.emitted("update:open")).toBeUndefined();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  // The veto that would break this page. A `closest("[data-loom-drawer-panel]")`
  // check fails here: the marker is on every panel, so one non-dismissible
  // drawer's document listener matches — and swallows — the pointerdown of its
  // dismissible sibling, which then refuses to be swiped. The marker has to
  // carry the instance's own id and the veto has to demand that exact value.
  it("does not let a non-dismissible drawer's veto swallow its sibling's gestures", async () => {
    const siblingRequests: boolean[][] = [];
    mounted = mount(
      defineComponent({
        setup() {
          return () => [
            h(Drawer, {
              open: true,
              title: "Sibling",
              side: "right",
              "onUpdate:open": (value: boolean) => siblingRequests.push([value]),
            }),
            h(Drawer, { open: true, title: "Guarded sheet", side: "bottom", dismissible: false }),
          ];
        },
      }),
      { attachTo: document.body },
    );
    await settle();

    const panels = [...document.querySelectorAll('[role="dialog"]')];
    const sibling = panels[0]!;
    const guarded = panels[1]!;

    // A drag on the guarded sheet's own body must stay declined…
    firePointer(guarded, "pointerdown", { clientX: 100, clientY: 400 });
    firePointer(guarded, "pointermove", { clientX: 100, clientY: 540, buttons: 1 });
    firePointer(guarded, "pointerup", { clientX: 100, clientY: 540 });
    await settle();

    // …and the same gesture on the sibling must still dismiss it. Both done
    // through the same document, which is exactly the condition the veto
    // broke under: one non-dismissible drawer on the page.
    firePointer(sibling, "pointerdown", { clientX: 100, clientY: 100 });
    firePointer(sibling, "pointermove", { clientX: 240, clientY: 100, buttons: 1 });
    firePointer(sibling, "pointerup", { clientX: 240, clientY: 100 });
    await settle();

    expect(siblingRequests).toEqual([[false]]);
  });

  it("still closes on Escape when dismissible is off — declining an accidental dismissal is not the same as having no keyboard exit", async () => {
    const wrapper = await mountDrawer({ dismissible: false });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
  });
});

describe("Drawer layout", () => {
  it("scrolls the body while the title stays put, so a panel taller than the viewport never loses its own name off the top", async () => {
    await mountDrawer(
      { title: "Composition detail" },
      { slots: { default: '<p id="body">rows</p>' } },
    );
    const labelId = panel().getAttribute("aria-labelledby")!;
    const header = document.getElementById(labelId)!.parentElement!;
    const body = document.getElementById("body")!.parentElement!;

    expect(header).not.toBe(body);
    expect(classesOf(body)).toContain("overflow-y-auto");
    expect(classesOf(header)).not.toContain("overflow-y-auto");
    expect(classesOf(header)).toContain("shrink-0");
    // Without `min-h-0` a flex item's automatic minimum size wins and the body
    // grows the panel past the viewport instead of scrolling inside it.
    expect(classesOf(body)).toContain("min-h-0");
    // A scroll that reaches the end of the body must not chain out to the
    // page that was just locked behind it.
    expect(classesOf(body)).toContain("overscroll-contain");
  });

  it("keeps the footer out of the scrolling region, so a long panel's actions stay reachable", async () => {
    await mountDrawer(
      {},
      { slots: { default: '<p id="body">rows</p>', footer: "<button id='apply'>Apply</button>" } },
    );
    const body = document.getElementById("body")!.parentElement!;
    const footer = document.getElementById("apply")!.parentElement!;
    expect(footer).not.toBe(body);
    expect(classesOf(footer)).toContain("shrink-0");
  });

  it("renders no footer row when nothing fills it, so an empty band never appears at the panel's edge", async () => {
    await mountDrawer();
    expect(panel().querySelector(".border-t")).toBeNull();
  });
});

describe("Drawer attribute routing", () => {
  it("merges a caller's class onto the panel, letting its width beat the size scale's", async () => {
    await mountDrawer({}, { attrs: { class: "w-40" } });
    const classes = classesOf(panel());
    expect(classes).toContain("w-40");
    expect(classes).not.toContain("w-[min(92vw,26rem)]");
  });

  it("routes every other fallthrough attribute onto the panel, which is what they describe", async () => {
    await mountDrawer({}, { attrs: { "data-testid": "filters", "aria-roledescription": "rail" } });
    expect(panel().getAttribute("data-testid")).toBe("filters");
    expect(panel().getAttribute("aria-roledescription")).toBe("rail");
  });
});

describe("Drawer labels", () => {
  it("names the close control in English when no host vocabulary is above it", async () => {
    await mountDrawer();
    expect(document.querySelector("[aria-label='Close']")).not.toBeNull();
  });

  it("lets one instance correct the close control's name through its own prop", async () => {
    await mountDrawer({ labels: { close: "Close filters" } });
    expect(document.querySelector("[aria-label='Close filters']")).not.toBeNull();
    expect(document.querySelector("[aria-label='Close']")).toBeNull();
  });

  it("takes the name from a host's vocabulary, and lets the instance's own prop beat it", async () => {
    mounted = mount(
      hostWith(() => ({ drawer: { close: "Đóng" } })),
      {
        attachTo: document.body,
        slots: {
          default: () => [
            h(Drawer, { open: true, title: "Scene 12" }),
            h(Drawer, { open: true, title: "Filters", labels: { close: "Đóng bộ lọc" } }),
          ],
        },
      },
    );
    await settle();

    const names = [...document.querySelectorAll("[role='dialog'] [aria-label]")].map((el) =>
      el.getAttribute("aria-label"),
    );
    expect(names).toEqual(["Đóng", "Đóng bộ lọc"]);
  });

  it("repaints the name when the host switches language under an already-open drawer", async () => {
    const locale = ref("en");
    mounted = mount(
      hostWith(() => (locale.value === "en" ? {} : { drawer: { close: "Đóng" } })),
      {
        attachTo: document.body,
        slots: { default: () => h(Drawer, { open: true, title: "Scene 12" }) },
      },
    );
    await settle();
    expect(document.querySelector("[aria-label='Close']")).not.toBeNull();

    // The assertion that fails the moment a label is resolved once in `setup`
    // rather than inside the render effect: every other test here still passes
    // and every language switch silently stops working.
    locale.value = "vi";
    await settle();
    expect(document.querySelector("[aria-label='Đóng']")).not.toBeNull();
    expect(document.querySelector("[aria-label='Close']")).toBeNull();
  });
});
