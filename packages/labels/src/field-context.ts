import {
  computed,
  inject,
  onScopeDispose,
  provide,
  reactive,
  ref,
  watchEffect,
  type ComputedRef,
  type InjectionKey,
} from "vue";
import { optional } from "@ecoma-io/loom-core";

/**
 * What a form-row wrapper (Field, Fieldset) knows about the control inside it.
 *
 * A wrapper renders a `<label for>` and a hint-or-error line, and it is the
 * only thing in the tree that knows the id it pointed that label at, the id of
 * the message, and whether the row is mandatory or in error. None of that can
 * reach a slotted control through props — the wrapper never rendered it — so
 * before this existed the caller copied three attributes by hand at every call
 * site, and forgetting one was a silent accessibility defect.
 *
 * Every member is a `ComputedRef` rather than a value. A row's `error` arrives
 * and clears while the control stays mounted, so the context has to move with
 * it; and a per-key ref is what lets one wrapper inherit a single key from
 * another (Field reads `readonly` off a Fieldset above it) without a hidden
 * whole-object merge.
 *
 * On the booleans, `undefined` means "this wrapper has no opinion" and never
 * "false". That is the whole precedence story — see `useFieldControl` — and it
 * is the same distinction `./props.ts` exists to explain, arriving from the
 * other side: there, a key is dropped so a child sees an absence; here, an
 * absence is a value a wrapper is allowed to hold.
 */
export interface FieldContext {
  /** The id the primary control adopts, so the wrapper's `<label for>` names it. */
  readonly controlId: ComputedRef<string | undefined>;
  /** The id of the wrapper's `<label>`, for group controls to reference via `aria-labelledby`. */
  readonly labelledBy: ComputedRef<string | undefined>;
  /** The id of the hint-or-error line, and `undefined` while no message is rendered. */
  readonly describedBy: ComputedRef<string | undefined>;
  /** The form field name the control submits under. */
  readonly name: ComputedRef<string | undefined>;
  /** Whether the wrapper marks the row mandatory. Becomes `aria-required`. */
  readonly required: ComputedRef<boolean | undefined>;
  /** Whether the wrapper is showing an error, which is the same fact as the control being invalid. */
  readonly invalid: ComputedRef<boolean | undefined>;
  /** Whether the wrapper disables what is inside it. */
  readonly disabled: ComputedRef<boolean | undefined>;
  /** Whether the wrapper renders what is inside it read-only. */
  readonly readonly: ComputedRef<boolean | undefined>;
  /**
   * Claims the row's single control id, and reports whether this control won it.
   *
   * `<Field><TextField /><TextField /></Field>` is a shape somebody will write,
   * and without a claim both inputs adopt the same generated id — a duplicate
   * id, and a `<label for>` that resolves to whichever the browser reaches
   * first. The `axe` gate cannot be the backstop: `duplicate-id-active` is
   * tagged `wcag2a-obsolete`/`deprecated` in axe-core, not `wcag2a`, so it is
   * in neither runtime list and `e2e/accessibility.e2e.ts` never runs it.
   *
   * Reactive rather than a plain boolean because the claim can move: a `v-if`
   * swapping the first control for the second must promote the second, or the
   * label points at an id no longer in the document.
   */
  claimControlId(): ComputedRef<boolean>;
}

/**
 * What a wrapper hands `provideFieldContext`, as getters rather than values —
 * the wrapper writes plain expressions over its own props and this file does
 * the wrapping, so a wrapper never has to remember which of its answers are
 * derived.
 */
export interface FieldContextSource {
  controlId: () => string | undefined;
  labelledBy?: () => string | undefined;
  describedBy: () => string | undefined;
  name: () => string | undefined;
  required: () => boolean | undefined;
  invalid: () => boolean | undefined;
  disabled: () => boolean | undefined;
  readonly: () => boolean | undefined;
}

/**
 * The control's own side of the contract: what this control was told directly,
 * with `undefined` for everything the caller left unset.
 *
 * Each key is `?: T | undefined` rather than `?: T`. Under
 * `exactOptionalPropertyTypes` that is the form that accepts both an omitted
 * key and an explicit `undefined` — and an explicit `undefined` is exactly what
 * a control passes when its own prop is unset.
 */
export interface FieldControlProps {
  /** The caller's `id`, which reaches a bare control as a fallthrough attr rather than a prop. */
  readonly id?: string | undefined;
  /** The caller's `aria-describedby`, likewise a fallthrough attr. */
  readonly describedBy?: string | undefined;
  /** The caller's `aria-labelledby`, for group controls that name themselves rather than being named by `label for`. */
  readonly ariaLabelledby?: string | undefined;
  readonly name?: string | undefined;
  readonly required?: boolean | undefined;
  readonly invalid?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly readonly?: boolean | undefined;
}

/**
 * The resolved attributes, ready to spread onto whichever node carries the
 * control's ARIA.
 *
 * A key whose value resolved to `undefined` is **absent**, not present-and-
 * undefined — `optional()` drops it. That is what makes the spread purely
 * additive: `v-bind="{ ...rest, ...field.attrs }"` can never blank out an
 * attribute the caller passed through fallthrough, so a control renders exactly
 * what it renders today whenever there is no wrapper above it.
 *
 * `aria-required` and `aria-invalid` are omitted rather than set to `"false"`.
 * Both are legal and both say nothing, and the absent attribute already means
 * the same thing — the house `x || undefined` idiom, moved one layer in.
 */
export interface FieldControlAttrs {
  readonly id?: string;
  readonly name?: string;
  readonly "aria-describedby"?: string;
  // Narrowed to the literal rather than `string`: Vue types `aria-invalid` on a
  // native element as `Booleanish | "grammar" | "spelling"`, so a widened
  // `string` here fails to spread onto the very `<input>` this exists for.
  readonly "aria-required"?: "true";
  readonly "aria-invalid"?: "true";
}

/**
 * What `useFieldControl` resolved, after the control's own props won.
 *
 * Returned `reactive` rather than as a bag of refs, which is the one place in
 * `src/lib/` that does so. A template unwraps only a *top-level* ref, and a
 * control needs four of these at once under names — `disabled`, `invalid`,
 * `readonly`, `required` — that each shadow a prop of the same name. `reactive`
 * gives `field.invalid` in both the script and the template, and the shadowing
 * question never arises. Destructuring it does lose reactivity; read through
 * `field.` and there is nothing to get wrong.
 */
export interface FieldControl {
  /** Spread onto the node that carries the control's ARIA, **after** the fallthrough attrs. */
  readonly attrs: FieldControlAttrs;
  readonly id: string | undefined;
  readonly labelledBy: string | undefined;
  readonly name: string | undefined;
  readonly disabled: boolean;
  readonly invalid: boolean;
  readonly readonly: boolean;
  readonly required: boolean;
}

/**
 * A `Symbol`, and not exported from `src/index.ts`: a consumer pinned to the
 * key is pinned to a shape that moves whenever a wrapper does. `useFieldControl`
 * is the supported way in.
 */
const FIELD_CONTEXT: InjectionKey<FieldContext> = Symbol("loom.field");

/**
 * The wrapper above this one, for a wrapper that composes over another.
 *
 * Only Field needs it, and only for `readonly`: Vue resolves `inject` to the
 * nearest provider **wholesale**, not per key, so a Field shadows the Fieldset
 * above it entirely. Any key both wrappers answer has to be merged by hand, and
 * reading the outer context here rather than merging inside
 * `provideFieldContext` keeps that decision visible in Field.vue, where the
 * reason for it lives.
 */
export function useOuterFieldContext(): FieldContext | undefined {
  return inject(FIELD_CONTEXT, undefined);
}

/** Called by a wrapper — Field and Fieldset — from its own `setup`. */
export function provideFieldContext(source: FieldContextSource): void {
  const claims = ref<symbol[]>([]);

  provide(FIELD_CONTEXT, {
    controlId: computed(source.controlId),
    labelledBy: computed(source.labelledBy ?? (() => undefined)),
    describedBy: computed(source.describedBy),
    name: computed(source.name),
    required: computed(source.required),
    invalid: computed(source.invalid),
    disabled: computed(source.disabled),
    readonly: computed(source.readonly),
    claimControlId() {
      const token = Symbol("loom.field.control");
      claims.value = [...claims.value, token];
      // The claiming scope is the control's, not the wrapper's, so this fires
      // when that one control unmounts and the next in document order is
      // promoted.
      onScopeDispose(() => {
        claims.value = claims.value.filter((held) => held !== token);
      });
      return computed(() => claims.value[0] === token);
    },
  });
}

/**
 * Opt a control into the wrapper around it. One call, one spread — see
 * `TextField.vue`, which is the worked example the rest of the family copies.
 *
 * **The rule is `own ?? wrapper ?? false`.** `??` and not `||`, so an explicit
 * `false` on the control beats a `true` from the wrapper: one control inside a
 * row that is showing an error can declare itself individually fine, and one
 * inside a clean row can declare itself individually invalid.
 *
 * That rule is worth nothing unless "unset" and "set to `false`" are still
 * different values by the time they arrive here, and by default they are not:
 * Vue resolves an absent `Boolean` prop with no declared default to `false`, so
 * `props.invalid ?? field` would short-circuit forever and the context would be
 * inert while looking perfectly wired. **Every participating prop must be
 * declared `boolean | undefined` with an explicit `undefined` default** — the
 * `| undefined` is what `exactOptionalPropertyTypes` needs to let `withDefaults`
 * take that default at all, and the default is what beats the Boolean cast.
 *
 * With no wrapper above, every chain falls through to the control's own props
 * and the `?? false` at the end is the same `false` the control's `withDefaults`
 * used to supply. Nothing about a control standing alone changes.
 *
 * The argument is a **getter**, not a props object, for the reason
 * `./attrs.ts` takes `useAttrs()` rather than a snapshot: a control feeds this a
 * mix of props and fallthrough attrs and both have to stay live.
 */
export function useFieldControl(own: () => FieldControlProps): FieldControl {
  const field = inject(FIELD_CONTEXT, undefined);
  const holdsControlId = field?.claimControlId();

  const id = computed(
    () => own().id ?? (holdsControlId?.value === true ? field?.controlId.value : undefined),
  );
  const name = computed(() => own().name ?? field?.name.value);
  const labelledBy = computed(() => own().ariaLabelledby ?? field?.labelledBy.value);

  // The one attribute whose rule is merge rather than replace, because
  // `aria-describedby` is a token list: the row's message is additional to
  // whatever else the caller pointed at, not an alternative to it. Replacing
  // would silently drop the row's hint the moment a caller described their
  // control for some other reason — which is the defect this file exists to
  // remove, reintroduced from the other end. The control's own id reads first:
  // a control that has something to say about itself is saying the more
  // specific thing, and a screen reader reads the list in order.
  const describedBy = computed(() => {
    const ids = [own().describedBy, field?.describedBy.value].filter(
      (candidate): candidate is string => candidate !== undefined && candidate.length > 0,
    );
    return ids.length > 0 ? ids.join(" ") : undefined;
  });

  const required = computed(() => own().required ?? field?.required.value ?? false);
  const invalid = computed(() => own().invalid ?? field?.invalid.value ?? false);
  const disabled = computed(() => own().disabled ?? field?.disabled.value ?? false);
  const readonly = computed(() => own().readonly ?? field?.readonly.value ?? false);

  // A development-mode safety net for the one context key a control can
  // deliberately decline. When a wrapper sets `readonly` but the control did
  // not pass that key in its `FieldControlProps`, the wrapper's instruction is
  // silently dropped — and without this warning the consumer has no signal
  // that it was. The `"readonly" in own()` check distinguishes "I defer to the
  // wrapper" (key present, value `undefined`) from "I don't participate" (key
  // absent), which is the same distinction `exactOptionalPropertyTypes` makes
  // at the type level.
  if (import.meta.env.DEV && field) {
    watchEffect(() => {
      if (field.readonly.value && !("readonly" in own())) {
        console.warn("[Loom] readonly was set on the Field, but this control does not claim it.");
      }
    });
  }

  const attrs = computed<FieldControlAttrs>(() =>
    optional({
      id: id.value,
      name: name.value,
      "aria-describedby": describedBy.value,
      "aria-required": required.value ? ("true" as const) : undefined,
      "aria-invalid": invalid.value ? ("true" as const) : undefined,
    }),
  );

  return reactive({ attrs, id, labelledBy, name, disabled, invalid, readonly, required });
}
