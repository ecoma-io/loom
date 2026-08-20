// @vitest-environment node
//
// Node rather than the project-wide jsdom, because these tests exercise the
// architecture checker against fixture trees on the filesystem — the same
// reason docs/.vitepress/sidebar.test.ts opts out of jsdom.
//
// The architecture checker is itself tested because a check that always
// passes is not a check. Each case builds a minimal `packages/` fixture with
// exactly the shape needed to trip one rule — an upward edge, a facade
// import, a cycle, a missing moon.yml, an undeclared dependency — and asserts
// that runChecks() reports it. The fixtures are also how the rules are kept
// honest in the other direction: a valid tree that satisfies every rule must
// report zero violations, so a future over-eager rule fails loudly rather
// than quietly blocking every component.
import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runChecks } from "./check-architecture.ts";

/** A minimal but valid package tree: a primitive that imports only core. */
function writeFixture(root: string): void {
  const buttonDir = join(root, "packages", "primitives", "button");
  const coreDir = join(root, "packages", "core");
  // Every tier directory must exist so internalPackages() can enumerate them;
  // the fixed packages (core, labels, theme-core, loom) also live under packages/.
  for (const tier of ["primitives", "composition", "layouts", "blocks"]) {
    mkdirSync(join(root, "packages", tier), { recursive: true });
  }
  for (const fixed of ["core", "labels", "theme-core", "loom"]) {
    mkdirSync(join(root, "packages", fixed, "src"), { recursive: true });
  }
  mkdirSync(join(buttonDir, "src"), { recursive: true });

  writeFileSync(
    join(buttonDir, "package.json"),
    JSON.stringify({
      name: "@ecoma-io/loom-button",
      exports: {},
      dependencies: { "@ecoma-io/loom-core": "workspace:*" },
    }),
  );
  writeFileSync(join(buttonDir, "moon.yml"), "project:\n  name: button\n");
  writeFileSync(
    join(buttonDir, "src", "Button.vue"),
    'import { cn } from "@ecoma-io/loom-core";\n',
  );
  writeFileSync(
    join(coreDir, "package.json"),
    JSON.stringify({ name: "@ecoma-io/loom-core", exports: {} }),
  );
  writeFileSync(join(coreDir, "src", "cn.ts"), "export const cn = () => '';\n");
  writeFileSync(join(root, "packages", "labels", "src", "index.ts"), "");
  writeFileSync(join(root, "packages", "loom", "src", "index.ts"), "");
}

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "loom-arch-"));
  writeFixture(root);
  return root;
}

describe("runChecks", () => {
  it("reports zero violations for a tree that satisfies every rule", () => {
    const root = makeRoot();
    try {
      expect(runChecks(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags an upward edge: a primitive importing a block", () => {
    const root = makeRoot();
    try {
      mkdirSync(join(root, "packages", "blocks", "app-header", "src"), { recursive: true });
      writeFileSync(
        join(root, "packages", "blocks", "app-header", "package.json"),
        JSON.stringify({ name: "@ecoma-io/loom-app-header", exports: {} }),
      );
      writeFileSync(join(root, "packages", "blocks", "app-header", "src", "AppHeader.vue"), "");
      // button now imports app-header — an upward edge.
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'import AppHeader from "@ecoma-io/loom-app-header";\n',
      );
      writeFileSync(
        join(root, "packages", "primitives", "button", "package.json"),
        JSON.stringify({
          name: "@ecoma-io/loom-button",
          exports: {},
          dependencies: { "@ecoma-io/loom-app-header": "workspace:*" },
        }),
      );

      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("above"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags an import of the public facade from an internal package", () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'import { Button } from "@ecoma-io/loom";\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("public facade"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a facade *subpath* import — @ecoma-io/loom/theme is still the facade", () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'import { useTheme } from "@ecoma-io/loom/theme";\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("public facade"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a backtick template-literal dynamic import", () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        "const m = await import(`@ecoma-io/loom-button`);\n",
      );
      writeFileSync(
        join(root, "packages", "primitives", "button", "package.json"),
        JSON.stringify({
          name: "@ecoma-io/loom-button",
          exports: {},
          dependencies: { "@ecoma-io/loom-button": "workspace:*" },
        }),
      );
      const failures = runChecks(root);
      // A self-import is a known internal package — no "unknown" failure — and
      // a backtick specifier must still be counted as an edge, surfacing as a
      // cycle or no violation? A self-import creates a self-cycle.
      expect(failures.some((f) => f.startsWith("cycle:") || f.includes("facade"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a dependency cycle between two primitives", () => {
    const root = makeRoot();
    try {
      mkdirSync(join(root, "packages", "primitives", "chip", "src"), { recursive: true });
      writeFileSync(
        join(root, "packages", "primitives", "chip", "package.json"),
        JSON.stringify({
          name: "@ecoma-io/loom-chip",
          exports: {},
          dependencies: { "@ecoma-io/loom-button": "workspace:*" },
        }),
      );
      writeFileSync(
        join(root, "packages", "primitives", "chip", "src", "Chip.vue"),
        'import Button from "@ecoma-io/loom-button";\n',
      );
      // button → chip AND chip → button: a two-node cycle.
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'import Chip from "@ecoma-io/loom-chip";\n',
      );
      writeFileSync(
        join(root, "packages", "primitives", "button", "package.json"),
        JSON.stringify({
          name: "@ecoma-io/loom-button",
          exports: {},
          dependencies: { "@ecoma-io/loom-chip": "workspace:*" },
        }),
      );

      const failures = runChecks(root);
      expect(failures.some((f) => f.startsWith("cycle:"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags an import of an undeclared internal dependency", () => {
    const root = makeRoot();
    try {
      mkdirSync(join(root, "packages", "primitives", "chip", "src"), { recursive: true });
      writeFileSync(
        join(root, "packages", "primitives", "chip", "package.json"),
        JSON.stringify({ name: "@ecoma-io/loom-chip", exports: {} }),
      );
      writeFileSync(
        join(root, "packages", "primitives", "chip", "src", "Chip.vue"),
        'import Button from "@ecoma-io/loom-button";\n',
      );
      // button does not declare chip, so the edge is not mirrored into moon.
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("does not declare"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a component directory that is missing its moon.yml", () => {
    const root = makeRoot();
    try {
      mkdirSync(join(root, "packages", "primitives", "orphan", "src"), { recursive: true });
      writeFileSync(
        join(root, "packages", "primitives", "orphan", "package.json"),
        JSON.stringify({ name: "@ecoma-io/loom-orphan", exports: {} }),
      );
      writeFileSync(join(root, "packages", "primitives", "orphan", "src", "Orphan.vue"), "");
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("missing moon.yml"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
