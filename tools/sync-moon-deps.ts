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
 * exactly the set of `@ecoma-io/loom-*` workspace dependencies declared in its
 * package.json, minus the package's own specifier (a package depending on
 * itself is a pnpm workspaces quirk, not a graph edge). Each specifier maps to
 * a Moon project id by stripping the `@ecoma-io/loom-` prefix — which is valid
 * because every component package's directory name matches its project id.
 *
 * Run `node tools/sync-moon-deps.ts` to rewrite the moon.yml files in place;
 * run it with `--check` to exit non-zero on drift (wired into `pnpm lint` via
 * tools/check-architecture.ts).
 *
 * A package may declare extra edges that are not package.json dependencies —
 * e.g. a representative component that owns theme-sensitive evidence and must
 * therefore become affected when the tokens change. Those are hand-declared
 * in `packages/<tier>/<name>/moon.yml` under a `deps` block prefixed with the
 * `# preserved` marker; this tool keeps them.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const TIERS = ["primitives", "composition", "blocks", "layouts"];

interface PackageInfo {
  dir: string;
  relDir: string;
  spec: string;
  selfId: string;
  deps: string[]; // cross-package Moon project ids from package.json
}

function loadPackages(): PackageInfo[] {
  const packages: PackageInfo[] = [];
  for (const tier of TIERS) {
    for (const name of readdirSync(join(ROOT, "packages", tier))) {
      const dir = join(ROOT, "packages", tier, name);
      const pkgJsonPath = join(dir, "package.json");
      let pkgJson: Record<string, unknown>;
      try {
        pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as Record<string, unknown>;
      } catch {
        continue; // not a package directory
      }
      const spec = pkgJson.name as string;
      if (!spec.startsWith("@ecoma-io/loom-")) continue;
      const selfId = spec.slice("@ecoma-io/loom-".length);
      const depSpecs = (pkgJson.dependencies ?? {}) as Record<string, string>;
      const deps = Object.keys(depSpecs)
        .filter((d) => d.startsWith("@ecoma-io/loom-"))
        .map((d) => d.slice("@ecoma-io/loom-".length))
        .filter((id) => id !== selfId);
      packages.push({ dir, relDir: `packages/${tier}/${name}`, spec, selfId, deps });
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
    // Replace an existing deps block (its own lines) but keep the keys after it.
    const withoutDeps = text.replace(/^deps:\n(?:^ {2}- .*\n?|^ {2}# preserved\n?)+/m, "");
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
