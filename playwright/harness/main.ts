import { createApp, defineComponent, h, type Component } from "vue";
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

const file = `../../docs/demos/${kebabToPascal(wanted)}Demo.vue`;
const loader = demos[file];
if (!loader) {
  const known = Object.keys(demos)
    .map((path) => path.replace(/^.*\/(\w+)Demo\.vue$/, "$1"))
    .sort();
  document.body.textContent = `Unknown component "${wanted}". Known: ${known.join(", ")}`;
  throw new Error(`no demo found for component "${wanted}"`);
}

const demo = await loader();
createApp(defineComponent({ render: () => h(demo.default) })).mount("#app");

// A trailing real tab-stop, after the demo. The docs site always has content
// following a demo, so a spec asserting "Tab leaves the group" always had a
// next element to land on there. The harness mounts the demo alone, and
// Firefox keeps focus on the last tabbable element when nothing follows it —
// which would make that assertion fail in Firefox only, testing an artifact
// of the harness rather than the component. One element after the demo
// restores the docs page's property in every engine.
const sentinel = document.createElement("button");
sentinel.textContent = "harness end-of-demo sentinel";
sentinel.id = "harness-sentinel";
document.body.appendChild(sentinel);
