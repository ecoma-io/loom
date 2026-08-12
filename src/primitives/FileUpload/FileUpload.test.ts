import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref, type PropType } from "vue";
import FileUpload, { type FileUploadRejection } from "./FileUpload.vue";
import { provideFieldContext } from "../../lib/field-context";
import { provideLoomLabels, type LoomLabelOverrides } from "../../lib/labels";

// A stand-in for the Field wrapping this control. Field's own behaviour is
// pinned in `Field.test.ts`; what matters here is that the zone reads a row it
// is inside at all.
const ProbeRow = defineComponent({
  props: {
    controlId: { type: String, default: undefined },
    describedBy: { type: String, default: undefined },
    name: { type: String, default: undefined },
    required: { type: Boolean, default: undefined },
    invalid: { type: Boolean, default: undefined },
    disabled: { type: Boolean, default: undefined },
    readonly: { type: Boolean, default: undefined },
  },
  setup(props, { slots }) {
    provideFieldContext({
      controlId: () => props.controlId,
      describedBy: () => props.describedBy,
      name: () => props.name,
      required: () => props.required,
      invalid: () => props.invalid,
      disabled: () => props.disabled,
      readonly: () => props.readonly,
    });
    return () => h("form", slots.default?.());
  },
});

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

describe("FileUpload inside a Field", () => {
  it("takes its id, description, name, required and invalid state from the row it sits in", () => {
    const row = mount(ProbeRow, {
      props: {
        controlId: "attachments",
        describedBy: "attachments-description",
        name: "attachments",
        required: true,
        invalid: true,
      },
      slots: { default: h(FileUpload) },
    });
    const input = row.get('input[type="file"]');
    expect(input.attributes("id")).toBe("attachments");
    // The zone activates the input through the label, so the row's id has to
    // reach both or the click target and the control come apart.
    expect(row.get("label").attributes("for")).toBe("attachments");
    expect(input.attributes("aria-describedby")).toBe("attachments-description");
    expect(input.attributes("name")).toBe("attachments");
    expect(input.attributes("aria-required")).toBe("true");
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(row.get("label").attributes("data-invalid")).toBeDefined();
  });

  // The live case for merging rather than replacing: this control points
  // `aria-describedby` at its own refusal message, and a row's hint arriving
  // must not stop a file explaining why it was turned away.
  it("keeps announcing its own refusal alongside the row's description", async () => {
    const row = mount(ProbeRow, {
      props: { describedBy: "attachments-description" },
      slots: { default: h(FileUpload, { maxSize: KB }) },
    });
    await dropOn(row.get("label").element, [makeFile("scan.tiff", { size: 2 * KB })]);

    const described = row.get('input[type="file"]').attributes("aria-describedby") ?? "";
    const [own, fromRow] = described.split(" ");
    // The control's own message reads first: it is the more specific thing to
    // say, and a screen reader reads the list in order.
    expect(row.get(`#${own ?? ""}`).text()).toBe("scan.tiff is larger than 1 KB.");
    expect(fromRow).toBe("attachments-description");
  });

  it("lets an explicit disabled and invalid overrule the row in both directions", () => {
    const optedOut = mount(ProbeRow, {
      props: { disabled: true, invalid: true },
      slots: { default: h(FileUpload, { disabled: false, invalid: false }) },
    });
    expect((optedOut.get('input[type="file"]').element as HTMLInputElement).disabled).toBe(false);
    expect(optedOut.get('input[type="file"]').attributes("aria-invalid")).toBeUndefined();

    const optedIn = mount(ProbeRow, {
      slots: { default: h(FileUpload, { disabled: true, invalid: true }) },
    });
    expect((optedIn.get('input[type="file"]').element as HTMLInputElement).disabled).toBe(true);
    expect(optedIn.get('input[type="file"]').attributes("aria-invalid")).toBe("true");
  });

  it("keeps a caller's own id and description ahead of the row's", () => {
    const row = mount(ProbeRow, {
      props: { controlId: "generated", describedBy: "attachments-description" },
      slots: { default: h(FileUpload, { id: "mine", "aria-describedby": "my-caveat" }) },
    });
    const input = row.get('input[type="file"]');
    expect(input.attributes("id")).toBe("mine");
    expect(row.get("label").attributes("for")).toBe("mine");
    expect(input.attributes("aria-describedby")).toBe("my-caveat attachments-description");
  });

  // `readonly` is inert on `<input type="file">`, so a row's must arrive as
  // nothing at all — and above all must not quietly become `disabled`.
  it("ignores a row's readonly rather than approximating it", () => {
    const row = mount(ProbeRow, {
      props: { readonly: true },
      slots: { default: h(FileUpload) },
    });
    const input = row.get('input[type="file"]');
    expect((input.element as HTMLInputElement).disabled).toBe(false);
    expect(input.attributes("readonly")).toBeUndefined();
    expect(row.get("label").attributes("data-readonly")).toBeUndefined();
  });

  // Every key that resolved to nothing is dropped from the bag, so a zone with
  // no row above it renders exactly what it rendered before the context
  // existed.
  it("outside any Field adds nothing of its own", () => {
    const wrapper = mount(FileUpload);
    const input = wrapper.get('input[type="file"]');
    for (const attribute of ["name", "aria-describedby", "aria-required", "aria-invalid"]) {
      expect(input.attributes(attribute)).toBeUndefined();
    }
    // The generated id is still the floor under both, so the label keeps
    // pointing at the input.
    const id = input.attributes("id");
    expect(id).toBeDefined();
    expect(wrapper.get("label").attributes("for")).toBe(id);
  });
});

/** A host declaring an application-wide vocabulary above the control. */
const LabelHost = defineComponent({
  props: {
    vocabulary: { type: Function as PropType<() => LoomLabelOverrides>, required: true },
  },
  setup(props, { slots }) {
    provideLoomLabels(() => props.vocabulary());
    return () => h("div", slots.default?.());
  },
});

describe("FileUpload labels", () => {
  it("writes the zone, the limit, the size column and every remove button in its own English", () => {
    const wrapper = mount(FileUpload, {
      props: { multiple: true, maxSize: 5 * MB, modelValue: [makeFile("a.txt", { size: 2 * KB })] },
    });
    expect(wrapper.get("label").text()).toContain("Choose files or drag them here");
    expect(wrapper.get("label").text()).toContain("Up to 5 MB");
    expect(wrapper.get("li").text()).toContain("2 KB");
    expect(wrapper.get("li button").attributes("aria-label")).toBe("Remove a.txt");
  });

  it("hands every size over as a byte count, never as text it has already formatted", async () => {
    // `formatBytes` writes `5 MB` with a space and a full stop for a decimal.
    // French writes `5 Mo` and a comma; Turkish puts the unit differently
    // again. A host handed the number reaches all of them; a host handed
    // `"5 MB"` reaches none.
    const wrapper = mount(FileUpload, {
      props: {
        maxSize: 5 * MB,
        labels: {
          hint: ({ maxSize }: { maxSize: number }) =>
            `Tối đa ${new Intl.NumberFormat("vi-VN").format(maxSize)} byte`,
          size: ({ bytes }: { bytes: number }) =>
            `${new Intl.NumberFormat("vi-VN").format(bytes)} byte`,
        },
      },
    });
    expect(wrapper.get("label").text()).toContain("Tối đa 5.242.880 byte");

    await chooseIn(wrapper.get('input[type="file"]').element, [makeFile("a.txt", { size: 2048 })]);
    expect(wrapper.get("li").text()).toContain("2.048 byte");
  });

  it("hands `remove` the File itself rather than its name", () => {
    const wrapper = mount(FileUpload, {
      props: {
        modelValue: [makeFile("a.txt", { size: 99 })],
        // The whole object, so a host can name the row by anything the file
        // carries — not only the name Loom happened to pick out of it.
        labels: { remove: ({ file }: { file: File }) => `Bỏ ${file.name} (${String(file.size)})` },
      },
    });
    expect(wrapper.get("li button").attributes("aria-label")).toBe("Bỏ a.txt (99)");
  });

  it("hands `rejected` the whole list, so the joiner between sentences is the host's", async () => {
    const wrapper = mount(FileUpload, {
      props: {
        multiple: true,
        maxSize: KB,
        // Counting the refusals rather than listing them is the thing a
        // per-file message could not express, and it is why this key takes the
        // list instead of one rejection at a time.
        labels: {
          rejected: ({ rejections }: { rejections: readonly FileUploadRejection[] }) =>
            `${String(rejections.length)} tệp bị từ chối.`,
        },
      },
    });
    await chooseIn(wrapper.get('input[type="file"]').element, [
      makeFile("big.bin", { size: 2 * KB }),
      makeFile("huge.bin", { size: 4 * KB }),
    ]);
    expect(wrapper.get('[aria-live="polite"]').text()).toBe("2 tệp bị từ chối.");
  });

  it("tells the refusal message which limit applied, and says so when none did", async () => {
    const wrapper = mount(FileUpload, {
      props: {
        accept: ".csv",
        labels: {
          rejected: ({
            rejections,
            maxSize,
          }: {
            rejections: readonly FileUploadRejection[];
            maxSize: number | undefined;
          }) =>
            `${String(rejections.length)}/${maxSize === undefined ? "no limit" : String(maxSize)}`,
        },
      },
    });
    await chooseIn(wrapper.get('input[type="file"]').element, [makeFile("notes.txt")]);
    // `undefined` is the honest answer for "no limit was set", and it is what
    // lets a host word that case for itself rather than inherit "the size
    // limit" in English.
    expect(wrapper.get('[aria-live="polite"]').text()).toBe("1/no limit");
  });

  it("keeps the keys a caller left out in English instead of blanking them", async () => {
    const wrapper = mount(FileUpload, {
      props: { maxSize: KB, labels: { remove: ({ file }: { file: File }) => `Bỏ ${file.name}` } },
    });
    await chooseIn(wrapper.get('input[type="file"]').element, [
      makeFile("big.bin", { size: 2048 }),
    ]);
    expect(wrapper.get('[aria-live="polite"]').text()).toBe("big.bin is larger than 1 KB.");
    expect(wrapper.get("label").text()).toContain("Choose a file or drag it here");
  });

  it("lets `label` and `hint` beat the resolved labels, because they are one zone's wording", () => {
    const wrapper = mount(FileUpload, {
      props: {
        maxSize: KB,
        label: "Attach the signed contract",
        hint: "PDF only",
        labels: { zone: () => "Kéo tệp vào đây", hint: () => "Tối đa 1 KB" },
      },
    });
    expect(wrapper.get("label").text()).toContain("Attach the signed contract");
    expect(wrapper.get("label").text()).toContain("PDF only");
  });

  it("takes its names from a host's vocabulary, and lets one instance correct one key", () => {
    const wrapper = mount(LabelHost, {
      props: {
        vocabulary: () => ({
          fileUpload: {
            zone: () => "Kéo tệp vào đây",
            remove: ({ file }: { file: File }) => `Bỏ ${file.name}`,
          },
        }),
      },
      slots: {
        default: () => [
          h(FileUpload, { modelValue: [makeFile("a.txt")] }),
          h(FileUpload, {
            modelValue: [makeFile("b.txt")],
            labels: { zone: () => "Ảnh đại diện" },
          }),
        ],
      },
    });
    const zones = wrapper.findAll("label");
    expect(zones[0]!.text()).toContain("Kéo tệp vào đây");
    expect(zones[1]!.text()).toContain("Ảnh đại diện");
    // The vocabulary still reaches the key neither instance touched.
    expect(wrapper.findAll("li button").map((b) => b.attributes("aria-label"))).toEqual([
      "Bỏ a.txt",
      "Bỏ b.txt",
    ]);
  });

  it("repaints its copy when the host switches language under it", async () => {
    const locale = ref("en");
    const wrapper = mount(LabelHost, {
      props: {
        vocabulary: () =>
          locale.value === "en" ? {} : { fileUpload: { zone: () => "Kéo tệp vào đây" } },
      },
      slots: { default: () => h(FileUpload) },
    });
    expect(wrapper.get("label").text()).toContain("Choose a file or drag it here");

    locale.value = "vi";
    await nextTick();

    // The assertion that fails the moment a label is read once in `setup`
    // instead of through `text.` inside the render.
    expect(wrapper.get("label").text()).toContain("Kéo tệp vào đây");
  });
});
