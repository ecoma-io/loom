# Repository Audit (Phase 1)

Evidence-backed companion to [the interface contract](./interface-contract.md). Where the
contract's status table is preliminary, this audit is the version grounded in a
six-area repository audit (package architecture, artifact taxonomy, public API,
consumer boundary, quality contracts, layout engine), each area's evidence cited
inline below and in the gap analysis. Audited at `445cc92` on
`johnitvn/feat-constitution-phase-0` (squash-landed on `main` as `956dbcd`),
2026-09-07. Nothing here changes a gate; where a row refines the contract's
preliminary statuses (one-public-package, PARTIALLY_ENFORCED pending #238),
the audit row is the one to rely on, and the gap analysis carries the
follow-ups.

Status scale: `ENFORCED` (a gate fails on violation) · `PARTIALLY_ENFORCED` (a gate
covers part of the contract) · `DOCUMENTED_ONLY` (prose claims it, no gate) ·
`NOT_ENFORCED` · `NOT_YET_MACHINE_CHECKABLE`.

## The dependency laws

| Rule                                       | Existing enforcement                                                                                                                                                                               | Status                                                                                             | Recommended phase                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| L1 — downward and same-layer only          | `check-architecture.ts` check 5 (rank compare, specifier text) + archkeep rows judging resolved imports; both run in `pnpm lint` and as dedicated CI steps; mutation suite proves rows fail loudly | ENFORCED (with one reader divergence — below)                                                      | —                                                                        |
| L2 — no upward imports, incl. types        | Same two readers; check 2's regex matches any `@ecoma-io/loom…` spelling regardless of `import type`                                                                                               | ENFORCED                                                                                           | —                                                                        |
| L3 — facade is a dependency sink           | check 2 + archkeep facade row; zero live violations (2004 imports scanned); `import type`, subpaths and dynamic imports covered; alias-subpath blind spot pinned expect-empty by a mutation row    | ENFORCED                                                                                           | See gaps: dashed-subpath and bare-import regex forms, alias invisibility |
| L4 — consumer-shaped reach the facade only | archkeep rows for `layer-docs` / `layer-e2e` / `layer-templates`; the E2E composition edge is licensed by the `layer-e2e` row and exercised only through the disclosed conformance route           | ENFORCED                                                                                           | —                                                                        |
| Cycles forbidden (DAG)                     | check 6 DFS + archkeep `layer-graph-is-acyclic` fitness; verdict clean, 119 projects                                                                                                               | ENFORCED                                                                                           | —                                                                        |
| One public npm package                     | Root manifest is the only publishable package; 106/107 component manifests `private: true`; template manifests gated by `check-template-artifacts.ts`                                              | **PARTIALLY_ENFORCED** — `tree-view` has no `private` field and no gate checks component manifests | Phase 2                                                                  |
| Five-artifact pairing                      | `check-component-artifacts.ts` in `pnpm lint` and its dedicated Verify step; demo gated transitively by the docs build each page's own import performs                                             | ENFORCED                                                                                           | —                                                                        |
| Theme-core is not a JS dependency          | check 5 styles-only branch + archkeep row + mutation pin; zero JS imports from any tier today                                                                                                      | ENFORCED                                                                                           | —                                                                        |
| No import-time browser code                | `sideEffects: ["**/*.css"]` declared; semgrep memory-leak rules catch leak-shaped side effects; the import-time surface itself is review-held                                                      | **PARTIALLY_ENFORCED**                                                                             | Phase 2                                                                  |

## Quality contracts

| Contract                  | Enforcement today                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Status                                                                                           | Phase                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Accessibility             | Five runtime axe gates (jsdom demo sweep over 109 demos, per-demo harness gate, root site gate over 133 built pages, template gate), all zero-exclude, all light+dark, all importing the pinned rule partition (51 browserless + 17 browser-required, pinned fail-closed by `packages/core/tests/a11y-scope.test.ts`); `eslint-plugin-vuejs-accessibility` tree-wide; five behavioural suites axe cannot express (target-size, focus-not-obscured, reduced-motion, SVG contrast, keyboard) | PARTIALLY_ENFORCED — per-component depth uneven; docs-page transcription of `WCAG_TAGS` unpinned | Phase 2 (pin the transcription; depth by component class) |
| Responsive                | Root suite covers 5/8 layouts at 320/1024/ultrawide; template page-level gate at 320/768; engine conformance for 4/8 compositions; mobile profiles only on infra legs                                                                                                                                                                                                                                                                                                                      | PARTIALLY_ENFORCED — 3 layouts, 3 compositions and all blocks lack browser evidence              | Phase 2                                                   |
| Theming                   | Contrast pairs pinned browserlessly (4.5:1 / 3:1, light+dark); dark-mode axe on every gate; template scans both themes; token-usage itself unlinted (no stylelint, no custom check)                                                                                                                                                                                                                                                                                                        | PARTIALLY_ENFORCED                                                                               | Phase 2                                                   |
| Semantic interaction      | 32/76 primitives own harness specs; spec ownership rule is one-directional (specs→tag, not role→specs)                                                                                                                                                                                                                                                                                                                                                                                     | PARTIALLY_ENFORCED — 44 primitives carry no browser evidence                                     | Phase 2                                                   |
| Composition               | Conformance route holds the four adapter-bearing compositions (engine-vs-DOM comparator, non-golden, band self-check); a new composition can land with neither adapter nor cases                                                                                                                                                                                                                                                                                                           | PARTIALLY_ENFORCED                                                                               | Phase 2                                                   |
| Public API deliberateness | Pairing gate enforces artifacts; deliberateness is review; package-index↔facade surface undiffed                                                                                                                                                                                                                                                                                                                                                                                           | PARTIALLY_ENFORCED                                                                               | Phase 2                                                   |

## Enforcement mechanics — what is wired where

- `pnpm lint` chains: eslint · check-component-artifacts · check-template-artifacts ·
  check-architecture · archkeep · check-skills. CI runs each artifact/architecture
  gate as its own unconditional Verify step **except `check-template-artifacts`,
  which runs only in root `pnpm lint`** — and CI's lint path is moon's affected
  ESLint tasks, which do not chain it. The template gate is therefore lint-only,
  not CI-enforced (verified: `grep check-template-artifacts ci.yml` → no match).
- Browser legs are planned by `tools/e2e-plan.ts` from the changed file set; the
  moon e2e task enumerates six of seven root specs by hand — `reduced-motion` is
  reached only through the Playwright `testMatch`, not the moon arg list.
- The published build excludes the engine as an import-graph fact (facade
  re-exports components and types only; only the four adapters declare the engine
  dependency). The stronger "zero engine bytes in dist" claim is recorded prose
  from a one-time comparison, not a standing check; a barrel re-export chain would
  pass both readers today.

## Where the two architecture readers disagree

1. **Engine rank.** `check-architecture.ts` ranks `layout-engine` 0, so a
   primitives→engine specifier edge passes check 5, while archkeep's rows (which
   omit the engine from every allow-list except the compositions') fail the same
   edge. The stricter gate wins in `pnpm lint`; no live edge exists (only the four
   adapters). The documented rank model matches the looser reader, so no doc claim
   is false — but a would-be violation is caught by one reader only.
2. **Facade regex breadth.** Check 2's subpath group `(?:/\w+)?` misses dashed
   subpaths and bare side-effect imports; the internal regex uses `[\w-]+`. Both
   forms are latent (only `a11y` and `theme` exist, both `\w+`-shaped).
3. **`./theme` in the workspace.** The published exports map carries `./theme`
   (root `package.json:53-56`, built by `lib.entry`), so real consumers are wired.
   Workspace-internal resolution is not: the facade package's exports map lacks
   `./theme`, tsconfig maps the specifier to `core/src/theme.ts` (a different file
   than the built one), and no vite/docs alias exists. Latent.

## Recorded conflicts carried forward

The seven-kind model's recorded conflicts (§Relationship in
[artifact-model](./artifact-model.md)), the disclosed E2E conformance licence, the
cross-platform naming surfaces, and the stale-prose items (README template names,
`a11y-scope.ts`'s "94 demos", the `layout-responsive.e2e.ts` header, the
`docs/moon.yml` single-test claim, `tree-view/moon.yml`'s unused-marker comment)
are all carried with evidence in [the gap analysis](./gap-analysis.md).
