// Every component ships four artifacts, and this is what says so.
//
// A component that exists but is not exported compiles, passes its tests and
// is unreachable. One with no demo cannot be seen; one with no documentation
// page cannot be found; one with no test is a promise nobody checked. Each of
// those failures is silent — nothing in a normal build has an opinion about a
// file that was never written — so the pairing is asserted here rather than
// left to whoever reviews the pull request remembering all four.
//
// Run: `node tools/check-component-artifacts.ts`
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ROOT = new URL("../", import.meta.url);

/**
 * The three tiers of component, and the only thing that differs between them.
 *
 * A block is composed where a primitive is configured, and a composition
 * primitive is layout where a block is content — but the pairing rule is one
 * rule, so it is written once and applied to all three.
 */
const TIERS = [
  { noun: "primitive", source: "src/primitives", docs: "docs/components" },
  { noun: "composition", source: "src/composition", docs: "docs/composition" },
  { noun: "block", source: "src/blocks", docs: "docs/blocks" },
] as const;

/** `PressableCard` → `pressable-card`, the docs page's filename. */
function toKebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

async function exists(url: URL): Promise<boolean> {
  try {
    await readFile(url);
    return true;
  } catch {
    return false;
  }
}

const indexSource = await readFile(new URL("src/index.ts", ROOT), "utf8");
const failures: string[] = [];
const counts: string[] = [];

for (const tier of TIERS) {
  const sourceRoot = new URL(`${tier.source}/`, ROOT);
  const directories = (await readdir(sourceRoot, { withFileTypes: true })).filter((entry) =>
    entry.isDirectory(),
  );
  counts.push(`${String(directories.length)} ${tier.noun}(s)`);

  for (const { name } of directories) {
    const dir = new URL(`${name}/`, sourceRoot);
    const pagePath = `${tier.docs}/${toKebab(name)}.md`;
    const page = new URL(pagePath, ROOT);

    const checks: [string, boolean][] = [
      [`${tier.source}/${name}/${name}.vue`, await exists(new URL(`${name}.vue`, dir))],
      [`${tier.source}/${name}/${name}.test.ts`, await exists(new URL(`${name}.test.ts`, dir))],
      [`${tier.source}/${name}/${name}Demo.vue`, await exists(new URL(`${name}Demo.vue`, dir))],
      [pagePath, await exists(page)],
    ];

    for (const [path, ok] of checks) {
      if (!ok) failures.push(`${name}: missing ${path}`);
    }

    // The export is what makes the component reachable at all. Matched against
    // the import path rather than the identifier, because a re-export can be
    // renamed and the path cannot. `src/` is dropped because `src/index.ts`
    // writes the specifier relative to itself.
    const specifier = `./${tier.source.slice("src/".length)}/${name}/${name}.vue`;
    if (!indexSource.includes(specifier)) {
      failures.push(`${name}: not exported from src/index.ts`);
    }

    // A documentation page with no `@api` marker prints prose about a component
    // and no signature — the one thing a reader came for.
    if (await exists(page)) {
      const pageSource = await readFile(page, "utf8");
      if (!new RegExp(`<!--\\s*@api\\s+${name}\\s*-->`).test(pageSource)) {
        failures.push(`${name}: ${pagePath} has no <!-- @api ${name} --> marker`);
      }
    }
  }
}

if (failures.length > 0) {
  const roots = TIERS.map((tier) => fileURLToPath(new URL(`${tier.source}/`, ROOT))).join(" and ");
  console.error(`Component artifacts incomplete (${String(failures.length)}):`);
  for (const failure of failures) console.error(`  • ${failure}`);
  console.error(
    `\nEvery component under ${roots} needs a component, a unit test, a demo, ` +
      `a documentation page carrying its @api marker, and an export from src/index.ts.`,
  );
  process.exit(1);
}

console.log(`Component artifacts complete for ${counts.join(" and ")}.`);
