import { createApp, defineComponent, h, onBeforeUnmount, type Component } from "vue";
import "./styles.css";

/**
 * The component E2E harness entry.
 *
 * A single page mounts one documentation demo — the same `.vue` file the
 * VitePress site renders — selected by `?component=<kebab-case-name>`, so a
 * browser spec drives the real component against its real public API without
 * paying for VitePress's chrome or a site build. The demos are the contract:
 * what a spec mounts is exactly what a reader of the docs sees, which is why
 * the glob is pointed at `docs/demos` rather than at a parallel copy.
 */
const demos = import.meta.glob<{ default: Component }>("../../docs/demos/*Demo.vue", {
  eager: false,
});

function kebabToPascal(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

const wanted = new URLSearchParams(window.location.search).get("component");
if (!wanted) {
  document.body.textContent = "No ?component= parameter given.";
  throw new Error("component E2E harness requires ?component=<kebab-name>");
}

// `wanted` is user-controlled (the `?component=` query parameter). It is
// validated before it ever selects code: `knownDemos` is the allow-list the
// glob discovered at build time, normalised to the same kebab-case names the
// `?component=` parameter carries, and `wanted` must name one of them exactly.
// A value that is not a demo name falls through to the error block below —
// there is no path from `wanted` to calling anything but a `docs/demos`
// module's own component.
const knownDemos = Object.keys(demos).map((path) =>
  path
    .replace(/^.*\/(\w+)Demo\.vue$/, "$1")
    // "SegmentedControl" -> "segmented-control"
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase(),
);
if (!knownDemos.includes(wanted)) {
  document.body.textContent = `Unknown component "${wanted}". Known: ${knownDemos.sort().join(", ")}`;
  throw new Error(`no demo found for component "${wanted}"`);
}
const loader = demos[`../../docs/demos/${kebabToPascal(wanted)}Demo.vue`];
// The allow-list above guarantees the key exists; `assert` is the type-level
// residue of that guarantee. It is not a second validation — it is how the
// checker knows the lookup cannot be `undefined` here.
if (!loader) {
  throw new Error(`no demo found for component "${wanted}"`);
}

// A trailing real tab-stop, after the demo. The docs site always has content
// following a demo, so a spec asserting "Tab leaves the group" always had a
// next element to land on there. The harness mounts the demo alone, and
// Firefox keeps focus on the last tabbable element when nothing follows it —
// which would make that assertion fail in Firefox only, testing an artifact
// of the harness rather than the component. One element after the demo
// restores the docs page's property in every engine. The sentinel genuinely
// needs to follow the demo on the page, rather than Teleport, since a
// keyboard spec must Tab to it.
const demo = await loader();
createApp(
  defineComponent({
    // The sentinel and its teardown live in the same function scope, so the
    // appended node cannot outlive the component that appended it.
    setup() {
      const sentinel = document.createElement("button");
      sentinel.textContent = "harness end-of-demo sentinel";
      sentinel.id = "harness-sentinel";
      document.body.appendChild(sentinel);
      onBeforeUnmount(() => {
        sentinel.remove();
      });
      return () => h(demo.default);
    },
  }),
).mount("#app");
