import { onScopeDispose, readonly, ref, watchPostEffect, type Ref } from "vue";

/**
 * Whether an enclosing `<fieldset disabled>` has made this control unavailable
 * — read off the element itself, not off anything a wrapper told us.
 *
 * The platform already answers this for `<input>`, `<button>`, `<select>` and
 * `<textarea>`: a disabled fieldset makes every such descendant *actually
 * disabled*, so `:disabled` matches, the tab stop goes and the control refuses
 * input. Nothing in Loom has to help — native roots inherit a fieldset's
 * disabling and composites call this composable instead, which is the house
 * rule stated in CONTRIBUTING.md's accessibility section.
 *
 * That answer stops at the boundary of that short list,
 * and Reka builds several controls out of elements that are not on it — a
 * `<span role="slider">`, a `<div role="spinbutton">`. Those keep their
 * `tabindex="0"` and their arrow-key handlers inside a disabled group: measured
 * in jsdom, a Slider in a `<fieldset disabled>` still took Home/End and moved
 * its value, and a DatePicker segment still typed. A control that looks
 * unavailable and still answers the keyboard is worse than one that looks
 * available, so the appearance cannot be fixed on its own.
 *
 * **This is a read of the native attribute, not a second copy of it.**
 * `Fieldset.vue`'s docblock rules out publishing `disabled` through the Field
 * context, and the reason is precedence: a context is a claim a control may
 * beat with `:disabled="false"`, while the native attribute disables it anyway,
 * leaving a control that renders enabled and silently refuses input. Nothing
 * here can drift that way, because there is nothing to beat — the answer is
 * recomputed from the same DOM the browser is reading, so a control cannot
 * disagree with the fieldset it is standing in. It also needs no Loom wrapper
 * at all: a raw `<fieldset disabled>` a consumer wrote works exactly as one of
 * ours does.
 *
 * The result is `false` on the server and until the effect first runs, which is
 * deliberate. `watchPostEffect` does not run during SSR, so the markup a server
 * emits matches the markup the client hydrates and the state settles in the
 * same tick as mount — a hydration-time correction rather than a mismatch.
 */
export function useAncestorDisabled(
  target: () => Element | null | undefined,
): Readonly<Ref<boolean>> {
  const disabled = ref(false);

  // Kept rather than chained off the constructor: an observer holds a strong
  // reference to everything it watches, and `disconnect()` is the only thing
  // that releases them.
  let observer: MutationObserver | undefined;

  function sync(): void {
    const start = target();
    if (!start) {
      observer?.disconnect();
      disabled.value = false;
      return;
    }

    const fieldsets = enclosingFieldsets(start);
    observer ??= new MutationObserver(sync);
    // Re-observed wholesale rather than diffed. The set is an element's
    // ancestor fieldsets — one or two of them in any real form — and the
    // attribute filter means nothing else in the document wakes this up.
    observer.disconnect();
    for (const fieldset of fieldsets) {
      observer.observe(fieldset, { attributes: true, attributeFilter: ["disabled"] });
    }

    disabled.value = fieldsets.some((fieldset) => fieldset.disabled);
  }

  watchPostEffect(sync);
  onScopeDispose(() => {
    observer?.disconnect();
  });

  return readonly(disabled);
}

/**
 * The `<fieldset>` ancestors whose `disabled` would reach `start`, outermost
 * last, whether or not any of them currently carries the attribute — they are
 * what has to be watched for the attribute arriving.
 *
 * The walk climbs child-by-child rather than calling `closest("fieldset")`
 * because of the exemption in the "actually disabled" rule: controls inside a
 * disabled fieldset's **first** `<legend>` stay available, which is what makes
 * a switch in the legend that re-enables its own group possible. Reaching a
 * fieldset through that legend is reaching a fieldset that does not disable
 * you, so it is skipped — and the walk continues past it, since a fieldset
 * further out may still disable the legend itself.
 */
function enclosingFieldsets(start: Element): HTMLFieldSetElement[] {
  const found: HTMLFieldSetElement[] = [];
  let node: Element | null = start;

  while (node) {
    const parent: Element | null = node.parentElement;
    if (parent instanceof HTMLFieldSetElement && node !== parent.querySelector(":scope > legend")) {
      found.push(parent);
    }
    node = parent;
  }

  return found;
}
