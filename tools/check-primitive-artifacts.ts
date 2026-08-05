// Every primitive ships four artifacts, and this is what says so.
//
// A component that exists but is not exported compiles, passes its tests and
// is unreachable. One with no demo cannot be seen; one with no documentation
// page cannot be found; one with no test is a promise nobody checked. Each of
// those failures is silent — nothing in a normal build has an opinion about a
// file that was never written — so the pairing is asserted here rather than
// left to whoever reviews the pull request remembering all four.
//
// Run: `node tools/check-primitive-artifacts.ts`
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ROOT = new URL("../", import.meta.url);
const PRIMITIVES = new URL("src/primitives/", ROOT);

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
const directories = await readdir(PRIMITIVES, { withFileTypes: true });
const failures: string[] = [];

for (const directory of directories) {
  if (!directory.isDirectory()) continue;
  const name = directory.name;
  const dir = new URL(`${name}/`, PRIMITIVES);
  const page = new URL(`docs/components/${toKebab(name)}.md`, ROOT);

  const checks: [string, boolean][] = [
    [`src/primitives/${name}/${name}.vue`, await exists(new URL(`${name}.vue`, dir))],
    [`src/primitives/${name}/${name}.test.ts`, await exists(new URL(`${name}.test.ts`, dir))],
    [`src/primitives/${name}/${name}Demo.vue`, await exists(new URL(`${name}Demo.vue`, dir))],
    [`docs/components/${toKebab(name)}.md`, await exists(page)],
  ];

  for (const [path, ok] of checks) {
    if (!ok) failures.push(`${name}: missing ${path}`);
  }

  // The export is what makes the component reachable at all. Matched against
  // the import path rather than the identifier, because a re-export can be
  // renamed and the path cannot.
  if (!indexSource.includes(`./primitives/${name}/${name}.vue`)) {
    failures.push(`${name}: not exported from src/index.ts`);
  }

  // A documentation page with no `@api` marker prints prose about a component
  // and no signature — the one thing a reader came for.
  if (await exists(page)) {
    const pageSource = await readFile(page, "utf8");
    if (!new RegExp(`<!--\\s*@api\\s+${name}\\s*-->`).test(pageSource)) {
      failures.push(
        `${name}: docs/components/${toKebab(name)}.md has no <!-- @api ${name} --> marker`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error(`Primitive artifacts incomplete (${String(failures.length)}):`);
  for (const failure of failures) console.error(`  • ${failure}`);
  console.error(
    `\nEvery primitive under ${fileURLToPath(PRIMITIVES)} needs a component, a unit test, ` +
      `a demo, a documentation page carrying its @api marker, and an export from src/index.ts.`,
  );
  process.exit(1);
}

console.log(`Primitive artifacts complete for ${String(directories.length)} primitive(s).`);
