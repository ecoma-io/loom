/**
 * The single registry of internal packages — the one the check uses instead
 * of the four hand-maintained lists (vite.config.ts aliases, tsconfig.json
 * paths, the facade's package.json dependencies, the moon projects glob)
 * that used to drift apart. The filesystem is the source of truth: a
 * component is internal iff its directory exists under `packages/<tier>/`,
 * and the four fixed packages are named here because they have no tier of
 * their own. Nothing is parsed from package.json — a component's specifier
 * is derived from its directory name, which is the same fact
 * tools/sync-moon-deps.ts uses to map package.json deps to moon projects.
 *
 * Dependency-free on purpose: this file runs under
 * `node --experimental-strip-types` from check-architecture.ts, so `node:fs`
 * is all it may import.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

/** Repo root; every path this file hands out is derived from it. */
export const ROOT = join(import.meta.dirname, "..", "..");

/** Component tiers in dependency order — later tiers may import earlier ones. */
export const TIERS = ["primitives", "composition", "layouts", "blocks"] as const;
export type Tier = (typeof TIERS)[number];

/** A layer key: a component tier, or one of the four fixed packages. */
export type Layer = Tier | "core" | "labels" | "loom" | "theme-core";

/** `button` → `@ecoma-io/loom-button`. Directory name == spec suffix, by construction. */
export function componentSpec(name: string): string {
  return `@ecoma-io/loom-${name}`;
}

/** `primitives` → absolute path of the tier directory under `root`. */
export function tierDir(root: string, tier: Tier): string {
  return join(root, "packages", tier);
}

/** `primitives` + `button` → absolute path of that component's package directory. */
export function componentDir(root: string, tier: Tier, name: string): string {
  return join(tierDir(root, tier), name);
}

export interface InternalPackage {
  /** Layer key: the tier for components, the package's own name for the fixed four. */
  tier: Layer;
  /** Directory name: the spec suffix for components, the fixed name otherwise. */
  name: string;
  /** The workspace specifier, e.g. `@ecoma-io/loom-button` or `@ecoma-io/loom`. */
  spec: string;
  /** Absolute package directory. */
  dir: string;
  /** Absolute src directory. */
  srcDir: string;
  /** theme-core ships CSS only — copied, never imported — so it stays out of the JS graph. */
  stylesOnly: boolean;
}

/**
 * The fixed four. The facade specifier is assembled, not written out, because
 * eslint's project-service parser trips over the bare at-ecoma-io-slash-loom
 * literal inside a string (the same quirk documented in check-architecture.ts).
 */
function fixedPackages(root: string): InternalPackage[] {
  const fixed = [
    { tier: "core", name: "core", spec: "@ecoma-io/loom-core", stylesOnly: false },
    { tier: "labels", name: "labels", spec: "@ecoma-io/loom-labels", stylesOnly: false },
    { tier: "theme-core", name: "theme-core", spec: "@ecoma-io/loom-theme-core", stylesOnly: true },
    { tier: "loom", name: "loom", spec: ["@ecoma-io", "loom"].join("/"), stylesOnly: false },
  ] as const;
  return fixed.map((pkg) => {
    const dir = join(root, "packages", pkg.name);
    return { ...pkg, dir, srcDir: join(dir, "src") };
  });
}

/** The components under one tier, enumerated from the filesystem. */
export function componentPackages(root: string, tier: Tier): InternalPackage[] {
  return readdirSync(tierDir(root, tier), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = componentDir(root, tier, entry.name);
      return {
        tier,
        name: entry.name,
        spec: componentSpec(entry.name),
        dir,
        srcDir: join(dir, "src"),
        stylesOnly: false,
      };
    });
}

/** Every internal package: the fixed four plus every filesystem-enumerated component. */
export function internalPackages(root = ROOT): InternalPackage[] {
  return [...fixedPackages(root), ...TIERS.flatMap((tier) => componentPackages(root, tier))];
}
