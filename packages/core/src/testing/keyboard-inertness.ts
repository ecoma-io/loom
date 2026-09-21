/**
 * The keyboard-inert pin's selector set: every element that takes focus or a
 * key without a tabindex of its own, plus the two attributes that grant one.
 *
 * A visual-only component's whole interaction row is `keyboard-inert` — the
 * absence of an interaction surface, "worthless asserted in prose" in the
 * contract's own words, which is why the pin is a query: mount the component
 * with representative content and assert this selector matches nothing, and
 * that the root carries no `tabindex` the component had no business adding.
 * The two assertions together are what "nothing in it operates, takes focus
 * or reports an interactive state of its own" means where a test can see it.
 *
 * The set is the focusable-element floor — native form and media controls,
 * links with an href, and anything a `tabindex` or `contenteditable` makes
 * operable. Elements that are focusable only conditionally (`[draggable]`,
 * pointer-grab handles) are absent on purpose: the pin witnesses the keyboard
 * surface, and a drag-only handle is the resize contract another component
 * owns in its own harness spec.
 */
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button",
  "input",
  "select",
  "textarea",
  "iframe",
  "summary",
  "details",
  "audio[controls]",
  "video[controls]",
  "[tabindex]",
  "[contenteditable]",
].join(",");
