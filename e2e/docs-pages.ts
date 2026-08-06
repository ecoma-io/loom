import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative, sep } from "node:path";

/**
 * Every documentation page, as the path VitePress serves it under — read off
 * the files in `docs/` rather than kept as a list beside them. A hand-written
 * list of every component and block page is a second copy of the directory
 * tree, and the failure it produces is the quiet one: a page ships, and the
 * accessibility sweep simply never looks at it because nobody remembered to
 * add the new URL. Deriving it here means a page added tomorrow is covered
 * the moment it exists.
 *
 * The mapping mirrors the routing `cleanUrls: true` gives the built site (see
 * `docs/.vitepress/config.mts`): `index.md` at the root of `docs/` is the
 * site's home page, `<dir>/index.md` serves at `<dir>/`, and every other
 * `<name>.md` serves at `<name>` with the extension stripped. Paths are
 * returned relative (no leading slash) so a caller can hand them straight to
 * `page.goto()` and have them resolve against the configured `baseURL`,
 * which already carries the site's `/docs/contribute/design-system/` prefix
 * — a leading slash would instead resolve against the origin and drop that
 * prefix entirely.
 */
export function documentationPages(): string[] {
  const docsRoot = fileURLToPath(new URL("../docs", import.meta.url));
  const pages: string[] = [];

  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      // VitePress's own build state, not documentation content.
      if (entry.name === ".vitepress") continue;

      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.name.endsWith(".md")) continue;

      const relPath = relative(docsRoot, fullPath).split(sep).join("/");
      if (relPath === "index.md") {
        pages.push(".");
      } else if (relPath.endsWith("/index.md")) {
        pages.push(relPath.slice(0, -"index.md".length));
      } else {
        pages.push(relPath.slice(0, -".md".length));
      }
    }
  }

  walk(docsRoot);
  return pages.sort((a, b) => a.localeCompare(b, "en"));
}
