/**
 * Loom's module-boundary law, as data, for `archkeep check`.
 *
 * The dependency direction this file states is not a new one. It is the same
 * order `tools/architecture/graph.ts` registers and `tools/check-architecture.ts`
 * has enforced since the package split:
 *
 *   core → labels → primitives → composition → layouts → blocks → facade
 *
 * What is new is *who* can see it. `check-architecture.ts` reads the specifier
 * text of every file under a package's `src/` with a regular expression; it is
 * deliberately narrow, and it says so. Archkeep resolves each specifier with
 * TypeScript's own resolver and judges the resolved target, so the spellings a
 * regex cannot follow — a relative path that climbs out of a package, an
 * absolute `packages/…` specifier, a re-export chain, a `.vue` block — reach
 * the same table stated here. The two are kept side by side on purpose;
 * `docs/architecture.md` records which invariant each one owns.
 *
 * The tag vocabulary uses DASH separators (`layer-primitives`), not colons.
 * Moon's own validation rejects a colon in a tag, and Archkeep's Moon provider
 * emits `moon.yml`'s tags verbatim — so a table written for `layer:primitives`
 * would match no project here while reading as enforced. Note that Moon *also*
 * derives colon-prefixed tags of its own from a project's `layer`/`stack`
 * fields (`layer:unknown`, `stack:unknown` on every project in this
 * repository, which declares neither). Those are Moon's, they are not this
 * axis, and nothing below keys on them.
 */

/**
 * The constraint table: one row per layer, each naming the layers it may
 * import.
 *
 * `onlyDependOnLibsWithTags` is read as "at or below", which is the exact
 * sentence `check-architecture.ts` implements with a rank comparison — a
 * package may import its own layer and every layer beneath it, and never one
 * above. Rows compose with AND, and each project carries exactly one layer
 * tag, so each import is judged by exactly one row of this axis.
 *
 * `onlyDependOnLibsWithTags: []` is a rule and not an empty setting: it says
 * the project may depend on nothing that carries a tag at all. Every project
 * in this workspace carries at least Moon's derived `layer:unknown`, so an
 * empty list here means "leaf" — which is what `core`, `theme-core` and
 * `tools` are.
 */
export const depConstraints = [
  // The foundation. `packages/core` holds cn(), optional(), useSplitAttrs(),
  // the motion constants and useTheme() — the helpers every other package is
  // built from and that are built from nothing here. Its package.json declares
  // no workspace dependency at all, and this row is that fact as law.
  {
    sourceTag: "layer-core",
    onlyDependOnLibsWithTags: [],
    description: "core is the foundation: it is imported by everything and imports nothing.",
    remediation:
      "Move the helper core needed into core itself, or invert the call so the caller passes it in.",
  },

  // Labels own the copy and the field/locale context primitives read. They sit
  // above core because they use `optional()`; nothing else may be beneath them.
  {
    sourceTag: "layer-labels",
    onlyDependOnLibsWithTags: ["layer-core"],
    description: "labels supplies copy and field context to components, and depends only on core.",
    remediation: "If labels needs a component, the dependency is pointing the wrong way.",
  },

  // The platform-independent layout core. It computes geometry from immutable
  // trees and imports nothing — no Vue, no DOM, not even cn — because a
  // layout oracle that touched the platform it is held against could not be
  // an oracle. The empty list is that fact as law, in the same shape as
  // core's row.
  {
    sourceTag: "layer-layout-engine",
    onlyDependOnLibsWithTags: [],
    description:
      "The layout engine is pure geometry over immutable trees. It is imported by the composition adapters and imports nothing.",
    remediation:
      "Move the helper the engine needs into the engine itself, or resolve it at the adapter boundary — the core must stay platform-independent.",
  },

  // The generic controls. A primitive may compose another primitive
  // (alert-dialog → button, field → inline-error) — same-layer edges are
  // allowed, and the cycle check below is what keeps that from closing a loop.
  {
    sourceTag: "layer-primitives",
    onlyDependOnLibsWithTags: ["layer-core", "layer-labels", "layer-primitives"],
    description:
      "A primitive is a generic control. It may compose other primitives, labels and core — never a composition, layout, block or the public facade.",
    remediation:
      "Reach for the lower-layer piece the composition wraps, or move the shared part down into core.",
  },

  // Layout compositions (Stack, Grid, Split, …). They may use primitives, and
  // today use only core and the layout engine — the row states the
  // architecture, not the census.
  {
    sourceTag: "layer-composition",
    onlyDependOnLibsWithTags: [
      "layer-core",
      "layer-labels",
      "layer-layout-engine",
      "layer-primitives",
      "layer-composition",
    ],
    description: "A composition arranges primitives; nothing above it may be reached from here.",
    remediation: "Move the piece being reached for down to the layer that may be imported.",
  },

  {
    sourceTag: "layer-layouts",
    onlyDependOnLibsWithTags: [
      "layer-core",
      "layer-labels",
      "layer-primitives",
      "layer-composition",
      "layer-layouts",
    ],
    description: "A layout assembles compositions and primitives into a page shape.",
    remediation:
      "A layout that needs a block has the direction inverted; pass the block in a slot.",
  },

  // Blocks are the top of the internal graph — the compositions of primitives
  // a consumer recognises as a feature (PageHeader, MetricCard, SidebarNav).
  {
    sourceTag: "layer-blocks",
    onlyDependOnLibsWithTags: [
      "layer-core",
      "layer-labels",
      "layer-primitives",
      "layer-composition",
      "layer-layouts",
      "layer-blocks",
    ],
    description: "A block is the highest internal layer; only the public facade sits above it.",
    remediation:
      "Nothing above a block exists to import. If the facade is being reached for, the export belongs here instead.",
  },

  // The publishing boundary. `packages/loom` re-exports the whole library and
  // is the only project that may reach every layer — and nothing below it may
  // reach back, which every row above states by omitting `layer-facade`.
  //
  // That omission is load-bearing rather than incidental: the facade's Moon
  // `deps: loom -> everything` is what makes `moon :test --affected` correct,
  // and a component importing the facade would invert that edge and make
  // affected selection a lie. `check-architecture.ts`'s check 2 says the same
  // thing about the specifier text; this row says it about the resolved target.
  {
    sourceTag: "layer-facade",
    onlyDependOnLibsWithTags: [
      "layer-core",
      "layer-labels",
      "layer-primitives",
      "layer-composition",
      "layer-layouts",
      "layer-blocks",
    ],
    description:
      "The public facade re-exports the library. It may reach every internal layer and nothing outside the published tree — not the docs site, not the browser suite, not the repository's own tooling.",
    remediation:
      "Whatever the facade is reaching for is not part of the published package. Move it into a layer, or leave it out of the facade.",
  },

  // theme-core ships `theme.css`, `global.css` and `fonts.css` and nothing
  // else. Its package.json `exports` names only the three stylesheets, and the
  // architecture check refuses a JavaScript import of it outright: the tokens
  // are copied into the build, never imported. So it is a leaf in this axis
  // too, and the row exists to keep it one.
  {
    sourceTag: "layer-theme-core",
    onlyDependOnLibsWithTags: [],
    description: "theme-core is the token source of truth and is CSS only — it imports nothing.",
    remediation:
      "A token that needs JavaScript is not a token. Put the logic in core and read the custom property from there.",
  },

  // The documentation site is the dogfood: its pages import the published
  // facade the way a consumer would, and its theme pulls theme-core's CSS at
  // build time (the hand-declared `# preserved` Moon edge). Those two are the
  // whole of what it may reach inside this workspace.
  {
    sourceTag: "layer-docs",
    onlyDependOnLibsWithTags: ["layer-facade", "layer-theme-core"],
    description:
      "The documentation site consumes the library through its published entry points, which is what makes a page rendering a component a live demonstration of it.",
    remediation:
      "Import from the facade rather than from a component package — a page that reaches past the public surface is documenting something a consumer cannot use.",
  },

  // The cross-cutting browser suite. It imports `@ecoma-io/loom/a11y` for
  // WCAG_TAGS — the same array the accessibility page publishes — and carries
  // the same hand-declared theme-core edge the docs project does.
  {
    sourceTag: "layer-e2e",
    onlyDependOnLibsWithTags: ["layer-facade", "layer-theme-core", "layer-composition"],
    description:
      "The browser suites drive the built site, read the library's own published a11y contract, and — since Archkeep began judging resolved edges — mount the layout compositions through the conformance route's case files. Stated truthfully: this row licenses ANY e2e-tagged project to import compositions (the root site suite carries the same tag, and a per-project distinction is not expressible here). The bound on escalation is not prose but the mutation row harness-reaches-past-the-compositions-it-proves: anything BENEATH the compositions, reached from any e2e file, reddens.",
    remediation:
      "Import the contract from the facade's `/a11y` subpath rather than from the package that happens to define it; a suite that needs to reach past the compositions should grow its own evidence and its own row, not widen this one.",
  },

  // `tools/` is the repository's own gate machinery — the architecture
  // checker, the component-artifact gate, the moon-deps sync, the E2E plan. It
  // is not shipped, and it reads the tree as data rather than importing it. A
  // tool that imported a component would be running the library to check it.
  //
  // `layer-e2e` and `layer-docs` are not the library, and the two reaches they
  // permit are load-bearing rather than drift: `e2e-plan.ts` is a pure
  // function of the changed file set plus the browser profile matrix
  // (`playwright/profiles.ts`) and the documentation page list
  // (`e2e/docs-pages.ts`), and `stage-docs.ts` reads the site's base path.
  // Those edges have existed since the split — their relative-path spelling is
  // suppressed below — but Lattice 0.11 judged only the spelling and never the
  // resolved edge, so `onlyDependOnLibsWithTags: []` could read as true.
  // Archkeep judges the edge, and the row states it.
  {
    sourceTag: "layer-tooling",
    onlyDependOnLibsWithTags: ["layer-e2e", "layer-docs"],
    description:
      "Repository tooling inspects the tree as data. It is never published and never imports the library it checks — the browser matrix, the page list and the site's base path are infrastructure it reads, not the library.",
    remediation:
      "Read the file rather than importing it — a checker that loads what it judges cannot report on a tree that will not load.",
  },
];

/**
 * The eight non-table options, every one written out at the value this
 * workspace runs on rather than left to a default. An option nobody wrote down
 * is an option only the tool knows the value of, and this file exists so that
 * a second reader — a contributor, or the next enforcer — recovers the whole
 * law from one place.
 */
export const moduleBoundaryOptions = {
  // Nothing in this workspace is above the boundary.
  allow: [],

  // Moon task names, not npm scripts. `build` is declared by exactly two
  // projects — `loom` (the published library build) and `docs` (the site) —
  // which is the fact the option below turns on, and why it is off.
  buildTargets: ["build"],

  // Off, and it follows from how this library ships rather than from taste.
  // Component packages export TypeScript and `.vue` source directly
  // (`exports` points at `src/index.ts`); the single real build is the
  // facade's, which Vite bundles from that source. So every component is
  // "non-buildable" by this option's definition and the facade is buildable,
  // and turning this on would report all ninety edges of the publishing
  // boundary as violations of a rule this repository deliberately does not
  // follow.
  enforceBuildableLibDependency: false,

  // A file reaching its own package through that package's public specifier
  // instead of a relative path is a cycle through the barrel, and it stays an
  // error. Loom has a live reason to care: the facade's `src/index.ts` is the
  // one file that legitimately names every package, and a component doing the
  // same to itself would make the bundle graph disagree with the source graph.
  allowCircularSelfDependency: false,

  // An `import()` is held to the same table as a static import. A boundary
  // crossed lazily is still crossed; it just fails later, in a chunk.
  checkDynamicDependenciesExceptions: [],

  // No project pair is excused from the cycle check. `check-architecture.ts`
  // check 6 makes the same claim over the specifier-text edge set.
  ignoredCircularDependencies: [],

  // On. A component that imports an npm package neither its own package.json
  // nor the root's declares works today only because something else installed
  // it, and breaks on the day that something else stops. This is the external
  // half of `check-architecture.ts`'s check 7, which makes the same demand of
  // internal specifiers — the two together mean every import a package makes
  // is declared somewhere.
  banTransitiveDependencies: true,

  // Off: no row above declares `bannedExternalImports`, so this option decides
  // nothing today. It is stated because leaving it implicit is what a second
  // reader cannot recover from silence.
  checkNestedExternalImports: false,
};

/**
 * The violations this workspace accepts, each with the argument for accepting
 * it. `reason` is mandatory and the loader refuses a row without one, which is
 * the right demand: an unexplained suppression is indistinguishable from a
 * boundary that quietly stopped being enforced.
 *
 * Two of the rows below are the same shape, and it is worth stating once. A
 * suppression removes a VERDICT, never a check: the file is still fully
 * analyzed, anything unreadable in it is still reported, and the next check in
 * the documented order fires at the same line exactly as fixing the specifier
 * would. And a row that stops covering anything is refused with exit 3 on the
 * next whole-workspace run — measured: a file whose accepted reaches were
 * removed exits 3 naming the row. Deleting the accepted file outright fails
 * earlier and coarser, exit 1 through the unresolved import that pointed at
 * it — a less precise message, still fail-closed. Either way none of these
 * can outlive the reach it accepts. The third row (the conformance route) is
 * a different shape: it accepts a relative SPELLING whose edge the layer-e2e
 * row states, so the verdict beside it still fires.
 */
export const boundarySuppressions = [
  {
    path: "tools/*.ts",
    messageId: "noRelativeOrAbsoluteImportsAcrossLibraries",
    reason:
      "`tools/` is repository machinery, run by node directly under --experimental-strip-types, and the three sources it reads — playwright/profiles.ts, e2e/docs-pages.ts, docs/.vitepress/base.ts — live in directories that are Moon projects but not npm packages: none has a package.json, so none has a published name to import instead. The rule is right that a relative path reaches past a public entry point; here there is no entry point to reach past. Giving three directories a package.json and an export map so that four import statements could be spelled differently would be restructuring the repository to suit the spelling, so the reach is accepted and named instead.",
  },
  {
    path: "playwright/harness/vite.config.mts",
    messageId: "noRelativeOrAbsoluteExternals",
    reason:
      "the harness's Vite config merges the root vite.config.ts so that the demo it mounts resolves every `@ecoma-io/loom-*` alias the unit suite resolves — one alias map, not two that drift. The root config is owned by no Moon project (there is no root project, and adding one would give the whole repository a second lint and test task), so the specifier resolves to a real file that belongs to nothing and is classified external. Importing the map is the point; duplicating it is the failure this avoids.",
  },
  {
    path: "playwright/harness/conformance.ts",
    messageId: "noRelativeOrAbsoluteImportsAcrossLibraries",
    reason:
      "the conformance route statically imports the four composition packages' e2e/conformance.cases.ts files — deliberately static, never import.meta.glob, because a glob's reaches neither architecture reader can see. Each case file lives in its package's e2e/ directory, which no specifier can name: the exports maps and the tsconfig paths both point at src/index.ts only, and giving browser-evidence fixtures a package entry point would be restructuring the package to suit a spelling. The EDGE those four imports draw is stated by the layer-e2e row (layer-composition, the components the harness proves and nothing beneath); this row accepts only the SPELLING, the same shape as the tools/*.ts pair — Archkeep judges the resolved edge past the suppressed spelling, and the row is where that edge is argued. The case files' own imports are intra-package and judged clean under their packages' rows, and the engine is reached only transitively through the judged composition edge. The residual is named rather than silent: the mutation rows that fire both verdicts in every OTHER harness file prove the suppression is one file's exception, not a blanket.",
  },
];

/**
 * The quality gates judged on every unscoped `check`, by presence — there is
 * no flag to forget.
 */
export const fitness = [
  {
    name: "layer-graph-is-acyclic",
    match: ["*"],
    condition: { type: "cycle-free" },
    reason:
      "the layer order above only holds while the graph is a DAG: a same-layer edge is allowed by every row, so two primitives importing each other satisfies the table and still makes the build order undefined. check-architecture.ts asserts this over the specifier-text edge set; this asserts it over the resolved one.",
  },
  {
    name: "every-analyzable-file-judged",
    match: ["*"],
    condition: { type: "coverage-minimum", statement: 100 },
    reason:
      "a boundary check that stopped reading a directory reports exactly what a clean directory reports. This repository's own claim is that every analyzable tracked file it owns is judged, so a file that stops being read turns this red instead of turning the report quiet.",
  },
];

/**
 * The tracked analyzable files this workspace knowingly leaves owned by no
 * project. Archkeep names every one of them on each run — a warning that
 * cannot be answered in the negative, because a file judged by nothing is
 * exactly what a stopped checker also looks like — and a row here is the
 * recorded answer. Three populations, three arguments:
 *
 * - The agent-host hooks are run by the coding agents the moment a file is
 *   written, which is the whole point of them: `.claude/` is host
 *   configuration, not a package, and no build or task consumes these files.
 * - The Semgrep fixtures are sample code that is defective on purpose, so a
 *   rule that never fires can be caught. They are data for a test of an
 *   analysis rule; the `.vue` file among them exists because the XSS rule
 *   targets a template expression.
 * - The five root single-file configs have no project to belong to: there is
 *   deliberately no Moon project at the root, for the reason the
 *   `playwright/harness/vite.config.mts` suppression below states — one would
 *   own every file no other project claims and give the whole repository a
 *   second lint and test task.
 *
 * A row that stops matching any unowned file is refused on the next run, so
 * these cannot outlive the files they name — a root config that gains a
 * project deletes its row by this edit, not by silence.
 */
export const coverage = {
  unowned: [
    {
      path: ".claude/hooks/*.mjs",
      reason:
        "agent-host integration, run by the coding agents on every file write rather than by any build or task; `.claude/` is host configuration, not a package anything depends on.",
    },
    {
      path: ".github/semgrep/*",
      reason:
        "fixtures for this repository's own Semgrep rules — deliberately defective sample code that exists to prove a rule fires; data for an analysis test, never code a boundary should judge.",
    },
    {
      path: "{commitlint.config.mjs,eslint.config.mjs,playwright.config.ts,vite.config.ts,vitest.setup.ts}",
      reason:
        "single-file root entry configs for the linters and the test/build runners; there is deliberately no Moon project at the root — one would own every unclaimed file and give the whole repository a second lint and test task.",
    },
  ],
};
