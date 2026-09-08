// @vitest-environment node
//
// Node rather than the project-wide jsdom, because these tests exercise the
// manifest privacy gate against fixture trees on the filesystem — the same
// reason docs/.vitepress/sidebar.test.ts opts out of jsdom.
//
// The privacy gate is itself tested because a check that always passes is
// not a check. Each case builds a minimal `packages/` tree with exactly the
// shape needed to trip one rule — a manifest with no `private`, a manifest
// carrying `publishConfig` — and asserts that checkManifestPrivacy()
// reports it. The fixtures are also how the rule is kept honest in the
// other direction: a tree where every package except the public facade is
// private must report zero failures, so a future over-eager rule fails
// loudly rather than quietly blocking every component.
import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkManifestPrivacy } from "./check-manifest-privacy.ts";

/** A minimal but valid package tree: a private primitive and the public facade. */
function writeFixture(root: string): void {
  // The gate walks two levels under `packages/` (a tier, then a component);
  // the facade `packages/loom` lives one level deep and is outside it, so
  // the fixture's public package must be the single-level `packages/loom`.
  for (const tier of ["primitives", "composition"]) {
    mkdirSync(join(root, "packages", tier), { recursive: true });
  }
  mkdirSync(join(root, "packages", "loom", "src"), { recursive: true });
  mkdirSync(join(root, "packages", "primitives", "button", "src"), { recursive: true });

  writeFileSync(
    join(root, "packages", "primitives", "button", "src", "Button.vue"),
    'import { cn } from "@ecoma-io/loom-core";\n',
  );
  writeFileSync(
    join(root, "packages", "loom", "src", "index.ts"),
    'export { default as Button } from "@ecoma-io/loom-button";\n',
  );
}

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "loom-privacy-"));
  writeFixture(root);
  return root;
}

function writeManifest(root: string, rel: string, manifest: object): void {
  writeFileSync(join(root, "packages", rel, "package.json"), JSON.stringify(manifest));
}

/** The private manifest a well-formed component carries. */
function privateManifest(): object {
  return { name: "@ecoma-io/loom-button", private: true };
}

describe("checkManifestPrivacy", () => {
  it("reports zero failures for a tree where every package private except the public facade", () => {
    const root = makeRoot();
    try {
      writeManifest(root, "primitives/button", privateManifest());
      // The facade `packages/loom` is the public (non-private) package; the
      // gate must not flag it.
      writeManifest(root, "loom", { name: "@ecoma-io/loom-facade" });
      expect(checkManifestPrivacy(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a component manifest with no private field", () => {
    const root = makeRoot();
    try {
      writeManifest(root, "loom", { name: "@ecoma-io/loom-facade" });
      // button lacks `private` — the exact #238 shape (tree-view).
      writeManifest(root, "primitives/button", { name: "@ecoma-io/loom-button" });
      const failures = checkManifestPrivacy(root);
      expect(failures.some((f) => f.includes("'private' must be true"))).toBe(true);
      expect(failures.some((f) => f.includes("primitives/button"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a component manifest carrying publishConfig", () => {
    const root = makeRoot();
    try {
      writeManifest(root, "loom", { name: "@ecoma-io/loom-facade" });
      writeManifest(root, "primitives/button", {
        ...privateManifest(),
        publishConfig: { access: "restricted" },
      });
      const failures = checkManifestPrivacy(root);
      expect(failures.some((f) => f.includes("publishConfig"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
