import type { Component } from "vue";

/**
 * The conformance registry's derivation, kept apart from the route that
 * consumes it (`./conformance.ts`) so the derivation can be held against the
 * tree without executing the route — importing the route mounts a Vue
 * application, throws on a missing `?conformance=` parameter, and demands a
 * browser. `conformance-registry.test.ts` is that hold: it fails when the
 * glob the route spells has drifted from this constant, when the tree holds a
 * cases module the pattern would not load, or when the refusals below stop
 * refusing.
 *
 * The registry replaced Phase 4A's hand-maintained `MODULES` list and its
 * eight static imports (ecoma-io/loom#322): a composition that lands cases
 * today is discovered by the glob, and a cases module the harness would NOT
 * load is the failure mode the fixture exists for — the structural gate
 * (`tools/check-composition-conformance.ts`) already fails a missing cases
 * file, so the new silence to pin was a file the harness never picked up.
 */

/**
 * The glob the route spells in its `import.meta.glob` call. `import.meta.glob`
 * accepts only a literal argument, so the route spells this string a second
 * time by hand; the fixture compares the two spellings, which is what keeps
 * the constant — the copy every other check reads — honest about what the
 * route actually loads. A single `*`, one directory deep: the composition
 * directory is the module name, and nothing outside `packages/composition/`
 * is ever in the route's reach.
 */
export const CONFORMANCE_CASES_GLOB = "../../packages/composition/*/e2e/conformance.cases.ts";

/** A fixture child, as the case modules carry it. */
export interface ChildBox {
  w: number;
  h: number;
}

/** What the route needs of a case; each case module satisfies it structurally. */
export interface PublishedCase {
  name: string;
  props: Record<string, unknown>;
  viewports: readonly number[];
  knownDivergence?: { reason: string; owner: string };
  engines?: readonly string[];
}

/**
 * The layout constraint the route offers the engine: a definite width — the
 * measured content box of the case's fixture container — and a max-content
 * height, the only height offer the engine's modelled subset answers.
 */
export interface LayoutConstraint {
  width: { mode: "definite"; size: number };
  height: { mode: "max-content" };
}

/**
 * A case module as the route consumes it. Every adapter types its props
 * parameter as its own component's props, and such a function is assignable
 * to one taking `never` (nothing is required of the argument) — so the
 * uniform shape takes `never` and each call site narrows back with a cast on
 * data that came from the module itself. The same trick types `layout`, whose
 * real signature belongs to the engine: no single case module anchors the
 * route's types any more (that anchor was one of the eight static imports),
 * so the call shapes are stated here and an engine signature change is caught
 * by the packages' own unit tier and the specs' runtime comparison, not by
 * this file's typecheck.
 */
export interface CaseModule {
  component: Component;
  adapter: (
    props: never,
    ctx: { viewportWidth: number; availableWidth: number },
    children: readonly ChildBox[],
  ) => unknown;
  layout: (tree: never, constraint: LayoutConstraint) => unknown;
  cases: readonly (PublishedCase & { children: readonly ChildBox[] })[];
}

/** The registry the route reads: the matched modules and the case-name owners. */
export interface ConformanceRegistry {
  /** Matched modules by composition name. Alphabetical, so order is a fact of the tree, not of directory iteration. */
  readonly modules: Readonly<Record<string, CaseModule>>;
  /** Case name to owning module, global across modules — the route locates a case by name. */
  readonly caseOwners: ReadonlyMap<string, string>;
}

/**
 * The composition name a matched glob key carries. The pattern is derived
 * from `CONFORMANCE_CASES_GLOB` itself, so the derivation follows the
 * constant instead of restating it: if the glob is ever widened or narrowed,
 * what counts as a module name follows it, and the fixture — which compares
 * the derived names against the tree — is what decides whether the new
 * pattern is still the right one.
 */
export function moduleFromGlobKey(key: string): string {
  // The pattern carries exactly one `*` (stated at the constant); the name is
  // what that `*` matched, and it must not span a separator — one directory
  // deep is what makes the composition directory the module name.
  const atStar = CONFORMANCE_CASES_GLOB.indexOf("*");
  const prefix = CONFORMANCE_CASES_GLOB.slice(0, atStar);
  const suffix = CONFORMANCE_CASES_GLOB.slice(atStar + 1);
  const matched =
    key.startsWith(prefix) && key.endsWith(suffix)
      ? key.slice(prefix.length, key.length - suffix.length)
      : "";
  if (matched.length === 0 || matched.includes("/")) {
    throw new Error(
      `conformance registry: matched key "${key}" does not spell the pattern "${CONFORMANCE_CASES_GLOB}" — the registry cannot name the composition it came from`,
    );
  }
  return matched;
}

/**
 * Build the registry from an eager glob's result. Refuses, at module scope,
 * anything that would make a later comparison lie: a matched module whose
 * `cases` is not an array (the route would die deeper in with a TypeError
 * naming no file), and a case name declared by two modules — the route
 * locates a case by its `data-conformance-case` section, where the first
 * match in the document wins, so a repeated name would silently compare one
 * section twice and report agreement the second case never earned.
 * tools/check-composition-conformance.ts holds the same uniqueness over the
 * modules' source; this runtime check is its twin, firing if a case module
 * ever reaches the page through a path the gate does not read.
 */
export function buildConformanceRegistry(matched: Record<string, unknown>): ConformanceRegistry {
  const named = Object.entries(matched)
    .map(([key, mod]) => ({ name: moduleFromGlobKey(key), key, mod: mod as CaseModule }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const modules: Record<string, CaseModule> = {};
  const caseOwners = new Map<string, string>();
  for (const { name, key, mod } of named) {
    // The array read goes through `unknown` on purpose: `Array.isArray` on a
    // typed readonly array narrows to `any[]`, and the loop below must see
    // declared types, not any.
    const cases = mod.cases as unknown;
    if (!Array.isArray(cases)) {
      throw new Error(
        `conformance registry: ${key} carries no cases array — a matched module the route cannot read must fail loudly, never read as an empty one`,
      );
    }
    modules[name] = mod;
    for (const one of cases as CaseModule["cases"]) {
      const owner = caseOwners.get(one.name);
      if (owner !== undefined) {
        throw new Error(
          `conformance registry: case "${one.name}" is declared by both ${owner} and ${name} — the comparator would compare the first section twice`,
        );
      }
      caseOwners.set(one.name, name);
    }
  }
  return { modules, caseOwners };
}

/**
 * The module that owns a case name, throwing on a name no module declared.
 * The error carries the whole known set, because the reader of a failed
 * navigation is choosing among these.
 */
export function caseOwnerOrThrow(registry: ConformanceRegistry, name: string): string {
  const owner = registry.caseOwners.get(name);
  if (owner === undefined) {
    throw new Error(
      `conformance registry: no case named "${name}". Known: ${[...registry.caseOwners.keys()].join(", ")}`,
    );
  }
  return owner;
}
