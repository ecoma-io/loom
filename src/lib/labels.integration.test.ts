import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, type Component } from "vue";
import { provideLoomLabels, type LoomLabelOverrides } from "./labels";

import AvatarGroup from "../primitives/AvatarGroup/AvatarGroup.vue";
import ColorPicker from "../primitives/ColorPicker/ColorPicker.vue";
import Combobox from "../primitives/Combobox/Combobox.vue";
import DatePicker from "../primitives/DatePicker/DatePicker.vue";
import FileUpload from "../primitives/FileUpload/FileUpload.vue";
import Indicator from "../primitives/Indicator/Indicator.vue";
import NumberField from "../primitives/NumberField/NumberField.vue";
import OtpInput from "../primitives/OtpInput/OtpInput.vue";
import Pagination from "../primitives/Pagination/Pagination.vue";
import Progress from "../primitives/Progress/Progress.vue";
import RadialProgress from "../primitives/RadialProgress/RadialProgress.vue";
import Rating from "../primitives/Rating/Rating.vue";
import Stepper from "../primitives/Stepper/Stepper.vue";
import TimePicker from "../primitives/TimePicker/TimePicker.vue";
import WindowControls from "../primitives/WindowControls/WindowControls.vue";
import ToastStack from "../blocks/ToastStack/ToastStack.vue";

/**
 * The claim this file exists to falsify: **nothing a Loom component puts in
 * front of a person or an assistive technology is unreachable from the host's
 * vocabulary.**
 *
 * Every other label test in the repository asserts that a string Loom wrote
 * can be replaced. That is the easy half, and it is structurally incapable of
 * catching the hard one: Reka UI hard-codes English into the parts Loom mounts
 * — `aria-label="Show popup"` on a combobox trigger, `"Increase"`/`"Decrease"`
 * on a number field's steppers, `aria-valuetext="Empty"` on an unfilled date
 * segment — and none of it falls back to *nothing* when Loom forgets to
 * override it. It falls back to English, silently, in an application whose
 * host never chose English. A test that only checks Loom's own defaults sees a
 * component that looks perfectly localised.
 *
 * So this test asserts the negative over the whole rendered surface: mount the
 * component under a vocabulary in which **every key of every slot** is
 * Vietnamese, then read back every accessible name, value text, role
 * description and text node, and fail on any Latin-alphabet word that is not
 * accounted for. A survivor shows up as the English word itself, whether Loom
 * wrote it or Reka did, and whether or not anyone remembered to write an
 * assertion for that particular string.
 *
 * `NumberField` and `Combobox` are named in their own cases below because they
 * are the regression: both mount Reka parts whose English has no prop to reach
 * it by, and both were the components a survey expected to find shipping with
 * no override at all.
 */

/**
 * Every slot, every key. `satisfies LoomLabelOverrides` is doing real work
 * here rather than decorating: it is a fresh object literal, so a key that
 * stops existing — or one that never existed — fails the build, and a slot
 * that *gains* a key is caught by the sweep below instead, which sees the new
 * English reach the DOM.
 */
const VIETNAMESE = {
  pagination: {
    nav: "Phân trang",
    first: "Trang đầu",
    previous: "Trang trước",
    next: "Trang sau",
    last: "Trang cuối",
    page: ({ page }: { page: number }) => `Trang ${new Intl.NumberFormat("vi-VN").format(page)}`,
    position: ({ page, pageCount }: { page: number; pageCount: number }) =>
      `Trang ${String(page)} trên ${String(pageCount)}`,
    ellipsis: "Còn nhiều trang",
  },
  windowControls: {
    minimize: "Thu nhỏ",
    maximize: "Phóng to",
    restore: "Khôi phục",
    close: "Đóng",
  },
  dateSegments: { month: "Tháng", day: "Ngày", year: "Năm", era: "Kỷ nguyên", empty: "Chưa đặt" },
  timeSegments: {
    hour: "Giờ",
    minute: "Phút",
    second: "Giây",
    dayPeriod: "Sáng hoặc chiều",
    empty: "Chưa đặt",
  },
  calendarPanel: {
    calendar: "Lịch",
    openCalendar: "Mở lịch",
    previousMonth: "Tháng trước",
    nextMonth: "Tháng sau",
  },
  rangeCell: { cell: () => "Một ngày" },
  dateRange: {
    startDate: "Ngày bắt đầu",
    endDate: "Ngày kết thúc",
    status: () => "Khoảng đã chọn",
  },
  dateTimeRange: {
    startDate: "Lúc bắt đầu",
    endDate: "Lúc kết thúc",
    status: () => "Khoảng đã chọn",
  },
  numberField: { increment: "Tăng", decrement: "Giảm", roleDescription: "Trường số" },
  combobox: { trigger: "Mở danh sách", empty: "Không có kết quả" },
  otpInput: { cell: ({ index }: { index: number }) => `Ô thứ ${String(index)}` },
  fileUpload: {
    zone: () => "Thả tệp vào đây",
    hint: () => "Giới hạn dung lượng",
    size: () => "Dung lượng",
    remove: () => "Bỏ tệp",
    rejected: () => "Tệp bị từ chối",
  },
  rating: { score: () => "Điểm đánh giá" },
  dialog: { close: "Đóng" },
  alertDialog: { confirm: "Xác nhận", cancel: "Huỷ" },
  drawer: { close: "Đóng" },
  stepper: {
    group: "Tiến trình",
    position: () => "Vị trí hiện tại",
    completed: () => "Đã hoàn thành",
  },
  toast: { close: "Đóng", announce: "Thông báo", region: () => "Vùng thông báo" },
  indicator: {
    online: "Trực tuyến",
    offline: "Ngoại tuyến",
    busy: "Bận",
    away: "Vắng mặt",
    count: () => "Số lượng",
    attention: "Cần chú ý",
  },
  avatarGroup: { overflow: () => "Còn lại", agent: () => "Tác nhân" },
  progress: { value: () => "Đã xong", indeterminate: "Chưa rõ" },
  radialProgress: { value: () => "Đã xong", indeterminate: "Chưa rõ" },
  colorPicker: {
    area: "Vùng chọn màu",
    areaRoleDescription: "Bộ chọn màu",
    areaThumb: "Núm chọn màu",
    areaThumbRoleDescription: "Núm màu",
    areaValue: ({ saturation, brightness }: { saturation: number; brightness: number }) =>
      `Độ bão hoà ${String(saturation)}, độ sáng ${String(brightness)}`,
    hue: "Sắc màu",
    hex: "Mã màu",
    presets: "Màu đặt sẵn",
    swatch: () => "Ô màu",
    swatchRoleDescription: "Ô màu sắc",
  },
} satisfies LoomLabelOverrides;

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

enableAutoUnmount(afterEach);

/**
 * Mount one component under the whole Vietnamese vocabulary and hand back its
 * root element.
 *
 * The vocabulary is declared from a `setup`, which is the only place
 * `provideLoomLabels` works and the arrangement a host actually uses — a
 * getter rather than a snapshot, for the reason the seam documents: the getter
 * runs inside each component's render effect, so a language switch repaints.
 */
function render(inner: Component, props: Record<string, unknown>): Element {
  const host = defineComponent({
    setup() {
      provideLoomLabels(() => VIETNAMESE);
      return () => h(inner, props);
    },
  });
  return mount(host, { attachTo: document.body }).element as Element;
}

/**
 * Every accessible name on or under `root`, in document order. The root itself
 * is included rather than only its descendants: several components render the
 * named element *as* their root — Pagination's `<nav>` is the landmark whose
 * name the whole test is about — and `querySelectorAll` alone would miss it.
 */
function names(root: Element): (string | null)[] {
  return [root, ...Array.from(root.querySelectorAll("*"))]
    .filter((el) => el.hasAttribute("aria-label"))
    .map((el) => el.getAttribute("aria-label"));
}

/** The attributes that carry a name or a value a screen reader will speak. */
const SPOKEN_ATTRS = [
  "aria-label",
  "aria-roledescription",
  "aria-valuetext",
  "aria-placeholder",
  "title",
  "placeholder",
  "alt",
];

/**
 * Everything the component says, as one flat list of strings.
 *
 * Reka's own Stepper live region is dropped, and only that one: Loom renders
 * its own beside it and removes Reka's from the box tree with the
 * `[data-loom-stepper] > [role="status"]:not([data-loom-live])` rule in
 * `src/styles/global.css`. jsdom applies no stylesheet, so the node this
 * selector matches is present in the DOM here and invisible to a real reader.
 * The selector is duplicated rather than approximated, so that a change to
 * either half stops matching and this test starts seeing Reka's "Step N of M"
 * again — which is the coupling being kept honest.
 */
function spoken(root: Element): string[] {
  const out: string[] = [];
  const hidden = new Set(
    Array.from(
      root.querySelectorAll('[data-loom-stepper] > [role="status"]:not([data-loom-live])'),
    ),
  );
  const visit = (node: Node): void => {
    if (hidden.has(node as Element)) return;
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (const attr of SPOKEN_ATTRS) {
        const value = (node as Element).getAttribute(attr);
        if (value) out.push(value);
      }
    }
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      out.push(node.textContent.trim());
    }
    node.childNodes.forEach(visit);
  };
  visit(root);
  return out;
}

/**
 * Every word the vocabulary above actually produces, collected by walking it
 * rather than by transcribing it.
 *
 * That matters because a lot of Vietnamese is spelled in unaccented ASCII —
 * "Trang", "sau", "Thu" — and a sweep that simply flagged Latin-alphabet words
 * would flag those too. Derived instead of listed, the set cannot drift: a key
 * whose translation changes updates the allowance with it, and a key that is
 * *added* to Loom is not in the vocabulary at all, so its English reaches the
 * DOM and is reported rather than silently permitted.
 *
 * A message that takes arguments is called with a proxy answering `1` to every
 * field. Every argument these labels read is a number, and the words in the
 * result are what is wanted — the digits are not words and are ignored below.
 */
function vocabularyWords(): Set<string> {
  const anyArgs = new Proxy({}, { get: () => 1 }) as never;
  const words = new Set<string>();
  for (const slot of Object.values(VIETNAMESE)) {
    for (const label of Object.values(slot as Record<string, string | ((a: never) => string)>)) {
      const text = typeof label === "function" ? label(anyArgs) : label;
      for (const word of text.split(/[^\p{L}]+/u)) if (word) words.add(word.toLowerCase());
    }
  }
  return words;
}

/**
 * The only two other kinds of Latin word allowed to appear, and keeping this
 * list short is what gives the sweep its teeth — each entry is a decision that
 * had to be justified rather than a suppression.
 *
 *   • Content the test itself passed in as a prop. It is the host's own text,
 *     and a component rendering it is doing its job.
 *   • Reka's date-field placeholders and day-period text, which are the
 *     *locale's* output rather than a hard-coded literal: they come from `Intl`
 *     and Reka's per-locale placeholder table, and they follow the `locale`
 *     prop that Loom hands straight through. A host wanting them in another
 *     language sets the locale, not the vocabulary.
 */
const HOST_SUPPLIED = ["Kim", "Lê", "Ánh", "Bưu", "Một", "Hai", "Ba", "Đã", "lưu"];
const LOCALE_OUTPUT = ["mm", "dd", "yyyy", "AM", "PM"];

/**
 * Any word in `entries` that the vocabulary, the host's own props and the
 * locale's own output do not account for. In a correctly swept library this is
 * always empty; a survivor arrives here as the English word itself.
 */
function unaccountedWords(entries: string[]): string[] {
  const allowed = vocabularyWords();
  for (const word of [...HOST_SUPPLIED, ...LOCALE_OUTPUT]) allowed.add(word.toLowerCase());

  const survivors: string[] = [];
  for (const entry of entries) {
    // Split on anything that is not a letter, and keep Unicode letters
    // together: `\p{L}` is what stops "Phân" arriving here as "Ph" and "n".
    for (const word of entry.split(/[^\p{L}]+/u)) {
      if (word.length > 1 && !allowed.has(word.toLowerCase())) {
        survivors.push(`${word} (in "${entry}")`);
      }
    }
  }
  return survivors;
}

/**
 * One case per component, and the props are chosen to reach the strings rather
 * than to be minimal: an unset `DatePicker` is what renders empty segments, a
 * `Rating` with a score is what renders the score, and an `AvatarGroup` past
 * its `max` is what renders the overflow.
 */
const COMPONENTS: [string, Component, Record<string, unknown>][] = [
  ["Pagination, full", Pagination, { page: 2, total: 120 }],
  ["Pagination, compact", Pagination, { page: 2, total: 120, variant: "compact" }],
  ["NumberField", NumberField, { modelValue: 5 }],
  ["Combobox", Combobox, { options: [{ value: "a", label: "Ánh" }] }],
  ["WindowControls", WindowControls, {}],
  ["Rating", Rating, { modelValue: 3 }],
  ["OtpInput", OtpInput, { length: 4 }],
  ["Indicator, count", Indicator, { variant: "count", count: 5 }],
  ["Indicator, status", Indicator, { status: "online" }],
  [
    "AvatarGroup",
    AvatarGroup,
    { avatars: [{ alt: "Kim" }, { alt: "Lê" }, { alt: "Bưu" }], max: 2 },
  ],
  ["Progress", Progress, { modelValue: 42, showValue: true }],
  ["RadialProgress", RadialProgress, { modelValue: 42, showValue: true }],
  [
    "Stepper",
    Stepper,
    { modelValue: 2, steps: [{ title: "Một" }, { title: "Hai" }, { title: "Ba" }] },
  ],
  ["ColorPicker", ColorPicker, { modelValue: "#3366cc" }],
  ["FileUpload", FileUpload, {}],
  ["TimePicker", TimePicker, {}],
  ["DatePicker", DatePicker, {}],
  // A block, and the one that owns a Reka provider and viewport of its own
  // rather than borrowing `Toast`'s — so it owns their two English defaults too.
  ["ToastStack", ToastStack, { items: [{ id: 1, title: "Đã lưu" }] }],
];

describe("a host's vocabulary reaches every string a component speaks", () => {
  for (const [name, component, props] of COMPONENTS) {
    it(`leaves no English in ${name}`, async () => {
      const wrapper = render(component, props);
      await nextTick();
      expect(unaccountedWords(spoken(wrapper))).toEqual([]);
    });
  }
});

/**
 * The two components the sweep above exists for, asserted by name and by
 * string. The sweep would catch a regression in either, but it would report it
 * as "the word Increase appeared" — these say which control, which Reka part
 * and which mechanism, so the next person to break it is told what to fix.
 */
describe("Reka UI's own English is replaced rather than competed with", () => {
  it("names NumberField's steppers and its spinbutton from the vocabulary", async () => {
    const wrapper = render(NumberField, { modelValue: 5 });
    await nextTick();
    const labelled = names(wrapper);

    expect(labelled).toContain("Tăng");
    expect(labelled).toContain("Giảm");
    // Reka writes these two inside its own render function with no prop for
    // them; a missing override reads as English rather than as nothing.
    expect(labelled).not.toContain("Increase");
    expect(labelled).not.toContain("Decrease");

    const spinbutton = wrapper.querySelector('[role="spinbutton"]');
    expect(spinbutton?.getAttribute("aria-roledescription")).toBe("Trường số");
  });

  it("names Combobox's trigger and empty row from the vocabulary", async () => {
    const wrapper = render(Combobox, { options: [] });
    await nextTick();
    const trigger = names(wrapper);

    expect(trigger).toContain("Mở danh sách");
    // Reka's `ComboboxTrigger` writes `aria-label="Show popup"` into its own
    // vnode props, so this is the assertion that the fallthrough replaced it.
    expect(trigger).not.toContain("Show popup");

    // The empty row only exists while the list is open, and the list is
    // portalled to `document.body` rather than rendered inside the anchor —
    // so it has to be opened, and then read from the document.
    const input = wrapper.querySelector("input");
    input?.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1 }),
    );
    input?.dispatchEvent(new PointerEvent("click", { bubbles: true, button: 0, pointerId: 1 }));
    await nextTick();
    await nextTick();

    expect(document.body.textContent).toContain("Không có kết quả");
    expect(document.body.textContent).not.toContain("No results");
    // Reka's own fallback for an empty combobox, which Loom's slot content
    // replaces rather than sits beside.
    expect(document.body.textContent).not.toContain("No options");
  });

  it("reports an unfilled date segment in the vocabulary's words, not Reka's Empty", async () => {
    const wrapper = render(DatePicker, {});
    await nextTick();
    const segments = Array.from(wrapper.querySelectorAll('[role="spinbutton"]'));

    expect(segments.length).toBeGreaterThan(0);
    for (const segment of segments) {
      expect(segment.getAttribute("aria-valuetext")).toBe("Chưa đặt");
    }
  });

  it("leaves a filled date segment's own value text alone", async () => {
    // The empty case is the only hard-coded one. Reka's filled value text is
    // the number, and the month's is the number plus the *locale's* month name
    // — replacing those would be Loom overriding the host's own locale, and
    // binding `aria-valuetext` unconditionally would erase them.
    const wrapper = render(DatePicker, { modelValue: "2026-03-09" });
    await nextTick();
    const values = Array.from(wrapper.querySelectorAll('[role="spinbutton"]')).map((el) =>
      el.getAttribute("aria-valuetext"),
    );

    expect(values).not.toContain("Chưa đặt");
    expect(values.some((value) => value?.includes("9"))).toBe(true);
  });

  it("reports ColorPicker's area thumb from the vocabulary on every axis change", async () => {
    const wrapper = render(ColorPicker, { modelValue: "#3366cc" });
    await nextTick();
    const thumb = wrapper.querySelector('[role="slider"]');

    // Reka builds this from its own English channel names — "Saturation 60,
    // Brightness 80" — and re-announces it on every arrow key.
    expect(thumb?.getAttribute("aria-valuetext")).toBe("Độ bão hoà 60, độ sáng 80");
    // The numbers are Reka's own arithmetic, so the value text and the
    // `aria-valuenow` beside it cannot disagree.
    expect(thumb?.getAttribute("aria-valuenow")).toBe("60");
  });
});

describe("a vocabulary is additive, not a replacement", () => {
  it("keeps Loom's English for a slot the host did not name", async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          provideLoomLabels(() => ({ pagination: { next: "Trang sau" } }));
          return () => h(Pagination, { page: 2, total: 120 });
        },
      }),
      { attachTo: document.body },
    ).element as Element;
    await nextTick();
    const labelled = names(wrapper);

    expect(labelled).toContain("Trang sau");
    // The seven keys the host said nothing about stay named rather than
    // blanking to nothing — key by key, never whole-object.
    expect(labelled).toContain("First page");
    expect(labelled).toContain("Previous page");
  });

  it("lets an instance's own labels prop beat the host's vocabulary", async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          provideLoomLabels(() => VIETNAMESE);
          return () =>
            h(Pagination, { page: 2, total: 120, labels: { nav: "Hoá đơn, bảng dưới" } });
        },
      }),
      { attachTo: document.body },
    ).element as Element;
    await nextTick();

    // Pagination renders the `<nav>` as its own root, so the landmark is the
    // element itself rather than one inside it.
    expect(wrapper.getAttribute("aria-label")).toBe("Hoá đơn, bảng dưới");
  });
});
