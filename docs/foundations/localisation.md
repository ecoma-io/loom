# Localisation

Loom ships the seam, not the content. There is no i18n package in its
dependencies, no bundled translations, and no plural engine — what it ships
instead is one contract that makes **every string a Loom component can put in
front of a person or an assistive technology** replaceable, including the ones
Reka UI writes underneath it.

That boundary is deliberate. A design system that shipped its own translations
would be shipping a second, competing source of truth for text your product
already translates somewhere, and it would be wrong for your product's tone
before it was wrong for its language. What Loom owes you is that nothing it
renders is unreachable.

<script setup lang="ts">
import { ref } from "vue";
import { Pagination, WindowControls, provideLoomLabels } from "@ecoma-io/loom";


const locale = ref("en");

const vietnamese = {
  pagination: {
    nav: "Phân trang",
    first: "Trang đầu",
    previous: "Trang trước",
    next: "Trang sau",
    last: "Trang cuối",
    page: ({ page }) => `Trang ${new Intl.NumberFormat("vi-VN").format(page)}`,
    position: ({ page, pageCount }) => `Trang ${page} trên ${pageCount}`,
    ellipsis: "Còn nhiều trang",
  },
  windowControls: {
    minimize: "Thu nhỏ",
    maximize: "Phóng to",
    restore: "Khôi phục",
    close: "Đóng",
  },
};

// This page is the demonstration: one call, in the setup of the component that
// renders everything below, and every Loom component on the page answers to it.
provideLoomLabels(() => (locale.value === "vi" ? vietnamese : {}));

const invoices = ref(3);
const activity = ref(2);
</script>

## Supply nothing and it works

A component with no vocabulary above it and no `labels` prop renders in English
and names everything it renders. That is not a fallback bolted on afterwards —
it is the default path, and it is why adopting this seam changes nothing for a
product that only ever ships English.

<Demo title="No vocabulary above it">
  <Pagination :page="1" :total="120" :labels="{ nav: 'Invoices, untranslated' }" />
</Demo>

## Two places to set it, and the rule between them

```
the instance's own `labels` prop   ??   the host's vocabulary   ??   Loom's English
```

Key by key, never whole-object. A vocabulary naming one string keeps English for
the rest; an instance overriding one key keeps the vocabulary's answer for the
others. There is no arrangement of the three that produces an unnamed control.

### Once, at the root

`provideLoomLabels` is the one you want for a language. Call it from the
`setup()` of your application's root component — the same place, and for the
same reason, as `applyLoomIconDefaults`.

```ts
import { provideLoomLabels } from "@ecoma-io/loom";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

provideLoomLabels(() => ({
  pagination: {
    next: t("pager.next"),
    page: ({ page }) => t("pager.page", { page }),
  },
  windowControls: { close: t("common.close") },
}));
```

It takes a **getter**, not an object, and that is what makes a language switch
work. The getter runs inside the render, so whatever reactive source it reads —
vue-i18n's locale, a `ref`, a store — is tracked, and every Loom component below
repaints when it changes. Hand it a snapshot instead and the first language
renders correctly while every switch after it does nothing.

Nesting is additive: a second `provideLoomLabels` deeper in the tree merges into
the one above rather than replacing it, so wrapping one dialog to change one word
does not lose the rest of your application's language.

<Demo title="One call at this page's root — every component below answers to it">
  <div class="flex w-full flex-col gap-4">
    <button
      type="button"
      class="self-start rounded-md border border-border px-3 py-1.5 text-sm hover:bg-subtle"
      @click="locale = locale === 'en' ? 'vi' : 'en'"
    >
      Switch this page to {{ locale === "en" ? "Vietnamese" : "English" }}
    </button>
    <Pagination v-model:page="invoices" :total="120" />
    <Pagination
      v-model:page="activity"
      variant="compact"
      :total="120"
      :labels="{ nav: 'Activity, second pager' }"
    />
    <div class="flex h-9 w-fit items-center rounded-lg border border-border bg-card">
      <WindowControls />
    </div>
  </div>
</Demo>

Only one thing in that block passes a `labels` prop, and it is the second
pagination's landmark name — the correction two navigations on one page always
need, in any language. Everything else, including the four names on the edge
buttons that Reka UI writes in English of its own accord, comes from the single
call at the top of this page.

### Per instance, for the names that are not a language

The `labels` prop is the correction, not the translation. Its case is the
pagination above a table and the pagination below it, which must not share a
landmark name however well the application is localised.

```vue
<Pagination :total="248" :labels="{ nav: 'Invoices, bottom' }" />
```

## A message that takes a value is a function

Loom never interpolates and never selects a plural form. A message that depends
on something only the render knows receives **the raw values** and returns a
finished string:

```ts
page: ({ page }: { page: number }) => string;
position: ({ page, pageCount }: { page: number; pageCount: number }) => string;
```

The argument is always an object of raw values, never text Loom has already
formatted. Handed the number, you can reach `Intl.NumberFormat` for Eastern
Arabic digits and `Intl.PluralRules` for a category English does not have.
Handed `"3"`, you cannot — the decision was already made, in English, by a
component with no business making it.

That is the whole answer to pluralisation, and it is why there is no plural
engine here to configure:

```ts
// vue-i18n owns the plural rules
unread: ({ count }) => t("inbox.unread", count);

// or Intl, with no library at all — Russian has three categories
const rules = new Intl.PluralRules("ru-RU");
const forms = { one: "письмо", few: "письма", many: "писем", other: "письма" };
unread: ({ count }) =>
  `${new Intl.NumberFormat("ru-RU").format(count)} ${forms[rules.select(count)]}`;

// Vietnamese has one form, and the number still goes through Intl
unread: ({ count }) => `${new Intl.NumberFormat("vi-VN").format(count)} chưa đọc`;
```

Where a message varies, the variation arrives as an **argument** rather than as
several sibling keys. Four keys plus a comma that Loom joins is not a sentence a
translator can reorder; one function is.

## Reka UI's English is overridable too

Loom is built on [Reka UI](https://reka-ui.com), which hard-codes English into
several of the parts Loom mounts — `aria-label="First Page"` on a pagination's
edge buttons, `` `Page ${n}` `` on every numbered one, and more besides. None of
them has a prop.

Loom overrides them anyway, and the mechanism is worth knowing because it
explains why the seam reaches things Reka's own API does not. Reka merges its
literal inside its render function; Vue applies a caller's fallthrough
attributes _after_ that render function returns, and for every attribute except
`class`, `style` and `on*`, the later value wins. So a binding on Loom's side
**replaces** Reka's rather than competing with it — and Loom's own English
differs from Reka's by exactly one capital letter (`First page`, not
`First Page`), which is what lets its test suite assert whose string reached the
DOM rather than merely what it said.

The practical consequence for you: `pagination.first` and its siblings are not
decoration. Leave one unset and it does not fall back to nothing — it falls back
to English, in a language your host never chose.

## Typing

A vocabulary is checked at both levels, and a partial one is the normal case.

```ts
import type { LoomLabelOverrides } from "@ecoma-io/loom";

// Fine — every slot is optional, and so is every key inside one.
const partial = { pagination: { next: "Trang sau" } } satisfies LoomLabelOverrides;

const slotTypo = { paginaton: { next: "Trang sau" } } satisfies LoomLabelOverrides;
//                 ^ error: 'paginaton' does not exist. Did you mean 'pagination'?

const keyTypo = { pagination: { nxt: "Trang sau" } } satisfies LoomLabelOverrides;
//                              ^ error: 'nxt' does not exist. Did you mean 'next'?

const wrongKind = { pagination: { page: "Trang" } } satisfies LoomLabelOverrides;
//                                ^ error: a counted message is a function, not a string
```

**Write `satisfies`, and write it on the declaration.** TypeScript's
excess-property check only fires on a fresh object literal, so a bag hoisted to a
module and passed as a variable is checked more weakly.

Not unchecked, though, and the difference is worth knowing rather than
worrying about. Because every key in these types is optional, TypeScript's
weak-type rule still rejects an object that shares no key with the type it is
assigned to — so a misspelled slot, or a slot object whose keys are _all_
misspelled, is an error with or without `satisfies`. The one case that slips
through is a typo sitting **beside** a correct key in the same hoisted object:

```ts
const bag = { pagination: { next: "Trang sau", nxt: "typo" } };
const vocabulary: LoomLabelOverrides = bag; // compiles; `nxt` is silently ignored
```

`satisfies` on the declaration closes it. That is the one place this contract
asks you to remember something.

Annotate with `LoomLabelOverrides` (or `LabelOverrides<PaginationLabels>` for a
single component's bag) rather than with the bag interface itself. The override
types are partial, so a key added to Loom in a later release is a key your
vocabulary may ignore; the bag interfaces are total, and a bag typed with one
would stop compiling the day the vocabulary grew.

## What it costs

Each component carries its own English, co-located with it, so the bytes
tree-shake with the component: importing `Button` ships none, and importing
`Pagination` ships `Pagination`'s — a couple of hundred bytes.

A host that translates everything still ships those defaults. That is the direct
tension in the requirement — the English has to exist for the supply-nothing case
— and eliminating it would mean stripping at build time, which means a bundler
plugin, which means the dependency this seam exists to avoid. So the cost is not
removed, it is bounded: you carry the English for the components you actually
import, and nothing for the ones you do not.
