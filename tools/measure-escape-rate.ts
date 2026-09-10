// The consumer escape rate — Phase 5D of the architecture-evolution program
// (docs/architecture/evolution-plan.md): how much custom CSS, layout,
// accessibility and interaction work a consumer still owns after the
// published package carries its part.
//
// The Official Templates are the measurement surface — real, consumer-shaped
// pages that consume `@ecoma-io/loom` exactly as an external consumer would —
// so the rate is counted from their sources, by this tool, never transcribed
// into the docs page by hand. Every category has an in/out line, stated in
// the docs page that records the baseline (docs/templates/escape-rate.md);
// what follows is only the mechanical shape of those lines.
//
// This is deliberately a measurement, not a gate: it runs nowhere in `pnpm
// lint` or CI, and nothing here compares the count against a threshold. A
// ceiling would police template work instead of documenting the ownership
// split the positioning states; the number is only ever read next to its
// method.
//
//   custom-css  — arbitrary-value utilities (values the published scale
//                 cannot express), inline `style` attributes, `<style>`
//                 blocks, and stylesheet blocks in `src/styles.css` beyond
//                 the declared `@import`/`@source` at-rules. Stock utility
//                 classes are the composition idiom Loom itself documents —
//                 they are not escape; component props carrying sizes
//                 (`min-col-width="14rem"`) are published API, not CSS.
//   manual-a11y — hand-written `aria-*` / `role` on plain (non-Loom)
//                 elements: naming the consumer's own landmarks and label
//                 spans. The same attributes on a Loom component are
//                 composition — the component carries the semantics, and a
//                 `Switch` named through `aria-labelledby` is the published
//                 contract working — and pass uncounted.
//   behaviour   — event-handler bindings in markup (the seams the contract's
//                 swap points sit at), sortable columns the host reorders
//                 for (`DataGrid` cycles the state, never reorders the rows),
//                 and manual focus work (`tabindex`, programmatic focus).
//                 `v-model` is the published controlled-state contract, not
//                 escape.
//
// Run: `pnpm escape-rate` — `node --experimental-strip-types
// tools/measure-escape-rate.ts [templates-dir]`.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** The published package a template is measured against. */
const FACADE = "@ecoma-io/loom";

export const CATEGORIES = ["custom-css", "manual-a11y", "behaviour"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface EscapeSignals {
  /** Arbitrary-value utilities — `[...]` — inside class attribute values. */
  arbitraryValues: number;
  /** `style` / `:style` attributes in markup. */
  inlineStyles: number;
  /** `<style>` blocks in the SFC. */
  styleBlocks: number;
  /** CSS blocks in `src/styles.css` beyond the declared at-rules. */
  stylesheetRules: number;
  /** `aria-*` / `role` written on plain (non-Loom) elements. */
  ariaOnPlainElements: number;
  /** Event-handler bindings (`@…` / `v-on:…`) in markup. */
  eventBindings: number;
  /** Sortable columns declared in the template's own column configuration. */
  sortableColumns: number;
  /** `tabindex` attributes and programmatic `.focus()` calls. */
  focusWork: number;
}

export interface TemplateMeasurement {
  name: string;
  /** Escape points per category, keyed by `Category`. */
  categories: Record<Category, number>;
  /** The per-signal counts behind the category numbers. */
  signals: EscapeSignals;
}

/** The `<script>`, the `<template>` and the `<style>` block count of an SFC — or null when the file is not a readable SFC. */
export interface SfcSections {
  script: string;
  template: string;
  styleBlocks: number;
}

/**
 * Splits the SFC into the sections the metric reads. The template block runs
 * from the first `<template` to the last `</template>`: the root template
 * legitimately contains nested `<template #slot>` elements, so a
 * first-close-tag read would measure half a page.
 *
 * Block tags match case-insensitively — HTML element names are
 * case-insensitive and an SFC block spelled `<SCRIPT>` is the same block —
 * and the script end tag tolerates whitespace before its `>` (`</script >`),
 * which is legal tag grammar, not the byte spelling. The root-template read
 * is the deliberate exception: `indexOf` has no case-insensitive form, and a
 * template spelled in exotic casing fails loudly by name one line below
 * instead of measuring a file without its markup.
 */
export function readSfcSections(source: string): SfcSections | null {
  const script = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/i.exec(source)?.[1];
  const templateStart = source.indexOf("<template");
  const templateEnd = source.lastIndexOf("</template>");
  if (script === undefined || templateStart < 0 || templateEnd < templateStart) return null;
  return {
    script,
    template: source.slice(templateStart, templateEnd + "</template>".length),
    styleBlocks: [...source.matchAll(/<style\b/gi)].length,
  };
}

/** The named imports from the published package — the components this page composes with. */
export function facadeImports(script: string): string[] {
  const names: string[] = [];
  const imports = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*["']${FACADE}["']`, "g");
  for (const statement of script.matchAll(imports)) {
    for (const specifier of (statement[1] ?? "").split(",")) {
      const name = specifier.trim();
      // A type-only specifier names no element, so it is dropped, not renamed.
      if (name.length === 0 || /^type\s/.test(name)) continue;
      names.push(name);
    }
  }
  return names;
}

/** `app-shell` → `AppShell`, so a kebab-spelled component tag is still recognised as Loom's. */
function toPascal(name: string): string {
  return name.replace(/(^|[-_])([a-z])/g, (_match, _sep: string, char: string) =>
    char.toUpperCase(),
  );
}

// A tag's attribute string is matched quote-aware — a `>` inside a quoted
// expression (`v-else-if="rows.length > 0"`) is attribute text, not the end of
// the tag. Comments are stripped before scanning, so prose that mentions an
// attribute ("no duplicated aria-label to fall out of sync") is never a count.
const MARKUP_COMMENT = /<!--[\s\S]*?-->/g;
const TAG = /<([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)>/g;
// Tailwind's arbitrary-value syntax — the one spelling for a value outside the
// scale the published utilities cover, in static and bound class values alike.
const ARBITRARY_VALUE = /\[[^\s"'<>{}]+\]/g;

export interface MarkupSignals {
  arbitraryValues: number;
  inlineStyles: number;
  ariaOnPlainElements: number;
  eventBindings: number;
  focusWork: number;
}

/** Counts the markup-side escape signals of one template's `<template>` block. */
export function scanTemplate(template: string, loomComponents: ReadonlySet<string>): MarkupSignals {
  const signals: MarkupSignals = {
    arbitraryValues: 0,
    inlineStyles: 0,
    ariaOnPlainElements: 0,
    eventBindings: 0,
    focusWork: 0,
  };
  const markup = template.replace(MARKUP_COMMENT, " ");
  for (const tag of markup.matchAll(TAG)) {
    const name = tag[1] ?? "";
    const attrs = tag[2] ?? "";
    const isLoom = loomComponents.has(name) || loomComponents.has(toPascal(name));

    for (const classAttr of attrs.matchAll(/\s(?::class|class)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
      const value = classAttr[2] ?? classAttr[3] ?? "";
      signals.arbitraryValues += [...value.matchAll(ARBITRARY_VALUE)].length;
    }
    if (/\s(?::style|style)(?=[\s=/>]|$)/.test(attrs)) signals.inlineStyles += 1;
    if (!isLoom) {
      signals.ariaOnPlainElements += [
        ...attrs.matchAll(/\s(?::aria-[a-zA-Z0-9-]+|aria-[a-zA-Z0-9-]+|:role|role)(?=[\s=/>]|$)/g),
      ].length;
    }
    signals.eventBindings += [
      ...attrs.matchAll(/\s(?:@|v-on:)[a-zA-Z][a-zA-Z0-9-]*(?:\.[a-zA-Z-]+)*\s*=/g),
    ].length;
    if (/\stabindex(?=[\s=/>]|$)/.test(attrs)) signals.focusWork += 1;
  }
  return signals;
}

/** Counts the script-side escape signals: the reorder work per sortable column, and manual focus. */
export function scanScript(script: string): { sortableColumns: number; focusCalls: number } {
  return {
    sortableColumns: [...script.matchAll(/\bsortable\s*:\s*true\b/g)].length,
    focusCalls: [...script.matchAll(/\.focus\(/g)].length,
  };
}

/**
 * The stylesheet blocks a template owns: every `{` whose prelude is not a
 * terminated declaration, comments removed. `@import` and `@source` are
 * declarations the contract itself allows — the README's "what to change
 * first" names both as in-repo scaffolding — so a stylesheet carrying only
 * them measures zero, and any block is CSS the template writes beyond what
 * the published entry carries.
 */
export function countStylesheetRules(css: string): number {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, " ");
  let count = 0;
  for (const block of withoutComments.matchAll(/([^{}]*)\{/g)) {
    const prelude = (block[1] ?? "").trim();
    if (prelude.length > 0 && !prelude.endsWith(";")) count += 1;
  }
  return count;
}

/** One template's escape measurement — or the reasons it could not be measured. */
export function measureTemplate(
  name: string,
  dir: string,
): { measurement: TemplateMeasurement | null; failures: string[] } {
  const failures: string[] = [];
  const appPath = join(dir, "src", "App.vue");
  const stylesPath = join(dir, "src", "styles.css");
  // The rest of the contract's file set is tools/check-template-artifacts.ts's
  // to assert; the metric reads only the two sources it counts.
  if (!existsSync(appPath)) {
    failures.push(`templates/${name}: missing src/App.vue — nothing to measure`);
  }
  if (!existsSync(stylesPath)) {
    failures.push(
      `templates/${name}: missing src/styles.css — the stylesheet a template owns is part of the measure`,
    );
  }
  if (failures.length > 0) return { measurement: null, failures };

  const sections = readSfcSections(readFileSync(appPath, "utf8"));
  if (sections === null) {
    failures.push(
      `templates/${name}: src/App.vue carries no readable <script>/<template> pair — the page's markup cannot be measured`,
    );
    return { measurement: null, failures };
  }
  const imports = facadeImports(sections.script);
  if (imports.length === 0) {
    failures.push(
      `templates/${name}: src/App.vue imports nothing from ${FACADE} — a page that does not consume the published package cannot be measured against it`,
    );
    return { measurement: null, failures };
  }

  const markup = scanTemplate(sections.template, new Set(imports));
  const script = scanScript(sections.script);
  const signals: EscapeSignals = {
    arbitraryValues: markup.arbitraryValues,
    inlineStyles: markup.inlineStyles,
    styleBlocks: sections.styleBlocks,
    stylesheetRules: countStylesheetRules(readFileSync(stylesPath, "utf8")),
    ariaOnPlainElements: markup.ariaOnPlainElements,
    eventBindings: markup.eventBindings,
    sortableColumns: script.sortableColumns,
    focusWork: markup.focusWork + script.focusCalls,
  };
  const categories: Record<Category, number> = {
    "custom-css":
      signals.arbitraryValues +
      signals.inlineStyles +
      signals.styleBlocks +
      signals.stylesheetRules,
    "manual-a11y": signals.ariaOnPlainElements,
    behaviour: signals.eventBindings + signals.sortableColumns + signals.focusWork,
  };
  return { measurement: { name, categories, signals }, failures };
}

/** The whole tier, sorted by name — or the failures that stop a baseline being stated. */
export function measureEscapeRate(root: string): {
  measurements: TemplateMeasurement[];
  failures: string[];
} {
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    return {
      measurements: [],
      failures: [`no templates directory at ${root} — the metric is measured against the tree`],
    };
  }
  const names = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (names.length === 0) {
    return {
      measurements: [],
      failures: [
        "templates/: no template directories found — the metric exists because templates exist",
      ],
    };
  }

  const measurements: TemplateMeasurement[] = [];
  const failures: string[] = [];
  for (const name of names) {
    const { measurement, failures: templateFailures } = measureTemplate(name, join(root, name));
    failures.push(...templateFailures);
    if (measurement !== null) measurements.push(measurement);
  }
  return { measurements, failures };
}

// CLI entry — prints the baseline against the real templates, or the named
// reasons it could not. A partial count must never read as a baseline: one
// unmeasurable template fails the whole run.
if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  const root = process.argv[2] ?? join(import.meta.dirname, "..", "templates");
  const { measurements, failures } = measureEscapeRate(root);
  if (failures.length > 0 || measurements.length === 0) {
    console.error("Escape-rate measurement failed:");
    for (const failure of failures.length > 0 ? failures : ["no template could be measured"]) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }
  const total = measurements.reduce(
    (sum, m) => sum + Object.values(m.categories).reduce((a, b) => a + b, 0),
    0,
  );
  console.log(
    `Escape-rate baseline: ${String(measurements.length)} template(s), ${String(total)} escape point(s) across ${String(CATEGORIES.length)} categories.`,
  );
  for (const measurement of measurements) {
    const count = Object.values(measurement.categories).reduce((a, b) => a + b, 0);
    console.log(
      `  ${measurement.name}: ${String(count)} (custom-css ${String(measurement.categories["custom-css"])}, manual-a11y ${String(measurement.categories["manual-a11y"])}, behaviour ${String(measurement.categories.behaviour)})`,
    );
  }
  const byCategory = CATEGORIES.map(
    (category) =>
      `${category} ${String(measurements.reduce((sum, m) => sum + m.categories[category], 0))}`,
  ).join(", ");
  console.log(`  by category: ${byCategory}`);
}
