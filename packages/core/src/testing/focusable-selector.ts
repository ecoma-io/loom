/**
 * Every element that takes focus or a key without a `tabindex` of its own,
 * plus the two attributes that grant one.
 *
 * The visual-only interaction class's whole matrix row is `keyboard-inert`, a
 * duty proved by absence — and an absence can only be pinned by a selector
 * that names what would contradict it. The set is deliberately closed: it is
 * the HTML focusable vocabulary, not a heuristic, so a pin using it fails the
 * day a component grows a focusable element rather than the day a selector
 * drifts.
 *
 * Note what is *not* here: native `<progress>` and `<meter>` are not
 * focusable, and contenteditable already appears through its attribute.
 * `details`/`summary` are listed though they key on Enter/Space only in some
 * engines — an inert surface must not carry either.
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
