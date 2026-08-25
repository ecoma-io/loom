/**
 * Vendor the Archkeep agent skills into the two directories the coding agents
 * this repository is worked in actually read, and record what was written.
 *
 * Measured on 2026-08-23 with a fixture holding one skill in each tree, then
 * asking each installed host what it could see:
 *
 * | host                | `.claude/skills/` | `.agents/skills/` |
 * | ------------------- | ----------------- | ----------------- |
 * | Claude Code 2.1.241 | reads             | does not read     |
 * | Codex 0.149.0       | does not read     | reads             |
 * | opencode 1.18.21    | reads             | reads             |
 *
 * Neither directory alone reaches all three, so the duplication is forced
 * rather than chosen — and `grep -aoE '\.(agents|claude)/skills' <claude
 * binary>` returns 104 hits for the first and none for the second, so it is
 * not a matter of waiting for a flag. opencode resolves a same-named skill in
 * both trees to one entry, so mirroring does not double-list anywhere.
 *
 * Copies, never symlinks: git on Windows without `core.symlinks` checks a
 * symlink out as a text file holding a path, which is a contributor with files
 * where the skills should be, no skills, and no error saying so.
 *
 * The source is the Archkeep *repository* at the pinned version's tag rather
 * than the package in `node_modules`: `skills/` exists in the repo but is
 * absent from the npm tarball's `files` array as of 0.14.0, so there is
 * nothing under `node_modules/@ecoma-io/archkeep/skills` to copy. The
 * `node_modules` path is tried first anyway, so this starts sourcing locally,
 * offline and without a tag lookup the day upstream ships it.
 *
 * Two populations live in these directories and the difference is the whole
 * design. **Vendored** skills are held byte-identical to an upstream release,
 * hashed in the manifest, and never hand-edited. **Owned** skills are this
 * repository's own, freely edited in `.claude/skills/` and mirrored outward
 * from there — never hashed against a recorded value, because a gate that
 * pins their bytes is a gate against editing them. What keeps a mirror honest
 * is tree-to-tree parity, which `check-skills.ts` asserts for both
 * populations.
 *
 * Usage:
 *   node --experimental-strip-types tools/sync-skills.ts [--from <dir>]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix, relative, sep } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const MANIFEST = join(ROOT, "tools", "skills.manifest.json");
const PACKAGE = "@ecoma-io/archkeep";
const REPO = "ecoma-io/archkeep";

/** Both trees are written; the first is also where owned skills are authored. */
export const TREES = [".claude/skills", ".agents/skills"] as const;

/**
 * Authored in `TREES[0]`, mirrored into the rest. Named here rather than
 * inferred, because "everything the manifest does not record" is exactly the
 * stray-file case the gate has to be able to reject.
 */
export const OWNED = ["add-component"] as const;

const README = `# Skills — generated, do not edit

Two directories hold the same skills because no single directory reaches every
host this repository is worked in:

| host        | \`.claude/skills/\` | \`.agents/skills/\` |
| ----------- | ----------------- | ----------------- |
| Claude Code | reads             | does not read     |
| Codex       | does not read     | reads             |
| opencode    | reads             | reads             |

\`arch-*\` is vendored from \`${PACKAGE}\` and held byte-identical to the pinned
release. Everything else is this repository's own, authored in
\`${TREES[0]}/\` and mirrored here.

Change either population with \`pnpm sync-skills\`, never by editing a file in
this directory. \`pnpm check-skills\` rejects a hand-edit, a drifted mirror, and
a dependency bump that was never re-synced.
`;

interface Manifest {
  /** How the vendored half was produced, and from which exact release. */
  vendor: { package: string; version: string; ref: string; source: string; skills: string[] };
  /** Authored here. Recorded so a stray directory is still an error. */
  owned: string[];
  /** Every path this script wrote, so the next run deletes only its own output. */
  writes: string[];
  /** Vendored bytes only. Owned skills are deliberately absent — see the docblock. */
  hashes: Record<string, string>;
}

const sha256 = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");

/** Repository-relative and slash-separated, so the manifest reads the same on Windows. */
const key = (absolute: string): string => relative(ROOT, absolute).split(sep).join(posix.sep);

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(path));
    else out.push(path);
  }
  return out;
}

/** The exact pin this repository declares. A range is rejected by the gate, not here. */
function pinnedVersion(): string {
  const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    devDependencies?: Record<string, string>;
  };
  const pin = manifest.devDependencies?.[PACKAGE];
  if (!pin) throw new Error(`${PACKAGE} is not a devDependency of this repository`);
  return pin;
}

/**
 * Where the upstream skills come from, most local first. The tag download is
 * the only step that needs a network, and it runs on a maintainer's machine
 * during a deliberate re-sync — never on a clone, a checkout or the gate.
 */
function sourceDir(version: string, explicit?: string): { dir: string; source: string } {
  if (explicit) {
    if (!existsSync(explicit)) throw new Error(`--from ${explicit} does not exist`);
    return { dir: explicit, source: `--from ${explicit}` };
  }
  const shipped = join(ROOT, "node_modules", PACKAGE, "skills");
  if (existsSync(shipped)) return { dir: shipped, source: `node_modules/${PACKAGE}/skills` };

  const ref = `v${version}`;
  const scratch = mkdtempSync(join(tmpdir(), "loom-skills-"));
  const archive = join(scratch, "source.tar.gz");
  execFileSync(
    "curl",
    ["-fsSL", "-o", archive, `https://codeload.github.com/${REPO}/tar.gz/refs/tags/${ref}`],
    { stdio: "pipe" },
  );
  execFileSync(
    "tar",
    ["-xzf", archive, "-C", scratch, "--strip-components=1", "--wildcards", "*/skills/*"],
    { stdio: "pipe" },
  );
  const dir = join(scratch, "skills");
  if (!existsSync(dir)) throw new Error(`${REPO}@${ref} carries no skills/ directory`);
  return { dir, source: `${REPO}@${ref}` };
}

export function sync(explicitFrom?: string): Manifest {
  const version = pinnedVersion();
  const { dir: upstream, source } = sourceDir(version, explicitFrom);

  const vendored = readdirSync(upstream, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (vendored.length === 0) throw new Error(`${source} holds no skills`);

  // Delete only what a previous run wrote. Wiping the tree instead would take
  // the owned skills with it, and they have no other copy.
  const previous = existsSync(MANIFEST)
    ? (JSON.parse(readFileSync(MANIFEST, "utf8")) as Manifest).writes
    : [];
  for (const path of previous) rmSync(join(ROOT, path), { force: true });

  const writes: string[] = [];
  const hashes: Record<string, string> = {};

  for (const tree of TREES) {
    for (const skill of vendored) {
      for (const file of filesUnder(join(upstream, skill))) {
        const bytes = readFileSync(file);
        const target = join(ROOT, tree, skill, relative(join(upstream, skill), file));
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, bytes);
        writes.push(key(target));
        hashes[key(target)] = sha256(bytes);
      }
    }
    const readme = join(ROOT, tree, "README.md");
    mkdirSync(dirname(readme), { recursive: true });
    writeFileSync(readme, README);
    writes.push(key(readme));
    hashes[key(readme)] = sha256(Buffer.from(README));
  }

  // Owned skills are mirrored out of the authoring tree. Written, so recorded
  // in `writes`; not hashed, so freely editable at the source.
  for (const skill of OWNED) {
    const from = join(ROOT, TREES[0], skill);
    if (!existsSync(from)) throw new Error(`owned skill ${skill} is missing from ${TREES[0]}`);
    for (const tree of TREES.slice(1)) {
      for (const file of filesUnder(from)) {
        const target = join(ROOT, tree, skill, relative(from, file));
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, readFileSync(file));
        writes.push(key(target));
      }
    }
  }

  const manifest: Manifest = {
    vendor: { package: PACKAGE, version, ref: `v${version}`, source, skills: vendored },
    owned: [...OWNED],
    writes: writes.sort(),
    hashes: Object.fromEntries(Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b))),
  };
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  // The manifest is a committed file a reviewer reads, so `format:check` has an
  // opinion about it — and Prettier collapses short arrays in a way
  // `JSON.stringify` does not. Formatting it here rather than ignoring it keeps
  // the two gates from disagreeing about a file this script owns, which is the
  // same hazard `.prettierignore` closes for the skill trees themselves.
  execFileSync(join(ROOT, "node_modules", ".bin", "prettier"), ["--write", key(MANIFEST)], {
    cwd: ROOT,
    stdio: "pipe",
  });
  return manifest;
}

if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  const index = process.argv.indexOf("--from");
  const manifest = sync(index === -1 ? undefined : process.argv[index + 1]);
  const owned = manifest.owned.length;
  console.log(
    `synced ${String(manifest.vendor.skills.length)} vendored + ${String(owned)} owned skill(s) ` +
      `into ${String(TREES.length)} trees from ${manifest.vendor.source}`,
  );
  for (const skill of manifest.vendor.skills) console.log(`  vendored  ${skill}`);
  for (const skill of manifest.owned) console.log(`  owned     ${skill}`);
}
