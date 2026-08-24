import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { attachToBody } from "@ecoma-io/loom-core/testing";
import { provideLoomLabels, type LoomLabelOverrides } from "@ecoma-io/loom-labels";
import Dialog from "../src/Dialog.vue";

/** A host declaring an application-wide vocabulary above the dialog. */
function hostWith(vocabulary: () => LoomLabelOverrides) {
  return defineComponent({
    setup(_props, { slots }) {
      provideLoomLabels(vocabulary);
      return () => h("div", slots.default?.());
    },
  });
}

let mounted: VueWrapper | undefined;

/** Attached to the document, because Reka portals the panel out of the wrapper. */
async function mountDialog(
  props: Record<string, unknown> = {},
  options: Record<string, unknown> = {},
) {
  mounted = mount(Dialog, {
    props: { open: true, title: "Delete workflow", ...props },
    attachTo: document.body,
    ...options,
  });
  await nextTick();
  await nextTick();
  return mounted;
}

/** The content panel — queried off the document, never the wrapper, because it is portalled. */
const panel = () => document.querySelector<HTMLElement>('[role="dialog"]')!;

/** Let Reka's focus, scroll-lock and dismiss machinery settle. */
async function settle() {
  for (let i = 0; i < 4; i++) await nextTick();
}

/** A press on an element outside the panel — the event Reka's outside-dismiss listens for. */
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

/**
 * Reka arms its document-level `pointerdown` listener inside a
 * `setTimeout(0)` (DismissableLayer utils) so a dialog opened *by* a press
 * does not see that press again. Microtask-only settling never reaches that
 * timer, so a test that presses outside must yield one macrotask first.
 */
function flushTimers() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function reset() {
  mounted?.unmount();
  mounted = undefined;
  document.body.innerHTML = "";
}

afterEach(reset);

describe("Dialog", () => {
  // The exact class each union member renders, strings restated here rather
  // than imported: a test that read `SIZE_CLASS` would agree with any edit to
  // it, including one that quietly moved a width.
  it.each([
    ["sm", "w-[min(90vw,20rem)]"],
    ["md", "w-[min(92vw,32rem)]"],
    ["lg", "w-[min(92vw,44rem)]"],
    ["xl", "w-[min(94vw,64rem)]"],
  ])("widens the panel per size (%s)", async (size, width) => {
    await mountDialog({ size });
    expect([...panel().classList]).toContain(width);
  });

  it("keeps md and lg at the widths they have always had — the shared middle of the two scales does not drift when a member is added", async () => {
    await mountDialog({ size: "md" });
    expect([...panel().classList]).toContain("w-[min(92vw,32rem)]");
    reset();

    await mountDialog({ size: "lg" });
    expect([...panel().classList]).toContain("w-[min(92vw,44rem)]");
  });

  it("matches Drawer at the ends of the scale, which is what lets a host pass one size to either surface", async () => {
    // Drawer's own pairs, restated rather than imported: one assertion does
    // not justify putting drawer on this package's dependency list.
    const DRAWER_SM_WIDTH = "w-[min(90vw,20rem)]";
    const DRAWER_XL_WIDTH = "w-[min(94vw,64rem)]";

    await mountDialog({ size: "sm" });
    expect([...panel().classList]).toContain(DRAWER_SM_WIDTH);
    reset();

    await mountDialog({ size: "xl" });
    expect([...panel().classList]).toContain(DRAWER_XL_WIDTH);
  });

  it("falls back to the confirm-box width when size is omitted, so a plain confirm never renders authoring-wide", async () => {
    await mountDialog();
    const classes = [...panel().classList];
    expect(classes).toContain("w-[min(92vw,32rem)]");
    expect(classes).not.toContain("w-[min(90vw,20rem)]");
    expect(classes).not.toContain("w-[min(92vw,44rem)]");
    expect(classes).not.toContain("w-[min(94vw,64rem)]");
  });

  it("portals the panel to the document body rather than leaving it inside the caller's tree, so no ancestor overflow or stacking context can clip a modal", async () => {
    const wrapper = await mountDialog();
    expect((wrapper.element as HTMLElement).contains(panel())).toBe(false);
    expect(panel().closest("body")).toBe(document.body);
  });

  it("names the dialog by its title so assistive tech announces what is being asked, not an unnamed modal", async () => {
    await mountDialog({ title: "Delete workflow" });
    const labelId = panel().getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)?.textContent.trim()).toBe("Delete workflow");
  });

  it("hideTitle removes the title from the visual layout but keeps it as the accessible name", async () => {
    await mountDialog({ title: "Filters", hideTitle: true });
    const labelId = panel().getAttribute("aria-labelledby")!;
    const titleEl = document.getElementById(labelId)!;
    expect(titleEl.textContent.trim()).toBe("Filters");
    expect([...titleEl.classList]).toContain("sr-only");
  });

  it("wires a description as the dialog's accessible description instead of loose body text", async () => {
    await mountDialog({ description: "This cannot be undone." });
    const describedBy = panel().getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent.trim()).toBe(
      "This cannot be undone.",
    );
  });

  it("offers the close affordance by default and drops it when closable is false", async () => {
    await mountDialog();
    expect(document.querySelector("[aria-label='Close']")).not.toBeNull();
    reset();

    await mountDialog({ closable: false });
    expect(document.querySelector("[aria-label='Close']")).toBeNull();
  });

  it("reports the close request upward instead of closing itself, so the host state stays the single source of truth", async () => {
    const wrapper = await mountDialog();
    document.querySelector<HTMLButtonElement>("[aria-label='Close']")!.click();
    await nextTick();
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull(); // still open — the host decides
  });

  // `closable` governs the corner control alone. The two passive exits — an
  // outside press and Escape — keep working with it false, which is the
  // documented contract and the reason these pins exist: a test used to claim
  // "Escape and the overlay as the way out" while exercising neither path.
  it("dismisses from a press outside the panel, closable or not", async () => {
    const wrapper = await mountDialog();
    await flushTimers();
    const outside = attachToBody(document.createElement("button"));
    firePointer(outside, "pointerdown");
    await settle();
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
    reset();

    // A fresh outside target: `reset()` above wipes the body, and a press on
    // a detached element never bubbles to the layer listening on the document.
    const unclosable = await mountDialog({ closable: false });
    await flushTimers();
    const secondOutside = attachToBody(document.createElement("button"));
    firePointer(secondOutside, "pointerdown");
    await settle();
    expect(unclosable.emitted("update:open")).toEqual([[false]]);
  });

  // `cancelable: true` is load-bearing: Reka honours a prevented Escape, and
  // preventDefault on a non-cancelable event is silently ignored — a test
  // dispatching without it would pin nothing but jsdom's own no-op.
  it("dismisses on Escape too, including under closable:false", async () => {
    const wrapper = await mountDialog({ closable: false });
    await settle();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    await settle();
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
  });

  it("renders no panel at all while closed — a modal must not sit in the DOM swallowing clicks", async () => {
    await mountDialog({ open: false });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("opens with focus inside the panel, so the keyboard is already in the task rather than behind it", async () => {
    await mountDialog(
      {},
      { slots: { footer: '<button type="button" id="confirm">Delete</button>' } },
    );
    await settle();
    expect(panel().contains(document.activeElement)).toBe(true);
  });

  it("traps focus in the panel — Tab off the last control returns to the first instead of reaching the page behind", async () => {
    await mountDialog(
      { closable: false },
      { slots: { footer: '<button type="button" id="confirm">Delete</button>' } },
    );
    await settle();
    const confirm = document.getElementById("confirm")!;
    const outside = attachToBody(document.createElement("button"));

    // A trap is what happens when focus tries to leave: Reka watches focusin
    // and pulls it back. Driving the real event is the only way to exercise
    // that, because jsdom runs no default Tab behaviour of its own.
    confirm.focus();
    outside.focus();
    outside.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    await settle();
    expect(panel().contains(document.activeElement)).toBe(true);
  });

  it("returns focus to whatever opened it on close, so the keyboard resumes where the user left off", async () => {
    mounted = mount(Dialog, {
      props: { title: "Delete workflow" },
      slots: { trigger: '<button type="button" id="opener">Delete</button>' },
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

  it("locks the page behind while it is open and releases it on close, so the modal is the only thing that scrolls", async () => {
    await mountDialog();
    await settle();
    expect(document.body.style.overflow).toBe("hidden");

    await mounted!.setProps({ open: false });
    await settle();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("hides the rest of the page from assistive tech while open, which is what makes the block real rather than visual", async () => {
    const sibling = attachToBody(document.createElement("main"));
    await mountDialog();
    await settle();
    expect(sibling.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders no trigger when the host drives the dialog entirely through v-model", async () => {
    await mountDialog({ open: false });
    expect(document.querySelectorAll("button")).toHaveLength(0);
  });
});

describe("Dialog labels", () => {
  it("names the close control in English when no host vocabulary is above it", async () => {
    await mountDialog();
    expect(document.querySelector("[aria-label='Close']")).not.toBeNull();
  });

  it("lets one instance correct the close control's name through its own prop", async () => {
    await mountDialog({ labels: { close: "Stop importing" } });
    expect(document.querySelector("[aria-label='Stop importing']")).not.toBeNull();
    expect(document.querySelector("[aria-label='Close']")).toBeNull();
  });

  it("takes the name from a host's vocabulary, and lets the instance's own prop beat it", async () => {
    const locale = ref("vi");
    mounted = mount(
      hostWith(() => (locale.value === "vi" ? { dialog: { close: "Đóng" } } : {})),
      {
        attachTo: document.body,
        slots: {
          default: () => [
            h(Dialog, { open: true, title: "Scene 12" }),
            h(Dialog, { open: true, title: "Import", labels: { close: "Dừng nhập" } }),
          ],
        },
      },
    );
    await settle();

    const names = [...document.querySelectorAll("[role='dialog'] [aria-label]")].map((el) =>
      el.getAttribute("aria-label"),
    );
    expect(names).toEqual(["Đóng", "Dừng nhập"]);
  });

  it("repaints the name when the host switches language under an already-open dialog", async () => {
    const locale = ref("en");
    mounted = mount(
      hostWith(() => (locale.value === "en" ? {} : { dialog: { close: "Đóng" } })),
      {
        attachTo: document.body,
        slots: { default: () => h(Dialog, { open: true, title: "Scene 12" }) },
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
