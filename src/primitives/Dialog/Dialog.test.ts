import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { attachToBody } from "../../testing/attach-to-body";
import Dialog from "./Dialog.vue";

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

function reset() {
  mounted?.unmount();
  mounted = undefined;
  document.body.innerHTML = "";
}

afterEach(reset);

describe("Dialog", () => {
  it("widens the panel per size — md for a confirm, lg for a multi-section form, xl for an authoring surface", async () => {
    const widths: Record<string, string> = {
      md: "w-[min(92vw,32rem)]",
      lg: "w-[min(92vw,44rem)]",
      xl: "w-[min(94vw,64rem)]",
    };
    for (const [size, cls] of Object.entries(widths)) {
      await mountDialog({ size });
      expect([...panel().classList]).toContain(cls);
      reset();
    }
  });

  it("falls back to the confirm-box width when size is omitted, so a plain confirm never renders authoring-wide", async () => {
    await mountDialog();
    const classes = [...panel().classList];
    expect(classes).toContain("w-[min(92vw,32rem)]");
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

  it("offers the close affordance by default and drops it when closable is false, leaving Escape and the overlay as the way out", async () => {
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
