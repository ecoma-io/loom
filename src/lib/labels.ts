import { computed, inject, provide, type ComputedRef, type InjectionKey } from "vue";
import { optional } from "./props";
import type { LoomLabels } from "./label-registry";

/**
 * A message the component cannot write on its own, because it depends on a
 * value only the render knows — a page number, a file name, a count.
 *
 * **The argument is one object, and every member is a raw value: a `number`, a
 * `Date`, a `File`. Never a string Loom has already formatted.** That is the
 * entire pluralisation answer, and it is why this library ships no
 * pluralisation engine and takes no i18n dependency. "3 unread" has one form in
 * Vietnamese, two in English, three in Russian and six in Arabic, and no
 * placeholder syntax Loom could invent would carry that. Loom hands over the
 * facts and receives a finished string; selecting the plural category, shaping
 * the digits and ordering the sentence all happen in the consumer's own
 * `Intl.PluralRules`, `Intl.NumberFormat`, vue-i18n, or hand-written `if`.
 *
 * Hand over the number and a consumer can reach `Intl.NumberFormat` for Eastern
 * Arabic digits. Hand over `"3"` and they cannot: the decision was already made,
 * in English, inside a component that had no business making it.
 *
 * One object rather than positional parameters, for two reasons. A bare
 * `(4, 12)` in a consumer's locale file says nothing about what either number
 * is. And a fact added later is a new key an existing override simply ignores,
 * where a new positional parameter would silently re-order every call site.
 *
 * There is deliberately no third kind. A message is a `string` or it is one of
 * these; a `string | (() => string)` union was considered and rejected, because
 * the reactivity it exists to buy is already bought by `provideLoomLabels`
 * taking a getter — and it would put a `resolve()` call around every binding in
 * every component for the rest of the library's life.
 */
export type LabelOf<Args extends object> = (args: Args) => string;

/**
 * What a consumer may pass for one component's bag: any subset of it.
 *
 * **This, not the bag interface itself, is the type a consumer annotates their
 * own object with.** A bag typed `PaginationLabels` must answer every key, so a
 * key added in a later release breaks that consumer's build; a bag typed
 * `LabelOverrides<PaginationLabels>` does not, which is what makes growing the
 * vocabulary a `feat` rather than a `feat!`.
 *
 * `T[K] | undefined` rather than a plain `Partial<T>`, because
 * `exactOptionalPropertyTypes` is on: under it `Partial<T>` rejects an
 * explicitly-`undefined` value, and an explicit `undefined` is exactly what a
 * consumer's own conditional expression produces when its condition is unmet.
 * It has to mean "no opinion", never "blank this out" — the same distinction
 * `./props.ts` exists to explain, arriving one layer in.
 */
export type LabelOverrides<T extends object> = {
  readonly [K in keyof T]?: T[K] | undefined;
};

/**
 * A whole vocabulary, as a host supplies it: any subset of any slot.
 *
 * Both levels are partial and both are checked. A misspelled slot and a
 * misspelled key inside a slot are each a compile error — on a fresh object
 * literal, which is the caveat the localisation guide documents and the reason
 * it tells a consumer to write `satisfies LoomLabelOverrides` on a bag they
 * hoist to a module.
 */
export type LoomLabelOverrides = {
  readonly [K in keyof LoomLabels]?: LabelOverrides<LoomLabels[K]> | undefined;
};

/** The shape both merge steps work in, once the slot's identity has been checked. */
type AnyBag = Record<string, unknown>;

/**
 * A `Symbol`, and not exported from `src/index.ts`, for the reason
 * `./field-context.ts` gives about its own: a consumer pinned to the key is
 * pinned to a shape that moves. `provideLoomLabels` is the supported way in.
 */
const LOOM_LABELS: InjectionKey<ComputedRef<LoomLabelOverrides>> = Symbol("loom.labels");

function mergeVocabularies(
  outer: LoomLabelOverrides,
  inner: LoomLabelOverrides,
): LoomLabelOverrides {
  const merged = { ...outer } as AnyBag;
  const patches = inner as AnyBag;
  for (const slot of Object.keys(patches)) {
    const patch = patches[slot] as AnyBag | undefined;
    if (patch === undefined) continue;
    // Per key inside the slot as well as per slot: a nested provider changing
    // one string must not blank the rest of that slot back to English.
    merged[slot] = { ...((merged[slot] ?? {}) as AnyBag), ...optional(patch) };
  }
  return merged;
}

/**
 * Declare a host's vocabulary once, from the `setup` of its root component —
 * the same place, and for the same reason, as `applyLoomIconDefaults`. It
 * resolves to Vue's `provide()`, so called from a plain entry module it
 * silently provides nothing and every component keeps its English.
 *
 * A **getter**, not a value, for the reason `./attrs.ts` takes `useAttrs()`
 * rather than a snapshot: the getter runs inside the `computed` that
 * `useLabels` returns, which runs inside the render effect, so a host whose bag
 * reads `t("pager.next")` tracks their locale ref and every Loom component
 * repaints on a language switch with no work here at all. Snapshot the bag
 * instead and the first language renders correctly and every switch after it
 * does nothing — a failure with no error and no warning.
 *
 * **A nested call merges into the bag above it rather than replacing it**, and
 * that is a deliberate divergence from `./field-context.ts`, which documents
 * the opposite and hand-merges the single key that needs it. Vue resolves
 * `inject` wholesale to the nearest provider, so without this a host wrapping
 * one dialog in a second `provideLoomLabels` to change one string would lose
 * every other string in the application back to English. Hand-merging is right
 * for two wrappers and one key; it does not scale to a vocabulary this size at
 * an unknown depth.
 */
export function provideLoomLabels(source: () => LoomLabelOverrides): void {
  const outer = inject(LOOM_LABELS, undefined);
  provide(
    LOOM_LABELS,
    computed(() => (outer === undefined ? source() : mergeVocabularies(outer.value, source()))),
  );
}

/**
 * Resolve one component's slot: **own prop, then the host's vocabulary, then
 * the component's own English** — key by key, never whole-object.
 *
 * Key by key is the whole point. A host providing `{ pagination: { next: "Sau" } }`
 * keeps English for the other seven rather than rendering a row of unnamed
 * buttons, and an instance overriding its own `nav` does not discard the host's
 * other six. `optional()` is what makes each spread purely additive: it drops
 * the `undefined`-valued keys, so an absent override cannot blank a present
 * default. Same function, same reasoning, as the attribute spread in
 * `./field-context.ts`.
 *
 * The prop beating the provider is not a preference. A page with two paginations
 * that need different names has no other way out, and an application-wide
 * vocabulary that could not be corrected per instance would force a host to
 * choose between localising and naming.
 *
 * `defaults` arrives from the component rather than from a central English
 * bundle, and that is what bounds the cost of the seam: a consumer importing
 * only `Button` ships no label bytes at all, and one importing `Pagination`
 * ships `Pagination`'s. A central `en` object would always ship whole.
 *
 * The result is typed from `defaults` rather than from `LoomLabels[K]`, with
 * the registry entry as a constraint on it. Structurally that is the same
 * check — a bag that does not match its registered slot does not compile — but
 * it keeps the resolved type nameable from the module that declared it.
 */
export function useLabels<K extends keyof LoomLabels, T extends LoomLabels[K]>(
  slot: K,
  defaults: T,
  own?: () => LabelOverrides<T> | undefined,
): ComputedRef<LoomLabels[K]> {
  const provided = inject(LOOM_LABELS, undefined);
  // Read inside the `computed`, never above it: that is what puts the host's
  // getter and this component's props inside the render effect, and it is the
  // one line that decides whether a language switch repaints.
  //
  // `Object.assign` rather than an object spread, and that is a type-level
  // choice rather than a stylistic one: spreading a generic `LoomLabels[K]`
  // widens it to an index signature that no longer satisfies the return type,
  // where `Object.assign` composes an intersection that does.
  return computed(() =>
    Object.assign({}, defaults, optional(provided?.value[slot] ?? {}), optional(own?.() ?? {})),
  );
}
