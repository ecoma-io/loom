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
 * Every page in a documentation directory, as sidebar links.
 *
 * Alphabetical by default: a curated order is a judgement to maintain, and the
 * reader arriving at a component list is looking a name up rather than
 * reading it through. Pass `order` — the slugs, in the order they should read
 * — for the directories where that default is wrong: a set of pages with a
 * genuine reading order (foundations building on one another) rather than a
 * flat list of names. A slug missing from `order` sorts after the ones named,
 * alphabetically, so an added page is never dropped silently for lack of an
 * update here.
 */
export function pagesIn(directory: string, order?: readonly string[]): SidebarLink[] {
  const root = new URL(`${directory}/`, DOCS);
  const rank = new Map<string, number>((order ?? []).map((slug, i) => [slug, i] as const));
  const pages: (SidebarLink & { slug: string })[] = [];
  const toLink = (dir: URL, file: string, prefix = ""): void => {
    const slug = `${prefix}${file.slice(0, -".md".length)}`;
    const source = readFileSync(fileURLToPath(new URL(file, dir)), "utf8");
    pages.push({ slug, text: title(source, slug), link: `/${directory}/${slug}` });
  };

  // The tree is the source, one level down: a subdirectory's pages (the
  // architecture `decisions/` ADRs) belong in the sidebar too, and a nested md
  // is linked at its full path without hand-maintaining it here.
  for (const entry of readdirSync(fileURLToPath(root), { withFileTypes: true })) {
    // A directory's `index.md` is the section landing the group header links
    // to, not an item inside its own list — and its `index` slug would
    // otherwise emit a `/dir/index` link that `cleanUrls` routing never
    // serves.
    if (entry.isDirectory()) {
      const nestedRoot = new URL(`${entry.name}/`, root);
      for (const file of readdirSync(fileURLToPath(nestedRoot))) {
        if (file.endsWith(".md") && file !== "index.md") toLink(nestedRoot, file, `${entry.name}/`);
      }
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "index.md") {
      toLink(root, entry.name);
    }
  }

  return pages
    .sort((a, b) => {
      // Compared before subtracting, and that is the whole point: two unranked
      // pages are both `Infinity`, and `Infinity - Infinity` is `NaN`. A
      // comparator that returns `NaN` does not sort — the engine reads it as
      // "these two are equal" and leaves them in the order the directory
      // happened to be read in. The alphabetical fallback below would never
      // run, and the failure is invisible, because a list in filesystem order
      // usually looks sorted until the one entry that is not.
      const ra = rank.get(a.slug) ?? Infinity;
      const rb = rank.get(b.slug) ?? Infinity;
      return ra !== rb ? ra - rb : a.text.localeCompare(b.text, "en");
    })
    .map(({ text, link }) => ({ text, link }));
}
