import { createApp } from "vue";
import type { InjectionKey } from "vue";
// Self-import: the fallback pair is real LiveRegion instances, so it
// inherits the VisuallyHidden clip technique instead of duplicating it. The
// cycle is benign — this module touches the SFC only inside
// `ensureStandaloneRegions()`, long after both modules have evaluated.
import LiveRegion from "./LiveRegion.vue";

/**
 * The seam's machinery, kept out of the SFC so the module-level state it
 * needs — the writer registries and the standalone fallback — is genuinely
 * module-level rather than per-instance.
 */
export type LiveRegionPoliteness = "polite" | "assertive";

/** The write half of the seam — what `useAnnounce()` hands back. */
export type Announce = (message: string, politeness?: LiveRegionPoliteness) => void;

/** The provide/inject shape a mounted region shares with its subtree. */
export interface LiveRegionContext {
  announce: Announce;
}

export const LIVE_REGION_KEY: InjectionKey<LiveRegionContext> = Symbol("loom-live-region");

/** The write function a mounted region registers. */
type Writer = Announce;

/**
 * Writers registered by regions mounted in the component tree, per
 * politeness. The earliest still-mounted region of a politeness wins, so a
 * region near the app root owns the channel and a stray duplicate deeper in
 * the tree stays silent.
 */
const regionWriters = new Map<LiveRegionPoliteness, Writer[]>();

/**
 * Writers for the standalone pair mounted on `document.body`, kept apart
 * from `regionWriters` so an in-tree region always outranks the fallback
 * without the lookup depending on mount order.
 */
const standaloneWriters = new Map<LiveRegionPoliteness, Writer>();

export function registerWriter(
  politeness: LiveRegionPoliteness,
  writer: Writer,
  standalone: boolean,
): () => void {
  if (standalone) {
    standaloneWriters.set(politeness, writer);
    return () => {
      if (standaloneWriters.get(politeness) === writer) standaloneWriters.delete(politeness);
    };
  }
  const list = regionWriters.get(politeness) ?? [];
  list.push(writer);
  regionWriters.set(politeness, list);
  return () => {
    regionWriters.set(
      politeness,
      (regionWriters.get(politeness) ?? []).filter((registered) => registered !== writer),
    );
  };
}

/**
 * True while the fallback pair is mounting, so those instances register as
 * the fallback rather than as in-tree regions. `createApp().mount()` runs
 * synchronously, so the flag cannot interleave.
 */
export let mountingStandalone = false;

let standaloneMounted = false;

/**
 * Mounts the standalone polite + assertive pair on `document.body` — the
 * default for callers that never mounted a region. It runs when the seam is
 * first asked for (`useAnnounce()`), never at announce time: a region added
 * in the same tick as its message is announced unreliably, so the pair has
 * to pre-exist the first message.
 */
export function ensureStandaloneRegions(): void {
  if (standaloneMounted || typeof document === "undefined") return;
  standaloneMounted = true;
  const host = document.createElement("div");
  host.setAttribute("data-loom-live-region", "");
  const apps: ReturnType<typeof createApp>[] = [];
  for (const politeness of ["polite", "assertive"] as const) {
    const mountPoint = document.createElement("div");
    host.appendChild(mountPoint);
    mountingStandalone = true;
    try {
      const app = createApp(LiveRegion, { politeness });
      app.mount(mountPoint);
      apps.push(app);
    } finally {
      mountingStandalone = false;
    }
  }
  document.body.appendChild(host);
  // The pair is a page-lifetime singleton — it must outlive the component
  // that first asked for it, or in-flight announcements would die with it —
  // so its teardown rides the page's, not any caller's.
  window.addEventListener(
    "pagehide",
    () => {
      for (const app of apps) app.unmount();
      standaloneWriters.clear();
      standaloneMounted = false;
      host.remove();
    },
    { once: true },
  );
}

/**
 * The shared announcer: the in-tree region of that politeness if one is
 * mounted, else the standalone pair. Never mounts anything — regions must
 * pre-exist announcements, so the pair is mounted when `useAnnounce()` first
 * runs, not here.
 */
export const announce: Announce = (message, politeness = "polite") => {
  if (typeof document === "undefined") return;
  const writer = regionWriters.get(politeness)?.[0] ?? standaloneWriters.get(politeness);
  writer?.(message);
};
