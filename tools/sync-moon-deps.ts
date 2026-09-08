/**
 * Sync Moon dependency edges with the pnpm workspace graph.
 *
 * Moon's affected selection follows its own `deps:` — and that graph was
 * empty except `loom -> everything`. pnpm's `package.json` workspace
 * dependencies (form-section -> fieldset, alert-dialog -> button, …) were not
 * mirrored into the projects' moon.yml, so a change to a component never
 * marked its genuine dependents affected. This tool closes that gap.
 *
 * The rule is intentionally simple so the architecture stays enforceable: for
 * every package under `packages/`, the Moon `deps:` of its project must be
 * exactly the set of `@ecoma-io/loom-*` workspace dependencies — `dependencies`
 * and `devDependencies` alike — declared in its package.json, minus the
 * package's own specifier (a package depending on itself is a pnpm workspaces
 * quirk, not a graph edge). DevDependencies count because a test-only import
 * is still an affected-closure edge: tags-input's tests import field through
 * `devDependencies`, and without the edge a field change would leave those
 * tests silently skippable. Each specifier maps to a Moon project id by
 * stripping the `@ecoma-io/loom-` prefix — which is valid because every
 * package's directory name matches its project id. The facade is the one
 * apparent exception: its project id is `loom` while its package name is
 * `@ecoma-io/loom-facade`, but nothing depends on the facade (it is the
 * private aggregator), so no edge ever has to be written to it.
 *
 * Run `node tools/sync-moon-deps.ts` to rewrite the moon.yml files in place;
 * run it with `--check` to exit non-zero on drift (wired into `pnpm lint` via
 * tools/check-architecture.ts).
 *
 * A package may declare extra edges that are not package.json dependencies —
 * e.g. a representative component that owns theme-sensitive evidence and must
 * therefore become affected when the tokens change. Those are hand-declared in
 * the package's own `moon.yml` — a tier child's or a fixed top-level package's
 * alike — under a `deps` block prefixed with the `# preserved` marker; this
 * tool keeps them.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

interface PackageInfo {
  dir: string;
  relDir: string;
  spec: string;
  selfId: string;
  deps: string[]; // cross-package Moon project ids from package.json
}

function readPackage(dir: string, relDir: string): PackageInfo | null {
  const pkgJsonPath = join(dir, "package.json");
  let pkgJson: Record<string, unknown>;
  try {
    pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as Record<string, unknown>;
  } catch {
    // The walk covers this workspace's package directories; a manifest that
    // does not parse is not one of them, and a directory with no readable
    // manifest must not become a derived edge.
    return null;
  }
  const spec = pkgJson.name as string;
  // Same on names: anything outside the `@ecoma-io/loom-` scope is not a
  // package this workspace graph reasons about, so it is skipped rather than
  // handed to moon as a would-be project id.
  if (!spec.startsWith("@ecoma-io/loom-")) return null;
  const selfId = spec.slice("@ecoma-io/loom-".length);
  // Both dependency blocks derive edges, under the same workspace filter
  // below: a test-only import is still an affected-closure edge, so a
  // devDependency on a sibling must mark this package affected too.
  const depSpecs = {
    ...((pkgJson.dependencies ?? {}) as Record<string, string>),
    ...((pkgJson.devDependencies ?? {}) as Record<string, string>),
  };
  const deps = Object.keys(depSpecs)
    .filter((d) => d.startsWith("@ecoma-io/loom-"))
    .map((d) => d.slice("@ecoma-io/loom-".length))
    .filter((id) => id !== selfId);
  return { dir, relDir, spec, selfId, deps };
}

/** Every Loom package: a `packages/` directory that is one, plus each child of one that is a tier. */
function loadPackages(): PackageInfo[] {
  const packages: PackageInfo[] = [];
  for (const entry of readdirSync(join(ROOT, "packages"), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const top = join(ROOT, "packages", entry.name);
    // Two shapes live under packages/: a fixed package that is the whole
    // directory (core, labels, layout-engine, theme-core, loom) and a tier of
    // component packages, one per child directory. The scope is structural —
    // a directory carrying a package.json is a package — so a package added
    // outside the four tier names is still derived, not silently hand-held.
    if (existsSync(join(top, "package.json"))) {
      const pkg = readPackage(top, `packages/${entry.name}`);
      if (pkg) packages.push(pkg);
      continue;
    }
    for (const name of readdirSync(top)) {
      const pkg = readPackage(join(top, name), `packages/${entry.name}/${name}`);
      if (pkg) packages.push(pkg);
    }
  }
  return packages;
}

/** A `# preserved` comment directly above a dep entry marks it hand-declared. */
const PRESERVED_MARKER = "# preserved";

interface MoonDeps {
  /** Deps derived from package.json workspace edges (regenerated each run). */
  generated: string[];
  /** Deps hand-declared under a `# preserved` comment (kept verbatim). */
  preserved: string[];
}

/** The moon.yml `deps:` list, split into generated and preserved. */
function readMoonDeps(moonPath: string): MoonDeps {
  const out: MoonDeps = { generated: [], preserved: [] };
  try {
    const lines = readFileSync(moonPath, "utf8").split("\n");
    let inDeps = false;
    let preserveNext = false;
    for (const line of lines) {
      if (!inDeps && /^deps:$/.test(line)) {
        inDeps = true;
        continue;
      }
      if (inDeps) {
        if (line.trim().startsWith(PRESERVED_MARKER)) {
          preserveNext = true;
          continue;
        }
        if (line.startsWith("  - ")) {
          const v = line.replace(/^ {2}- "?/, "").replace(/"?\s*$/, "");
          if (v) {
            if (preserveNext) {
              out.preserved.push(v);
            } else {
              out.generated.push(v);
            }
          }
          preserveNext = false;
          continue;
        }
        break; // end of the deps block
      }
    }
  } catch {
    // fall through to empty
  }
  return out;
}

/** True when the file already declares exactly these generated deps. */
function hasSameDeps(moonPath: string, deps: string[]): boolean {
  const a = [...readMoonDeps(moonPath).generated].sort();
  const b = [...deps].sort();
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function writeDeps(moonPath: string, deps: string[], preserved: string[]): void {
  const text = readFileSync(moonPath, "utf8");
  // A preserved edge that is also a package.json workspace dep would be written
  // twice — once generated, once preserved — and the duplicate would hide from
  // `--check`, which compares only the generated set (moon's
  // `syncProjectWorkspaceDependencies` can also write the preserved edge back
  // into package.json, which is exactly how the overlap appears). The
  // package.json side is the single source of truth for edges it can express,
  // so the preserved copy of an overlapped dep is dropped rather than kept.
  const overlapped = new Set(deps);
  const dedupedPreserved = preserved.filter((d) => !overlapped.has(d));
  const preservedBlock = dedupedPreserved.length
    ? dedupedPreserved.map((d) => `  ${PRESERVED_MARKER}\n  - "${d}"`).join("\n") + "\n"
    : "";
  const generatedBlock = deps.length ? deps.map((d) => `  - "${d}"`).join("\n") + "\n" : "";
  const depsBlock =
    deps.length || preserved.length ? `deps:\n${generatedBlock}${preservedBlock}` : "";
  if (/^deps:$/m.test(text)) {
    // Replace an existing deps block (its own lines) but keep the keys after
    // it. A preserved line may carry trailing prose (`# preserved — why this
    // edge exists`), which is a legal form of the marker, so the marker arm
    // consumes the whole line: matching the bare marker would stop mid-line
    // and orphan the prose — invalid YAML — above the rewritten block.
    const withoutDeps = text.replace(/^deps:\n(?:^ {2}- .*\n?|^ {2}# preserved[^\n]*\n?)+/m, "");
    writeFileSync(
      moonPath,
      withoutDeps.replace(/(?=^tags:|^project:|^tasks:|^inheritedBy:)/m, depsBlock),
    );
  } else {
    writeFileSync(moonPath, text.replace(/(?=^tags:|^project:|^tasks:|^inheritedBy:)/m, depsBlock));
  }
}

function main(): void {
  const check = process.argv.includes("--check");
  const packages = loadPackages();
  let failures = 0;

  for (const pkg of packages) {
    const moonPath = join(pkg.dir, "moon.yml");
    const deps = [...new Set(pkg.deps)];
    const { preserved } = readMoonDeps(moonPath);
    if (hasSameDeps(moonPath, deps)) continue;

    if (check) {
      console.error(`moon deps drift: ${pkg.relDir} — expected [${deps.join(", ")}]`);
      failures++;
    } else {
      writeDeps(moonPath, deps, preserved);
      console.log(`synced ${pkg.relDir} -> [${deps.join(", ")}]`);
    }
  }

  if (check) {
    if (failures) {
      console.error(
        `\n${String(failures)} project(s) out of sync. Run \`node tools/sync-moon-deps.ts\` to fix.`,
      );
      process.exit(1);
    }
    console.log("moon deps are in sync with the pnpm workspace graph.");
  }
}

main();
