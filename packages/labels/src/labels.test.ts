import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref, type PropType } from "vue";
import {
  provideLoomLabels,
  useLabels,
  type LabelOf,
  type LabelOverrides,
  type LoomLabelOverrides,
} from "./labels";

enableAutoUnmount(afterEach);

// Declared here rather than imported from `Pagination.vue`, so this file tests
// the composable and not the component. It is not free-floating either: passing
// it to `useLabels("pagination", …)` only compiles while it still satisfies the
// registry's `pagination` slot, so a key renamed in `PaginationLabels` fails
// here too.
interface TestLabels {
  readonly nav: string;
  readonly first: string;
  readonly previous: string;
  readonly next: string;
  readonly last: string;
  readonly page: LabelOf<{ page: number }>;
  readonly position: LabelOf<{ page: number; pageCount: number }>;
  readonly ellipsis: string;
}

const ENGLISH: TestLabels = {
  nav: "Pagination",
  first: "First page",
  previous: "Previous page",
  next: "Next page",
  last: "Last page",
  page: ({ page }) => `Page ${String(page)}`,
  position: ({ page, pageCount }) => `Page ${String(page)} of ${String(pageCount)}`,
  ellipsis: "More pages",
};

/** A host declaring a vocabulary, with the source deliberately left reactive. */
const Host = defineComponent({
  props: {
    vocabulary: {
      type: Function as PropType<() => LoomLabelOverrides>,
      default: (): LoomLabelOverrides => ({}),
    },
  },
  setup(props, { slots }) {
    provideLoomLabels(() => props.vocabulary());
    return () => h("div", slots.default?.());
  },
});

/** One component reading one slot, rendering what it resolved. */
const Reader = defineComponent({
  props: {
    own: {
      type: Object as PropType<LabelOverrides<TestLabels>>,
      default: undefined,
    },
  },
  setup(props) {
    const text = useLabels("pagination", ENGLISH, () => props.own);
    return () =>
      h("output", [
        h("span", { "data-key": "nav" }, text.value.nav),
        h("span", { "data-key": "next" }, text.value.next),
        h("span", { "data-key": "ellipsis" }, text.value.ellipsis),
        h("span", { "data-key": "page" }, text.value.page({ page: 3 })),
      ]);
  },
});

function read(wrapper: ReturnType<typeof mount>, key: string): string {
  return wrapper.get(`[data-key="${key}"]`).text();
}

describe("useLabels", () => {
  it("falls back to the component's own English when a host declares nothing at all", () => {
    const wrapper = mount(Reader);
    expect(read(wrapper, "nav")).toBe("Pagination");
    expect(read(wrapper, "next")).toBe("Next page");
    expect(read(wrapper, "page")).toBe("Page 3");
  });

  it("replaces only the keys a host names, leaving the rest of the slot in English", () => {
    const wrapper = mount(Host, {
      props: { vocabulary: () => ({ pagination: { next: "Trang sau" } }) },
      slots: { default: () => h(Reader) },
    });
    expect(read(wrapper, "next")).toBe("Trang sau");
    // The failure this pins is the whole-object merge: a host correcting one
    // string must not blank the other seven into unnamed buttons.
    expect(read(wrapper, "nav")).toBe("Pagination");
    expect(read(wrapper, "ellipsis")).toBe("More pages");
  });

  it("lets one instance's own prop beat the host's vocabulary, key by key", () => {
    const wrapper = mount(Host, {
      props: { vocabulary: () => ({ pagination: { nav: "Phân trang", next: "Trang sau" } }) },
      slots: { default: () => h(Reader, { own: { nav: "Hoá đơn, dưới" } }) },
    });
    // The case this exists for: two paginations on one page, one vocabulary.
    expect(read(wrapper, "nav")).toBe("Hoá đơn, dưới");
    expect(read(wrapper, "next")).toBe("Trang sau");
  });

  it("reads an explicitly undefined override as no opinion rather than as a blank name", () => {
    const wrapper = mount(Host, {
      props: { vocabulary: () => ({ pagination: { next: undefined } }) },
      slots: { default: () => h(Reader, { own: { nav: undefined } }) },
    });
    // What a consumer's own conditional expression produces when its condition
    // is unmet. An unnamed button is the worst available reading of it.
    expect(read(wrapper, "next")).toBe("Next page");
    expect(read(wrapper, "nav")).toBe("Pagination");
  });

  it("merges a nested vocabulary into the one above it instead of shadowing it wholesale", () => {
    const wrapper = mount(Host, {
      props: { vocabulary: () => ({ pagination: { nav: "Phân trang", next: "Trang sau" } }) },
      slots: {
        default: () =>
          h(Host, { vocabulary: () => ({ pagination: { next: "Kế tiếp" } }) }, () => h(Reader)),
      },
    });
    // Vue resolves `inject` to the nearest provider wholesale. Without the
    // merge, a modal wrapped in a second provider to change one word loses the
    // entire application's language back to English, silently.
    expect(read(wrapper, "next")).toBe("Kế tiếp");
    expect(read(wrapper, "nav")).toBe("Phân trang");
    expect(read(wrapper, "ellipsis")).toBe("More pages");
  });

  it("lets a nested vocabulary introduce a slot the one above it never named", () => {
    const wrapper = mount(Host, {
      props: { vocabulary: () => ({ windowControls: { close: "Đóng" } }) },
      slots: {
        default: () =>
          h(Host, { vocabulary: () => ({ pagination: { next: "Trang sau" } }) }, () => h(Reader)),
      },
    });
    expect(read(wrapper, "next")).toBe("Trang sau");
    expect(read(wrapper, "nav")).toBe("Pagination");
  });

  it("treats a slot a nested vocabulary sets to undefined as untouched, not as emptied", () => {
    const wrapper = mount(Host, {
      props: { vocabulary: () => ({ pagination: { next: "Trang sau" } }) },
      slots: {
        default: () => h(Host, { vocabulary: () => ({ pagination: undefined }) }, () => h(Reader)),
      },
    });
    expect(read(wrapper, "next")).toBe("Trang sau");
  });

  it("leaves a slot alone when the host's vocabulary names only other components", () => {
    const wrapper = mount(Host, {
      props: { vocabulary: () => ({ windowControls: { close: "Đóng" } }) },
      slots: { default: () => h(Reader) },
    });
    expect(read(wrapper, "nav")).toBe("Pagination");
  });

  it("repaints every resolved name when the host's vocabulary changes under it", async () => {
    const locale = ref("en");
    const wrapper = mount(Host, {
      props: {
        vocabulary: () => (locale.value === "en" ? {} : { pagination: { next: "Trang sau" } }),
      },
      slots: { default: () => h(Reader) },
    });
    expect(read(wrapper, "next")).toBe("Next page");

    locale.value = "vi";
    await nextTick();

    // This is the assertion that fails the moment a label is resolved once in
    // `setup` instead of inside the render effect — a refactor that passes
    // every other test in this file and breaks every language switch.
    expect(read(wrapper, "next")).toBe("Trang sau");
  });

  it("hands a counted message the raw number, so the plural form is the host's to choose", () => {
    // Russian has three categories where English has two, and Loom ships no
    // engine that knows either. It hands over the number; the host decides.
    const plural = new Intl.PluralRules("ru-RU");
    const forms: Record<string, string> = { one: "страница", few: "страницы", many: "страниц" };
    const wrapper = mount(Host, {
      props: {
        vocabulary: () => ({
          pagination: {
            page: ({ page }: { page: number }) =>
              `${new Intl.NumberFormat("ru-RU").format(page)} ${forms[plural.select(page)] ?? ""}`,
          },
        }),
      },
      slots: { default: () => h(Reader) },
    });
    expect(read(wrapper, "page")).toBe("3 страницы");
  });

  it("mounts without a provider anywhere above it, so the seam costs a lone component nothing", () => {
    expect(() => mount(Reader)).not.toThrow();
  });
});
