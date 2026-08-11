import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import FileUpload from "./FileUpload.vue";

enableAutoUnmount(afterEach);

const KB = 1024;
const MB = 1024 * KB;

/**
 * A File whose reported size is whatever the test needs.
 *
 * `new File(["…"], …)` derives `size` from the bytes handed to it, so pinning
 * the `maxSize` path honestly would otherwise mean allocating megabytes per
 * assertion. The size is the thing under test, so it is the only thing faked.
 */
function makeFile(
  name: string,
  { size = 8, type = "", lastModified = 1_700_000_000_000 } = {},
): File {
  const file = new File(["x"], name, { type, lastModified });
  Object.defineProperty(file, "size", { value: size, configurable: true });
  return file;
}

/**
 * jsdom implements no `DataTransfer`, so a drag event carries a stand-in with
 * the two members this component reads — the files, and the `dropEffect` it
 * writes back to tell the operating system the zone copies rather than moves.
 * Omitting `files` builds the other case worth covering: a drag carrying no
 * transfer at all, which must not throw its way out of a handler.
 */
function dragEvent(type: string, files?: File[]): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  if (files !== undefined) {
    Object.defineProperty(event, "dataTransfer", {
      value: { files, items: [], types: ["Files"], dropEffect: "none" },
    });
  }
  return event;
}

function dropEffectOf(event: Event): string {
  return ((event as DragEvent).dataTransfer as unknown as { dropEffect: string }).dropEffect;
}

async function dropOn(zone: Element, files: File[]): Promise<void> {
  zone.dispatchEvent(dragEvent("drop", files));
  await nextTick();
}

/** Choosing through the file dialog: the browser fills `files`, then fires `change`. */
async function chooseIn(input: Element, files: File[]): Promise<void> {
  Object.defineProperty(input, "files", { value: files, configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await nextTick();
}

describe("FileUpload", () => {
  it("hides the file input by clipping it, so it stays focusable and in the tab order", async () => {
    const wrapper = mount(FileUpload, { attachTo: document.body });
    const input = wrapper.get('input[type="file"]');

    // The three ways this normally goes wrong, each of which removes the only
    // keyboard path into the control.
    expect(input.attributes("hidden")).toBeUndefined();
    expect(input.attributes("tabindex")).toBeUndefined();
    expect(input.classes()).toContain("sr-only");
    expect(input.classes()).not.toContain("hidden");

    (input.element as HTMLInputElement).focus();
    await nextTick();
    expect(document.activeElement).toBe(input.element);
  });

  it("puts the file input ahead of each row's remove button in the tab order", () => {
    const wrapper = mount(FileUpload, {
      props: { modelValue: [makeFile("one.txt"), makeFile("two.txt")], multiple: true },
    });

    const stops = wrapper
      .findAll("input, button, a, [tabindex]")
      .filter((stop) => stop.attributes("disabled") === undefined)
      .map((stop) => stop.attributes("aria-label") ?? stop.element.tagName.toLowerCase());

    expect(stops).toEqual(["input", "Remove one.txt", "Remove two.txt"]);
  });

  it("names the input with the zone's own copy, worded for how many files it takes", () => {
    const single = mount(FileUpload);
    expect(single.get("label").text()).toContain("Choose a file or drag it here");
    expect(single.get("label").attributes("for")).toBe(single.get("input").attributes("id"));

    const many = mount(FileUpload, { props: { multiple: true } });
    expect(many.get("label").text()).toContain("Choose files or drag them here");
  });

  it("uses the caller's own wording when one is given", () => {
    const wrapper = mount(FileUpload, { props: { label: "Attach the signed contract" } });
    expect(wrapper.get("label").text()).toContain("Attach the signed contract");
  });

  it("forwards accept and multiple to the native input", () => {
    const wrapper = mount(FileUpload, { props: { accept: ".csv,text/csv", multiple: true } });
    const input = wrapper.get('input[type="file"]');
    expect(input.attributes("accept")).toBe(".csv,text/csv");
    expect(input.attributes("multiple")).toBe("");
  });

  it("emits the files a reader dropped on the zone", async () => {
    const wrapper = mount(FileUpload, { props: { multiple: true } });
    const dropped = [makeFile("a.txt"), makeFile("b.txt", { lastModified: 2 })];

    await dropOn(wrapper.get("label").element, dropped);

    expect(wrapper.emitted("update:modelValue")).toEqual([[dropped]]);
  });

  it("emits the files a reader chose through the file dialog", async () => {
    const wrapper = mount(FileUpload);
    const chosen = makeFile("report.pdf");

    await chooseIn(wrapper.get('input[type="file"]').element, [chosen]);

    expect(wrapper.emitted("update:modelValue")).toEqual([[[chosen]]]);
  });

  it("clears the input's value so the same file can be chosen twice running", async () => {
    // Without this the input compares the new selection against its own value,
    // finds them equal and never fires `change` — so a file taken out of the
    // list cannot be put back, and the control looks dead the second time.
    const wrapper = mount(FileUpload);
    const input = wrapper.get('input[type="file"]');
    await chooseIn(input.element, [makeFile("report.pdf")]);
    expect((input.element as HTMLInputElement).value).toBe("");
  });

  it("appends to the list when multiple, rather than replacing what is there", async () => {
    const first = makeFile("a.txt");
    const second = makeFile("b.txt", { lastModified: 2 });
    const wrapper = mount(FileUpload, { props: { modelValue: [first], multiple: true } });

    await dropOn(wrapper.get("label").element, [second]);

    expect(wrapper.emitted("update:modelValue")).toEqual([[[first, second]]]);
  });

  it("replaces the chosen file when multiple is not set", async () => {
    const first = makeFile("a.txt");
    const second = makeFile("b.txt", { lastModified: 2 });
    const wrapper = mount(FileUpload, { props: { modelValue: [first] } });

    await dropOn(wrapper.get("label").element, [second]);

    expect(wrapper.emitted("update:modelValue")).toEqual([[[second]]]);
  });

  it("keeps its own list when modelValue is not bound", async () => {
    // An empty-array default would read as "the host owns this list", and
    // every chosen file would vanish on the next render with nothing reported.
    const wrapper = mount(FileUpload, { props: { multiple: true } });

    await dropOn(wrapper.get("label").element, [makeFile("kept.txt")]);

    expect(wrapper.findAll("li")).toHaveLength(1);
    expect(wrapper.get("li").text()).toContain("kept.txt");
  });

  it("refuses a file over maxSize, names it in the live region and reports it", async () => {
    const big = makeFile("scan.tiff", { size: 6 * MB });
    const wrapper = mount(FileUpload, { props: { maxSize: 5 * MB } });

    await dropOn(wrapper.get("label").element, [big]);

    expect(wrapper.emitted("reject")).toEqual([[[{ file: big, reason: "too-large" }]]]);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.get('[aria-live="polite"]').text()).toBe("scan.tiff is larger than 5 MB.");
  });

  it("refuses a file outside accept, which no browser checks on a drop", async () => {
    const wrong = makeFile("notes.txt", { type: "text/plain" });
    const wrapper = mount(FileUpload, { props: { accept: "image/png" } });

    await dropOn(wrapper.get("label").element, [wrong]);

    expect(wrapper.emitted("reject")).toEqual([[[{ file: wrong, reason: "type" }]]]);
    expect(wrapper.get('[aria-live="polite"]').text()).toBe(
      "notes.txt is not an accepted file type.",
    );
  });

  it("matches accept by extension when the browser reports no MIME type", async () => {
    // `file.type` is the browser's guess and it is empty for anything it does
    // not recognise, so an accept list of MIME types alone turns files away.
    const csv = makeFile("rows.CSV");
    const wrapper = mount(FileUpload, { props: { accept: ".csv,text/csv, " } });

    await dropOn(wrapper.get("label").element, [csv]);

    expect(wrapper.emitted("reject")).toBeUndefined();
    expect(wrapper.emitted("update:modelValue")).toEqual([[[csv]]]);
  });

  it("matches accept by MIME family and by exact type", async () => {
    const png = makeFile("shot.png", { type: "image/png" });

    const family = mount(FileUpload, { props: { accept: "image/*" } });
    await dropOn(family.get("label").element, [png]);
    expect(family.emitted("update:modelValue")).toEqual([[[png]]]);

    const exact = mount(FileUpload, { props: { accept: "image/png" } });
    await dropOn(exact.get("label").element, [png]);
    expect(exact.emitted("update:modelValue")).toEqual([[[png]]]);
  });

  it("refuses a file already in the list rather than listing it twice", async () => {
    const first = makeFile("a.txt");
    const again = makeFile("a.txt");
    const wrapper = mount(FileUpload, { props: { modelValue: [first], multiple: true } });

    await dropOn(wrapper.get("label").element, [again]);

    expect(wrapper.emitted("reject")).toEqual([[[{ file: again, reason: "duplicate" }]]]);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.get('[aria-live="polite"]').text()).toBe("a.txt has already been chosen.");
  });

  it("keeps the first of several dropped files when multiple is not set, and says so", async () => {
    const first = makeFile("a.txt");
    const extra = makeFile("b.txt", { lastModified: 2 });
    const wrapper = mount(FileUpload);

    await dropOn(wrapper.get("label").element, [first, extra]);

    expect(wrapper.emitted("update:modelValue")).toEqual([[[first]]]);
    expect(wrapper.emitted("reject")).toEqual([[[{ file: extra, reason: "too-many" }]]]);
    expect(wrapper.get('[aria-live="polite"]').text()).toBe(
      "b.txt was not added — only one file can be chosen.",
    );
  });

  it("reports every file refused by one interaction in a single reject event", async () => {
    const big = makeFile("big.png", { size: 3 * MB, type: "image/png" });
    const wrong = makeFile("notes.txt", { type: "text/plain" });
    const wrapper = mount(FileUpload, {
      props: { accept: "image/*", maxSize: MB, multiple: true },
    });

    await dropOn(wrapper.get("label").element, [big, wrong]);

    expect(wrapper.emitted("reject")).toEqual([
      [
        [
          { file: big, reason: "too-large" },
          { file: wrong, reason: "type" },
        ],
      ],
    ]);
  });

  it("keeps the live region mounted before there is anything to announce", () => {
    // A live region that appears together with its text is a region assistive
    // tech was not yet watching, so the first refusal — the one that matters
    // most — is the one it announces least reliably.
    const wrapper = mount(FileUpload);
    expect(wrapper.find('[aria-live="polite"]').exists()).toBe(true);
    expect(wrapper.get('[aria-live="polite"]').text()).toBe("");
    expect(wrapper.get('input[type="file"]').attributes("aria-describedby")).toBeUndefined();
  });

  it("points the input at the refusal message while one is showing", async () => {
    const wrapper = mount(FileUpload, { props: { maxSize: KB } });
    await dropOn(wrapper.get("label").element, [makeFile("scan.tiff", { size: 2 * KB })]);

    const described = wrapper.get('input[type="file"]').attributes("aria-describedby");
    expect(described).toBeDefined();
    expect(wrapper.get(`#${described ?? ""}`).text()).toBe("scan.tiff is larger than 1 KB.");
  });

  it("removes the file its button is named after, and no other", async () => {
    const [a, b, c] = [
      makeFile("a.txt"),
      makeFile("b.txt", { lastModified: 2 }),
      makeFile("c.txt", { lastModified: 3 }),
    ];
    const wrapper = mount(FileUpload, { props: { modelValue: [a, b, c], multiple: true } });

    await wrapper.get('button[aria-label="Remove b.txt"]').trigger("click");

    expect(wrapper.emitted("update:modelValue")).toEqual([[[a, c]]]);
  });

  it("clears the refusal message once the reader edits the list themselves", async () => {
    const kept = makeFile("a.txt");
    const wrapper = mount(FileUpload, {
      props: { modelValue: [kept], maxSize: KB, multiple: true },
    });
    await dropOn(wrapper.get("label").element, [makeFile("big.bin", { size: 2 * KB })]);
    expect(wrapper.get('[aria-live="polite"]').text()).not.toBe("");

    await wrapper.get('button[aria-label="Remove a.txt"]').trigger("click");

    expect(wrapper.get('[aria-live="polite"]').text()).toBe("");
  });

  it("shows each file's name beside its size, in the units a file browser uses", () => {
    const wrapper = mount(FileUpload, {
      props: {
        multiple: true,
        modelValue: [
          makeFile("empty.txt", { size: 0, lastModified: 1 }),
          makeFile("tiny.txt", { size: 999, lastModified: 2 }),
          makeFile("rows.csv", { size: 1536, lastModified: 3 }),
          makeFile("page.png", { size: 20 * KB, lastModified: 4 }),
          makeFile("clip.mp4", { size: 5 * MB, lastModified: 5 }),
          makeFile("disk.img", { size: 2.5 * 1024 * MB, lastModified: 6 }),
          // Nothing above GB: a size nobody uploads reads as a large number of
          // gigabytes rather than as a unit the reader has to decode.
          makeFile("array.raw", { size: 3 * 1024 * 1024 * MB, lastModified: 7 }),
        ],
      },
    });

    const rows = wrapper.findAll("li").map((row) =>
      row
        .findAll("span")
        .map((cell) => cell.text())
        .join(" "),
    );

    expect(rows).toEqual([
      "empty.txt 0 B",
      "tiny.txt 999 B",
      "rows.csv 1.5 KB",
      "page.png 20 KB",
      "clip.mp4 5 MB",
      "disk.img 2.5 GB",
      "array.raw 3072 GB",
    ]);
  });

  it("spells the size limit into the hint when the caller gives none", () => {
    const derived = mount(FileUpload, { props: { maxSize: 5 * MB } });
    expect(derived.get("label").text()).toContain("Up to 5 MB");

    const written = mount(FileUpload, { props: { maxSize: 5 * MB, hint: "PNG or JPG only" } });
    expect(written.get("label").text()).toContain("PNG or JPG only");
    expect(written.get("label").text()).not.toContain("Up to 5 MB");

    const none = mount(FileUpload);
    expect(none.get("label").text()).not.toContain("Up to");
  });

  it("refuses the drop, the dialog and every remove button when disabled", async () => {
    const kept = makeFile("a.txt");
    const wrapper = mount(FileUpload, { props: { modelValue: [kept], disabled: true } });

    expect((wrapper.get('input[type="file"]').element as HTMLInputElement).disabled).toBe(true);
    expect(
      (wrapper.get('button[aria-label="Remove a.txt"]').element as HTMLButtonElement).disabled,
    ).toBe(true);

    await dropOn(wrapper.get("label").element, [makeFile("b.txt", { lastModified: 2 })]);
    await wrapper.get('button[aria-label="Remove a.txt"]').trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("reject")).toBeUndefined();
  });

  it("does not light the zone up for a drag it is going to refuse", async () => {
    const wrapper = mount(FileUpload, { props: { disabled: true } });
    wrapper.get("label").element.dispatchEvent(dragEvent("dragenter"));
    await nextTick();
    expect(wrapper.get("label").attributes("data-dragging")).toBeUndefined();
  });

  it("marks an invalid control on the input and on the zone", () => {
    const wrapper = mount(FileUpload, { props: { invalid: true } });
    expect(wrapper.get('input[type="file"]').attributes("aria-invalid")).toBe("true");
    expect(wrapper.get("label").attributes("data-invalid")).toBe("true");
    expect(wrapper.get("label").classes()).toContain("border-destructive");
    // The halo is the non-error focus bloom; an invalid zone keeps the crisp
    // destructive outline instead, never both at once.
    expect(wrapper.get("label").classes()).not.toContain("focus-within:shadow-halo");
  });

  it("holds the drag state while the pointer crosses onto a child of the zone", async () => {
    // The defect this pins: `dragleave` fires on the zone the moment the
    // pointer enters one of its own children, so a naive enter/leave pair drops
    // the highlight and picks it straight back up — the zone flickers under the
    // cursor at the exact moment it is meant to say "let go here".
    const wrapper = mount(FileUpload);
    const zone = wrapper.get("label");
    const child = wrapper.get("label span");

    zone.element.dispatchEvent(dragEvent("dragenter"));
    await nextTick();
    expect(zone.attributes("data-dragging")).toBe("true");

    // What the browser sends as the pointer moves onto the medallion: the
    // child's enter, then the zone's own leave, both bubbling to the zone.
    child.element.dispatchEvent(dragEvent("dragenter"));
    zone.element.dispatchEvent(dragEvent("dragleave"));
    await nextTick();
    expect(zone.attributes("data-dragging")).toBe("true");

    child.element.dispatchEvent(dragEvent("dragleave"));
    await nextTick();
    expect(zone.attributes("data-dragging")).toBeUndefined();
  });

  it("drops the drag state when the files land", async () => {
    const wrapper = mount(FileUpload);
    wrapper.get("label").element.dispatchEvent(dragEvent("dragenter"));
    await nextTick();

    await dropOn(wrapper.get("label").element, [makeFile("a.txt")]);

    expect(wrapper.get("label").attributes("data-dragging")).toBeUndefined();
  });

  it("claims the drag as a copy, and refuses it outright when disabled", () => {
    const open = mount(FileUpload);
    const overOpen = dragEvent("dragover", []);
    open.get("label").element.dispatchEvent(overOpen);
    // Without the preventDefault the browser keeps its own handling — navigate
    // to the dropped file — and the drop never reaches the zone at all.
    expect(overOpen.defaultPrevented).toBe(true);
    expect(dropEffectOf(overOpen)).toBe("copy");

    const closed = mount(FileUpload, { props: { disabled: true } });
    const overClosed = dragEvent("dragover", []);
    closed.get("label").element.dispatchEvent(overClosed);
    expect(dropEffectOf(overClosed)).toBe("none");

    const bare = dragEvent("dragover");
    open.get("label").element.dispatchEvent(bare);
    expect(bare.defaultPrevented).toBe(true);
  });

  it("survives a drop carrying no files at all", async () => {
    const wrapper = mount(FileUpload);
    wrapper.get("label").element.dispatchEvent(dragEvent("drop"));
    await nextTick();
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("staggers the rows through the shared list vocabulary rather than a delay of its own", () => {
    const files = ["a", "b", "c", "d", "e", "f", "g"].map((name, index) =>
      makeFile(`${name}.txt`, { lastModified: index }),
    );
    const wrapper = mount(FileUpload, { props: { modelValue: files, multiple: true } });

    expect(wrapper.findAll("li").map((row) => row.attributes("style"))).toEqual([
      "animation-delay: 0ms;",
      "animation-delay: 24ms;",
      "animation-delay: 48ms;",
      "animation-delay: 72ms;",
      "animation-delay: 96ms;",
      // Capped, so a long list never turns into a slow one.
      "animation-delay: 120ms;",
      "animation-delay: 120ms;",
    ]);
    expect(wrapper.get("li").classes()).toContain("animate-fade-rise");
  });

  it("keeps a surviving row's identity when another row is removed", async () => {
    const [a, b] = [makeFile("a.txt"), makeFile("b.txt", { lastModified: 2 })];
    const wrapper = mount(FileUpload, { props: { modelValue: [a, b], multiple: true } });
    const second = wrapper.findAll("li")[1]?.element;

    await wrapper.setProps({ modelValue: [b] });

    // Keyed by the File itself rather than by index: the surviving row is the
    // same DOM node it already was, instead of a remount that replays the
    // entrance animation on every row after the one that left.
    expect(wrapper.get("li").element).toBe(second);
  });

  it("routes class onto the root and every other attribute onto the input", () => {
    const wrapper = mount(FileUpload, {
      attrs: { class: "max-w-md", name: "attachment", "data-testid": "upload", id: "given" },
    });

    expect(wrapper.classes()).toContain("max-w-md");
    const input = wrapper.get('input[type="file"]');
    expect(input.attributes("name")).toBe("attachment");
    expect(input.attributes("data-testid")).toBe("upload");
    // A caller's own id still has to be the one the label points at, or the
    // zone names nothing.
    expect(input.attributes("id")).toBe("given");
    expect(wrapper.get("label").attributes("for")).toBe("given");
  });

  it("merges a caller's class rather than letting it fight the root's own", () => {
    const wrapper = mount(FileUpload, { attrs: { class: "w-64" } });
    expect(wrapper.classes()).toContain("w-64");
    expect(wrapper.classes()).not.toContain("w-full");
  });
});
