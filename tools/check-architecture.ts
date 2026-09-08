/**
 * Mechanical architecture enforcement for the Moon package graph.
 *
 * The affected-test and component-E2E architecture stays honest only as long
 * as the claims it rests on are checked, so — in the same spirit as
 * tools/check-component-artifacts.ts — the rules below are asserted rather
 * than left to review. Run as part of `pnpm lint` and in CI.
 *
 * Checks:
 *
 * 1. Moon `deps:` match each package's `package.json` workspace dependencies
 *    (delegated to tools/sync-moon-deps.ts --check). This is what makes
 *    `moon :test --affected` and `moon :e2e --affected` genuinely propagate.
 *
 * 2. No package below the facade may import the public facade — the specifier
 *    written `at-ecoma-io/loom`, under every spelling: the bare import, each
 *    subpath including dashed ones, the dynamic `import()`, and the bare
 *    side-effect `import "…"` (checked under every internal src tree except
 *    packages/loom and theme-core's CSS). The facade's
 *    `deps: loom -> everything` is the publishing boundary; a component
 *    importing it would make affected selection a lie — a facade-level
 *    change looks like a Loom change and nothing in the real graph is a
 *    Loom-dependent package. This check is also the edge's only reporter:
 *    check 5 maps facade subpaths onto the facade and stays silent, because
 *    the side-effect spelling is invisible to its `from`/`import(` grammar
 *    and a second report for the same import is noise.
 *
 * 3. A package that owns browser evidence — specs under its own `e2e/`
 *    directory (the glob `packages/<tier>/<name>/e2e/*.e2e.ts`) — must
 *    actually carry the `e2e` tag — meaning it has a Moon e2e task (see
 *    .moon/tasks/e2e.yml `inheritedBy: tags: [e2e]`). An orphan spec would
 *    silently run in nobody's Moon graph.
 *
 * 4. Every component directory is a Moon project: `moon.yml` exists and
 *    `package.json` exists with an `exports` field.
 *
 * 5. Layer direction: an internal package may import only packages at or
 *    below its own layer — layout-engine/core → labels → primitives →
 *    composition → patterns → layouts → facade. An upward edge is the general form of the
 *    check-2 facade ban, which is its topmost case.
 *
 * 6. The internal src edge set contains no cycles, reported as paths. A cycle
 *    needs a same-layer or downward return edge, which check 5 allows, so it
 *    is checked on top of it.
 *
 * 7. Every internal spec a package's src imports is declared in that
 *    package's package.json. An import without a declared dependency is an
 *    edge check 1 never mirrors into moon, so `--affected` would miss it.
 *
 * 8. The published build carries zero engine bytes, as an import-graph fact:
 *    no module under the facade reaches a `./layout` adapter by relative
 *    path, no barrel below the facade re-exports one (relatively or through
 *    a package's own deep specifier), and the engine is reached by no
 *    specifier — package or relative, at any subpath depth — outside the
 *    engine itself and the composition adapters' `src/layout.ts`. This is
 *    check 5's former engine judgment (D3/M1 of the gap analysis), now
 *    file-precise and scanned across whole package directories rather than
 *    src trees only.
 *
 * The body is a pure `runChecks(root)` so the rules can be exercised against
 * fixture trees in tools/check-architecture.test.ts; the CLI entry at the
 * bottom runs it against the real repository and exits non-zero on any
 * violation.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { internalPackages, TIERS, type Layer } from "./architecture/graph.ts";

/** Every violation the rules found, one human-readable string each. */
export function runChecks(root: string): string[] {
  const failures: string[] = [];

  function fail(message: string): void {
    failures.push(message);
  }

  // ---- 1. Moon deps == pnpm workspace deps -----------------------------
  // Only meaningful against the real repository: sync-moon-deps.ts resolves
  // its own ROOT (the repo, not the `root` passed here) and compares each
  // package's package.json against its moon.yml. A fixture tree has no
  // moon.yml, so the comparison would be against the real repo's files — a
  // test that validates the wrong thing and turns on a real-repo drift the
  // fixture did not cause. The fixture tests exercise checks 2-7; check 1 is
  // the CLI/repo-only delegation.
  if (root === ROOT()) {
    try {
      const check = execFileSync(
        process.execPath,
        ["--experimental-strip-types", join(import.meta.dirname, "sync-moon-deps.ts"), "--check"],
        { cwd: root, encoding: "utf8" },
      );
      process.stdout.write(check);
    } catch (err) {
      const stdout = (err as Error & { stdout?: string }).stdout ?? "";
      if (stdout) process.stdout.write(stdout);
      for (const line of String(err).split("\n")) if (line.length) fail(line);
    }
  }

  // ---- 2. no package below the facade may import it ------------------------
  // The specifier is assembled rather than written out because the parser in
  // eslint's project-service mode trips over a bare at-ecoma-io-slash-loom token
  // inside a string literal (module-declaration name parsing). Same bytes, no
  // parse error.
  //
  // Check 2 owns the facade edge outright, and that is deliberate rather than
  // historical: it is the only reader whose specifier grammar reaches every
  // spelling. Check 5's INTERNAL_SPEC requires a `from "…"` or `import("…")`
  // prefix, so the bare side-effect form (`import "@ecoma-io/loom"`) never
  // matches it; and the dashed subpath (`@ecoma-io/loom/theme-css`) is exactly
  // the shape the old `(?:/\w+)?` group was blind to. The group is now
  // `[\w-]+` — the grammar INTERNAL_SPEC already carried — so both readers
  // accept one set of spellings, while check 5 maps subpaths onto the facade
  // and reports nothing: one import, one report.
  const FACADE_SPEC = ["@ecoma-io", "loom"].join("/");
  const FACADE_TARGET = `${FACADE_SPEC}(?:/[\\w-]+)?`;
  const FACADE_IMPORT = new RegExp(
    `from\\s+["'\`]${FACADE_TARGET}["'\`]` +
      `|import\\s*\\(\\s*["'\`]${FACADE_TARGET}["'\`]` +
      // The bare side-effect form has no `from` and no call parens — the one
      // spelling that escaped every reader, this checker included, before 2G.
      `|import\\s+["'\`]${FACADE_TARGET}["'\`]`,
  );
  const packages = internalPackages(root);
  for (const pkg of packages) {
    if (pkg.stylesOnly || pkg.name === "loom") continue;
    walkSrcFiles(pkg, (file, text) => {
      if (FACADE_IMPORT.test(text)) {
        fail(
          `${labelOf(pkg)}: ${rel(root, file)} imports the public facade (or a facade subpath) — that edge would corrupt affected selection`,
        );
      }
    });
  }

  // ---- 3. e2e specs require an e2e-tagged Moon project -------------------
  for (const tier of TIERS) {
    for (const name of readdirSync(join(root, "packages", tier))) {
      const e2eDir = join(root, "packages", tier, name, "e2e");
      if (!isDirectoryWithSpecs(e2eDir)) continue;
      // The tag is parsed, not searched for: a substring test on the whole file
      // (`moonText.includes("e2e")`) is satisfied by the word "e2e" anywhere —
      // a comment, a path, another tag — so a project tagged `["a11y"]` would
      // pass despite owning specs nobody's graph runs. The actual `tags:` list
      // is the only thing that decides whether the shared e2e task inherits.
      const tags = parseTags(readFileSync(join(root, "packages", tier, name, "moon.yml"), "utf8"));
      if (!tags.includes("e2e")) {
        fail(`${tier}/${name}: owns e2e/ specs but its moon.yml tags omit \`e2e\``);
      }
    }
  }

  /** The `tags:` YAML list in a project's moon.yml, e.g. `["e2e"]`. */
  function parseTags(moonText: string): string[] {
    const match = /^tags:\s*\[(.*)\]$/m.exec(moonText);
    if (!match) return [];
    return (match[1] ?? "")
      .split(",")
      .map((tag) => tag.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
  }

  function isDirectoryWithSpecs(dir: string): boolean {
    if (!existsSync(dir)) return false;
    return readdirSync(dir).some((f) => f.endsWith(".e2e.ts"));
  }

  // ---- 4. every component dir is a Moon project --------------------------
  for (const tier of TIERS) {
    for (const name of readdirSync(join(root, "packages", tier))) {
      const dir = join(root, "packages", tier, name);
      if (!existsSync(join(dir, "moon.yml")))
        fail(`${tier}/${name}: missing moon.yml (Moon project stub)`);
      const pkgPath = join(dir, "package.json");
      if (!existsSync(pkgPath)) {
        fail(`${tier}/${name}: missing package.json`);
      } else {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { exports?: unknown };
        if (!pkg.exports) fail(`${tier}/${name}: package.json is missing an \`exports\` entry`);
      }
    }
  }

  // ---- 5/6/7. layer direction, cycles, declared deps ----------------------
  // The package set and src trees come from tools/architecture/graph.ts — one
  // filesystem-backed registry instead of the four hand lists (vite aliases,
  // tsconfig paths, facade deps, moon glob) that used to drift apart.
  const specToPackage = new Map(packages.map((pkg) => [pkg.spec, pkg] as const));
  const graphPackages = packages.filter((pkg) => !pkg.stylesOnly);

  // Rank of each layer in the dependency direction. A package may import at or
  // below its own rank; the facade (6) is the top, and check 2 already reports
  // the forbidden edge into it — here it is simply the highest upward case.
  //
  // The layout engine sits at Foundation rank 0 on purpose — its rank says
  // "below everything", yet only the composition adapters may import it. A
  // rank number cannot express that, so the engine edge is not judged by rank
  // here at all: check 8 owns it, against the same real-consumer-set argument
  // D3/M1 of the gap analysis recorded, now file-precise and scanned across
  // whole package directories.
  const LAYERS = {
    core: 0,
    labels: 1,
    "layout-engine": 0,
    primitives: 2,
    composition: 3,
    patterns: 4,
    layouts: 5,
    loom: 6,
  } satisfies Record<Exclude<Layer, "theme-core">, number>;
  const DIRECTION =
    "layout-engine/core → labels → primitives → composition → patterns → layouts → facade";

  // The specifier side of `from "…"`, `export … from "…"`, and `import("…")` —
  // quoted string or backtick template literal. A facade subpath
  // (`@ecoma-io/loom/theme`) is the facade and is treated as such below; the
  // bare `@ecoma-io/loom` and each `@ecoma-io/loom-<name>` package are the
  // internal graph. Doc comments naming an `@ecoma-io/loom/…` subpath cannot
  // match because the regex requires a `from "` / `import(` prefix.
  const INTERNAL_SPEC =
    /(?:from\s+|import\s*\(\s*)["'`](@ecoma-io\/loom(?:-[a-z0-9-]+)?(?:\/[\w-]+)?)["'`]/g;

  interface InternalEdge {
    from: (typeof graphPackages)[number];
    to: (typeof graphPackages)[number];
    file: string;
  }

  const edges: InternalEdge[] = [];
  for (const pkg of graphPackages) {
    const importedSpecs = new Set<string>();
    walkSrcFiles(pkg, (file, text) => {
      for (const match of text.matchAll(INTERNAL_SPEC)) {
        const rawSpec = match[1];
        if (!rawSpec) continue;
        // A facade subpath (`@ecoma-io/loom/theme`) is an edge to the facade
        // itself: the subpath is part of the public surface, so importing it
        // is importing the facade, and the lookup below must land on it.
        const spec = rawSpec.startsWith(`${FACADE_SPEC}/`) ? FACADE_SPEC : rawSpec;
        const to = specToPackage.get(spec);
        if (!to) {
          fail(
            `${labelOf(pkg)}: ${rel(root, file)} imports ${spec} — not a known internal package`,
          );
          continue;
        }
        if (to.stylesOnly) {
          fail(
            `${labelOf(pkg)}: ${rel(root, file)} imports ${spec} — theme-core is CSS that is copied, never imported`,
          );
          continue;
        }
        // The facade edge belongs to check 2, and records nothing here: not
        // the failure (one import, one report — check 2 is the only reader
        // that also sees the bare side-effect spelling), not the undeclared-
        // dependency demand check 7 would raise beside it, and not the
        // cycle-graph edge, which is safe to drop because the facade
        // terminates the graph — a cycle through it already contains the edge
        // check 2 reported.
        if (to.spec === FACADE_SPEC) continue;
        importedSpecs.add(to.spec);
        edges.push({ from: pkg, to, file });
        // graphPackages already excluded theme-core (stylesOnly), and the
        // facade is handled above, so both tiers are real layer keys.
        const fromRank = LAYERS[pkg.tier as Exclude<Layer, "theme-core">];
        const toRank = LAYERS[to.tier as Exclude<Layer, "theme-core">];
        if (toRank > fromRank) {
          fail(
            `${labelOf(pkg)}: ${rel(root, file)} imports ${to.spec} — ${to.tier} (rank ${String(toRank)}) is above ${pkg.tier} (rank ${String(fromRank)}); imports point only downward (${DIRECTION})`,
          );
        }
      }
    });

    // Check 7. Only this direction is enforced: an import package.json does not
    // declare is an edge moon never mirrors, so a change to the imported package
    // would not flag this one affected. A declared dependency that src no longer
    // imports over-invalidates instead — extra affected runs, never missing ones
    // — so it is left to cleanup rather than failed here.
    if (importedSpecs.size === 0) continue;
    const pkgJson = JSON.parse(readFileSync(join(pkg.dir, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    for (const spec of importedSpecs) {
      if (!pkgJson.dependencies?.[spec]) {
        fail(
          `${labelOf(pkg)}: src imports ${spec} but package.json does not declare it — moon would not mark this package affected`,
        );
      }
    }
  }

  // Check 6. DFS over the same edge set, reporting each cycle once, rotated to
  // start at its lexicographically smallest node so the same cycle is not
  // reported anew from each of its entry points.
  const adjacency = new Map<string, string[]>(graphPackages.map((pkg) => [pkg.spec, []]));
  for (const { from, to } of edges) {
    const targets = adjacency.get(from.spec);
    if (targets) targets.push(to.spec);
  }
  const reportedCycles = new Set<string>();
  const path: string[] = [];
  const color = new Map<string, "gray" | "black">();
  const visit = (spec: string): void => {
    color.set(spec, "gray");
    path.push(spec);
    for (const next of adjacency.get(spec) ?? []) {
      const state = color.get(next);
      if (state === "gray") {
        // A back edge to a node still on the path closes a cycle at that node.
        const cycle = path.slice(path.indexOf(next));
        const start = [...cycle].sort()[0];
        if (start === undefined) continue;
        const first = cycle.indexOf(start);
        const reported = [...cycle.slice(first), ...cycle.slice(0, first), start].join(" -> ");
        if (!reportedCycles.has(reported)) {
          reportedCycles.add(reported);
          fail(`cycle: ${reported}`);
        }
      } else if (state === undefined) {
        visit(next);
      }
    }
    path.pop();
    color.set(spec, "black");
  };
  for (const pkg of graphPackages) {
    if (!color.has(pkg.spec)) visit(pkg.spec);
  }

  // ---- 8. the published build carries zero engine bytes -------------------
  // contract.md states that as an import-graph fact and, until 2G, held it
  // with a one-time byte comparison against the pre-slice build — prose that a
  // barrel re-export chain would sail through. The fact has three failure
  // modes, and each is its own rule below:
  //
  // (a) the facade reaching a layout adapter by relative path. `./layout` is
  //     the adapter filename in every composition and the engine's own
  //     internals; no module under packages/loom has any business naming
  //     it, because the facade is the bundle root — one edge from it and the
  //     engine ships inside every consumer import, whatever tree-shaking does.
  // (b) a barrel re-exporting an adapter outward. That file names no engine
  //     specifier, so the engine rule cannot see it, and composition → engine
  //     is a *legal* edge for every other reader — this chain is exactly the
  //     one that passed both readers before this check existed. Only the
  //     engine's own index may re-export `./layout`: while the other rules
  //     hold, nothing consumer-reachable imports the engine at all.
  // (c) the engine specifier naming a file outside its legitimate set,
  //     enumerated from the tree rather than recalled: the engine itself, and
  //     the composition adapters at `src/layout.ts` — the same two entries the
  //     boundary rows and the interface contract state. This is check 5's
  //     former engine judgment (D3/M1), moved here so one check owns the
  //     engine edge end to end and can be file-precise about it: a
  //     composition importing the engine from its component rather than its
  //     adapter is reaching past the seam the contract names. The scan walks
  //     whole package directories rather than src trees, and enumerates
  //     packages through the graph registry — so an untracked migration husk
  //     under packages/ is never read. Files outside packages/ are out of
  //     scope on purpose: templates, docs and the E2E suites reach the library
  //     only through the facade (their own boundary rows say so), while the
  //     checker's own configs legitimately *name* the specifier — tsconfig
  //     paths, the vite alias, the mutation harness — and an allow-list of the
  //     checker itself is how allow-lists rot.
  const ENGINE_SPEC = ["@ecoma-io", "loom-layout-engine"].join("/");
  const INTERNAL_PKG_PREFIX = ["@ecoma-io", "loom-"].join("/");
  // `from "…/layout"`, `import("…/layout")` and the bare `import "…/layout"` —
  // the same three-form context the facade regex uses, against a relative
  // specifier that resolves to a module named layout (`./layout`,
  // `../src/layout`, `../../composition/stack/src/layout`). "Any module named
  // layout" is an approximation, accepted so the rule stays resolution-free:
  // if it ever fires on a module that is not an adapter, the answer is an
  // explicit allow-list entry here — never a quiet narrowing of the pattern.
  const LAYOUT_EDGE = new RegExp(
    `(?:from\\s+|import\\s*\\(\\s*|import\\s+)["'\`](?:\\.\\.?/)+(?:[\\w-]+/)*layout["'\`]`,
  );
  // A re-export is the outward edge: `export { layout } from "./layout"`,
  // `export * from "./layout"`, `export type { … } from "./layout"`. Two shapes
  // the first cut missed, each probed against this checker before the grammar
  // moved: prettier wraps the clause across lines (`export {\n  layout,\n}
  // from …`), so the export→from gap is `[^;]` — newline-tolerant, still
  // bounded by the statement's semicolon so the lazy gap cannot reach into a
  // later statement; and a barrel can name the adapter without `./layout`
  // text at all, through its own package's deep specifier
  // (`…/loom-stack/src/layout`), which resolves to the same file. The plain
  // imports inside the adapter's own package — its unit tests, its
  // conformance cases — are the adapter working as designed and must stay
  // legal.
  const LAYOUT_REEXPORT = new RegExp(
    `export\\s[^;]*?from\\s*["'\`]` +
      `(?:(?:\\.\\.?/)+(?:[\\w-]+/)*|${INTERNAL_PKG_PREFIX}[\\w-]+(?:/[\\w-]+)*/)layout["'\`]`,
  );
  // The engine edge, under the spellings text can see. The package form names
  // the engine at any subpath depth — the bare-specifier-only grammar let
  // `…engine/src/pure` compile unseen. The relative form is the same edge
  // spelled so it needs no tsconfig entry to compile
  // (`../../layout-engine/src/index`); it keys on the climb naming the
  // engine's directory, exact today because no other directory in the tree
  // carries that name. One spelling the grammar deliberately does not claim:
  // a dynamic import whose specifier is interpolated resolves to nothing
  // until run time, and a text reader that claimed to see it would promise
  // more than it does.
  const ENGINE_PACKAGE_IMPORT = new RegExp(
    `(?:from\\s+|import\\s*\\(\\s*|import\\s+)["'\`]${ENGINE_SPEC}(?:/[\\w-]+)*["'\`]`,
  );
  const ENGINE_RELATIVE_IMPORT = new RegExp(
    `(?:from\\s+|import\\s*\\(\\s*|import\\s+)["'\`](?:\\.\\.?/)+(?:[\\w-]+/)*layout-engine(?:/[\\w-]+)*["'\`]`,
  );
  for (const pkg of graphPackages) {
    const isEngine = pkg.tier === "layout-engine";
    walkPackageFiles(pkg, (file, text) => {
      if (pkg.tier === "loom" && LAYOUT_EDGE.test(text)) {
        fail(
          `${labelOf(pkg)}: ${rel(root, file)} reaches a layout adapter by relative path — the facade is the bundle root, so one edge from it ships engine bytes in every consumer import`,
        );
      }
      // The loom exclusion is dedup, not scope: rule (a)'s `from "./layout"`
      // clause already reports the facade's own re-export of the adapter, and
      // one edge is one report.
      if (!isEngine && pkg.tier !== "loom" && LAYOUT_REEXPORT.test(text)) {
        fail(
          `${labelOf(pkg)}: ${rel(root, file)} re-exports a layout adapter — only the engine's own index may re-export ./layout; an exported adapter puts engine bytes on the consumer path through the facade's re-export of this package`,
        );
      }
      // Both spellings are the same edge, so they share the condition, the
      // allow-list (the engine itself, each adapter's exact src/layout.ts) and
      // the message — one engine import, one report.
      if (
        (ENGINE_PACKAGE_IMPORT.test(text) || ENGINE_RELATIVE_IMPORT.test(text)) &&
        !isEngine &&
        file !== join(pkg.dir, "src", "layout.ts")
      ) {
        fail(
          `${labelOf(pkg)}: ${rel(root, file)} imports the layout engine — its only consumers are the engine itself and the composition adapters' src/layout.ts (${DIRECTION}); any other edge ships engine bytes in the published build`,
        );
      }
    });
  }

  return failures;
}

/**
 * Every .ts/.vue file below a package's src tree, read and passed to `visit`
 * as (file, text). Files outside src — a package's own tests and e2e specs —
 * are not part of the internal src edge set.
 */
function walkSrcFiles(pkg: { srcDir: string }, visit: (file: string, text: string) => void): void {
  if (!existsSync(pkg.srcDir)) return;
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(join(dir, entry.name));
        continue;
      }
      if (!/\.(ts|vue)$/.test(entry.name)) continue;
      // Comments are documentation, not imports: a doc comment that *shows* an
      // import of a facade subpath (`core/src/theme.ts`'s `@example` block
      // imports from `@ecoma-io/loom/theme`) must not be treated as an edge.
      // Stripping comments before matching keeps the rules honest while
      // leaving documentation free to show consumers how to import.
      visit(join(dir, entry.name), stripComments(readFileSync(join(dir, entry.name), "utf8")));
    }
  };
  walk(pkg.srcDir);
}

/**
 * Every .ts/.vue file below a package's whole directory — src, tests and e2e —
 * read and passed to `visit` as (file, text). Check 8 scans the whole
 * directory on purpose: an engine import hiding in a component's test or a
 * conformance case is not consumer-reachable, but it is still the edge the
 * boundary rows forbid, and the adapter seam is a file (`src/layout.ts`), not
 * a tier. `node_modules` is skipped because a package can carry one (pnpm's
 * workspace links) and nothing under it is this package's source — the same
 * reason untracked residue must never join a scan of the tree.
 */
function walkPackageFiles(pkg: { dir: string }, visit: (file: string, text: string) => void): void {
  if (!existsSync(pkg.dir)) return;
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        walk(join(dir, entry.name));
        continue;
      }
      if (!/\.(ts|vue)$/.test(entry.name)) continue;
      visit(join(dir, entry.name), stripComments(readFileSync(join(dir, entry.name), "utf8")));
    }
  };
  walk(pkg.dir);
}

/**
 * Remove `//` line comments and `/* … *&#47;` block comments. Approximate on
 * purpose — this is a heuristic to keep doc comments from tripping import
 * detection, not a parser — so string literals that contain `//` (a URL, a
 * path) are left intact, which is the conservative direction for a check.
 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** `primitives/button` for a component, plain `core` for the fixed packages. */
function labelOf(pkg: { tier: string; name: string }): string {
  return pkg.tier === pkg.name ? pkg.name : `${pkg.tier}/${pkg.name}`;
}

/** Path relative to the repo root, so a violation message points at a real file. */
function rel(root: string, file: string): string {
  return file.slice(root.length + 1);
}

// CLI entry — run against the real repository and exit non-zero on violations.
if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  const failures = runChecks(ROOT());
  if (failures.length) {
    for (const f of failures) console.error(`architecture: ${f}`);
    console.error(`\n${String(failures.length)} architecture violation(s). Fix before pushing. `);
    process.exit(1);
  }
  console.log("architecture checks pass.");
}

function ROOT(): string {
  return join(import.meta.dirname, "..");
}
