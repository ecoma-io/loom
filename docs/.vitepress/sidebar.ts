// The sidebar is read off the pages, not written beside them.
//
// A hand-maintained list of twenty-odd links is a second copy of the directory
// it describes, and the failure it produces is the quiet one: the page builds,
// the search finds it, and nothing in the navigation ever mentions it. Nobody
// notices, because the only symptom is an absence.
//
// So the tree is the source. Adding a page adds its link; renaming a page
// renames its link; deleting one deletes it. There is nothing to keep in sync,
// which is the only reliable way for two things to stay in sync.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DOCS = new URL("../", import.meta.url);

export interface SidebarLink {
  text: string;
  link: string;
}

/** The first `# Heading` in a markdown source — the page's own title. */
function title(markdown: string, fallback: string): string {
  return /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim() ?? fallback;
}

/**
 * Every page in a documentation directory, as sidebar links, ordered by title.
 *
 * Alphabetical rather than authored: a curated order would be a judgement to
 * maintain, and the reader arriving at a component list is looking a name up
 * rather than reading it through.
 */
export function pagesIn(directory: string): SidebarLink[] {
  const root = new URL(`${directory}/`, DOCS);
  return readdirSync(fileURLToPath(root))
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const slug = file.slice(0, -".md".length);
      const source = readFileSync(fileURLToPath(new URL(file, root)), "utf8");
      return { text: title(source, slug), link: `/${directory}/${slug}` };
    })
    .sort((a, b) => a.text.localeCompare(b.text, "en"));
}
