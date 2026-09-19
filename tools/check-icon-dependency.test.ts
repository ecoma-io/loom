// @vitest-environment node
//
// Node rather than the project-wide jsdom, because these tests exercise the
// icon dependency gate against fixture trees on the filesystem — the same
// reason the manifest privacy gate's tests opt out of jsdom.
//
// The gate is itself tested because a check that always passes is not a
// check. Each case builds the minimal `packages/` tree and root manifest
// needed to trip one rule — the shipped #379 shape (icons under
// `dependencies` on the root), a component declaring icons as a hard
// dependency, a facade without its peer contract, a drifted peer range —
// and asserts checkIconDependency() reports it. The fixtures also keep the
// rule honest the other way: a tree where every carrier declares the peer
// at the catalog range must report zero failures, so an over-eager rule
// fails loudly instead of blocking every component.
import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkIconDependency } from "./check-icon-dependency.ts";

const ICON = "@lucide/vue";
const CATALOG = "^1.40.0";

function makeRoot(): string {
  // The gate walks both shapes under `packages/`: a one-level package and a
  // two-level component, mirroring the real layout.
  const root = mkdtempSync(join(tmpdir(), "loom-icon-dep-"));
  for (const tier of ["primitives", "composition"]) {
    mkdirSync(join(root, "packages", tier, "button", "src"), { recursive: true });
  }
  mkdirSync(join(root, "packages", "loom", "src"), { recursive: true });
  return root;
}

function writeRootManifest(root: string, manifest: object): void {
  writeFileSync(join(root, "package.json"), JSON.stringify(manifest));
}

function writeManifest(root: string, rel: string, manifest: object): void {
  writeFileSync(join(root, "packages", rel, "package.json"), JSON.stringify(manifest));
}

/** The well-formed root facade: icons as a peer, workspace resolve as a dev. */
function rootManifest(): object {
  return {
    name: "@ecoma-io/loom",
    dependencies: {},
    devDependencies: { [ICON]: CATALOG },
    peerDependencies: { [ICON]: CATALOG },
  };
}

/** A component that uses icons correctly: peer-only, at the catalog range. */
function iconComponentManifest(): object {
  return { name: "@ecoma-io/loom-button", peerDependencies: { [ICON]: CATALOG } };
}

describe("checkIconDependency", () => {
  it("reports zero failures when every icon reference is a peer at the catalog range", () => {
    const root = makeRoot();
    try {
      writeRootManifest(root, rootManifest());
      writeManifest(root, "primitives/button", iconComponentManifest());
      writeManifest(root, "loom", { name: "@ecoma-io/loom-facade", private: true });
      expect(checkIconDependency(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags the shipped #379 shape: the root facade lists icons as a dependency", () => {
    const root = makeRoot();
    try {
      writeRootManifest(root, {
        ...rootManifest(),
        dependencies: { [ICON]: CATALOG },
      });
      const failures = checkIconDependency(root);
      expect(failures.some((f) => f.includes("#379") && f.startsWith(".:"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a component listing icons as a dependency — the alert/carousel shape", () => {
    const root = makeRoot();
    try {
      writeRootManifest(root, rootManifest());
      writeManifest(root, "primitives/button", {
        name: "@ecoma-io/loom-button",
        dependencies: { [ICON]: CATALOG },
      });
      const failures = checkIconDependency(root);
      expect(failures.some((f) => f.includes("must be a peerDependency"))).toBe(true);
      expect(failures.some((f) => f.includes("primitives/button"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a root facade that fails to declare icons as a peer", () => {
    const root = makeRoot();
    try {
      writeRootManifest(root, {
        name: "@ecoma-io/loom",
        dependencies: {},
        devDependencies: { [ICON]: CATALOG },
        peerDependencies: {},
      });
      const failures = checkIconDependency(root);
      expect(
        failures.some((f) => f.includes("must declare '@lucide/vue' as a peerDependency")),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a peer range that drifts from the root catalog", () => {
    const root = makeRoot();
    try {
      writeRootManifest(root, rootManifest());
      writeManifest(root, "primitives/button", {
        name: "@ecoma-io/loom-button",
        peerDependencies: { [ICON]: "^1.39.0" },
      });
      const failures = checkIconDependency(root);
      expect(failures.some((f) => f.includes("does not match the root catalog range"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a root dev range that diverges from its own peer range", () => {
    const root = makeRoot();
    try {
      writeRootManifest(root, {
        ...rootManifest(),
        devDependencies: { [ICON]: "^1.38.0" },
      });
      const failures = checkIconDependency(root);
      expect(failures.some((f) => f.includes("must match the peerDependencies range"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
