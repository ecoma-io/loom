// Lays the built documentation out the way it will be served, and refuses to
// if the Cloudflare route disagrees about where that is.
//
// VitePress builds a site whose every asset URL carries `BASE`, then writes it
// to a directory whose root is the site root. Those two facts contradict each
// other the moment the base is not `/`: `dist/index.html` asks the browser for
// `/docs/contribute/design-system/assets/app.js`, and a static file server
// rooted at `dist/` has no such path. The page loads, the styles and scripts
// 404, and what ships is a wall of unstyled text.
//
// So the build is nested under a directory tree matching the base, and the
// nested tree is what Cloudflare serves. Doing it here rather than with a
// request rewrite in the Worker keeps the deployment scriptless: there is no
// handler to reason about, and the file layout is the whole explanation.
//
// Two jobs, and `--check` is the seam between them. Asserting the route reads
// two source files and compares them; copying the build needs a build to exist.
// They are one script because they are one decision — where the site lives —
// and splitting them across two files would leave the assertion somewhere a
// reader looking for the layout would not find it. But CI's `verify` job no
// longer builds the site (every end-to-end leg does, through Playwright's
// `webServer`), and it still has to make the assertion, because nothing else
// before a merge does. Without the flag it would have to build a site it then
// throws away just to reach the check.
//
// Run: `node tools/stage-docs.ts`         — assert, then stage the build.
//      `node tools/stage-docs.ts --check` — assert only; no build required.
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BASE, SITE_HOST, SITE_URL } from "../docs/.vitepress/base.ts";

const ROOT = new URL("../", import.meta.url);
const BUILD = new URL("docs/.vitepress/dist/", ROOT);
const STAGE = new URL(".cloudflare/", ROOT);
const WRANGLER = new URL("wrangler.jsonc", ROOT);

const CHECK_ONLY = process.argv.includes("--check");

/**
 * The route Cloudflare must carry for the staged tree to be reachable.
 *
 * `BASE` has a trailing slash and the pattern needs the wildcard directly
 * after it, so `/docs/…/design-system/` becomes `…/design-system/*` — the
 * request for the site root included.
 */
const EXPECTED_ROUTE = `${SITE_HOST}${BASE}*`;

// The comparison is against the raw source rather than a parse: `wrangler.jsonc`
// is JSONC, and pulling in a comment-tolerant parser to read one string would
// be a dependency for a substring search. What matters is that the exact route
// is present, and a substring answers that.
const wranglerSource = await readFile(WRANGLER, "utf8");
if (!wranglerSource.includes(`"pattern": "${EXPECTED_ROUTE}"`)) {
  console.error(
    `wrangler.jsonc has no route for ${EXPECTED_ROUTE}.\n\n` +
      `The base in docs/.vitepress/base.ts is "${BASE}", so the Worker must be bound to\n` +
      `that path — otherwise it deploys successfully and never receives a request.\n` +
      `Set the route's "pattern" to "${EXPECTED_ROUTE}" (or change the base, if the\n` +
      `move was the intent).`,
  );
  process.exit(1);
}

if (CHECK_ONLY) {
  console.log(
    `wrangler.jsonc routes ${EXPECTED_ROUTE}, matching the base ${SITE_URL} is built with.`,
  );
} else {
  // `BASE` is `/a/b/` — the leading and trailing slashes are what make it a URL
  // prefix, and what make it the wrong shape for a path segment list.
  const segments = BASE.split("/").filter(Boolean);
  const target = new URL(`${segments.join("/")}/`, STAGE);

  await rm(STAGE, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(BUILD, target, { recursive: true });

  console.log(
    `Staged ${fileURLToPath(BUILD)}\n     to ${fileURLToPath(target)}\n` + `  serving ${SITE_URL}`,
  );
}
