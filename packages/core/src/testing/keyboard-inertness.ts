/**
 * The keyboard-interactive vocabulary per the HTML Standard's focusable
 * areas: every element that takes focus or a key without a `tabindex` of its
 * own, plus the attributes that grant one.
 *
 * The visual-only interaction class's whole matrix row is `keyboard-inert`, a
 * duty proved by absence — and an absence can only be pinned by a selector
 * that names what would contradict it. The set is deliberately closed, not a
 * heuristic, so a pin using it fails the day a component grows a
 * keyboard-interactive element rather than the day a selector drifts.
 *
 * Exactly one over-match is deliberate, and it is noted inline where it
 * lives: the four native controls stay state-blind on `disabled`, because
 * the pin is an absence oracle for native interactive *controls* — not for
 * enabled ones.
 *
 * Note what is *not* here: `summary` carries the disclosure's whole keyboard
 * contract, while `details` itself is never the tab stop in any engine, so
 * only the `summary` is listed. Native `<progress>` and `<meter>` are not
 * focusable and stay out.
 */
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  // State-blind on purpose for the four native controls: the pin is an
  // absence oracle for native interactive CONTROLS in a visual-only
  // component, and a `disabled` control is one binding away from focusable —
  // the day the control appears is the day the pin should fire, not the day
  // it becomes enabled. `aria-disabled` changes nothing: the element stays
  // natively focusable either way.
  "button",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "iframe",
  "embed",
  "object",
  "summary",
  "audio[controls]",
  "video[controls]",
  // A tab stop is keyboard interaction; `tabindex="-1"` is the opt-out of
  // sequential focus, and this repository itself uses it as an inertness
  // mechanism (scroll containers, ecoma-io/loom#438) — flagging it would
  // contradict the pattern it exists to serve.
  "[tabindex]:not([tabindex='-1'])",
  // Only the editable states: the enumerated attribute's true states are the
  // empty string (also the valueless form), `true` and `plaintext-only`;
  // `false` is the explicit non-editable declaration and unknown values
  // inherit — neither is keyboard-editable standalone. An editable="false"
  // island inside an editable ancestor is reached through the ancestor,
  // which this list already matches.
  "[contenteditable='']",
  "[contenteditable='true']",
  "[contenteditable='plaintext-only']",
].join(",");
