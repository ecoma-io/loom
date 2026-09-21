/**
 * Pin test for FOCUSABLE_SELECTOR's observable match behaviour in a real DOM.
 *
 * The selector is the absence oracle behind the twenty-nine visual-only
 * keyboard-inertness pins (#432 tranche 1): its match set is what those pins
 * name as a contradiction, so a wrong edge here is a pin that fires on inert
 * markup or stays silent on interactive markup. Every edge named in the
 * ecoma-io/loom#443 audit is asserted through element identities in a jsdom
 * fixture — never through the selector's source string, which would pin
 * spelling instead of meaning.
 *
 * jsdom is deliberately the DOM here because it is the DOM the pins query:
 * a semantics disagreement between this file and the pins' own queries is a
 * finding, not a fixture to tune.
 */
import { describe, expect, it } from "vitest";
import { FOCUSABLE_SELECTOR } from "../src/testing/keyboard-inertness";

/** Mount a fixture in body and return the ids the selector matched, in DOM order. */
function matchedIds(fixture: string): string[] {
  document.body.innerHTML = fixture;
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).map((el) => el.id);
}

describe("FOCUSABLE_SELECTOR", () => {
  describe("matches the HTML keyboard-interactive vocabulary", () => {
    it("matches a link through its href, the empty href included", () => {
      // href="" still names a destination (the current document); a bare <a> is prose.
      expect(
        matchedIds(
          `<a id="link" href="/next"></a><a id="link-empty-href" href=""></a><a id="link-bare"></a>`,
        ),
      ).toEqual(["link", "link-empty-href"]);
    });

    it("matches an image-map area through its href", () => {
      // An area without href paints nothing clickable and keys nothing.
      expect(
        matchedIds(`<map><area id="area" href="/next" /><area id="area-bare" /></map>`),
      ).toEqual(["area"]);
    });

    it("matches the four native controls state-blind, disabled included", () => {
      // The deliberate over-match: a disabled control is one binding away from focusable,
      // so the pin fires the day the control appears, not the day it becomes enabled.
      expect(
        matchedIds(
          `<button id="button"></button><button id="button-disabled" disabled></button>` +
            `<input id="input" /><input id="input-disabled" disabled />` +
            `<select id="select"></select><textarea id="textarea"></textarea>`,
        ),
      ).toEqual(["button", "button-disabled", "input", "input-disabled", "select", "textarea"]);
    });

    it("matches the embedded contexts: iframe, embed, object", () => {
      // embed and object are focusable areas per the HTML Standard — the defect this pin guards.
      expect(
        matchedIds(
          `<iframe id="iframe"></iframe><embed id="embed" /><object id="object"></object>`,
        ),
      ).toEqual(["iframe", "embed", "object"]);
    });

    it("matches summary — inside details and alone — never details itself", () => {
      // summary carries the disclosure's whole keyboard contract; no engine seats
      // details itself in the tab order.
      expect(
        matchedIds(
          `<details id="details"><summary id="details-summary"></summary></details>` +
            `<summary id="loose-summary"></summary><details id="summaryless"></details>`,
        ),
      ).toEqual(["details-summary", "loose-summary"]);
    });

    it("matches audio and video only while they carry controls", () => {
      // Without the attribute the element renders no UI there is a key for.
      expect(
        matchedIds(
          `<audio id="audio-controls" controls></audio><video id="video-controls" controls></video>` +
            `<audio id="audio-bare"></audio><video id="video-bare"></video>`,
        ),
      ).toEqual(["audio-controls", "video-controls"]);
    });

    it("matches a tab stop at zero and positive, never minus one", () => {
      // tabindex="-1" is the opt-out of sequential focus — this repository's own
      // inertness mechanism for scroll containers (#438).
      expect(
        matchedIds(
          `<span id="tab-zero" tabindex="0"></span><span id="tab-positive" tabindex="3"></span>` +
            `<span id="tab-minus-one" tabindex="-1"></span>`,
        ),
      ).toEqual(["tab-zero", "tab-positive"]);
    });

    it("matches contenteditable in its editable spellings: valueless, empty, true, plaintext-only", () => {
      // The valueless form is the empty-string state by enumerated-attribute semantics.
      expect(
        matchedIds(
          `<div id="ce-valueless" contenteditable></div><div id="ce-empty" contenteditable=""></div>` +
            `<div id="ce-true" contenteditable="true"></div><div id="ce-plaintext" contenteditable="plaintext-only"></div>`,
        ),
      ).toEqual(["ce-valueless", "ce-empty", "ce-true", "ce-plaintext"]);
    });
  });

  describe("does not match what is not keyboard-interactive", () => {
    it("does not match structural and presentational elements", () => {
      // None is a focusable area; progress and meter render state without taking focus.
      expect(
        matchedIds(
          `<div id="div"></div><span id="span"></span><label id="label"></label>` +
            `<output id="output"></output><progress id="progress"></progress><meter id="meter"></meter>`,
        ),
      ).toEqual([]);
    });

    it("does not match an input hidden from rendering", () => {
      // input[type=hidden] renders nothing and is never focusable.
      expect(matchedIds(`<input id="hidden" type="hidden" />`)).toEqual([]);
    });

    it("does not match the explicit or unknown non-editable contenteditable states", () => {
      // false is the explicit non-editable declaration; unknown values inherit from
      // the nearest editable ancestor — neither is keyboard-editable standalone.
      expect(
        matchedIds(
          `<div id="ce-false" contenteditable="false"></div><div id="ce-unknown" contenteditable="yes"></div>`,
        ),
      ).toEqual([]);
    });

    it("does not match a draggable element", () => {
      // Dragging is a pointer interaction; the attribute grants no tab stop.
      expect(matchedIds(`<div id="draggable" draggable="true"></div>`)).toEqual([]);
    });
  });
});
