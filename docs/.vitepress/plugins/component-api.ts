// The API tables in the documentation are read out of the components
// themselves.
//
// A hand-written props table is a copy of a declaration, and a copy drifts:
// the prop gains a default, the union gains a member, the table keeps saying
// what was true when someone last remembered to edit it. Nothing warns you,
// because prose cannot be type-checked. So the table is generated at build
// time from the single-file component's own `defineProps`, its slots and its
// emits — if the component changes, the page changes with it or the build
// fails to find the component at all.
//
// Usage, in any markdown page:
//
//     <!-- @api Button -->
//
// The name resolves to `src/**/<Name>.vue`. There is no path to keep in sync
// with a move, and a typo is a build error rather than a silently empty table.
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parse, type ComponentDoc, type PropDescriptor } from "vue-docgen-api";

const SRC = fileURLToPath(new URL("../../../src/", import.meta.url));

const MARKER = /^[ \t]*<!--[ \t]*@api[ \t]+([A-Za-z][A-Za-z0-9]*)[ \t]*-->[ \t]*$/gm;

/** Every `.vue` under `src/`, indexed by component name. Built once per run. */
async function indexComponents(): Promise<Map<string, string>> {
  const entries = await readdir(SRC, { recursive: true, withFileTypes: true });
  const index = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".vue")) continue;
    index.set(entry.name.slice(0, -".vue".length), `${entry.parentPath}/${entry.name}`);
  }
  return index;
}

/** A table cell: pipes would end the cell, newlines would end the row. */
function cell(text: string | undefined): string {
  return (
    (text ?? "")
      .replace(/\s*\n\s*/g, " ")
      .replace(/\|/g, "\\|")
      .trim() || "—"
  );
}

function code(text: string): string {
  return `\`${text.replace(/\|/g, "\\|")}\``;
}

/**
 * Every `type X = "a" | "b" | …` declared in a component's own script.
 *
 * `vue-docgen-api` reads syntax rather than types, so a prop declared as
 * `variant?: ButtonVariant` comes back carrying the alias name and nothing
 * else — a table cell reading `ButtonVariant` tells a reader strictly less
 * than the prop's declaration did. The alias is still the right thing to
 * write: it is what a consumer imports, and `cva`'s class map is bound to it
 * with `satisfies`, so the two cannot drift.
 *
 * So the alias is expanded here, from the file that declared it. A union whose
 * members are not all string literals is left alone — expanding it would print
 * a type expression rather than a set of values.
 */
function literalUnions(source: string): Map<string, string[]> {
  const unions = new Map<string, string[]>();
  const declaration = /\btype\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]+);/g;
  for (const match of source.matchAll(declaration)) {
    const [, name, body] = match;
    if (name === undefined || body === undefined) continue;
    const members = body
      .split("|")
      .map((member) => member.trim())
      .filter((member) => member.length > 0);
    if (members.length > 1 && members.every((member) => /^(["'])(?:(?!\1).)*\1$/.test(member))) {
      unions.set(
        name,
        members.map((member) => `"${member.slice(1, -1)}"`),
      );
    }
  }
  return unions;
}

/** What `vue-docgen-api` could work out about a prop's type, expanded where it fell short. */
function propType(prop: PropDescriptor, unions: Map<string, string[]>): string {
  if (prop.values?.length) return prop.values.map(code).join(" \\| ");
  const type = prop.type;
  if (!type) return "—";
  // A union's members come back on `elements`, which docgen populates but does
  // not declare on `PropDescriptor["type"]`. Read through `unknown` and check
  // the shape rather than trusting either the declaration or the runtime.
  const elements = (type as unknown as { elements?: unknown }).elements;
  if (type.name === "union" && Array.isArray(elements)) {
    return (elements as { name: string }[]).map((element) => code(element.name)).join(" \\| ");
  }
  const expanded = unions.get(type.name);
  if (expanded) return expanded.map(code).join(" \\| ");
  return code(type.name);
}

function propsTable(doc: ComponentDoc, unions: Map<string, string[]>): string {
  if (!doc.props?.length) return "";
  const rows = doc.props.map((prop) => {
    const name = prop.required ? `${code(prop.name)} *required*` : code(prop.name);
    const defaultValue = prop.defaultValue ? code(prop.defaultValue.value) : "—";
    return `| ${name} | ${propType(prop, unions)} | ${defaultValue} | ${cell(prop.description)} |`;
  });
  return [
    "#### Props",
    "",
    "| Prop | Type | Default | Description |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

function eventsTable(doc: ComponentDoc): string {
  if (!doc.events?.length) return "";
  const rows = doc.events.map((event) => {
    const payload = event.type?.names.map(code).join(" \\| ") ?? "—";
    return `| ${code(event.name)} | ${payload} | ${cell(event.description)} |`;
  });
  return [
    "#### Events",
    "",
    "| Event | Payload | Description |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

function slotsTable(doc: ComponentDoc): string {
  if (!doc.slots?.length) return "";
  const rows = doc.slots.map((slot) => {
    const bindings = slot.bindings?.length
      ? slot.bindings.map((binding) => code(binding.name ?? "—")).join(", ")
      : "—";
    return `| ${code(slot.name)} | ${bindings} | ${cell(slot.description)} |`;
  });
  return [
    "#### Slots",
    "",
    "| Slot | Bindings | Description |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

function apiSection(doc: ComponentDoc, source: string): string {
  const unions = literalUnions(source);
  const tables = [propsTable(doc, unions), eventsTable(doc), slotsTable(doc)].filter(Boolean);
  if (tables.length === 0)
    return `_${doc.displayName} takes no props, emits no events and exposes no slots._\n`;
  return tables.join("\n");
}

/**
 * Expands `<!-- @api Name -->` markers in markdown pages before VitePress
 * renders them. `enforce: "pre"` is what puts this ahead of VitePress's own
 * markdown transform — after it, the page is already HTML and the marker is
 * an inert comment.
 */
export function componentApi() {
  let index: Promise<Map<string, string>> | undefined;

  return {
    name: "loom:component-api",
    enforce: "pre" as const,
    buildStart() {
      // Rebuilt per run so a component added while the dev server is up is
      // found rather than reported missing until someone restarts it.
      index = undefined;
    },
    async transform(this: { addWatchFile?: (id: string) => void }, markdown: string, id: string) {
      if (!id.endsWith(".md")) return null;
      MARKER.lastIndex = 0;
      if (!MARKER.test(markdown)) return null;

      index ??= indexComponents();
      const components = await index;

      const replacements = new Map<string, string>();
      MARKER.lastIndex = 0;
      for (const match of markdown.matchAll(MARKER)) {
        const name = match[1];
        if (name === undefined || replacements.has(name)) continue;
        const file = components.get(name);
        if (file === undefined) {
          throw new Error(
            `${id}: <!-- @api ${name} --> names a component that does not exist under src/. ` +
              `Known: ${[...components.keys()].sort().join(", ")}`,
          );
        }
        this.addWatchFile?.(file);
        const [doc, source] = await Promise.all([parse(file), readFile(file, "utf8")]);
        replacements.set(name, apiSection(doc, source));
      }

      return markdown.replace(MARKER, (_match, name: string) => replacements.get(name) ?? _match);
    },
  };
}
