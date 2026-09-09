// The public surface of the facade is agreed in several places and watched
// from one more, and they drifted silently until this checker existed:
//
//  1. the root manifest's `exports` map assigns each consumer-facing subpath
//     (`./a11y`, `./theme`, `./styles/*.css`) a built file;
//  2. the library build's `vite.config.ts` `build.lib.entry` declares which
//     `.ts` files those JS units are bundled from;
//  3. the declaration stems in `packages/loom/src/` are the type side of the
//     same surface (the build emits the `.d.ts` files to `dist/`; the gate
//     reads the sources they are built from);
//  4. the documentation site's markdown imports and appeals to each subpath —
//     a subpath nothing documents is a defect, and one documented but absent
//     from `exports` is a broken link for every consumer;
//  5. the sibling package barrels (`packages/**/src/index.ts`) each export a
//     public-looking surface of their own — an identifier one of them exports
//     that no facade entry re-exports is surface a consumer cannot reach, no
//     matter how public the barrel makes it look;
//  6. the docs' `<!-- @api Name -->` markers generate a props table for a
//     component by name — a marker naming a component no consumer can import
//     documents surface that does not exist;
//  7. every facade identifier must be mentioned somewhere a consumer reads —
//     an export nothing documents fails the interface contract by its own
//     words;
//  8. the facade manifest (`packages/loom/package.json` `exports`) and the
//     tsconfig `paths` name the facade subpaths a third and fourth time, and
//     both are invisible to the legs above: a subpath they drop breaks
//     workspace resolution and the type-checker while every published file
//     still agrees.
//
// contract.md:138-141 already names a subpath documented anywhere in docs/
// but absent from `exports` a contract defect, and the reverse ("an exports
// entry nothing documents") equally suspicious. The checker asserts the
// conditions the prose leaves to review and holds the docs to the whole set.
// It is M12: the deterministic gate behind "Public API deliberateness" in the
// interface contract.
//
// The JS surface is normalised onto one unit set: the bare `@ecoma-io/loom`
// entry builds from `index.ts`, and each `./<name>` subpath builds from
// `<name>.ts`. So "index" is a member of the set alongside "a11y" and "theme",
// and the exports map must carry `.` if and only if the build carries an
// `index` entry.
//
// Identifier matching is exact, never substring: every export clause is
// parsed into its exported names, and a name counts as covered only when the
// same name appears in the facade's own parsed export set (or in the
// deliberate-internal register, below). A barrel may also ship a `default`
// binding; that one is covered when the facade re-exports that package's
// default under a name (`export { default as Table } from …`) or when the
// register records the withholding.
//
// The register lives where the decision lives: a block of `//`-comment
// records in `packages/loom/src/index.ts`, machine-parsed and human-readable:
//
//   // @internal <identifier> — <because>        a barrel export the facade withholds
//   // @internal <pkg>:default — <because>       a barrel's default binding, re-exported under a name
//   // @internal-doc <Identifier> — <because>    a docs @api marker for a component no consumer imports
//   // @generated-docs <Suffix> [<Suffix> …] — <because>
//   //     facade identifiers documented by the site's generated API tables,
//   //     named by the exact suffix their names end in
//
// `<pkg>` is the package name without its `@ecoma-io/loom-` prefix. Both
// directions are drift: an unrecorded export the facade withholds fails, and
// a recorded name that stops being withholdable — because a facade entry
// started re-exporting it, or because no barrel exports it any more — fails
// as a stale decision; a @generated-docs suffix no identifier ends in any
// more decays the same way. The @internal-doc direction is deliberately
// one-way-strength: a marker nothing accounts for is the dangerous case and
// fails, while a recorded exception no live marker currently uses is inert
// prose, not a hole, and is left alone.
//
// Run as part of `pnpm lint` and in CI.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

/** Every parity violation the checker found, one human-readable string each. */
export function runChecks(root: string): string[] {
  const failures: string[] = [];

  function fail(message: string): void {
    failures.push(message);
  }

  const exportsMap = readRootExports(root);
  const surface = exportsSurface(exportsMap, fail);
  const libEntries = viteEntryKeys(root);
  const declarations = declarationStems(root);
  const styles = styleExports(exportsMap);
  const docsFiles = collectMarkdown(root);
  const documented = documentedSubpaths(docsFiles);
  const docsAliasOrder = docsAliasEntries(root);
  const facade = facadeSurface(root, fail);
  const barrels = packageBarrels(root);
  const register = internalRegister(root, fail);

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
  //
  // The documented set is scoped to the pages a consumer actually reads —
  // `docs/**` except `docs/architecture/`, which is a frozen audit record, not
  // a copy-pasteable reference. A historical mention in baseline.md or a
  // contract table must not become a binding contract on today's exports map;
  // that is the reverse of the gate's purpose and would make a deliberate
  // subpath removal unlandable without touching old prose.
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

  // The docs toolchain leg. Every exported JS subpath must have a VitePress
  // alias, listed before the bare `@ecoma-io/loom` entry. The docs import the
  // library the way a consumer does — a snippet on the site is copy-pasteable —
  // so a subpath the site ships in a fence or a live demo must resolve in the
  // docs build. Vite's alias resolution is first-match and a string alias
  // matches the specifier it prefixes, so a bare entry listed before a subpath
  // swallows it and rewrites `@ecoma-io/loom/theme` to `index.ts/theme` — a
  // broken path. The root vite.config.ts orders subpaths before the bare entry
  // for the same reason; this leg pins the docs config to the same rule.
  const bareAliasIndex = docsAliasOrder.indexOf("@ecoma-io/loom");
  for (const name of sortedSurface(surface)) {
    if (name === "index") continue; // the bare entry cannot shadow itself
    const subpath = `@ecoma-io/loom/${name}`;
    const aliasIndex = docsAliasOrder.indexOf(subpath);
    if (aliasIndex === -1) {
      fail(
        `./${name} has no alias in docs/.vitepress/config.mts — a documented @ecoma-io/loom/${name} import cannot resolve there`,
      );
    } else if (bareAliasIndex !== -1 && aliasIndex > bareAliasIndex) {
      fail(
        `@ecoma-io/loom/${name} is listed after the bare @ecoma-io/loom alias in docs/.vitepress/config.mts, so it can never resolve (first-match prefix alias)`,
      );
    }
  }
  for (const name of sortedSurface(surface)) {
    if (name === "index") continue; // the bare entry is not a subpath
    if (!documented.includes(name)) {
      fail(`exports map carries ./${name} but no docs/ markdown mentions @ecoma-io/loom/${name}`);
    }
  }

  // The pruned-map guard. The docs config once carried ~109 internal-package
  // aliases (`@ecoma-io/loom-accordion`, …) that no docs file imported; 2F
  // pruned it to the facade keys. `docsAliasEntries` is structurally blind to
  // a dash-form key — its pattern matches the facade and its subpaths only —
  // so every leg above would wave a re-added internal alias through, and
  // this reader exists to make the relapse fail instead.
  for (const alias of docsInternalAliases(root)) {
    fail(
      `${alias} is an internal-package alias in docs/.vitepress/config.mts — internal-package aliases were pruned from the docs config; the facade keys are the only aliases it may carry`,
    );
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

  // Package-index↔facade. Every identifier any sibling barrel exports must be
  // reachable through the facade under the same name — or recorded as a
  // deliberate withholding. Without this leg a barrel could grow a new export
  // that looks public, passes every surface leg above, and stays unreachable
  // for every consumer of the one public package.
  const parsedBarrels = barrels.map((barrel) => ({ ...barrel, parsed: parseBarrel(barrel, fail) }));
  for (const barrel of parsedBarrels) {
    for (const name of barrel.parsed.names) {
      if (name === "default") {
        if (
          !facade.defaults.has(barrel.pkgName) &&
          !register.internal.has(`${barrel.scope}:default`)
        ) {
          fail(
            `${barrel.relPath} exports a default binding but no facade entry re-exports it and no @internal record withholds it — publish it under a name from packages/loom/src/index.ts or record why it stays package-local`,
          );
        }
        continue;
      }
      if (!facade.names.has(name) && !register.internal.has(name)) {
        fail(
          `${barrel.relPath} exports "${name}" but no facade entry re-exports it and no @internal record withholds it — publish it from packages/loom/src/index.ts or record why it stays internal`,
        );
      }
    }
  }

  // The register's own staleness legs, in both directions. A record is a
  // decision, and a decision that no longer describes the code is worse than
  // none: it reads as deliberate what is now an accident.
  for (const [key, entry] of register.internal) {
    if (key.endsWith(":default")) {
      const pkgName = `@ecoma-io/loom-${key.slice(0, -":default".length)}`;
      if (facade.defaults.has(pkgName)) {
        fail(
          `@internal ${key} (${entry.at}) records a withheld default, but a facade entry re-exports that package's default — the record is stale; drop it or drop the re-export`,
        );
        continue;
      }
      if (!parsedBarrels.some((b) => b.pkgName === pkgName && b.parsed.names.has("default"))) {
        fail(
          `@internal ${key} (${entry.at}) records a withheld default, but no barrel of ${pkgName} exports a default — the record is stale; drop it`,
        );
      }
      continue;
    }
    if (facade.names.has(key)) {
      fail(
        `@internal ${key} (${entry.at}) records a withheld identifier, but a facade entry exports it — the record is stale; drop the record or the re-export`,
      );
      continue;
    }
    if (!parsedBarrels.some((b) => b.parsed.names.has(key))) {
      fail(
        `@internal ${key} (${entry.at}) records a withheld identifier, but no package barrel exports it — the record is stale; drop it`,
      );
    }
  }
  for (const [name, entry] of register.internalDoc) {
    if (facade.names.has(name)) {
      fail(
        `@internal-doc ${name} (${entry.at}) records a non-importable component, but the facade exports it — the record is stale; drop it`,
      );
    }
  }

  // @api marker↔facade. The docs' generated props tables are keyed by marker,
  // and the marker names resolve to any `.vue` under `packages/` — including
  // internal sub-components no consumer can import. Every live marker must
  // name a facade export or a recorded exception. The marker pattern is the
  // generator's own (`docs/.vitepress/plugins/component-api.ts`), so the two
  // readers cannot disagree about what a marker is.
  const markers = docsApiMarkers(docsFiles);
  for (const marker of markers) {
    if (!facade.names.has(marker.name) && !register.internalDoc.has(marker.name)) {
      fail(
        `${marker.file} carries an @api marker for "${marker.name}", but no facade entry exports that name and no @internal-doc record explains it — document an importable component or record why this internal one's table belongs on the page`,
      );
    }
  }

  // Identifier docs coverage. Every facade identifier must be mentioned at
  // least once in the pages a consumer reads — "an export nothing documents"
  // fails the interface contract by its own words — unless the register
  // records where its documentation lives instead: an @internal record (kept
  // for completeness; the staleness leg fails an @internal record and a
  // facade export long before this leg sees the pair), or a @generated-docs
  // class whose documentation is the site's generated API tables, which a
  // markdown scan structurally cannot see.
  const documentedNames = docsIdentifierTokens(docsFiles);
  for (const name of facade.names) {
    if (documentedNames.has(name) || register.internal.has(name)) continue;
    if ([...register.classes.keys()].some((suffix) => matchesClass(name, suffix))) continue;
    fail(
      `facade export "${name}" is mentioned in no docs/ page a consumer reads — an export nothing documents fails the interface contract; document it on the page that serves it`,
    );
  }

  // A class record is a claim about today's surface, so it decays like any
  // other: a suffix no facade identifier ends in any more is a stale record,
  // not a standing exemption.
  for (const [suffix, entry] of register.classes) {
    if (![...facade.names].some((name) => matchesClass(name, suffix))) {
      fail(
        `@generated-docs ${suffix} (${entry.at}) records a documented class, but no facade identifier ends in "${suffix}" — the record is stale; drop it`,
      );
    }
  }

  // Subpath mirror. The root exports map, the facade manifest and the
  // tsconfig paths each name the facade subpath set independently, and the
  // two workspace files are seen by no leg above. A subpath any one of the
  // three drops breaks workspace resolution or the type-checker while the
  // published files still agree, so the three must be one set.
  const mirror = subpathMirror(root, surface, fail);
  for (const state of mirror) {
    fail(
      `${state.label} is carried by ${state.carried.join(" and ")}, but missing from ${state.missing.join(" and ")}`,
    );
  }

  return failures;
}

/**
 * Read one package manifest. A malformed one is a named failure, not a raw
 * SyntaxError: JSON.parse's error carries no path, and in a tree of manifests
 * an unnamed parse error is a hunt.
 */
function readManifest(manifestPath: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `api-parity: ${manifestPath} does not parse as JSON — ${(error as Error).message}`,
      { cause: error },
    );
  }
}

/**
 * The root manifest's `exports` map.
 *
 * The published package is the root manifest — the `packages/loom/package.json`
 * facade is the internal aggregator consumers import *through*, not the thing
 * that ships. `exports` is where the published surface is declared.
 */
function readRootExports(root: string): Record<string, unknown> {
  const manifest = readManifest(join(root, "package.json")) as {
    exports?: Record<string, unknown>;
  };
  return manifest.exports ?? {};
}

/**
 * The JS unit names an exports map declares. The root `.` is the facade's
 * bare entry (built from `index.ts`); each `./<name>` subpath is its own unit.
 * `./package.json` and the stylesheets are not JS units of the facade. A
 * dotted stem (`./a11y.js`) is fail-named through `fail`, never skipped: every
 * reader this surface is judged against — the vite entry map, the declaration
 * stems, the tsconfig paths, the docs aliases — matches a bare identifier, so
 * a dotted key could not be judged by any leg, only passed over, and a gate
 * that cannot judge a key has to say so rather than read as green.
 */
function exportsSurface(
  exportsMap: Record<string, unknown>,
  fail: (message: string) => void,
): Map<string, true> {
  const surface = new Map<string, true>();
  if (exportsMap["."]) surface.set("index", true);
  for (const key of Object.keys(exportsMap)) {
    if (!key.startsWith("./")) continue;
    const stem = key.slice(2);
    if (stem === "" || stem === "package.json" || stem.startsWith("styles/")) {
      continue;
    }
    if (stem.includes(".")) {
      fail(
        `exports map carries "./${stem}" — a dotted stem is not a unit name this gate can judge against the build entries, declarations or tsconfig paths; name the unit without the extension`,
      );
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
 * Every markdown file under docs/, excluding `docs/architecture/`, together
 * with its root-relative path. One walk feeds every docs-facing leg, and the
 * path rides along because the @api leg's failures must name the file they
 * came from.
 *
 * `docs/architecture/` is excluded: it is a frozen audit record (baseline,
 * gap analysis, contract), not a page a consumer reads. A subpath named there
 * is a historical fact, not a promise about today's exports map — excluding it
 * keeps a deliberate subpath removal from being blocked by old prose.
 */
interface DocsFile {
  path: string;
  text: string;
}

function collectMarkdown(root: string): DocsFile[] {
  const files: DocsFile[] = [];
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        // docs/architecture/ is the frozen audit record — pinned to the exports
        // map by contract.md's own table, not by every historical mention.
        if (entry.name === "architecture") continue;
        walk(path);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push({ path: relative(root, path), text: readFileSync(path, "utf8") });
      }
    }
  };
  walk(join(root, "docs"));
  return files;
}

/** Every facade-subpath mention in docs/ markdown, as the bare reference stem. */
function documentedSubpaths(docsFiles: DocsFile[]): string[] {
  const found = new Set<string>();
  for (const { text } of docsFiles) {
    for (const match of text.matchAll(/@ecoma-io\/loom\/([\w./*-]+)/g)) {
      const reference = match[1];
      if (reference === undefined) continue;
      // Stop the stem at the first non-stem character (a backtick, a comma, a
      // period ending a sentence) so `@ecoma-io/loom/theme,` reads as `theme`.
      found.add(reference.trim().replace(/[^a-z0-9./*-]+.*$/i, ""));
    }
  }
  return [...found];
}

/**
 * The facade aliases declared in the docs VitePress config, in file order.
 *
 * The docs config aliases `@ecoma-io/loom` and its subpaths to the facade's
 * source (see config.mts). Order matters here: Vite resolves aliases as
 * first-match prefixes, so the bare entry must come after the subpaths or it
 * swallows them — this is exactly the shadow `check-api-parity.ts` pins.
 *
 * Parsed as text (the config is TypeScript, not imported) for the same reason
 * the vite entry map is parsed: the checker should not execute the tools it
 * audits.
 */
function docsAliasEntries(root: string): string[] {
  const config = join(root, "docs", ".vitepress", "config.mts");
  if (!existsSync(config)) return [];
  const text = readFileSync(config, "utf8");
  const entries: string[] = [];
  for (const match of text.matchAll(/["'](@ecoma-io\/loom(?:\/[a-z0-9-]+)?)["']\s*:/g)) {
    if (match[1]) entries.push(match[1]);
  }
  return entries;
}

/**
 * The dash-form internal-package alias keys (`@ecoma-io/loom-accordion`, …)
 * declared in the docs VitePress config, in file order.
 *
 * A sibling of `docsAliasEntries` rather than part of it, because the two
 * answer opposite questions: that reader collects the facade keys that are
 * allowed to exist, and a dash-form key is invisible to its pattern — which
 * is exactly how a re-added internal alias would slip past the ordering
 * legs. The docs config deliberately carries none of the internal aliases
 * (the facade's bare-specifier imports resolve through the packages/loom
 * workspace links instead), so any match is a violation, not a parity input.
 * Parsed as text for the same reason `docsAliasEntries` is.
 */
function docsInternalAliases(root: string): string[] {
  const config = join(root, "docs", ".vitepress", "config.mts");
  if (!existsSync(config)) return [];
  const text = readFileSync(config, "utf8");
  const entries: string[] = [];
  for (const match of text.matchAll(/["'](@ecoma-io\/loom-[a-z0-9-]+(?:\/[a-z0-9-]+)?)["']\s*:/g)) {
    if (match[1]) entries.push(match[1]);
  }
  return entries;
}

// --- identifier-level export parsing ---------------------------------------

/**
 * One exported binding of a clause: the name the module binds locally and the
 * name it ships under (`default as Table` ships `Table`; `default` alone
 * ships the default binding).
 */
interface ExportedBinding {
  local: string;
  exported: string;
  /** The `from` specifier of the clause the binding came from, if any. */
  from: string | null;
}

interface ParsedModule {
  bindings: ExportedBinding[];
  /** `export * from "…"` specifiers, resolved relative to the parsing file. */
  starSources: string[];
  /** `export const|function|class|enum|interface|type` and `export default` names. */
  declarations: string[];
  /** Specifiers this parser could not read — each becomes a named failure. */
  errors: string[];
}

const CLAUSE_START = /^export\s+(type\s+)?\{/;
const STAR_EXPORT = /^export\s+\*\s*(?:as\s+([A-Za-z_$][\w$]*))?\s*(?:from\s*["']([^"']+)["'])?/;
const DESTRUCTURING_EXPORT = /^export\s+(?:const|let|var)\s*[{[]/;
const EXPORT_DECLARATION =
  /^export\s+(?:declare\s+)?(?:async\s+)?(?:const|function\s*\*?|class|enum|interface|type)\s+([A-Za-z_$][\w$]*)/;
const EXPORT_DEFAULT = /^export\s+default\b/;
const CLAUSE_SPECIFIER =
  /^(?:type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+(?:type\s+)?([A-Za-z_$][\w$]*))?$/;
const CLAUSE_FROM = /from\s*["']([^"']+)["']/;

/**
 * Parse one module's exported names out of its text — clauses, star exports
 * and declarations — without executing or type-checking anything. The parse
 * is deliberately line-anchored and brace-collecting rather than a full
 * JavaScript grammar: it covers the export forms this repository's barrels
 * and facade entries use (clause, `export *`, const/function/class/enum/
 * interface/type, `export default`) and reports anything it cannot read —
 * a malformed clause, a destructuring export, a sourceless star — as an
 * error instead of guessing, so a form the parser does not know fails the
 * gate rather than silently passing it. Both callers share that contract:
 * the barrel leg surfaces `errors` by name, and the facade leg must too.
 */
function parseModuleExports(text: string): ParsedModule {
  const bindings: ExportedBinding[] = [];
  const starSources: string[] = [];
  const declarations: string[] = [];
  const errors: string[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === undefined) continue;
    const star = STAR_EXPORT.exec(line);
    if (star) {
      if (star[1] !== undefined) {
        // `export * as ns from "…"` ships one namespace name.
        bindings.push({ local: "*", exported: star[1], from: null });
      } else if (star[2] !== undefined) {
        // A bare `export * from "…"` re-exports the source's own names and
        // is expanded by the caller, which knows the file it sits in.
        starSources.push(star[2]);
      } else {
        errors.push(`export * without a source specifier: "${line.trim()}"`);
      }
      continue;
    }
    const clause = CLAUSE_START.exec(line);
    if (clause) {
      let buffer = line.slice(clause[0].length);
      while (!buffer.includes("}") && i + 1 < lines.length) {
        const next = lines[i + 1];
        if (next === undefined) break;
        i += 1;
        buffer += `\n${next}`;
      }
      const close = buffer.indexOf("}");
      if (close === -1) {
        errors.push(`export clause starting "${line.trim()}" never closes`);
        continue;
      }
      const from = CLAUSE_FROM.exec(buffer.slice(close))?.[1] ?? null;
      for (const raw of buffer.slice(0, close).split(",")) {
        const spec = raw.trim();
        if (spec === "") continue;
        const parsed = CLAUSE_SPECIFIER.exec(spec);
        if (!parsed) {
          errors.push(`unparseable export specifier "${spec}"`);
          continue;
        }
        // Destructured with a default so the group reads are `string` under
        // noUncheckedIndexedAccess; the regex matched, so the name is there.
        const [, local = "", alias] = parsed;
        bindings.push({ local, exported: alias ?? local, from });
      }
      continue;
    }
    const declaration = EXPORT_DECLARATION.exec(line);
    // `export const { a, b } = …` publishes names through a destructuring
    // pattern no clause-shaped reader can see — record it as unread rather
    // than let both names walk past every identifier leg.
    if (!declaration && DESTRUCTURING_EXPORT.test(line)) {
      errors.push(
        `destructuring export "${line.trim()}" — name the exported bindings in an export clause`,
      );
      continue;
    }
    if (declaration) {
      const name = declaration[1];
      if (name !== undefined) declarations.push(name);
      continue;
    }
    if (EXPORT_DEFAULT.test(line)) {
      declarations.push("default");
      continue;
    }
    // The fall-through is the last branch, not a quiet one. An `export` line
    // no shape above matched — the `export` and its clause brace split across
    // lines (`export\n{ a, b };`), an `export let`, anything else — is a form
    // this parser cannot read, and its contract is that an unread form errors
    // named rather than reads as a module exporting nothing. Silently skipping
    // it here would be exactly the hole the docblock promises is closed.
    if (/^export\b/.test(line)) {
      errors.push(
        `unreadable export form "${line.trim()}" — the parser reads clause, star, declaration and default shapes`,
      );
    }
  }
  return { bindings, starSources, declarations, errors };
}

/**
 * The facade's identifier surface: every name the entries under
 * `packages/loom/src/` export, plus the set of sibling packages whose
 * `default` binding a facade entry re-exports. Parsed from the same files the
 * declaration leg counts as the type side of the surface, so a facade entry
 * added for a new subpath joins this set automatically.
 *
 * The parser's own contract is honoured here, not just in the barrel leg: an
 * export form it cannot read fails named, and a star re-export is expanded
 * into the surface it actually publishes — a star the gate cannot see is
 * precisely how an undocumented export would slip past every identifier leg.
 */
interface FacadeSurface {
  names: Set<string>;
  /** Package names (e.g. `@ecoma-io/loom-table`) whose default the facade re-exports. */
  defaults: Set<string>;
}

function facadeSurface(root: string, fail: (message: string) => void): FacadeSurface {
  const names = new Set<string>();
  const defaults = new Set<string>();
  const dir = join(root, "packages", "loom", "src");
  if (!existsSync(dir)) return { names, defaults };
  const pkgNameToDir = workspacePackageNames(root);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
    const seen = new Set<string>([join(dir, file)]);
    const visit = (path: string): void => {
      const relPath = relative(root, path);
      const parsed = parseModuleExports(readFileSync(path, "utf8"));
      for (const error of parsed.errors) fail(`${relPath}: ${error}`);
      for (const binding of parsed.bindings) {
        if (binding.exported !== "default") names.add(binding.exported);
        // `default as Table` from a sibling package: the package's default
        // binding is reachable through the facade, under the exported name.
        // The specifier is stored (not the resolved directory) so the barrel
        // side compares package name to package name.
        if (binding.local === "default" && binding.from) {
          if (pkgNameToDir.has(binding.from)) defaults.add(binding.from);
        }
      }
      for (const declaration of parsed.declarations) {
        if (declaration !== "default") names.add(declaration);
      }
      for (const source of parsed.starSources) {
        if (!source.startsWith(".")) {
          fail(
            `${relPath} re-exports * from "${source}" — the parity gate expands relative star exports only, so a facade star must be written as named re-exports for the surface it publishes to be visible`,
          );
          continue;
        }
        const target = join(dirname(path), source.endsWith(".ts") ? source : `${source}.ts`);
        if (!existsSync(target) || seen.has(target)) {
          fail(
            `${relPath} re-exports * from "${source}", which does not resolve to a .ts file beside it`,
          );
          continue;
        }
        seen.add(target);
        visit(target);
      }
    };
    visit(join(dir, file));
  }
  return { names, defaults };
}

/**
 * The sibling package barrels: every `index.ts` under a `src/` directory in
 * packages/, at any tier depth, outside the
 * facade's own directory, with the package name its manifest declares.
 * Component barrels are one directory per component, so the manifest read is
 * what keeps the register's `<pkg>:default` scope honest even if a directory
 * and a package name ever disagree.
 */
interface PackageBarrel {
  /** Root-relative path, for failure messages. */
  relPath: string;
  /** Absolute directory of the package (the manifest's directory). */
  dir: string;
  /** The manifest's `name` (e.g. `@ecoma-io/loom-table`); a barrel without one fails. */
  pkgName: string;
  /** The register scope: the package name minus its `@ecoma-io/loom-` prefix. */
  scope: string;
  parsed: { names: Set<string> };
}

function packageBarrels(root: string): Omit<PackageBarrel, "parsed">[] {
  const barrels: Omit<PackageBarrel, "parsed">[] = [];
  const packagesDir = join(root, "packages");
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      // Built output and installed dependencies are not source barrels.
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      const path = join(dir, entry.name);
      if (
        entry.name === "src" &&
        existsSync(join(path, "index.ts")) &&
        !path.includes(join("packages", "loom"))
      ) {
        const manifestPath = join(dirname(path), "package.json");
        const pkgName = existsSync(manifestPath)
          ? ((readManifest(manifestPath) as { name?: string }).name ?? "")
          : "";
        if (pkgName === "") {
          barrels.push({
            relPath: relative(root, join(path, "index.ts")),
            dir: dirname(path),
            pkgName: "",
            scope: "",
          });
          continue;
        }
        barrels.push({
          relPath: relative(root, join(path, "index.ts")),
          dir: dirname(path),
          pkgName,
          scope: pkgName.replace(/^@ecoma-io\/loom-/, ""),
        });
        continue;
      }
      walk(path);
    }
  };
  walk(packagesDir);
  return barrels.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

/**
 * Package name → directory, read from every manifest under `packages/` that
 * sits beside a `src/` directory. The facade's `from` specifiers resolve
 * through this map so `default as Table from "@ecoma-io/loom-table"` is
 * matched to the table barrel itself rather than to any name coincidence.
 */
function workspacePackageNames(root: string): Map<string, string> {
  const names = new Map<string, string>();
  const packagesDir = join(root, "packages");
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      const path = join(dir, entry.name);
      const manifestPath = join(path, "package.json");
      if (existsSync(manifestPath) && existsSync(join(path, "src"))) {
        const name = (readManifest(manifestPath) as { name?: string }).name;
        if (name) names.set(name, path);
      }
      walk(path);
    }
  };
  walk(packagesDir);
  return names;
}

/**
 * Parse one barrel, expanding its `export *` sources. Star expansion is
 * resolved relative to the barrel's own directory and only follows `.ts`
 * files; anything else (a `.vue` source, a bare package specifier) fails the
 * gate rather than being guessed at, because an unexpanded star is exactly
 * how an unreviewed export would slip past every leg.
 */
function parseBarrel(
  barrel: Omit<PackageBarrel, "parsed">,
  fail: (message: string) => void,
): {
  names: Set<string>;
} {
  if (barrel.pkgName === "") {
    fail(
      `${barrel.relPath} declares no "name" in its package.json — the parity gate resolves every barrel to its package`,
    );
    return { names: new Set() };
  }
  const names = new Set<string>();
  const seen = new Set<string>([barrel.dir]);
  const visit = (path: string, text: string): void => {
    const parsed = parseModuleExports(text);
    for (const error of parsed.errors) fail(`${relative(barrel.dir, path)}: ${error}`);
    for (const binding of parsed.bindings) names.add(binding.exported);
    for (const declaration of parsed.declarations) names.add(declaration);
    for (const source of parsed.starSources) {
      if (!source.startsWith(".")) {
        fail(
          `${barrel.relPath} re-exports * from "${source}" — the parity gate expands relative star exports only`,
        );
        continue;
      }
      const target = join(dirname(path), source.endsWith(".ts") ? source : `${source}.ts`);
      if (!existsSync(target) || seen.has(target)) {
        fail(
          `${barrel.relPath} re-exports * from "${source}", which does not resolve to a .ts file beside it`,
        );
        continue;
      }
      seen.add(target);
      visit(target, readFileSync(target, "utf8"));
    }
  };
  // `dir` is the package directory; the barrel lives at `<dir>/src/index.ts`.
  const entryPath = join(barrel.dir, "src", "index.ts");
  visit(entryPath, readFileSync(entryPath, "utf8"));
  return { names };
}

// --- the deliberate-internal register ---------------------------------------

interface RegisterEntry {
  because: string;
  /** Where the record sits, so a stale one can be found and deleted. */
  at: string;
}

interface InternalRegister {
  /** `name` → entry, or `<scope>:default` → entry for withheld defaults. */
  internal: Map<string, RegisterEntry>;
  /** Component names a docs @api marker may name without being importable. */
  internalDoc: Map<string, RegisterEntry>;
  /**
   * Exact name suffix → entry, for classes of facade identifiers whose
   * documentation is generated rather than written in markdown prose.
   */
  classes: Map<string, RegisterEntry>;
}

// The scoped form is literally `<pkg>:default` — a scope on any other
// identifier does not parse, and falls into the malformed-record trap below.
const INTERNAL_LINE = /^\s*\/\/\s*@internal\s+([A-Za-z_$][\w$]*)(?::(default))?\s+[—-]\s+(.+)$/;
const INTERNAL_DOC_LINE = /^\s*\/\/\s*@internal-doc\s+([A-Za-z_$][\w$]*)\s+[—-]\s+(.+)$/;
const CLASS_LINE =
  /^\s*\/\/\s*@generated-docs\s+([A-Za-z_$][\w$]*(?:\s+[A-Za-z_$][\w$]*)*)\s+[—-]\s+(.+)$/;
const INTERNAL_MARK = /^\s*\/\/\s*@internal(-doc)?\b/;

/**
 * Whether a facade identifier belongs to a registered class: its name ends
 * with the class's exact suffix (case included) and the suffix is proper —
 * `Surface` the component is not a member of the `Surface` class, while
 * `AvatarGroupSurface` is.
 */
function matchesClass(name: string, suffix: string): boolean {
  return name.length > suffix.length && name.endsWith(suffix);
}

/**
 * Parse the register out of `packages/loom/src/index.ts`. The record lives
 * where the decision lives — beside the re-exports it qualifies — and is
 * machine-parsed from `//` comment lines so no second file can drift from it.
 * A line that opens a record but does not parse as one (a missing because, a
 * malformed scope) fails the gate rather than being skipped: half a record is
 * a record nobody can trust.
 */
function internalRegister(root: string, fail: (message: string) => void): InternalRegister {
  const register: InternalRegister = {
    internal: new Map(),
    internalDoc: new Map(),
    classes: new Map(),
  };
  const facadeIndex = join(root, "packages", "loom", "src", "index.ts");
  if (!existsSync(facadeIndex)) return register;
  const relPath = relative(root, facadeIndex);
  const lines = readFileSync(facadeIndex, "utf8").split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === undefined) continue;
    const internal = INTERNAL_LINE.exec(line);
    if (internal) {
      // Destructured with defaults rather than indexed so the reads are
      // `string` under noUncheckedIndexedAccess; `scope` is the optional
      // `:default` group, and its presence is the whole key decision.
      const [, name = "", scope, because = ""] = internal;
      const key = scope === undefined ? name : `${name}:default`;
      register.internal.set(key, { because: because.trim(), at: `${relPath}:${String(i + 1)}` });
      continue;
    }
    const internalDoc = INTERNAL_DOC_LINE.exec(line);
    if (internalDoc) {
      const [, name = "", because = ""] = internalDoc;
      register.internalDoc.set(name, {
        because: because.trim(),
        at: `${relPath}:${String(i + 1)}`,
      });
      continue;
    }
    const classified = CLASS_LINE.exec(line);
    if (classified) {
      const [, suffixes = "", because = ""] = classified;
      for (const suffix of suffixes.split(/\s+/)) {
        register.classes.set(suffix, {
          because: because.trim(),
          at: `${relPath}:${String(i + 1)}`,
        });
      }
      continue;
    }
    if (INTERNAL_MARK.test(line)) {
      fail(
        `${relPath}:${String(i + 1)} opens an @internal record that does not parse — one line per name: // @internal <identifier> — <because>`,
      );
    }
  }
  return register;
}

// --- the docs legs ----------------------------------------------------------

/** Identical to the generator's marker pattern in component-api.ts, by design. */
const API_MARKER = /^[ \t]*<!--[ \t]*@api[ \t]+([A-Za-z][A-Za-z0-9]*)[ \t]*-->[ \t]*$/gm;

/** Every live `<!-- @api Name -->` marker under docs/, with the file it sits in. */
function docsApiMarkers(docsFiles: DocsFile[]): { file: string; name: string }[] {
  const markers: { file: string; name: string }[] = [];
  for (const { path, text } of docsFiles) {
    for (const match of text.matchAll(API_MARKER)) {
      if (match[1]) markers.push({ file: path, name: match[1] });
    }
  }
  return markers;
}

/**
 * The prose half of a markdown file: fenced code blocks and HTML comments
 * removed, fences first so a marker inside a block leaves with the block.
 * A fenced sample is a copy of the code a page demos — its identifiers can
 * outlive the export they name, and a comment is not rendered at all — so
 * neither is documentation. Inline code stays: a backticked name in a
 * sentence is prose.
 */
function docsProse(text: string): string {
  const kept: string[] = [];
  let inFence = false;
  for (const line of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) kept.push(line);
  }
  return kept.join("\n").replace(/<!--[\s\S]*?-->/g, " ");
}

/**
 * Every identifier-shaped word used anywhere in docs/ markdown prose, as one
 * set. Tokenising (rather than searching per name) keeps the coverage leg
 * linear in the size of the docs tree, and for identifier-shaped names it
 * answers exactly what a word-boundary search would: `List` never matches
 * inside `ListItem`, because both readers stop at the character classes an
 * identifier may contain.
 */
function docsIdentifierTokens(docsFiles: DocsFile[]): Set<string> {
  const tokens = new Set<string>();
  for (const { text } of docsFiles) {
    for (const match of docsProse(text).matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
      tokens.add(match[0]);
    }
  }
  return tokens;
}

// --- the subpath mirror -----------------------------------------------------

/**
 * The facade subpaths the workspace's two extra copies of the surface name —
 * the facade manifest's `exports` and the tsconfig `paths` — plus the root
 * surface they must agree with. The tsconfig is JSONC, so its facade keys are
 * read as text; the quoted-key pattern cannot reach a dash-form internal
 * package (`@ecoma-io/loom-core` has no `/` after `loom`), which is what
 * keeps the internal workspace mappings out of the comparison.
 *
 * `fail` reaches the manifest read too: the facade copy goes through the same
 * `exportsSurface`, whose dotted-stem ruling is the gate's, not one copy's.
 *
 * The mirror compares keys, never values: it verifies each subpath's presence
 * across the three copies, and whether an entry points at the right file
 * stays with the build and the type-checker.
 */
function subpathMirror(
  root: string,
  surface: Map<string, true>,
  fail: (message: string) => void,
): { label: string; carried: string[]; missing: string[] }[] {
  const sources: { label: string; names: Set<string> }[] = [
    { label: "the root exports map", names: new Set(surface.keys()) },
  ];

  const facadeManifestPath = join(root, "packages", "loom", "package.json");
  let facadeManifest = new Map<string, true>();
  if (existsSync(facadeManifestPath)) {
    const manifest = readManifest(facadeManifestPath) as {
      exports?: Record<string, unknown>;
    };
    facadeManifest = exportsSurface(manifest.exports ?? {}, fail);
  }
  sources.push({ label: "packages/loom/package.json", names: new Set(facadeManifest.keys()) });

  const tsKeys = new Map<string, true>();
  const tsconfigPath = join(root, "tsconfig.base.json");
  if (existsSync(tsconfigPath)) {
    const text = readFileSync(tsconfigPath, "utf8");
    for (const match of text.matchAll(/"@ecoma-io\/loom(\/([a-z0-9-]+))?"\s*:/g)) {
      tsKeys.set(match[2] ?? "index", true);
    }
  }
  sources.push({ label: "tsconfig.base.json", names: new Set(tsKeys.keys()) });

  const union = new Set<string>();
  for (const source of sources) for (const name of source.names) union.add(name);
  const drift: { label: string; carried: string[]; missing: string[] }[] = [];
  for (const name of [...union].sort()) {
    const carried = sources
      .filter((source) => source.names.has(name))
      .map((source) => source.label);
    const missing = sources
      .filter((source) => !source.names.has(name))
      .map((source) => source.label);
    if (missing.length > 0) drift.push({ label: subpathLabel(name), carried, missing });
  }
  return drift;
}

function sortedSurface(surface: Map<string, true>): string[] {
  return [...surface.keys()].sort();
}

/** A human-readable name for a JS unit: `./a11y` for a subpath, `.` for the bare entry. */
function surfaceLabel(name: string): string {
  return name === "index" ? "the root entry (.)" : `./${name}`;
}

/** A human-readable name for a mirrored subpath: `.` for the bare entry, `./theme` otherwise. */
function subpathLabel(name: string): string {
  return name === "index" ? "the bare facade entry (.)" : `./${name}`;
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
  console.log(
    "exports, build entries, declarations, styles, docs, package barrels, @api markers and the subpath mirror agree on the facade surface.",
  );
}
