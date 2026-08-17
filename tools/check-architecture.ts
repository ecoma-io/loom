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
 * 2. No `packages/src` may import the public facade — the specifier written
 *    `at-ecoma-io/loom` — as a bare import (checked under every
 *    packages/<tier>/<name>/src tree). The facade's `deps: loom -> everything`
 *    is the publishing boundary; a component importing it would make affected
 *    selection a lie — a facade-level change looks like a Loom change and
 *    nothing in the real graph is a Loom-dependent package. The single
 *    exception is `packages/labels`, which imports the facade's label types
 *    `import type`-only (documented in vite.config.ts), and only that.
 *
 * 3. A package that owns browser evidence — specs under its own `e2e/`
 *    directory (the glob `packages/<tier>/<name>/e2e/*.e2e.ts`) — must
 *    actually carry the `e2e` tag — meaning it has a Moon e2e task (see
 *    .moon/tasks/e2e.yml `inheritedBy: tags: [e2e]`). An orphan spec would
 *    silently run in nobody's Moon graph.
 *
 * 4. Every component directory is a Moon project: `moon.yml` exists and
 *    `package.json` exists with an `exports` field.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");
const TIERS = ["primitives", "composition", "blocks", "layouts"];

let failures = 0;

function fail(message: string): void {
  console.error(`architecture: ${message}`);
  failures++;
}

// ---- 1. Moon deps == pnpm workspace deps -----------------------------
try {
  const check = execFileSync(
    process.execPath,
    ["--experimental-strip-types", join(import.meta.dirname, "sync-moon-deps.ts"), "--check"],
    { cwd: ROOT, encoding: "utf8" },
  );
  process.stdout.write(check);
} catch (err) {
  const stdout = (err as Error & { stdout?: string }).stdout ?? "";
  if (stdout) process.stdout.write(stdout);
  for (const line of String(err).split("\n")) if (line.length) fail(line);
}

// ---- 2. no component -> facade imports -------------------------------
// The specifier is assembled rather than written out because the parser in
// eslint's project-service mode trips over a bare at-ecoma-io-slash-loom token
// inside a string literal (module-declaration name parsing). Same bytes, no
// parse error.
const FACADE_SPEC = ["@ecoma-io", "loom"].join("/");
const FACADE_IMPORT = new RegExp(
  `from\\s+["']${FACADE_SPEC}["']|import\\s*\\(\\s*["']${FACADE_SPEC}["']`,
);
for (const tier of TIERS) {
  for (const name of readdirSync(join(ROOT, "packages", tier))) {
    const srcDir = join(ROOT, "packages", tier, name, "src");
    if (!existsSync(srcDir)) continue;
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          walk(join(dir, entry.name));
          continue;
        }
        if (!/\.(ts|vue)$/.test(entry.name)) continue;
        const text = readFileSync(join(dir, entry.name), "utf8");
        if (FACADE_IMPORT.test(text)) {
          fail(
            `${tier}/${name}: src imports the public facade — that edge would corrupt affected selection`,
          );
        }
      }
    };
    walk(srcDir);
  }
}

// ---- 3. e2e specs require an e2e-tagged Moon project -------------------
for (const tier of TIERS) {
  for (const name of readdirSync(join(ROOT, "packages", tier))) {
    const e2eDir = join(ROOT, "packages", tier, name, "e2e");
    if (!isDirectoryWithSpecs(e2eDir)) continue;
    // The tag is parsed, not searched for: a substring test on the whole file
    // (`moonText.includes("e2e")`) is satisfied by the word "e2e" anywhere —
    // a comment, a path, another tag — so a project tagged `["a11y"]` would
    // pass despite owning specs nobody's graph runs. The actual `tags:` list
    // is the only thing that decides whether the shared e2e task inherits.
    const tags = parseTags(readFileSync(join(ROOT, "packages", tier, name, "moon.yml"), "utf8"));
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
  for (const name of readdirSync(join(ROOT, "packages", tier))) {
    const dir = join(ROOT, "packages", tier, name);
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

if (failures) {
  console.error(`\n${String(failures)} architecture violation(s). Fix before pushing. `);
  process.exit(1);
}
console.log("architecture checks pass.");
