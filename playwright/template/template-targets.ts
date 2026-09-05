import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Metadata for one discovered template.
 *
 * Each template is a consumer-shaped Vite app under `templates/` with its own
 * `vite.config.ts`, `index.html` and `src/main.ts`. The harness assigns each a
 * unique port so all templates can serve concurrently during a browser test run.
 */
export interface TemplateTarget {
  /** The template's directory name, e.g. `"saas-shell"` or `"starter"`. */
  id: string;
  /** Absolute filesystem path to the template directory. */
  path: string;
  /** The port this template's Vite dev server runs on. */
  port: number;
  /** The URL path the template serves at (always `"/"` for standalone apps). */
  route: string;
}

const DIR = fileURLToPath(new URL("..", import.meta.url));
const ROOT = join(DIR, "..");
const TEMPLATES_ROOT = join(ROOT, "templates");

// The first port the template harness allocates. Must not overlap with the
// component harness port (5183) or the docs preview port (4173).
const START_PORT = 5184;

/**
 * Every template in the `templates/` directory, discovered from the tree rather
 * than from a hard-coded list — a template added tomorrow is covered the moment
 * its directory exists. A template removed tomorrow stops being served without
 * anyone remembering to edit a second source of truth.
 *
 * Templates are sorted by name for determinism. The returned list is what both
 * the server script and the Playwright config iterate, so a name here means a
 * dev server and a project in the test matrix.
 */
export function templateTargets(): TemplateTarget[] {
  const names = readdirSync(TEMPLATES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return names.map((name, i) => ({
    id: name,
    path: join(TEMPLATES_ROOT, name),
    port: START_PORT + i,
    route: "/",
  }));
}
