// Loom's icons are a peer, never a hard dependency, and this is what says so.
//
// `@lucide/vue` is the icon surface of every component that renders one. It
// is a consumer-provided library — the application chooses the icon set and
// must own the version — so the repository's internal convention (carried by
// core, accordion, checkbox, chip, calendar, error-summary, sidebar-nav) is a
// `peerDependencies` declaration, and #379 is the failure that convention
// guards: the published `0.6.0` of the root facade shipped `@lucide/vue` as
// a regular `dependencies` entry, giving every consumer a hard copy of the
// icon library they must already provide.
//
// The rules:
// - No manifest anywhere — root or package — may list `@lucide/vue` under
//   `dependencies`; the shipped #379 shape is verboten, for the root facade
//   most of all.
// - The root manifest (the published `@ecoma-io/loom`) must declare it as a
//   peer: the published artifact is re-exporting icon-bearing components, so
//   consumers must provide the library. The root may additionally list it in
//   `devDependencies` — that is the workspace's own resolution of the peer,
//   the same role `vue` plays — and when it does, the dev range must match
//   the peer range so the workspace builds against what consumers get.
// - Any package under `packages/` that references `@lucide/vue` at all must
//   declare it as a peer, and every peer range must equal the root catalog's
//   range: the version is single-sourced, so a bump updates every carrier in
//   one place instead of drifting per package.
//
// Run: `node tools/check-icon-dependency.ts` — wired into `pnpm lint`, next
// to the manifest privacy gate it complements.
import { readdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ICON = "@lucide/vue";

/**
 * Check the `@lucide/vue` declaration contract across every manifest — the
 * root facade's and all packages under `packages/` — returning one
 * human-readable failure string per violation.
 *
 * `root` is the repository root. The package set is discovered from the
 * tree, never a list, using the same two shapes as the manifest privacy
 * gate: one-level packages (`packages/core/package.json`) and two-level
 * components (`packages/primitives/button/package.json`). A manifest that
 * does not reference the icon library is checked only for the forbidden
 * hard-dependency shape; the root manifest gets the full facade contract.
 */
export function checkIconDependency(root: string): string[] {
  const ROOT_PACKAGE = join(root, "package.json");
  const failures: string[] = [];
  const manifests: string[] = [ROOT_PACKAGE, ...packageManifests(root)];

  const rootPkg = JSON.parse(readFileSync(ROOT_PACKAGE, "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  const catalogRange = rootPkg.peerDependencies?.[ICON];

  for (const manifestPath of manifests) {
    // The root manifest is the published facade, designated explicitly — a
    // path `replace(root, ".")` would render it `./package.json` and orphan
    // every root-only rule to silence.
    const isRoot = manifestPath === ROOT_PACKAGE;
    const rel = isRoot ? "." : manifestPath.replace(root, ".");
    const pkg = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };

    if (pkg.dependencies?.[ICON] !== undefined) {
      failures.push(
        `${rel}: '${ICON}' must be a peerDependency, not a dependency — the icon library is consumer-provided (#379)`,
      );
    }

    if (isRoot) {
      // The published facade. Its consumers already provide the icon
      // library, so the manifest must say so — the #379 defect was exactly
      // this declaration being a hard dependency instead.
      if (catalogRange === undefined) {
        failures.push(
          `${rel}: the root facade must declare '${ICON}' as a peerDependency — consumers provide the icon library (#379)`,
        );
      }
      // The workspace's own resolution of its own peer must match the peer
      // range; otherwise the workspace builds against a different icon
      // library than consumers receive.
      const devRange = pkg.devDependencies?.[ICON];
      if (catalogRange !== undefined && devRange !== undefined && devRange !== catalogRange) {
        failures.push(
          `${rel}: devDependencies '${ICON}' ${devRange} must match the peerDependencies range ${catalogRange} — one version per workspace`,
        );
      }
    } else if (
      (pkg.peerDependencies?.[ICON] ?? pkg.devDependencies?.[ICON] ?? pkg.dependencies?.[ICON]) !==
        undefined &&
      pkg.peerDependencies?.[ICON] === undefined
    ) {
      // A component that uses icons at any level of the dependency graph
      // must hold its consumers to provide the library.
      failures.push(`${rel}: a package referencing '${ICON}' must declare it as a peerDependency`);
    }

    const peerRange = pkg.peerDependencies?.[ICON];
    if (catalogRange !== undefined && peerRange !== undefined && peerRange !== catalogRange) {
      failures.push(
        `${rel}: peerDependencies '${ICON}' ${peerRange} does not match the root catalog range ${catalogRange} — a bump updates every carrier in one place`,
      );
    }
  }

  return failures;
}

/**
 * Every package manifest under `packages/` — both shapes.
 *
 * One-level packages (the foundations, the facade) carry their manifest at
 * `packages/<name>/package.json`; two-level packages (a component under a
 * tier) at `packages/<tier>/<name>/package.json`. A directory without a
 * manifest declares nothing, so it is none of this gate's business.
 */
function packageManifests(root: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(join(root, "packages"), { withFileTypes: true }).filter((entry) =>
    entry.isDirectory(),
  );

  for (const entry of entries) {
    const dir = join(root, "packages", entry.name);
    const ownManifest = join(dir, "package.json");
    try {
      readFileSync(ownManifest);
      results.push(ownManifest);
    } catch {
      // No manifest of its own — walk one level deeper for the tier's
      // components.
      for (const child of readdirSync(dir, { withFileTypes: true }).filter((c) =>
        c.isDirectory(),
      )) {
        const manifest = join(dir, child.name, "package.json");
        try {
          readFileSync(manifest);
        } catch {
          continue;
        }
        results.push(manifest);
      }
    }
  }

  return results;
}

// CLI entry — run against the real repository and exit non-zero on
// violations.
if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  const ROOT = join(import.meta.dirname, "..");
  const failures = checkIconDependency(ROOT);
  if (failures.length) {
    for (const f of failures) console.error(f);
    console.error(`\n${String(failures.length)} icon dependency violation(s). Fix before pushing.`);
    process.exit(1);
  }
  console.log(
    "@lucide/vue is a peerDependency everywhere; the root facade's catalog is single-sourced.",
  );
}
