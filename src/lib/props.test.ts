import { describe, expect, it } from "vitest";
import { optional } from "./props";

describe("optional", () => {
  it("omits the keys whose value is undefined", () => {
    expect(optional({ a: 1, b: undefined, c: "x" })).toEqual({ a: 1, c: "x" });
  });

  it("omits the key rather than setting it to undefined", () => {
    // The distinction this whole helper exists for: `{ open: undefined }` and
    // `{}` are the same to `toEqual`, so the assertion has to be on the key.
    expect(Object.keys(optional({ open: undefined }))).toEqual([]);
  });

  it("keeps false, zero and the empty string, which are values and not absences", () => {
    expect(optional({ a: false, b: 0, c: "" })).toEqual({ a: false, b: 0, c: "" });
  });

  it("keeps null, which a host chose to pass", () => {
    expect(optional({ a: null })).toEqual({ a: null });
  });

  it("returns an object that shares no reference with its input", () => {
    const input = { a: 1 };
    expect(optional(input)).not.toBe(input);
  });
});
