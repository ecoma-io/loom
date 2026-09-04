// Every Official Template ships the contract's artifacts, and this is what
// says so.
//
// A directory under `templates/` that calls itself a template while missing
// one of them fails silently everywhere else: a missing entrypoint compiles
// as an empty directory, a missing build is invisible until CI invokes the
// task, and a missing README is invisible until someone copies the template
// and finds nothing telling them what to change first. Each of those failures
// is an absence, not an error — nothing in a normal build has an opinion
// about a file that was never written — so the pairing is asserted here
// rather than left to a reviewer remembering the contract.
//
// The contract these artifacts satisfy is docs/templates/contract.md. Where
// an artifact needs a content assertion, it lives beside the file in the
// table below; import-level boundaries are archkeep's job — the
// `layer-templates` row judges resolved targets on every `pnpm lint`.
//
// Run: `node tools/check-template-artifacts.ts` — wired into `pnpm lint`,
// right after the component gate it mirrors.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const TEMPLATES = join(ROOT, "templates");

/**
 * The contract's file set, plus the content assertions the file set alone
 * cannot make. An `assert` returns the failure message when the file's
 * content violates the contract, or `null` when it holds.
 */
const ARTIFACTS: readonly {
  file: string;
  assert?: (content: string, name: string) => string | null;
}[] = [
  {
    file: "package.json",
    assert: (content, name) => {
      const pkg = JSON.parse(content) as {
        name?: string;
        private?: boolean;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      if (pkg.private !== true) {
        return `'private' must be true — a template is never published`;
      }
      if (pkg.name !== `@ecoma-io/loom-template-${name}`) {
        return `name must be '@ecoma-io/loom-template-${name}'`;
      }
      if (pkg.dependencies?.["@ecoma-io/loom"] !== "workspace:*") {
        return `dependencies must declare the published package as exactly "workspace:*" while the template lives in this repository`;
      }
      // The import-level boundary is archkeep's to judge, but a manifest that
      // declares an internal package betrays the consumer shape without a
      // single import being written — and no `@ecoma-io/loom-*` package except
      // the facade exists on the registry, so the copied template would carry
      // a dependency nothing can install.
      const internal = Object.keys({
        ...pkg.dependencies,
        ...pkg.devDependencies,
      }).filter((dep) => dep.startsWith("@ecoma-io/loom-"));
      if (internal.length > 0) {
        return `must not declare internal packages (${internal.join(", ")}) — only the published '@ecoma-io/loom' is a dependency a consumer can install`;
      }
      return null;
    },
  },
  {
    file: "moon.yml",
    assert: (content) => {
      if (!/^tags: \["layer-templates"\]/m.test(content)) {
        return `must carry tags: ["layer-templates"] — a project the boundary table cannot see is a project it cannot judge`;
      }
      if (!/^ {2}build:$/m.test(content)) {
        return `must declare a build task — 'runnable' that no command can run is only a claim`;
      }
      // The Moon edge, like the manifest dependency, is the affected-boundary
      // half of consuming the facade: without it a facade change stops
      // re-running this template's build, and nothing else in the workspace
      // derives edges for a tree outside `packages/`. The comment line above
      // the entry is the `# preserved` marker sync-moon-deps.ts keeps.
      if (!/^deps:\n(?:[ \t]*#[^\n]*\n)*[ \t]*- "loom"\n/m.test(content)) {
        return `must hand-declare the deps edge to "loom" (with its '# preserved' marker) — without it a facade change never marks this template affected`;
      }
      return null;
    },
  },
  { file: "index.html" },
  { file: "vite.config.ts" },
  { file: "src/main.ts" },
  { file: "src/App.vue" },
  { file: "src/styles.css" },
  { file: "README.md" },
];

const failures: string[] = [];
const counts: string[] = [];

// Discovered from the tree, never a list: a template added here is checked
// here, and one deleted deletes its row by this edit rather than silence.
const names = readdirSync(TEMPLATES, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

// A run that found no template is not a clean run — the tier was deleted or
// the tool is looking at the wrong tree, and either way reporting nothing
// would read exactly like a passing run.
if (names.length === 0) {
  failures.push(
    "templates/: no template directories found — the gate exists because templates exist",
  );
}

for (const name of names) {
  for (const artifact of ARTIFACTS) {
    const path = join(TEMPLATES, name, artifact.file);
    if (!existsSync(path)) {
      failures.push(`templates/${name}: missing ${artifact.file}`);
      continue;
    }
    if (artifact.assert) {
      const content = readFileSync(path, "utf8");
      const failure = artifact.assert(content, name);
      if (failure !== null) failures.push(`templates/${name}: ${artifact.file} ${failure}`);
    }
  }
  counts.push(name);
}

if (failures.length > 0) {
  console.error(
    [
      "Template artifact check failed. The contract is docs/templates/contract.md:",
      ...failures.map((f) => `  - ${f}`),
    ].join("\n"),
  );
  process.exit(1);
}

console.log(`Template artifacts: ${counts.join(", ")} satisfy the contract.`);
