import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { attachToBody } from "@ecoma-io/loom-core/testing";
import { provideLoomLabels, type LoomLabelOverrides } from "@ecoma-io/loom-labels";
import AlertDialog from "../src/AlertDialog.vue";

/** A host declaring an application-wide vocabulary above the alert. */
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
async function mountAlert(
  props: Record<string, unknown> = {},
  options: Record<string, unknown> = {},
) {
  mounted = mount(AlertDialog, {
    props: { open: true, title: "Delete workflow?", ...props },
    attachTo: document.body,
    ...options,
  });
  await settle();
  return mounted;
}

/** The panel — queried off the document, never the wrapper, because it is portalled. */
const panel = () => document.querySelector<HTMLElement>('[role="alertdialog"]');

const buttonNamed = (label: string) =>
  [...document.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.textContent.trim() === label,
  );

// Reka defers past the render queue on purpose, and this component depends on
// one of those deferrals: `AlertDialogContent` moves focus onto the cancel
// element inside a `nextTick` of its own, after the focus scope has already
// taken the panel. Waiting only one tick reads the panel mid-flight.
async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

/** `@vue/test-utils`' `trigger` cannot set `MouseEvent.button`, which Reka reads. */
function firePointer(el: Element, type: string) {
  el.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: 1,
      pointerType: "mouse",
    }),
  );
}

function reset() {
  mounted?.unmount();
  mounted = undefined;
  document.body.innerHTML = "";
}

afterEach(reset);

describe("AlertDialog", () => {
  it("opens with focus on cancel rather than on the action, so a reflexive Enter backs out instead of destroying something", async () => {
    await mountAlert({ destructive: true, labels: { confirm: "Delete permanently" } });

    // The single behaviour this component exists to guarantee. Reka's
    // AlertDialogContent is what implements it; this test is what stops a
    // version bump, or a hand-rolled content node, from quietly undoing it.
    expect(document.activeElement).toBe(buttonNamed("Cancel"));
    expect(document.activeElement).not.toBe(buttonNamed("Delete permanently"));
  });

  it("resolves a keypress on the freshly opened panel as a cancel, never as a confirm", async () => {
    const wrapper = await mountAlert({
      destructive: true,
      labels: { confirm: "Delete permanently" },
    });

    // What a reader who hits Enter before finishing the sentence actually gets:
    // whatever is focused is activated, so the outcome is decided entirely by
    // where focus opened.
    (document.activeElement as HTMLElement).click();
    await settle();
    expect(wrapper.emitted("cancel")).toHaveLength(1);
    expect(wrapper.emitted("confirm")).toBeUndefined();
  });

  it("carries role=alertdialog rather than role=dialog, so the description is announced with the name", async () => {
    await mountAlert({ description: "This cannot be undone." });
    expect(panel()).not.toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("names the panel by its title so assistive tech announces the decision, not an unnamed modal", async () => {
    await mountAlert({ title: "Delete workflow?" });
    const labelId = panel()!.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)?.textContent.trim()).toBe("Delete workflow?");
  });

  it("points aria-describedby at the rendered description, which is the whole value of the alertdialog role", async () => {
    await mountAlert({ description: "Every scene in it goes too." });
    const describedBy = panel()!.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent.trim()).toBe(
      "Every scene in it goes too.",
    );
  });

  it("drops aria-describedby entirely when there is no description, rather than pointing it at an element that does not exist", async () => {
    await mountAlert();
    expect(panel()!.hasAttribute("aria-describedby")).toBe(false);
  });

  it("ignores a click outside — an accidental click at the edge of the screen must not answer the question", async () => {
    const wrapper = await mountAlert();
    const outside = attachToBody(document.createElement("div"));

    firePointer(outside, "pointerdown");
    firePointer(outside, "pointerup");
    await settle();

    expect(panel()).not.toBeNull();
    expect(wrapper.emitted("update:open")).toBeUndefined();
    expect(wrapper.emitted("cancel")).toBeUndefined();
  });

  it("renders no close glyph — the two buttons are the only way out", async () => {
    await mountAlert({ labels: { confirm: "Delete", cancel: "Keep" } });
    const labels = [...document.querySelectorAll("button")].map((b) => b.textContent.trim());
    expect(labels).toEqual(["Keep", "Delete"]);
  });

  it("treats Escape as the cancel button, emitting cancel alongside the close request", async () => {
    const wrapper = await mountAlert();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();

    expect(wrapper.emitted("cancel")).toHaveLength(1);
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
    expect(wrapper.emitted("confirm")).toBeUndefined();
  });

  it("emits confirm and the close request when the action is pressed", async () => {
    const wrapper = await mountAlert({ labels: { confirm: "Delete permanently" } });

    buttonNamed("Delete permanently")!.click();
    await settle();

    expect(wrapper.emitted("confirm")).toHaveLength(1);
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
    expect(wrapper.emitted("cancel")).toBeUndefined();
  });

  it("emits cancel and the close request when cancel is pressed", async () => {
    const wrapper = await mountAlert();

    buttonNamed("Cancel")!.click();
    await settle();

    expect(wrapper.emitted("cancel")).toHaveLength(1);
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
    expect(wrapper.emitted("confirm")).toBeUndefined();
  });

  it("reports the outcome upward instead of closing itself, so a host can keep it open while the work runs", async () => {
    await mountAlert({ labels: { confirm: "Delete permanently" } });
    buttonNamed("Delete permanently")!.click();
    await settle();
    expect(panel()).not.toBeNull(); // still open — the host decides
  });

  it("labels the two buttons Confirm and Cancel by default and takes the caller's verbs over them", async () => {
    await mountAlert();
    expect(buttonNamed("Confirm")).toBeDefined();
    expect(buttonNamed("Cancel")).toBeDefined();
    reset();

    await mountAlert({ labels: { confirm: "Discard", cancel: "Keep editing" } });
    expect(buttonNamed("Discard")).toBeDefined();
    expect(buttonNamed("Keep editing")).toBeDefined();
    expect(buttonNamed("Confirm")).toBeUndefined();
  });

  it("paints the action destructive only when asked, and marks it with more than the colour", async () => {
    await mountAlert({ labels: { confirm: "Delete" } });
    expect([...buttonNamed("Delete")!.classList]).toContain("bg-primary");
    expect(panel()!.hasAttribute("data-destructive")).toBe(false);
    reset();

    await mountAlert({ destructive: true, labels: { confirm: "Delete" } });
    expect([...buttonNamed("Delete")!.classList]).toContain("bg-destructive");
    expect(panel()!.getAttribute("data-destructive")).toBe("true");
  });

  it("returns focus to the trigger after a confirm, so the keyboard resumes where the reader left off", async () => {
    mounted = mount(AlertDialog, {
      props: { title: "Delete workflow?", labels: { confirm: "Delete permanently" } },
      slots: { trigger: '<button type="button" id="opener">Delete workflow</button>' },
      attachTo: document.body,
    });
    await settle();
    const opener = document.getElementById("opener")!;
    opener.focus();
    opener.click();
    await settle();
    expect(panel()).not.toBeNull();

    buttonNamed("Delete permanently")!.click();
    await settle();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("returns focus to the trigger after a cancel too, whichever way the reader backed out", async () => {
    mounted = mount(AlertDialog, {
      props: { title: "Delete workflow?" },
      slots: { trigger: '<button type="button" id="opener">Delete workflow</button>' },
      attachTo: document.body,
    });
    await settle();
    const opener = document.getElementById("opener")!;
    opener.focus();
    opener.click();
    await settle();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("traps focus in the panel — focus that escapes to the page behind is pulled back", async () => {
    await mountAlert();
    const outside = attachToBody(document.createElement("button"));

    // A trap is what happens when focus tries to leave: Reka watches focusin
    // and pulls it back. Driving the real event is the only way to exercise
    // that, because jsdom runs no default Tab behaviour of its own.
    outside.focus();
    outside.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    await settle();
    expect(panel()!.contains(document.activeElement)).toBe(true);
  });

  it("portals the panel to the document body, so no ancestor overflow or stacking context can clip it", async () => {
    const wrapper = await mountAlert();
    expect((wrapper.element as HTMLElement).contains(panel())).toBe(false);
    expect(panel()!.closest("body")).toBe(document.body);
  });

  it("renders no panel at all while closed — a modal must not sit in the DOM swallowing clicks", async () => {
    await mountAlert({ open: false });
    expect(panel()).toBeNull();
  });

  it("renders no trigger when the host drives the alert entirely through v-model", async () => {
    await mountAlert({ open: false });
    expect(document.querySelectorAll("button")).toHaveLength(0);
  });

  it("hides the rest of the page from assistive tech while open, which is what makes the block real rather than visual", async () => {
    const sibling = attachToBody(document.createElement("main"));
    await mountAlert();
    expect(sibling.getAttribute("aria-hidden")).toBe("true");
  });

  it("locks the page behind while it is open and releases it on close", async () => {
    await mountAlert();
    expect(document.body.style.overflow).toBe("hidden");

    await mounted!.setProps({ open: false });
    await settle();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("merges a caller's class onto the panel instead of letting it lose to the panel's own width", async () => {
    await mountAlert({}, { attrs: { class: "w-[20rem]", "data-testid": "confirm" } });
    const classes = [...panel()!.classList];
    expect(classes).toContain("w-[20rem]");
    expect(classes).not.toContain("w-[min(92vw,32rem)]");
    expect(panel()!.getAttribute("data-testid")).toBe("confirm");
  });
});

describe("AlertDialog labels", () => {
  it("names both buttons in English when no host vocabulary is above it", async () => {
    await mountAlert();
    expect(buttonNamed("Confirm")).toBeDefined();
    expect(buttonNamed("Cancel")).toBeDefined();
  });

  it("takes both names from a host's vocabulary, and lets one instance correct the verb", async () => {
    mounted = mount(
      hostWith(() => ({ alertDialog: { confirm: "Đồng ý", cancel: "Huỷ" } })),
      {
        attachTo: document.body,
        slots: {
          default: () => [
            h(AlertDialog, { open: true, title: "Rời khỏi trang?" }),
            h(AlertDialog, {
              open: true,
              title: "Xoá cảnh?",
              labels: { confirm: "Xoá vĩnh viễn" },
            }),
          ],
        },
      },
    );
    await settle();

    // The split this contract exists for: `cancel` is the application's word,
    // set once; `confirm` is the verb this one decision performs.
    const names = [...document.querySelectorAll("button")].map((b) => b.textContent.trim());
    expect(names).toEqual(["Huỷ", "Đồng ý", "Huỷ", "Xoá vĩnh viễn"]);
  });

  it("repaints both names when the host switches language under an already-open alert", async () => {
    const locale = ref("en");
    mounted = mount(
      hostWith(() =>
        locale.value === "en" ? {} : { alertDialog: { confirm: "Đồng ý", cancel: "Huỷ" } },
      ),
      {
        attachTo: document.body,
        slots: { default: () => h(AlertDialog, { open: true, title: "Delete workflow?" }) },
      },
    );
    await settle();
    expect(buttonNamed("Cancel")).toBeDefined();

    // The assertion that fails the moment a label is resolved once in `setup`
    // rather than inside the render effect: every other test here still passes
    // and every language switch silently stops working.
    locale.value = "vi";
    await settle();
    expect(buttonNamed("Huỷ")).toBeDefined();
    expect(buttonNamed("Đồng ý")).toBeDefined();
    expect(buttonNamed("Cancel")).toBeUndefined();
  });
});
