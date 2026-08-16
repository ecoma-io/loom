// Every component ships five artifacts, and this is what says so.
//
// A component that exists but is not exported compiles, passes its tests and
// is unreachable. One with no demo cannot be seen; one with no documentation
// page cannot be found; one with no test is a promise nobody checked. Each of
// those failures is silent — nothing in a normal build has an opinion about a
// file that was never written — so the pairing is asserted here rather than
// left to whoever reviews the pull request remembering all four.
//
// The tree is packages/ (kebab-case directories under a tier), and a
// component's artifacts are checked against the layout it has there. Its demo
// lives in the documentation site (`docs/demos/`), which renders it, so the
// demo is not re-asserted here as a file — the docs page that must carry the
// `@api` marker is what ties the component to the site.
//
// Run: `node tools/check-component-artifacts.ts`
import { readdir, readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

/**
 * A tier of component, and the directories that differ between them.
 *
 * Components live under `packages/<tier>/<kebab-name>/`, with their source
 * file in `src/` and their test in `tests/`, and a documentation page under
 * `docs/`.
 */
const TIERS = [
  { noun: "primitive", tier: "packages/primitives", docs: "docs/components" },
  { noun: "composition", tier: "packages/composition", docs: "docs/composition" },
  { noun: "block", tier: "packages/blocks", docs: "docs/blocks" },
  { noun: "layout", tier: "packages/layouts", docs: "docs/layouts" },
] as const;

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

// Every component must be exported from the facade — that is what makes it
// reachable. The export read is matched against the import path rather than
// the identifier, because a re-export can be renamed and the path cannot.
const facadeIndexSource = await readFile(new URL("packages/loom/src/index.ts", ROOT), "utf8");

const failures: string[] = [];
const counts: string[] = [];

for (const tier of TIERS) {
  const root = new URL(`${tier.tier}/`, ROOT);

  // Package directories are kebab-case (button, separator). They are keyed to
  // PascalCase for uniform checking — that is the name the component file, the
  // docs @api marker, and the export identifier all use.
  const kebabs = await subdirectories(root);
  const byPascal = new Map<string, string>();
  for (const kebab of kebabs) byPascal.set(toPascal(kebab), kebab);

  // The tool discovers from the tree, so the count is the true membership.
  counts.push(`${String(byPascal.size)} ${tier.noun}(s)`);

  for (const [pascalName, kebabName] of byPascal) {
    const srcDir = new URL(`${kebabName}/src/`, root);
    const testsDir = new URL(`${kebabName}/tests/`, root);
    const pagePath = `${tier.docs}/${kebabName}.md`;
    const page = new URL(pagePath, ROOT);

    const checks: [string, boolean][] = [
      [
        `${tier.tier}/${kebabName}/src/${pascalName}.vue`,
        await exists(new URL(`${pascalName}.vue`, srcDir)),
      ],
      [
        `${tier.tier}/${kebabName}/tests/${pascalName}.test.ts`,
        await exists(new URL(`${pascalName}.test.ts`, testsDir)),
      ],
      [pagePath, await exists(page)],
    ];

    // The export is what makes the component reachable at all.
    const facadeSpecifier = `@ecoma-io/loom-${kebabName}`;
    if (!facadeIndexSource.includes(facadeSpecifier)) {
      failures.push(`${pascalName}: not exported from packages/loom/src/index.ts`);
    }

    for (const [path, ok] of checks) {
      if (!ok) failures.push(`${pascalName}: missing ${path}`);
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
      `a documentation page carrying its @api marker, and an export from packages/loom/src/index.ts.`,
  );
  process.exit(1);
}

console.log(`Component artifacts complete for ${counts.join(" and ")}.`);
