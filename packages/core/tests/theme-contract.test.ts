/**
 * Pin test for the token contract — the same doctrine as
 * a11y-contract.test.ts: the law's internal consistency is proven on every
 * run, not left to the gate that consumes it, because a register entry that
 * quietly stopped naming a real position would read as an honest record.
 *
 * What this pins is the LAW's shape (theme-contract.ts), not any component's
 * values — the tree is the gate's object (tools/check-token-allowlist.ts and
 * its own fixtures). What the gate cannot see about the register, though, is
 * the one thing that makes it a register at all: every exception must name a
 * file the gate actually scans (an exception outside the scan scope is dead
 * law — it could never fire), no position may be registered twice, and every
 * shape and reason must be stated. A value registered as an exception must
 * also not itself be a token reference — the gate passes those by shape, so
 * such an entry would be dead on arrival.
 *
 * Editing TOKEN_EXCEPTIONS is LAW-MAKING, not refactoring: each entry is a
 * literal a component carries, with the reason it stands. An edit lands as a
 * deliberate change with the reason written where the entry is edited — and
 * the gate's own necessity fixtures (check-token-allowlist.test.ts) prove
 * every entry fires by removing it over the real tree.
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { TOKEN_EXCEPTIONS, TOKEN_VALUE_SHAPES } from "../src/theme-contract";

const ROOT = join(import.meta.dirname, "..", "..", "..");

/**
 * The gate's scan scope, spelled the way its header states it: every `.vue`
 * under the four component tiers' `src/`, plus the templates. `docs/` and the
 * fixed packages are out of scope on purpose, so an exception pointing there
 * could never fire.
 */
const SCAN_SCOPE =
  /^(?:packages\/(?:primitives|composition|patterns|layouts)\/.+\/src\/.+\.vue|templates\/.+\.vue)$/;

describe("token contract", () => {
  it("declares the value shapes, each with its reason", () => {
    expect(TOKEN_VALUE_SHAPES.length).toBeGreaterThan(0);
    for (const shape of TOKEN_VALUE_SHAPES) {
      expect(shape.shape.length, "a shape must be stated").toBeGreaterThan(0);
      expect(
        shape.because.length,
        `the shape "${shape.shape}" must say why it is not a second home for a visual decision`,
      ).toBeGreaterThan(0);
    }
  });

  it("registers each exception against a file the gate scans", () => {
    expect(TOKEN_EXCEPTIONS.length).toBeGreaterThan(0);
    for (const exception of TOKEN_EXCEPTIONS) {
      expect(
        SCAN_SCOPE.test(exception.path),
        `${exception.path} is outside the gate's scan scope — the entry could never fire; delete it or fix the path`,
      ).toBe(true);
      expect(
        existsSync(join(ROOT, exception.path)),
        `${exception.path} does not exist in the tree — the entry is dead law`,
      ).toBe(true);
    }
  });

  it("registers no position twice", () => {
    const seen = new Set<string>();
    for (const exception of TOKEN_EXCEPTIONS) {
      const key = `${exception.path}|${exception.value}`;
      expect(seen.has(key), `TOKEN_EXCEPTIONS registers ${key} twice`).toBe(false);
      seen.add(key);
    }
  });

  it("registers literals, not token references — the gate passes those by shape", () => {
    for (const exception of TOKEN_EXCEPTIONS) {
      expect(
        exception.value.includes("var(--"),
        `${exception.path} registers "${exception.value}", which is already token-anchored — the entry is dead law`,
      ).toBe(false);
      expect(
        exception.value.length,
        "an exception must name the value it stands for",
      ).toBeGreaterThan(0);
      expect(
        exception.because.length,
        `${exception.path} "${exception.value}" must say why it stands rather than a token`,
      ).toBeGreaterThan(0);
    }
  });
});
