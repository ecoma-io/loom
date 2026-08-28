import { inject } from "vue";
import { LIVE_REGION_KEY, ensureStandaloneRegions, announce } from "./context";
import type { Announce } from "./context";

/**
 * The announcement seam. Call once in `setup()`:
 *
 *   const announce = useAnnounce();
 *   announce("3 results found");            // politely
 *   announce("Upload failed", "assertive"); // interrupting
 *
 * Under a mounted `<LiveRegion>` the message goes to the region registered
 * for that politeness; with no region in the tree it goes to the standalone
 * pair that this call mounts on `document.body` — mounted here, at setup
 * time, so the regions pre-exist the first message rather than appearing in
 * the same tick as it. SSR-safe: with no `document` there is nowhere to
 * announce to, and the function is a no-op.
 */
export function useAnnounce(): Announce {
  ensureStandaloneRegions();
  return inject(LIVE_REGION_KEY, null)?.announce ?? announce;
}
