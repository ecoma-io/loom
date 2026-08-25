/**
 * The gate on the vendored agent skills.
 *
 * `sync-skills.ts` explains why two directories hold the same skills and what
 * separates a vendored file from an owned one. This asserts that what is
 * committed still matches that arrangement, and it runs over the whole tree
 * rather than over a glob of changed files — every drift it exists to catch
 * sits in a file the commit never touched.
 *
 * The direction that matters is the third one below. A hand-edit and a drifted
 * mirror both leave a diff a reviewer can see. **A dependency bump with no
 * re-sync leaves none at all**: both copies stay perfectly consistent with each
 * other and with the manifest while both go stale against the release they
 * claim to be. The only thing that catches it is comparing the version the
 * manifest recorded against the version `package.json` now pins, which is why
 * the pin must be exact — a range makes the comparison meaningless, so a range
 * is itself a failure.
 *
 * `readFacts` touches the filesystem and `evaluate` does not, so the tests
 * exercise every direction below as plain data.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const MANIFEST = join(ROOT, "tools", "skills.manifest.json");
const PACKAGE = "@ecoma-io/archkeep";

/** An exact semver pin — no range operator, no tag, no url. */
const EXACT_PIN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export interface Manifest {
  vendor: { package: string; version: string; ref: string; source: string; skills: string[] };
  owned: string[];
  writes: string[];
  hashes: Record<string, string>;
}

export interface Facts {
  /** Null when the file is missing or unparseable; both are failures. */
  manifest: Manifest | null;
  manifestError: string | null;
  /** Whatever `package.json` declares, verbatim, so a range can be reported as one. */
  pin: string | null;
  /** Every file actually present under a managed tree, keyed repo-relative. */
  present: Record<string, string>;
  trees: readonly string[];
}

const sha256 = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
const key = (absolute: string): string => relative(ROOT, absolute).split(sep).join(posix.sep);

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(path));
    else out.push(path);
  }
  return out.sort();
}

/** The skill a managed path belongs to — `.claude/skills/arch-check/X` -> `arch-check`. */
function skillOf(path: string, tree: string): string | null {
  const rest = path.slice(tree.length + 1);
  const slash = rest.indexOf("/");
  return slash === -1 ? null : rest.slice(0, slash);
}

export function readFacts(trees: readonly string[]): Facts {
  let manifest: Manifest | null = null;
  let manifestError: string | null = null;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as Manifest;
  } catch (error) {
    manifestError = error instanceof Error ? error.message : String(error);
  }

  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    devDependencies?: Record<string, string>;
  };

  const present: Record<string, string> = {};
  for (const tree of trees) {
    for (const file of filesUnder(join(ROOT, tree)))
      present[key(file)] = sha256(readFileSync(file));
  }

  return {
    manifest,
    manifestError,
    pin: pkg.devDependencies?.[PACKAGE] ?? null,
    present,
    trees,
  };
}

/** Every way the committed trees can stop matching what they claim to be. */
export function evaluate(facts: Facts): string[] {
  const problems: string[] = [];
  const { manifest, trees } = facts;

  if (!manifest) {
    return [
      `tools/skills.manifest.json is missing or unreadable (${facts.manifestError ?? "no reason"}).` +
        ` Run \`pnpm sync-skills\`.`,
    ];
  }

  // An empty manifest passes every hash comparison there is. Read as a clean
  // scan it is the most dangerous state this file can be in, so it is named
  // before anything is compared.
  if (Object.keys(manifest.hashes).length === 0) {
    problems.push(
      "tools/skills.manifest.json records no hashed files, so every check below would" +
        " compare nothing and pass. Run `pnpm sync-skills`.",
    );
  }
  if (manifest.vendor.skills.length === 0) {
    problems.push("tools/skills.manifest.json records no vendored skills. Run `pnpm sync-skills`.");
  }

  if (facts.pin === null) {
    problems.push(`${PACKAGE} is not a devDependency, but skills are vendored from it.`);
  } else if (!EXACT_PIN.test(facts.pin)) {
    problems.push(
      `${PACKAGE} is pinned as "${facts.pin}", which is a range. Vendored files are a copy of` +
        ` one release, so the pin has to name that release exactly or a bump cannot be detected.`,
    );
  } else if (facts.pin !== manifest.vendor.version) {
    problems.push(
      `${PACKAGE} is pinned at ${facts.pin} but the skills were vendored from` +
        ` ${manifest.vendor.version}. A bump leaves no diff in these trees — both copies stay` +
        ` consistent with each other while both go stale. Run \`pnpm sync-skills\`.`,
    );
  }

  for (const [path, expected] of Object.entries(manifest.hashes)) {
    const actual = facts.present[path];
    if (actual === undefined) problems.push(`${path} is recorded in the manifest but missing.`);
    else if (actual !== expected) {
      problems.push(
        `${path} was edited by hand. Vendored files are held byte-identical to` +
          ` ${manifest.vendor.package}@${manifest.vendor.version}; change it upstream and re-sync.`,
      );
    }
  }

  // A file under a managed tree that the manifest never recorded, and that no
  // owned skill accounts for. Without this the trees could grow a skill that
  // nothing keeps in sync and nothing verifies.
  const owned = new Set(manifest.owned);
  for (const path of Object.keys(facts.present)) {
    if (path in manifest.hashes) continue;
    const tree = trees.find((t) => path.startsWith(`${t}/`));
    if (tree === undefined) continue;
    const skill = skillOf(path, tree);
    if (skill !== null && owned.has(skill)) continue;
    problems.push(
      `${path} is under a managed skills tree but is recorded nowhere. Add its skill to` +
        ` \`OWNED\` in tools/sync-skills.ts if this repository authors it, or run` +
        ` \`pnpm sync-skills\` if it should have been vendored.`,
    );
  }

  // Tree parity, which is what keeps an *owned* skill's mirror honest without
  // pinning its bytes: the hashes above cannot do it, because an owned skill
  // has none by design.
  const [authoring, ...mirrors] = trees;
  if (authoring !== undefined) {
    for (const path of Object.keys(facts.present)) {
      if (!path.startsWith(`${authoring}/`)) continue;
      const rest = path.slice(authoring.length);
      for (const mirror of mirrors) {
        const twin = `${mirror}${rest}`;
        if (!(twin in facts.present)) {
          problems.push(`${path} has no counterpart at ${twin}. Run \`pnpm sync-skills\`.`);
        } else if (facts.present[twin] !== facts.present[path]) {
          problems.push(
            `${path} and ${twin} have drifted apart. The two trees exist because no single one` +
              ` reaches every host, so they have to hold the same bytes. Run \`pnpm sync-skills\`.`,
          );
        }
      }
    }
    for (const mirror of mirrors) {
      for (const path of Object.keys(facts.present)) {
        if (!path.startsWith(`${mirror}/`)) continue;
        const twin = `${authoring}${path.slice(mirror.length)}`;
        if (!(twin in facts.present)) {
          problems.push(`${path} exists only in ${mirror}. Run \`pnpm sync-skills\`.`);
        }
      }
    }
  }

  return [...new Set(problems)].sort();
}

if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  const { TREES } = (await import("./sync-skills.ts")) as { TREES: readonly string[] };
  const problems = evaluate(readFacts(TREES));
  for (const problem of problems) console.error(`  ${problem}`);
  if (problems.length > 0) {
    console.error(
      `\n${String(problems.length)} skill-tree problem(s). These directories are what every` +
        ` coding agent in this repository reads before it does anything else.`,
    );
    process.exit(1);
  }
  console.log(`skills: ${String(Object.keys(readFacts(TREES).present).length)} files consistent`);
}
