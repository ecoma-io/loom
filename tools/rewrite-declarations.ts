/**
 * Make the emitted declarations importable by a consumer.
 *
 * TypeScript emits each `.d.ts` preserving the *specifier* that source wrote —
 * `@ecoma-io/loom-core`, `@ecoma-io/loom-button`, … — because those are the
 * strings the compiler saw. Vite does the same job for JavaScript differently:
 * its `preserveModules` resolution rewrites the identical specifiers to
 * relative paths (`./packages/core/src/cn.js`). The result is a `dist/` whose
 * JS side is self-contained and whose declaration side has 88 import strings
 * that resolve only inside this repository — the internal packages are
 * private and never installed, so a consumer reading `dist/packages/loom/src/
 * index.d.ts` fails on the first name. A published `@ecoma-io/loom` with
 * unreadable types is a package whose API is invisible.
 *
 * The fix is to give the declarations the same treatment Vite already gave
 * the JS. Every bare `@ecoma-io/loom-<name>` reference is rewritten to the
 * relative path from the file that contains it to `dist/packages/<tier>/
 * <name>/src/index.d.ts` — the barrel, which re-exports the same surface
 * (components and their types) that the specifier stood for. Bare specifiers
 * that are not internal (`vue`, `reka-ui`) are left alone: they arrive as
 * peer/regular deps the consumer installs for themselves, exactly as with the
 * JS output.
 *
 * Run after `vue-tsc -p tsconfig.build.json`, as part of `pnpm build`.
 */
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

// The tool lives in `tools/`, so the repository root is its parent directory.
// `import.meta.dirname` is the directory of the file itself under any Node
// loading style — never the cwd, which is whichever directory the command
// happened to run from.
const ROOT = join(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const TIERS = ["primitives", "composition", "layouts", "blocks"] as const;
const FIXED: readonly [string, string][] = [
  // The regex extracts the suffix after `@ecoma-io/loom-`, so the key is the
  // bare name (`core`, `labels`), not the full specifier.
  ["core", "core"],
  ["labels", "labels"],
];
const SPEC_PREFIX = ["@ecoma-io", "loom-"].join("/");

/** Whether a name is an internal package and, if so, its dist sub-path. */
function distDirOf(name: string): string[] | null {
  const fixed = FIXED.find(([spec]) => spec === name);
  if (fixed) return [fixed[1]];
  for (const tier of TIERS) {
    const dir = join(DIST, "packages", tier, name, "src");
    try {
      readdirSync(dir);
      return [tier, name];
    } catch {
      // Not this tier; try the next.
    }
  }
  return null;
}

let rewritten = 0;
let checked = 0;

for (const entry of readdirSync(join(DIST, "packages"), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const srcDirs: string[] = [];
  if (TIERS.includes(entry.name as (typeof TIERS)[number])) {
    for (const sub of readdirSync(join(DIST, "packages", entry.name), {
      withFileTypes: true,
    })) {
      if (sub.isDirectory() && sub.name !== "node_modules") {
        srcDirs.push(join(DIST, "packages", entry.name, sub.name, "src"));
      }
    }
  } else if (entry.name === "core" || entry.name === "labels" || entry.name === "loom") {
    srcDirs.push(join(DIST, "packages", entry.name, "src"));
  }

  for (const srcDir of srcDirs) {
    for (const file of readdirSync(srcDir).filter((f) => f.endsWith(".d.ts"))) {
      const path = join(srcDir, file);
      const text = readFileSync(path, "utf8");
      const rewrittenText = text.replace(
        new RegExp(`from\\s+["']${SPEC_PREFIX}([a-z0-9-]+)["']`, "g"),
        (_match, name: string) => {
          const target = distDirOf(name);
          if (!target) return _match;
          const rel = relative(srcDir, join(DIST, "packages", ...target, "src", "index"))
            .split(sep)
            .join("/");
          return `from "${rel.startsWith(".") ? rel : `./${rel}`}"`;
        },
      );
      checked++;
      if (rewrittenText !== text) {
        writeFileSync(path, rewrittenText);
        dropSourceMap(path);
        rewritten++;
      }
    }
  }
}

/**
 * Delete the sourcemap beside a rewritten declaration. The map's `mappings`
 * were encoded for the *original* text; rewriting a specifier changes the
 * byte lengths on every line after the edit, so the map's offsets are stale
 * before we write the new file — a map that points at the wrong positions is
 * worse than no map. A rewritten declaration's map is dropped rather than
 * rewritten, because regenerating an accurate map from the new text is what
 * the compiler would have to do and it cannot be done by string surgery.
 */
function dropSourceMap(path: string): void {
  try {
    rmSync(`${path}.map`, { force: true });
  } catch {
    // No sourcemap — nothing to drop.
  }
}

if (rewritten) {
  console.log(
    `rewrite-declarations: rewrote ${String(rewritten)} of ${String(checked)} .d.ts files`,
  );
}
