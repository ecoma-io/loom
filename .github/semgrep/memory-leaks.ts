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

// A concise arrow defers its body to call time — module scope ends at the `=>`.
// ok: loom-browser-api-at-module-scope
export const viewportWidth = (): number => window.innerWidth;

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
