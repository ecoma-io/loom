// Fixtures for memory-leaks.yml, exercised by `semgrep --test --config .semgrep`.
// Deliberately leaky code: excluded from the build, from ESLint and from tsc.

declare const el: HTMLElement;
declare const blob: Blob;
declare const someRef: { value: number };
declare function watch(source: unknown, cb: () => void): unknown;
declare function watchEffect(cb: () => void): unknown;
declare function onUnmounted(cb: () => void): void;

// ruleid: loom-global-listener-at-module-scope
window.addEventListener("resize", onResize);

function onResize(): void {
  el.dataset["w"] = String(window.innerWidth);
}

// ruleid: loom-reactive-effect-at-module-scope
watch(someRef, () => undefined);
// ruleid: loom-reactive-effect-at-module-scope
watchEffect(() => undefined);

// Each deferring body of the effect rule pinned: an effect created in any of
// these runs when the body runs, not while the module is evaluating.
// ok: loom-reactive-effect-at-module-scope
export const stopWatching = (): unknown => {
  return watch(someRef, () => undefined);
};
// ok: loom-reactive-effect-at-module-scope
function scopedWatch(): unknown {
  return watchEffect(() => undefined);
}
// ok: loom-reactive-effect-at-module-scope
const anonymousWatch = function (): unknown {
  return watchPostEffect(() => undefined);
};
// ok: loom-reactive-effect-at-module-scope
class EffectHost {
  mount(): unknown {
    return watchSyncEffect(() => undefined);
  }
}

export function listeners(): void {
  // ruleid: loom-inline-listener-cannot-be-removed
  el.addEventListener("click", () => undefined);
  // ruleid: loom-inline-listener-cannot-be-removed
  el.addEventListener("keydown", function () {
    return undefined;
  });

  // ok: loom-inline-listener-cannot-be-removed
  el.addEventListener("click", () => undefined, { once: true });
  // ok: loom-inline-listener-cannot-be-removed
  el.addEventListener("click", () => undefined, { signal: new AbortController().signal });
  // ok: loom-inline-listener-cannot-be-removed
  el.addEventListener("click", onResize);

  // ruleid: loom-remove-listener-with-inline-handler
  el.removeEventListener("click", () => undefined);
  // ok: loom-remove-listener-with-inline-handler
  el.removeEventListener("click", onResize);

  // ok: loom-global-listener-at-module-scope
  window.addEventListener("scroll", onResize);
}

export function timers(): void {
  // ruleid: loom-discarded-timer-handle
  setInterval(onResize, 1000);

  // ok: loom-discarded-timer-handle
  const handle = setInterval(onResize, 1000);
  onUnmounted(() => clearInterval(handle));
}

export function observers(): void {
  // ruleid: loom-discarded-observer
  new ResizeObserver(onResize).observe(el);
  // ruleid: loom-discarded-observer
  new MutationObserver(onResize);

  // ok: loom-discarded-observer
  const observer = new IntersectionObserver(onResize);
  onUnmounted(() => observer.disconnect());
}

export function connections(): void {
  // ruleid: loom-discarded-long-lived-connection
  new EventSource("/events");
  // ruleid: loom-discarded-long-lived-connection
  new WebSocket("wss://example.test");

  // ok: loom-discarded-long-lived-connection
  const channel = new BroadcastChannel("loom");
  onUnmounted(() => channel.close());
}

export function objectUrls(): string {
  // ruleid: loom-object-url-never-revoked
  return URL.createObjectURL(blob);
}

export function objectUrlsRevoked(): void {
  // ok: loom-object-url-never-revoked
  const url = URL.createObjectURL(blob);
  URL.revokeObjectURL(url);
}

export function portals(): void {
  // ruleid: loom-body-append-without-removal
  document.body.appendChild(el);
}

export function portalsCleaned(): void {
  // ok: loom-body-append-without-removal
  document.body.appendChild(el);
  onUnmounted(() => document.body.removeChild(el));
}

// The import-time contract: a module that reads the browser while it is being
// evaluated runs that read in every consumer that imports it, rendered or not.

// ruleid: loom-browser-api-at-module-scope
const initialViewport = window.innerWidth;
// ruleid: loom-browser-api-at-module-scope
document.documentElement.dataset["loomBoot"] = "1";
// ruleid: loom-browser-api-at-module-scope
const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
// ruleid: loom-browser-api-at-module-scope
const storedPosition = localStorage.getItem("loom");

// Construction and frame scheduling run at import too. The assigned form is
// the one the leak rules beside this rule cannot see — assignment is their
// exemption, and a module-scope assignment owns no lifecycle either.
// ruleid: loom-browser-api-at-module-scope
const resizeObserver = new ResizeObserver(() => undefined);
// ruleid: loom-browser-api-at-module-scope
const mutationObserver = new MutationObserver(() => undefined);
// ruleid: loom-browser-api-at-module-scope
const intersectionObserver = new IntersectionObserver(() => undefined);
// ruleid: loom-browser-api-at-module-scope
const performanceObserver = new PerformanceObserver(() => undefined);
// ruleid: loom-browser-api-at-module-scope
const socket = new WebSocket("wss://example.test");
// ruleid: loom-browser-api-at-module-scope
const eventStream = new EventSource("/events");
// ruleid: loom-browser-api-at-module-scope
const worker = new Worker(new URL("./worker.ts", import.meta.url));
// ruleid: loom-browser-api-at-module-scope
const sharedWorker = new SharedWorker(new URL("./worker.ts", import.meta.url));
// ruleid: loom-browser-api-at-module-scope
const channel = new BroadcastChannel("loom");
// ruleid: loom-browser-api-at-module-scope
const firstFrame = requestAnimationFrame(() => undefined);

// A concise arrow defers its body to call time — module scope ends at the `=>`.
// ok: loom-browser-api-at-module-scope
export const viewportWidth = (): number => window.innerWidth;

// The block-bodied arrow and the function expression defer exactly the same
// way; each exemption row of the rule is pinned here so dropping a row turns
// this file red.
// ok: loom-browser-api-at-module-scope
export const viewportSize = (): { width: number } => {
  return { width: window.innerWidth };
};
// ok: loom-browser-api-at-module-scope
export const measuredViewport = function (): number {
  return window.innerHeight;
};

// The sanctioned guard: the branch exists because the environment may not be a
// browser, so the reads inside it are deliberate.
// ok: loom-browser-api-at-module-scope
if (typeof window !== "undefined") {
  window.history.replaceState(null, "", window.location.href);
}

// The sanctioned guard in conditional-expression form — each polarity defers
// one branch to run time.
// ok: loom-browser-api-at-module-scope
const ternaryViewport = typeof window !== "undefined" ? window.innerWidth : 0;
// ok: loom-browser-api-at-module-scope
const ternaryViewportDark = typeof window === "undefined" ? 0 : window.innerWidth;

// Further conjuncts do not unsanction the guard, on either side of the `&&`.
// ok: loom-browser-api-at-module-scope
if (typeof window !== "undefined" && window.location.protocol === "https:") {
  window.history.replaceState(null, "", window.location.href);
}
// ok: loom-browser-api-at-module-scope
if (navigator.userAgent && typeof document !== "undefined") {
  document.documentElement.dataset["loomBoot"] = "1";
}

// The remaining polarities of the guard set — each row of the rule is pinned,
// because a guard row that stops matching sanctions nothing and reads as if
// it still does.
// ok: loom-browser-api-at-module-scope
if (typeof window === "undefined") {
  document.documentElement.dataset["loomBoot"] = "1";
}
// ok: loom-browser-api-at-module-scope
if (typeof window != "undefined") {
  window.history.replaceState(null, "", window.location.href);
}
// ok: loom-browser-api-at-module-scope
if (typeof window == "undefined") {
  document.documentElement.dataset["loomBoot"] = "1";
}
// ok: loom-browser-api-at-module-scope
if (typeof document === "undefined" && window.location.protocol === "https:") {
  window.history.replaceState(null, "", window.location.href);
}
// ok: loom-browser-api-at-module-scope
if (typeof document != "undefined" && window.location.protocol === "https:") {
  window.history.replaceState(null, "", window.location.href);
}
// ok: loom-browser-api-at-module-scope
if (typeof document == "undefined" && window.location.protocol === "https:") {
  window.history.replaceState(null, "", window.location.href);
}
// ok: loom-browser-api-at-module-scope
const ternaryViewportBang = typeof window != "undefined" ? window.innerWidth : 0;
// ok: loom-browser-api-at-module-scope
const ternaryViewportEq = typeof window == "undefined" ? 0 : window.innerWidth;

// A static member's initializer runs when the class definition is evaluated —
// import time for a module-level class — so the class-body exemption does not
// reach it. The exemption still holds for everything below that is not
// `static`: instance fields run at construction and methods at call time,
// which is why the static branch went through the `static` shape instead of
// loosening that exemption.
// The annotation sits on the field line because that is where the finding
// starts — the class spelling is irrelevant to the range.
class Platform {
  // ruleid: loom-browser-api-at-module-scope
  static isTouch = window.matchMedia("(pointer: coarse)").matches;
}
class SharedObserver {
  // ruleid: loom-browser-api-at-module-scope
  static shared = new ResizeObserver(() => undefined);
}
class BootFrame {
  // ruleid: loom-browser-api-at-module-scope
  static handle = requestAnimationFrame(() => undefined);
}
const LazyViewport = class {
  // ruleid: loom-browser-api-at-module-scope
  static probe = window.innerWidth;
};
export default class {
  // ruleid: loom-browser-api-at-module-scope
  static booted = document.documentElement.dataset["loomBoot"];
}

// The sanctioned static initializer guard, in conditional-expression form —
// the only guard shape an initializer can carry, in all four polarities.
// ok: loom-browser-api-at-module-scope
class GuardedViewport {
  static width = typeof window !== "undefined" ? window.innerWidth : 0;
}
// ok: loom-browser-api-at-module-scope
class GuardedViewportDark {
  static nav = typeof window === "undefined" ? null : window.navigator;
}
// ok: loom-browser-api-at-module-scope
class GuardedViewportBang {
  static width = typeof window != "undefined" ? window.innerWidth : 0;
}
// ok: loom-browser-api-at-module-scope
class GuardedViewportEq {
  static nav = typeof window == "undefined" ? null : window.navigator;
}

// A class declared inside a body evaluates when that body runs, and its
// static initializers defer with it.
// ok: loom-browser-api-at-module-scope
export function deferredProbe(): number {
  class Deferred {
    static probe = window.innerWidth;
  }
  return Deferred.probe;
}

// Instance members keep the class-body exemption the static branch was built
// around.
// ok: loom-browser-api-at-module-scope
class ViewportGauge {
  width = window.innerWidth;

  read(): number {
    return window.innerHeight;
  }
}

// A `static { ... }` initialization block has the same import-time semantics
// and no coverage: semgrep's JavaScript grammar cannot parse the block form,
// so the rule cannot claim it — it stays on review, like the `.vue` script
// blocks the interface contract already names.

// An immediately-invoked body is not a deferral: the invocation happens while
// the module is evaluating, which is the defect itself.
(function boot(): void {
  // ruleid: loom-browser-api-at-module-scope
  const bootViewport = window.innerWidth;
})();
(function (): void {
  // ruleid: loom-browser-api-at-module-scope
  document.documentElement.dataset["loomBoot"] = "1";
})();
(() => {
  // ruleid: loom-browser-api-at-module-scope
  localStorage.getItem("loom");
})();
// ruleid: loom-browser-api-at-module-scope
(() => document.title)("x");

// A module-scope call is reported through its callee member — one defect
// shape, one finding. `semgrep --test` counts annotated lines rather than
// findings, so this file cannot pin the count; the count is probe-verified
// instead (semgrep 1.172.0, before the call shapes were dropped: this line
// reported twice).
// ruleid: loom-browser-api-at-module-scope
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Listener registration keeps its own rule: the addEventListener line below is
// loom-global-listener-at-module-scope's finding and must not double-report.
// ruleid: loom-global-listener-at-module-scope
window.addEventListener("resize", onResize);

// The listener rule defers the same way the browser-read rule does: a
// registration inside a body belongs to that body's lifetime.
// ok: loom-global-listener-at-module-scope
export const bindViewport = (): void => {
  window.addEventListener("resize", onResize);
};
// ok: loom-global-listener-at-module-scope
class ListenerHost {
  attach(): void {
    document.addEventListener("scroll", onResize);
  }
}

export function browserReadsAreLifecycleWork(): void {
  // ok: loom-browser-api-at-module-scope
  document.activeElement?.scrollIntoView();
  // ok: loom-browser-api-at-module-scope
  void navigator.clipboard.readText();
  // ok: loom-browser-api-at-module-scope
  if (typeof document === "undefined") return;
  // ok: loom-browser-api-at-module-scope
  document.title = "loom";
}
