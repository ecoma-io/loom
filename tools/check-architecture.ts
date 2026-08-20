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
 *    written `at-ecoma-io/loom` — as a bare import (checked under every
 *    internal src tree except packages/loom and theme-core's CSS). The
 *    facade's `deps: loom -> everything` is the publishing boundary; a
 *    component importing it would make affected selection a lie — a
 *    facade-level change looks like a Loom change and nothing in the real
 *    graph is a Loom-dependent package.
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
 *    below its own layer — core → labels → primitives → composition →
 *    layouts → blocks → facade. An upward edge is the general form of the
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
  // parse error. `(?:/…)?` covers the facade's subpaths (`@ecoma-io/loom/theme`,
  // `@ecoma-io/loom/a11y`) — they are the facade too, and a component that
  // imports one is importing the public surface.
  const FACADE_SPEC = ["@ecoma-io", "loom"].join("/");
  const FACADE_IMPORT = new RegExp(
    `from\\s+["'\`]${FACADE_SPEC}(?:/\\w+)?["'\`]|import\\s*\\(\\s*["'\`]${FACADE_SPEC}(?:/\\w+)?["'\`]`,
  );
  const packages = internalPackages(root);
  for (const pkg of packages) {
    if (pkg.stylesOnly || pkg.name === "loom") continue;
    walkSrcFiles(pkg, (_file, text) => {
      if (FACADE_IMPORT.test(text)) {
        fail(
          `${labelOf(pkg)}: src imports the public facade (or a facade subpath) — that edge would corrupt affected selection`,
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
  const LAYERS = {
    core: 0,
    labels: 1,
    primitives: 2,
    composition: 3,
    layouts: 4,
    blocks: 5,
    loom: 6,
  } satisfies Record<Exclude<Layer, "theme-core">, number>;
  const DIRECTION = "core → labels → primitives → composition → layouts → blocks → facade";

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
        importedSpecs.add(to.spec);
        edges.push({ from: pkg, to, file });
        if (to.spec === FACADE_SPEC) {
          fail(
            `${labelOf(pkg)}: ${rel(root, file)} imports the public facade — ${DIRECTION} ends there; nothing below packages/loom may import it`,
          );
          continue;
        }
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
