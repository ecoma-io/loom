// Where this site lives, stated once.
//
// Three things need to agree about it and they are written in three different
// languages: VitePress prefixes every generated asset URL with it, the staging
// step has to nest the built output under a matching directory tree so a static
// file server finds those URLs, and the Cloudflare route has to match the same
// path or the Worker never sees the request. A copy in each is three chances
// for two of them to drift — and the failure is a blank page in production and
// nowhere else, because the dev server serves from `/` no matter what this says.
//
// So the first two import it, and `tools/stage-docs.ts` asserts the third
// against it rather than trusting that someone updated `wrangler.jsonc` too.

/** The public origin the documentation is served from. */
export const SITE_HOST = "ecoma.io";

/** The path prefix under that origin, leading and trailing slash included. */
export const BASE = "/docs/contribute/design-system/";

/** The full public URL of the documentation home. */
export const SITE_URL = `https://${SITE_HOST}${BASE}`;
