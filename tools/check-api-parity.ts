// The public surface of the facade is agreed in three places and watched from
// a fourth, and they drifted silently until this checker existed:
//
//  1. the root manifest's `exports` map assigns each consumer-facing subpath
//     (`./a11y`, `./theme`, `./styles/*.css`) a built file;
//  2. the library build's `vite.config.ts` `build.lib.entry` declares which
//     `.ts` files those JS units are bundled from;
//  3. the declaration files the build emits in `packages/loom/src/` are the
//     type side of the same surface;
//  4. the documentation site's markdown imports and appeals to each subpath —
//     a subpath nothing documents is a defect, and one documented but absent
//     from `exports` is a broken link for every consumer.
//
// contract.md:138-141 already names a subpath documented anywhere in docs/
// but absent from `exports` a contract defect, and the reverse ("an exports
// entry nothing documents") equally suspicious. The checker asserts the two
// conditions the prose leaves to review (an exports entry reaches a built JS
// unit and a declaration, and every built unit is exported), and holds the
// docs to the whole set. It is M12: the deterministic gate behind "Public API
// deliberateness" in the interface contract.
//
// The JS surface is normalised onto one unit set: the bare `@ecoma-io/loom`
// entry builds from `index.ts`, and each `./<name>` subpath builds from
// `<name>.ts`. So "index" is a member of the set alongside "a11y" and "theme",
// and the exports map must carry `.` if and only if the build carries an
// `index` entry.
//
// Run as part of `pnpm lint` and in CI.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Every parity violation the checker found, one human-readable string each. */
export function runChecks(root: string): string[] {
  const failures: string[] = [];

  function fail(message: string): void {
    failures.push(message);
  }

  const exportsMap = readRootExports(root);
  const surface = exportsSurface(exportsMap);
  const libEntries = viteEntryKeys(root);
  const declarations = declarationStems(root);
  const styles = styleExports(exportsMap);
  const documented = documentedSubpaths(root);

  // JS-side parity: the exports surface (`.` plus every JS subpath), the vite
  // build entries, and the emitted declarations must be one set. A drift
  // either way is a defect: an entry that builds nothing is a broken import
  // for consumers, an analysed entry nobody can reach is dead surface.
  for (const name of sortedSurface(surface)) {
    if (!libEntries.includes(name)) {
      fail(`${surfaceLabel(name)} is exported but the vite build has no entry named "${name}"`);
    }
    if (!declarations.includes(name)) {
      fail(`${surfaceLabel(name)} is exported but packages/loom/src has no ${name}.ts declaration`);
    }
  }
  for (const name of libEntries) {
    if (!surface.has(name)) {
      fail(
        `vite build entry "${name}" is not exported — no ${surfaceLabel(name)} in the root exports map`,
      );
    }
    if (!declarations.includes(name)) {
      fail(`vite build entry "${name}" has no declaration file in packages/loom/src`);
    }
  }
  for (const name of declarations) {
    if (!surface.has(name)) {
      fail(
        `packages/loom/src/${name}.ts is not exported — no ${surfaceLabel(name)} in the root exports map`,
      );
    }
    if (!libEntries.includes(name)) {
      fail(
        `packages/loom/src/${name}.ts is never built — the vite config has no entry named "${name}"`,
      );
    }
  }

  // The stylesheet half of the same contract. The styles are copied, not
  // bundled — vite.config.ts copies `packages/theme-core/src` verbatim — so
  // the exports entry must point at a stylesheet that actually exists in the
  // source directory the build ships.
  const styleNames = new Set(styles.map((state) => state.name));
  for (const state of styles) {
    if (!existsSync(join(root, "packages", "theme-core", "src", `${state.name}.css`))) {
      fail(
        `exports map carries ./styles/${state.name}.css but packages/theme-core/src has no ${state.name}.css`,
      );
    }
  }

  // The documentation side of the contract. A subpath documented anywhere in
  // docs/ but absent from exports is a broken link for every reader who tries
  // it; an exports entry nothing documents is surface that appeared without
  // the deliberate-narrowing discussion in contract.md#the-public-api.
  for (const reference of documented) {
    if (reference.startsWith("styles/")) {
      // `@ecoma-io/loom/styles/*.css` (contract.md's own table) is a
      // reader-facing wildcard over the whole stylesheet family.
      if (reference.includes("*")) {
        if (styles.length === 0) {
          fail(
            `docs/ mention @ecoma-io/loom/${reference} but the exports map lists no ./styles/*.css`,
          );
        }
        continue;
      }
      const name = reference.slice("styles/".length, -".css".length);
      if (!styleNames.has(name)) {
        fail(
          `docs/ mention @ecoma-io/loom/${reference} but the exports map does not list ./styles/${name}.css`,
        );
      }
      continue;
    }
    if (!surface.has(reference)) {
      fail(
        `docs/ mention @ecoma-io/loom/${reference} but the exports map does not list ./${reference}`,
      );
    }
  }
  for (const name of sortedSurface(surface)) {
    if (name === "index") continue; // the bare entry is not a subpath
    if (!documented.includes(name)) {
      fail(`exports map carries ./${name} but no docs/ markdown mentions @ecoma-io/loom/${name}`);
    }
  }
  for (const state of styles) {
    if (
      !documented.some(
        (reference) => reference === `styles/${state.name}.css` || reference.includes("*"),
      )
    ) {
      fail(
        `exports map carries ./styles/${state.name}.css but no docs/ markdown mentions @ecoma-io/loom/styles/${state.name}.css`,
      );
    }
  }

  return failures;
}

/**
 * The root manifest's `exports` map.
 *
 * The published package is the root manifest — the `packages/loom/package.json`
 * facade is the internal aggregator consumers import *through*, not the thing
 * that ships. `exports` is where the published surface is declared.
 */
function readRootExports(root: string): Record<string, unknown> {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    exports?: Record<string, unknown>;
  };
  return manifest.exports ?? {};
}

/**
 * The JS unit names the exports map declares. The root `.` is the facade's
 * bare entry (built from `index.ts`); each `./<name>` subpath is its own unit.
 * `./package.json` and the stylesheets are not JS units of the facade.
 */
function exportsSurface(exportsMap: Record<string, unknown>): Map<string, true> {
  const surface = new Map<string, true>();
  if (exportsMap["."]) surface.set("index", true);
  for (const key of Object.keys(exportsMap)) {
    if (!key.startsWith("./")) continue;
    const stem = key.slice(2);
    if (
      stem === "" ||
      stem === "package.json" ||
      stem.startsWith("styles/") ||
      stem.includes(".")
    ) {
      continue;
    }
    surface.set(stem, true);
  }
  return surface;
}

/** The stylesheet stems the exports map declares, `./styles/global.css` → `global`. */
function styleExports(exportsMap: Record<string, unknown>): { name: string }[] {
  const styles: { name: string }[] = [];
  for (const key of Object.keys(exportsMap)) {
    if (key.startsWith("./styles/") && key.endsWith(".css")) {
      styles.push({ name: key.slice("./styles/".length, -".css".length) });
    }
  }
  return styles;
}

/**
 * The `build.lib.entry` keys of the root vite config, in file order.
 *
 * Parsed, not imported: executing vite.config.ts would run the config's
 * top-level lifecycle for a check that only needs the entry map. Only the
 * `entry: { name: pkg("…") }` lines inside the lib block are read — the text
 * around them may legitimately carry other `name:` shapes, so the match is
 * anchored to a bare identifier followed by a function call.
 */
function viteEntryKeys(root: string): string[] {
  for (const file of ["vite.config.ts", "vite.config.js"]) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    const lib = /build\s*:\s*{[\s\S]*?lib\s*:\s*{[\s\S]*?entry\s*:\s*{([\s\S]*?)}[\s\S]*?}/.exec(
      text,
    );
    if (!lib?.[1]) continue;
    const entries: string[] = [];
    for (const match of lib[1].matchAll(/([A-Za-z_$][\w$]*)\s*:\s*\w+\(/g)) {
      if (match[1]) entries.push(match[1]);
    }
    return entries;
  }
  return [];
}

/**
 * The `.ts` declaration stems in `packages/loom/src` — the type side of the
 * surface, matched by name to the build entries the same sources emit.
 */
function declarationStems(root: string): string[] {
  const dir = join(root, "packages", "loom", "src");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => file.slice(0, -".ts".length));
}

/**
 * Every facade-subpath mention in docs/ markdown, as the bare reference stem
 * (`theme`, `styles/global`). The docs import the library the way a consumer
 * does — a snippet on the site is copy-pasteable — so a subpath referenced
 * here is a documented part of the surface.
 */
function documentedSubpaths(root: string): string[] {
  const found = new Set<string>();
  walkMarkdown(join(root, "docs"), (text) => {
    for (const match of text.matchAll(/@ecoma-io\/loom\/([\w./*-]+)/g)) {
      const reference = match[1];
      if (reference === undefined) continue;
      // Stop the stem at the first non-stem character (a backtick, a comma, a
      // period ending a sentence) so `@ecoma-io/loom/theme,` reads as `theme`.
      found.add(reference.trim().replace(/[^a-z0-9./*-]+.*$/i, ""));
    }
  });
  return [...found];
}

/** Walk every .md file under a directory tree. */
function walkMarkdown(dir: string, visit: (text: string) => void): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMarkdown(path, visit);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      visit(readFileSync(path, "utf8"));
    }
  }
}

function sortedSurface(surface: Map<string, true>): string[] {
  return [...surface.keys()].sort();
}

/** A human-readable name for a JS unit: `./a11y` for a subpath, `.` for the bare entry. */
function surfaceLabel(name: string): string {
  return name === "index" ? "the root entry (.)" : `./${name}`;
}

// CLI entry — run against the real repository and exit non-zero on
// violations.
if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  const ROOT = join(import.meta.dirname, "..");
  const failures = runChecks(ROOT);
  if (failures.length) {
    for (const f of failures) console.error(`api-parity: ${f}`);
    console.error(`\n${String(failures.length)} api parity violation(s). Fix before pushing.`);
    process.exit(1);
  }
  console.log("exports, build entries, declarations, styles and docs agree on the facade surface.");
}
