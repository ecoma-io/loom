// Conventional Commits, enforced by lefthook's commit-msg hook.
//
// This repository is a single package, so a scope carries no routing
// information the type does not already give, and stays optional. When one is
// used it must come from the list below, which names the areas a change can
// actually land in. Rules and examples: CONTRIBUTING.md.
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "primitives",
        "composition",
        "blocks",
        "brand",
        "lib",
        "a11y",
        "styles",
        "docs",
        "e2e",
        "workspace",
        "deps",
        "ci",
      ],
    ],
    "body-max-line-length": [0],
  },
};
