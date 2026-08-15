// Every component ships five artifacts, and this is what says so.
//
// A component that exists but is not exported compiles, passes its tests and
// is unreachable. One with no demo cannot be seen; one with no documentation
// page cannot be found; one with no test is a promise nobody checked. Each of
// those failures is silent — nothing in a normal build has an opinion about a
// file that was never written — so the pairing is asserted here rather than
// left to whoever reviews the pull request remembering all four.
//
// During the dual-architecture migration, components may live under either the
// legacy src/ tree (PascalCase directories) or the new packages/ tree
// (kebab-case directories). The tool discovers both, and checks each
// component's artifacts against the tree it actually lives in. A component
// that has migrated to packages/ is checked against the new layout; one that
// remains in src/ is checked against the old layout.
//
// Run: `node tools/check-component-artifacts.ts`
import { readdir, readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

/**
 * A tier of component, and the directories that differ between them.
 *
 * During the dual-architecture migration, a tier has two possible source
 * locations: the legacy `src/<tier>/` and the new `packages/<tier>/`. A
 * component that has migrated to `packages/` is checked against the new
 * artifact layout; one that remains in `src/` is checked against the old one.
 */
const TIERS = [
  {
    noun: "primitive",
    legacy: "src/primitives",
    modern: "packages/primitives",
    docs: "docs/components",
  },
  {
    noun: "composition",
    legacy: "src/composition",
    modern: "packages/composition",
    docs: "docs/composition",
  },
  { noun: "block", legacy: "src/blocks", modern: "packages/blocks", docs: "docs/blocks" },
  { noun: "layout", legacy: "src/layouts", modern: "packages/layouts", docs: "docs/layouts" },
] as const;

/** `PressableCard` → `pressable-card`, the docs page and package directory name. */
function toKebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/** `pressable-card` → `PressableCard`, the component and file name. */
function toPascal(name: string): string {
  return name.replace(/(^|[-_])([a-z])/g, (_match, _sep, char: string) => char.toUpperCase());
}

async function exists(url: URL): Promise<boolean> {
  try {
    await readFile(url);
    return true;
  } catch {
    return false;
  }
}

/** Read a directory's immediate subdirectories, silently returning an empty array if the directory does not exist. */
async function subdirectories(url: URL): Promise<string[]> {
  try {
    const entries = await readdir(url, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

// During the migration, components may be exported from either src/index.ts or
// packages/loom/src/index.ts. Both are checked so that a migrated component is
// found in the facade and an unmigrated one is found in the legacy barrel.
const legacyIndexSource = await readFile(new URL("src/index.ts", ROOT), "utf8");
let facadeIndexSource = "";
try {
  facadeIndexSource = await readFile(new URL("packages/loom/src/index.ts", ROOT), "utf8");
} catch {
  // The facade doesn't exist yet — early in the migration this is expected.
}

const failures: string[] = [];
const counts: string[] = [];

for (const tier of TIERS) {
  const legacyRoot = new URL(`${tier.legacy}/`, ROOT);
  const modernRoot = new URL(`${tier.modern}/`, ROOT);

  // Legacy directories are PascalCase (Button, Separator). Modern directories
  // are kebab-case (button, separator). Both are keyed to PascalCase for
  // uniform checking — that is the name the component file, the docs @api
  // marker, and the export identifier all use.
  const legacyDirs = await subdirectories(legacyRoot);
  const modernKebabs = await subdirectories(modernRoot);
  const modernByPascal = new Map<string, string>();
  for (const kebab of modernKebabs) {
    modernByPascal.set(toPascal(kebab), kebab);
  }

  // A component may exist in both trees briefly during migration; that is fine
  // — it is checked once from the modern tree when it exists there.
  const allPascal = new Set([...legacyDirs, ...modernByPascal.keys()]);
  counts.push(`${String(allPascal.size)} ${tier.noun}(s)`);

  for (const pascalName of allPascal) {
    const kebabName = toKebab(pascalName);
    const pagePath = `${tier.docs}/${kebabName}.md`;
    const page = new URL(pagePath, ROOT);
    const isModern = modernByPascal.has(pascalName);

    if (isModern) {
      // New layout: packages/<tier>/<kebab>/src/<Pascal>.vue,
      // packages/<tier>/<kebab>/tests/<Pascal>.test.ts.
      const kebabDir = modernByPascal.get(pascalName);
      // `isModern` is true, so the map has the entry — but the type system
      // cannot see that. The fallback is never reached in practice.
      if (kebabDir === undefined) continue;
      const srcDir = new URL(`${kebabDir}/src/`, modernRoot);
      const testsDir = new URL(`${kebabDir}/tests/`, modernRoot);

      const checks: [string, boolean][] = [
        [
          `${tier.modern}/${kebabName}/src/${pascalName}.vue`,
          await exists(new URL(`${pascalName}.vue`, srcDir)),
        ],
        [
          `${tier.modern}/${kebabName}/tests/${pascalName}.test.ts`,
          await exists(new URL(`${pascalName}.test.ts`, testsDir)),
        ],
      ];

      // A migrated component must be exported from the facade.
      const facadeSpecifier = `@ecoma-io/loom-${kebabName}`;
      if (!facadeIndexSource.includes(facadeSpecifier)) {
        failures.push(`${pascalName}: not exported from packages/loom/src/index.ts`);
      }

      for (const [path, ok] of checks) {
        if (!ok) failures.push(`${pascalName}: missing ${path}`);
      }
    } else {
      // Legacy layout: src/<tier>/<Pascal>/<Pascal>.vue,
      // src/<tier>/<Pascal>/<Pascal>.test.ts, src/<tier>/<Pascal>/<Pascal>Demo.vue.
      const dir = new URL(`${pascalName}/`, legacyRoot);

      const checks: [string, boolean][] = [
        [
          `${tier.legacy}/${pascalName}/${pascalName}.vue`,
          await exists(new URL(`${pascalName}.vue`, dir)),
        ],
        [
          `${tier.legacy}/${pascalName}/${pascalName}.test.ts`,
          await exists(new URL(`${pascalName}.test.ts`, dir)),
        ],
        [
          `${tier.legacy}/${pascalName}/${pascalName}Demo.vue`,
          await exists(new URL(`${pascalName}Demo.vue`, dir)),
        ],
        [pagePath, await exists(page)],
      ];

      for (const [path, ok] of checks) {
        if (!ok) failures.push(`${pascalName}: missing ${path}`);
      }

      // The export is what makes the component reachable at all. Matched against
      // the import path rather than the identifier, because a re-export can be
      // renamed and the path cannot. `src/` is dropped because `src/index.ts`
      // writes the specifier relative to itself.
      const specifier = `./${tier.legacy.slice("src/".length)}/${pascalName}/${pascalName}.vue`;
      if (!legacyIndexSource.includes(specifier)) {
        failures.push(`${pascalName}: not exported from src/index.ts`);
      }
    }

    // A documentation page with no `@api` marker prints prose about a component
    // and no signature — the one thing a reader came for.
    if (await exists(page)) {
      const pageSource = await readFile(page, "utf8");
      if (!new RegExp(`<!--\\s*@api\\s+${pascalName}\\s*-->`).test(pageSource)) {
        failures.push(`${pascalName}: ${pagePath} has no <!-- @api ${pascalName} --> marker`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`Component artifacts incomplete (${String(failures.length)}):`);
  for (const failure of failures) console.error(`  • ${failure}`);
  console.error(
    `\nEvery component needs a component, a unit test, a demo, ` +
      `a documentation page carrying its @api marker, and an export from the barrel (src/index.ts or packages/loom/src/index.ts).`,
  );
  process.exit(1);
}

console.log(`Component artifacts complete for ${counts.join(" and ")}.`);
