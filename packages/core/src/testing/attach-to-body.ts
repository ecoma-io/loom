import { onTestFinished } from "vitest";

/**
 * Appends `node` to `document.body` and registers its own removal as
 * teardown for the test currently running, so the node's lifetime is scoped
 * to exactly the test that created it.
 *
 * Several primitives here (Dialog, DropdownMenu, Select) portal their real
 * content out of the component's own subtree and onto `document.body`, so a
 * test that exercises "focus stays trapped inside the panel" or "the rest of
 * the page goes `aria-hidden` while it's open" has to put a stand-in node on
 * the body itself — there is no wrapper element to mount it under instead.
 * Once that node exists, something has to take it back off, and where that
 * something lives matters.
 *
 * Some of these files already run a file-wide `afterEach` that wipes
 * `document.body.innerHTML`. That reset is real, and it is not being
 * replaced — nothing in these suites leaks today. But it is a blunt
 * instrument, declared once at the top of the file and read by nobody at the
 * point a new node gets appended — which is exactly the shape that survives
 * a refactor by accident (the reset stays; the test around it changes shape
 * underneath it) and stops protecting anything the day someone deletes it
 * believing each test already cleans up after itself. Registering removal in
 * the same scope that did the appending keeps the pairing visible at the
 * call site instead of several dozen lines away.
 *
 * `onTestFinished` over a plain `node.remove()` written at the end of the
 * test body, for the same reason `afterEach` itself is trustworthy: code
 * placed after a test's assertions only runs if none of them threw, and a
 * failing assertion is exactly the moment teardown matters most — a fixture
 * left behind is how the *next* test in the file starts from a DOM that
 * still remembers the one that failed, instead of a clean one.
 */
export function attachToBody<T extends ChildNode>(node: T): T {
  document.body.append(node);
  onTestFinished(() => {
    node.remove();
  });
  return node;
}
