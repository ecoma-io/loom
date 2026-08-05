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
