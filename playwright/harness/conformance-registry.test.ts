// The registry derivation's gate (Phase 4D, ecoma-io/loom#322): what the
// conformance route would load must equal what the tree holds.
//
// tools/check-composition-conformance.ts owns the file-set law — a
// composition without e2e/conformance.cases.ts fails there. The failure mode
// nothing else covers is the reverse: a cases file the HARNESS never picks
// up, because the glob literal in conformance.ts drifted, was narrowed, or
// was spelled differently from the pattern every check here reads. This file
// is parse-only over the route's source, like the repository's other gates —
// importing conformance.ts would mount a Vue application and demand a
// browser — and it holds three laws:
//
//   1. the route spells the registry's glob literal, eagerly, and nothing
//      else;
//   2. that pattern, expanded over the tree, reaches exactly the
//      compositions that own a cases module — no miss, no phantom;
//   3. the derivation and its refusals still refuse.
//
// Run by the tools vitest tier (vite.config.ts' include) and by the
// playwright project's own test task, so a harness edit re-runs it in CI.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

import {
  buildConformanceRegistry,
  caseOwnerOrThrow,
  CONFORMANCE_CASES_GLOB,
  moduleFromGlobKey,
} from "./conformance-registry";

// `import.meta.dirname`, not `import.meta.url`: under vitest's module runner
// the url is not a file: URL (the same reason tools/check-composition-conformance.test.ts
// resolves its real files through dirname).
const HARNESS_DIR = import.meta.dirname;
const ROOT = resolve(HARNESS_DIR, "../..");
const ROUTE_SOURCE = readFileSync(join(HARNESS_DIR, "conformance.ts"), "utf8");

/** The composition directories, from the tree — never a hand list. */
function compositionDirs(): string[] {
  return readdirSync(join(ROOT, "packages", "composition"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** The compositions that own a cases module, from the tree. */
function treeOwners(): string[] {
  return compositionDirs().filter((name) =>
    existsSync(join(ROOT, "packages", "composition", name, "e2e", "conformance.cases.ts")),
  );
}

/** The key the route's glob would carry for one composition name. */
function globKeyFor(name: string): string {
  // Rebuilt by slice, not `replace("*", …)`: the pattern carries exactly one
  // `*` (asserted by the single-star check in this file), the name is
  // substituted for it and nothing else, and `String.replace` on a plain
  // string is a CodeQL incomplete-sanitization finding before it is a
  // readability choice.
  const atStar = CONFORMANCE_CASES_GLOB.indexOf("*");
  return CONFORMANCE_CASES_GLOB.slice(0, atStar) + name + CONFORMANCE_CASES_GLOB.slice(atStar + 1);
}

describe("the route's glob literal", () => {
  test("spells the registry's pattern verbatim, eagerly", () => {
    // `import.meta.glob` takes only a literal, so the route spells the
    // pattern a second time beside the constant; the constant is what every
    // check below reads, and this is what keeps it honest about the route.
    const call = /import\.meta\.glob\(\s*"([^"]+)"\s*,\s*\{([^}]*)\}\s*\)/.exec(ROUTE_SOURCE);
    expect(call, "conformance.ts carries one import.meta.glob call").not.toBeNull();
    expect(call?.[1]).toBe(CONFORMANCE_CASES_GLOB);
    expect(call?.[2]).toContain("eager: true");
  });

  test("is a single-star, one-directory pattern — the model every other check expands", () => {
    // globKeyFor() models Vite's matching by replacing the one `*`; a `**`
    // or a second star would silently invalidate that model, so the shape
    // the model assumes is itself asserted here.
    expect(CONFORMANCE_CASES_GLOB.includes("**")).toBe(false);
    expect(CONFORMANCE_CASES_GLOB.split("*").length - 1).toBe(1);
  });
});

describe("the registry against the tree", () => {
  test("the glob reaches exactly the compositions that own a cases module", () => {
    const owners = treeOwners();
    expect(owners.length, "the tree holds cases modules to compare").toBeGreaterThan(0);
    // No miss: every owner's expanded path exists, so the route loads it.
    for (const name of owners) {
      expect(
        existsSync(join(HARNESS_DIR, globKeyFor(name))),
        `${name} owns a cases module the route's pattern must reach`,
      ).toBe(true);
    }
    // No phantom: every composition the pattern names that is NOT an owner
    // names a file that does not exist, so the route loads nothing for it —
    // scroll-reel is the deliberate instance (no cases module, an exception
    // row on the register instead).
    for (const name of compositionDirs()) {
      if (!owners.includes(name)) {
        expect(
          existsSync(join(HARNESS_DIR, globKeyFor(name))),
          `${name} owns no cases module, so the route's pattern must name no file for it`,
        ).toBe(false);
      }
    }
  });

  test("the derived module names are exactly the tree's owners", () => {
    const stubs: Record<string, unknown> = {};
    for (const name of treeOwners()) {
      stubs[globKeyFor(name)] = {
        cases: [{ name: `${name}-case`, props: {}, viewports: [360], children: [] }],
      };
    }
    const registry = buildConformanceRegistry(stubs);
    expect(Object.keys(registry.modules)).toEqual(treeOwners());
    // One case per stub module landed in the global name registry, owned by
    // the module whose key carried it.
    for (const name of treeOwners()) {
      expect(registry.caseOwners.get(`${name}-case`)).toBe(name);
    }
  });

  test("every tree key derives its composition name", () => {
    for (const name of treeOwners()) {
      expect(moduleFromGlobKey(globKeyFor(name))).toBe(name);
    }
    expect(() =>
      moduleFromGlobKey("../../packages/patterns/alert/e2e/conformance.cases.ts"),
    ).toThrow(/cannot name the composition/);
  });
});

describe("the refusals", () => {
  test("a case name declared by two modules is refused at build", () => {
    const call = (): unknown =>
      buildConformanceRegistry({
        [globKeyFor("stack")]: {
          cases: [{ name: "shared", props: {}, viewports: [360], children: [] }],
        },
        [globKeyFor("inline")]: {
          cases: [{ name: "shared", props: {}, viewports: [360], children: [] }],
        },
      });
    // The registry iterates in its sorted order, so the first declarer named
    // in the refusal is the alphabetically-first module — deterministic,
    // whatever order the glob happened to match in.
    expect(call).toThrow(
      /case "shared" is declared by both inline and stack — the comparator would compare the first section twice/,
    );
  });

  test("a matched module without a cases array is refused by name, not by TypeError", () => {
    const call = (): unknown => buildConformanceRegistry({ [globKeyFor("stack")]: {} });
    expect(call).toThrow(/conformance\.cases\.ts carries no cases array/);
  });

  test("a name no module declared is refused with the known set", () => {
    const registry = buildConformanceRegistry({
      [globKeyFor("stack")]: {
        cases: [{ name: "stack-case", props: {}, viewports: [360], children: [] }],
      },
    });
    expect(() => caseOwnerOrThrow(registry, "no-such-case")).toThrow(
      /no case named "no-such-case"\. Known: stack-case/,
    );
  });
});
