// Fixtures for xss.yml, exercised by `semgrep --test --config .semgrep`.
// Every line marked `ruleid:` must be reported and every line marked `ok:` must
// not be — which is what stops a rule from being quietly widened or narrowed.
// Deliberately unsafe code: excluded from the build, from ESLint and from tsc.

declare const DOMPurify: { sanitize: (v: string) => string };
declare const el: HTMLElement;
declare const iframe: HTMLIFrameElement;
declare const range: Range;
declare const untrusted: string;
declare function h(tag: string, props: Record<string, unknown>): unknown;

export function htmlProperties(): void {
  // ruleid: loom-unsafe-html-property-assignment
  el.innerHTML = untrusted;
  // ruleid: loom-unsafe-html-property-assignment
  el.outerHTML = `<b>${untrusted}</b>`;
  // ruleid: loom-unsafe-html-property-assignment
  iframe.srcdoc = untrusted;

  // ok: loom-unsafe-html-property-assignment
  el.innerHTML = "<hr />";
  // ok: loom-unsafe-html-property-assignment
  el.innerHTML = DOMPurify.sanitize(untrusted);
  // ok: loom-unsafe-html-property-assignment
  el.textContent = untrusted;
}

export function adjacentHtml(): void {
  // ruleid: loom-unsafe-insert-adjacent-html
  el.insertAdjacentHTML("beforeend", untrusted);
  // ok: loom-unsafe-insert-adjacent-html
  el.insertAdjacentHTML("beforeend", DOMPurify.sanitize(untrusted));
  // ok: loom-unsafe-insert-adjacent-html
  el.insertAdjacentText("beforeend", untrusted);
}

export function documentWrite(): void {
  // ruleid: loom-document-write
  document.write(untrusted);
  // ruleid: loom-document-write
  document.writeln("<p></p>");
}

export function dynamicCode(): void {
  // ruleid: loom-dynamic-code-execution
  eval(untrusted);
  // ruleid: loom-dynamic-code-execution
  new Function("a", "return a")(1);
  // ruleid: loom-dynamic-code-execution
  setTimeout("doThing()", 100);
  // ruleid: loom-dynamic-code-execution
  setInterval("doThing()", 100);

  // ok: loom-dynamic-code-execution
  setTimeout(() => undefined, 100);
}

export function contextualFragment(): void {
  // ruleid: loom-range-create-contextual-fragment
  el.append(range.createContextualFragment(untrusted));
  // ok: loom-range-create-contextual-fragment
  el.append(range.createContextualFragment(DOMPurify.sanitize(untrusted)));
}

export function attributes(): void {
  // ruleid: loom-unsafe-attribute-assignment
  el.setAttribute("href", untrusted);
  // ruleid: loom-unsafe-attribute-assignment
  el.setAttribute("onclick", untrusted);
  // ruleid: loom-unsafe-attribute-assignment
  el.setAttribute("srcdoc", untrusted);

  // ok: loom-unsafe-attribute-assignment
  el.setAttribute("aria-label", untrusted);
  // ok: loom-unsafe-attribute-assignment
  el.setAttribute("href", "#main");
}

export function navigation(): void {
  // ruleid: loom-unvalidated-navigation
  location.href = untrusted;
  // ruleid: loom-unvalidated-navigation
  window.location.assign(untrusted);
  // ruleid: loom-unvalidated-navigation
  window.open(untrusted, "_blank");

  // ok: loom-unvalidated-navigation
  location.href = "/docs";
}

export function urlLiterals(): readonly string[] {
  return [
    // ruleid: loom-javascript-url-literal
    "javascript:alert(1)",
    // ruleid: loom-javascript-url-literal
    "data:text/html,<script>alert(1)</script>",
    // ok: loom-javascript-url-literal
    "https://ecoma.io",
  ];
}

export function messages(): void {
  // ruleid: loom-postmessage-without-origin-check
  window.addEventListener("message", function (event: MessageEvent) {
    el.textContent = String(event.data);
  });

  // ok: loom-postmessage-without-origin-check
  window.addEventListener("message", function (event: MessageEvent) {
    if (event.origin !== "https://ecoma.io") return;
    el.textContent = String(event.data);
  });
}

export function renderFunctions(): unknown {
  // ruleid: loom-render-function-inner-html
  h("div", { innerHTML: untrusted });
  // ok: loom-render-function-inner-html
  return h("div", { innerHTML: DOMPurify.sanitize(untrusted) });
}
