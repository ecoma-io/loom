// Loom is one public package, and this is what says so.
//
// The distributing surface of this repository is exactly `@ecoma-io/loom`,
// the root manifest. Everything under `packages/` exists to be imported
// through that facade from a single checkout, so each of those manifests
// must be un-publishable: a `"private": true` that refuses to let `pnpm
// publish` escape, and no `publishConfig` to smuggle publish metadata past
// it. A publishable-shaped manifest — the facade shape without the private
// flag — could be accidentally published, and #238 is that failure already
// shipped once: `packages/primitives/tree-view` was the only one of 106
// component manifests without `"private": true`, and nothing complained.
// Templates get this gate already (`check-template-artifacts.ts` asserts
// `private` for its own tree); component manifests had none. This is the
// gap A2 gate, and it is what flips the "One public package" contract row
// from PARTIALLY_ENFORCED to ENFORCED (see
// docs/architecture/interface-contract.md).
//
// The facade itself — `packages/loom/package.json` — is named
// `@ecoma-io/loom-facade` and is deliberately private too: it is the
// internal aggregator the repository actually imports against; nothing is
// published from it.
//
// The walk covers two shapes under `packages/`, matching how the workspace
// is actually laid out. One-level packages — the foundation packages
// (`core`, `labels`, `layout-engine`, `theme-core`) and the facade (`loom`)
// carry their manifest at `packages/<name>/package.json`. Two-level
// packages — the component tiers (`primitives`, `composition`, `patterns`,
// `layouts`) — carry theirs at `packages/<tier>/<name>/package.json`. A
// component is five artifacts deep — `src/`, `tests/`, a docs page — and
// none of those directory names read as a package, so there is nothing
// nested worth walking. A manifest that is not in this tree — the root one,
// a template, a fixture — is none of this gate's business.
//
// Run: `node tools/check-manifest-privacy.ts` — wired into `pnpm lint`,
// right after the component artifact gate it guards.
import { readdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Check that every two-level-deep package under `packages/` is private and
 * carries no publish metadata, returning one human-readable failure string
 * per offending manifest.
 *
 * `root` is the repository root. The manifest set is discovered from the
 * tree, never a list: a package added here is checked here, and one deleted
 * deletes its row by this edit rather than silence. `packages/loom` is
 * excluded by the shape of the walk — it is one level deep, and its
 * manifest lives at `packages/loom/package.json`, outside the two-level
 * pattern this gate walks.
 */
export function checkManifestPrivacy(root: string): string[] {
  const failures: string[] = [];
  const manifests = packageManifests(root);

  for (const manifestPath of manifests) {
    const pkg = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      private?: boolean;
      publishConfig?: unknown;
    };
    // The `private` field is the publish refusal. It must be the literal
    // boolean `true`, not a truthy string: only the boolean actually
    // blocks `npm publish`.
    if (pkg.private !== true) {
      failures.push(
        `${manifestPath.replace(root, ".")}: 'private' must be true — a package under packages/ is never published`,
      );
    }
    // A `publishConfig` overrides parts of the publish flow. On a private
    // manifest that is an outright inconsistency — the manifest refuses to
    // publish while carrying instructions for publishing it.
    if (pkg.publishConfig !== undefined) {
      failures.push(
        `${manifestPath.replace(root, ".")}: must not carry publishConfig — publish metadata belongs only on the root manifest`,
      );
    }
  }

  return failures;
}

/**
 * Every package manifest under `packages/` — both shapes.
 *
 * A one-level package (`packages/core/package.json`: the foundations and
 * the facade) has its manifest directly under `packages/`. A two-level
 * package (`packages/primitives/button/package.json`: a component under a
 * tier) has its manifest under a further directory. A directory without a
 * manifest (an empty `src/`, a stray fixture) is not something this gate
 * can judge — there is no manifest to make private, and there is nothing to
 * publish either. Both shapes are real workspace members in this
 * repository, so the walk covers both; the escape a one-level shape opens is
 * not theoretical (packages/loom itself is one-level).
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
      // No `package.json` of its own — walk one level deeper for a
      // component's (a tier directory holds components, not its own
      // manifest).
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
  const failures = checkManifestPrivacy(ROOT);
  if (failures.length) {
    for (const f of failures) console.error(f);
    console.error(
      `\n${String(failures.length)} manifest privacy violation(s). Fix before pushing.`,
    );
    process.exit(1);
  }
  console.log("component manifests are private; only the root package is publishable.");
}
