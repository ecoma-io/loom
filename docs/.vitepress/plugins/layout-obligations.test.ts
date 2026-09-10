// @vitest-environment node
//
// Node rather than the project-wide jsdom, for the same reason
// pattern-record.test.ts opts out: the expansion is a pure string transform
// over files read from disk, and the tests read the real contracts and hold
// the rendered obligations to them against synthetic sidecars.
//
// The plugin's whole purpose is the obligations split: the composition model
// authored once in frontmatter, the regions rendered from the component's own
// slots, the responsive and accessibility obligations rendered from the
// sidecar and matrices the gates enforce — never transcribed. That makes this
// plugin a gate, and the law for gates (docs/architecture/evolution-ledger.md:
// "every new enforcement rule ships with a negative/mutation test") applies
// to it too — so every failure path below is exercised, not only asserted
// from reading the code.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  dutiesFor,
  expandLayoutObligations,
  parseSidecar,
  readComposition,
  readMatrix,
  regionsParagraph,
} from "./layout-obligations.ts";

const A11Y_CONTRACT = fileURLToPath(
  new URL("../../../packages/core/src/a11y-contract.ts", import.meta.url),
);
const RESPONSIVE_CONTRACT = fileURLToPath(
  new URL("../../../packages/core/src/responsive-contract.ts", import.meta.url),
);
const TIER_GRAPH = fileURLToPath(new URL("../../../tools/architecture/graph.ts", import.meta.url));

const PAGE = "docs/layouts/app-shell.md";
const SIDECAR = "packages/layouts/app-shell/a11y.json";
const MARKER = "<!-- @layout-obligations AppShell -->";

const COMPOSITION =
  '---\ncomposition: "One shell owning a rail, a header band and a filling content area."\n---\n';
const FRONTMATTER = `${COMPOSITION}\n# AppShell\n\n## Obligations\n\n${MARKER}\n`;

const SIDECAR_SOURCE = JSON.stringify({
  role: "none",
  basis: "renders <header>, <aside> and main-content landmarks around slots.",
  responsive: {
    behaviour: ["intrinsic-collapse", "band-scale"],
    basis: "the sidebar+content row is flex-wrap with a min-width floor on the content pane.",
    evidence: { sweep: ["e2e/layout-responsive.e2e.ts"] },
  },
  evidence: {
    browserless: ["docs/demos/AppShellDemo.vue"],
    harness: [
      {
        path: "packages/layouts/app-shell/e2e/app-shell.e2e.ts",
        because: "pins the shell regions",
      },
    ],
    sweep: ["docs/layouts/app-shell.md"],
  },
  interaction: {
    class: "container",
    basis: "the page's landmark skeleton.",
    exceptions: [
      { requirement: "keyboard-operate", because: "geometry only — keyboard passage unproven" },
    ],
  },
});

function expand({
  markdown = FRONTMATTER,
  sidecarSource = SIDECAR_SOURCE,
  a11yContractSource = readFileSync(A11Y_CONTRACT, "utf8"),
  responsiveContractSource = readFileSync(RESPONSIVE_CONTRACT, "utf8"),
  tierGraphSource = readFileSync(TIER_GRAPH, "utf8"),
  componentFile = "packages/layouts/app-shell/src/AppShell.vue",
}: {
  markdown?: string;
  sidecarSource?: string;
  a11yContractSource?: string;
  responsiveContractSource?: string;
  tierGraphSource?: string;
  componentFile?: string;
} = {}): Promise<string | null> {
  return expandLayoutObligations({
    markdown,
    id: PAGE,
    componentFile,
    sidecarPath: SIDECAR,
    sidecarSource,
    a11yContractSource,
    responsiveContractSource,
    tierGraphSource,
  });
}

describe("expandLayoutObligations", () => {
  it("renders the four obligations from the real contracts and the sidecar", async () => {
    const result = (await expand()) ?? "";
    // Regions come from the component's own slots, not from the page.
    expect(result).toContain("**Regions.** The layout hosts 3 regions, read from its own slots:");
    expect(result).toContain("`#sidebar`, `#header`, and the default region");
    // The responsive claim renders the sidecar's words and basis verbatim.
    expect(result).toContain(
      "**Responsive behaviour.** Declared `intrinsic-collapse`, `band-scale`",
    );
    expect(result).toContain("flex-wrap with a min-width floor");
    expect(result).toContain("| `sweep` | `e2e/layout-responsive.e2e.ts` |");
    expect(result).toContain("| `harness` | — |");
    // The a11y obligations name the duties the real matrices demand, and the
    // named exception with its reason.
    expect(result).toContain("The role's matrix row owes `semantic-aria`, `name`, `contrast`");
    expect(result).toContain("its matrix row owes `keyboard-operate`");
    expect(result).toContain("`keyboard-operate` — _geometry only — keyboard passage unproven_");
    // The composition model is the authored claim, and the position is the
    // graph's tier order.
    expect(result).toContain(
      "**Composition model.** One shell owning a rail, a header band and a filling content area.",
    );
    expect(result).toContain(
      "`layouts` is the outermost component tier — above `primitives`, `composition`, `patterns`",
    );
    expect(result).not.toContain(MARKER);
  });

  it("leaves a page without the marker alone", async () => {
    await expect(expand({ markdown: "# AppShell\n\nno marker here\n" })).resolves.toBeNull();
  });

  it("refuses a second marker — the obligations are one claim about one layout", async () => {
    const markdown = `${FRONTMATTER}\n${MARKER}\n`;
    await expect(expand({ markdown })).rejects.toThrow("carries 2 @layout-obligations markers");
  });

  it("refuses a page with no frontmatter block — the claim has nowhere to sit", async () => {
    const markdown = `# AppShell\n\n## Obligations\n\n${MARKER}\n`;
    await expect(expand({ markdown })).rejects.toThrow("no frontmatter block");
  });

  it("refuses a page whose frontmatter carries no composition claim", async () => {
    const markdown = `---\ntitle: "AppShell"\n---\n# AppShell\n\n## Obligations\n\n${MARKER}\n`;
    await expect(expand({ markdown })).rejects.toThrow("carries no `composition:`");
  });

  it("refuses a second composition key — the composition model is one claim", async () => {
    const markdown = `---\ncomposition: "One claim."\ncomposition: "A second."\n---\n# AppShell\n\n${MARKER}\n`;
    await expect(expand({ markdown })).rejects.toThrow("carries 2 `composition:` keys");
  });

  it("refuses an empty composition claim", async () => {
    const markdown = `---\ncomposition: ""\n---\n# AppShell\n\n## Obligations\n\n${MARKER}\n`;
    await expect(expand({ markdown })).rejects.toThrow("the composition model is empty");
  });

  it("refuses an unquoted composition claim that is not a plain scalar", async () => {
    const markdown = `---\ncomposition: |\n  block\n---\n# AppShell\n\n## Obligations\n\n${MARKER}\n`;
    await expect(expand({ markdown })).rejects.toThrow(
      "block scalar, a flow collection, or an unquoted value",
    );
  });

  it("refuses a behaviour word the closed vocabulary does not carry", async () => {
    const sidecar = JSON.parse(SIDECAR_SOURCE) as Record<string, unknown>;
    const responsive = sidecar.responsive as { behaviour: string[] };
    responsive.behaviour = ["intrinsic-collapse", "snaps-to-grid"];
    await expect(expand({ sidecarSource: JSON.stringify(sidecar) })).rejects.toThrow(
      'declares the behaviour "snaps-to-grid"',
    );
  });

  it("refuses a sidecar that does not parse", async () => {
    await expect(expand({ sidecarSource: "{not json" })).rejects.toThrow("does not parse as JSON");
  });

  it("refuses a sidecar with no responsive claim", async () => {
    const sidecar = JSON.parse(SIDECAR_SOURCE) as Record<string, unknown>;
    delete sidecar.responsive;
    await expect(expand({ sidecarSource: JSON.stringify(sidecar) })).rejects.toThrow(
      'must carry a "responsive" claim',
    );
  });

  it("refuses a sidecar whose responsive claim carries no behaviour", async () => {
    const sidecar = JSON.parse(SIDECAR_SOURCE) as Record<string, unknown>;
    const responsive = sidecar.responsive as { behaviour: string[] };
    responsive.behaviour = [];
    await expect(expand({ sidecarSource: JSON.stringify(sidecar) })).rejects.toThrow(
      "must be a non-empty array",
    );
  });

  it("refuses an interaction class no matrix row carries", async () => {
    const sidecar = JSON.parse(SIDECAR_SOURCE) as Record<string, unknown>;
    const interaction = sidecar.interaction as { class: string };
    interaction.class = "teleporting";
    await expect(expand({ sidecarSource: JSON.stringify(sidecar) })).rejects.toThrow(
      'no INTERACTION_MATRIX row carries "teleporting"',
    );
  });

  it("refuses a component that exposes no slots — a layout hosts a region or it is not a layout", () => {
    expect(() => regionsParagraph([], "packages/layouts/void/src/Void.vue")).toThrow(
      "exposes no slots",
    );
  });

  it("escapes markup in sidecar prose — the claim is data, not markup", async () => {
    const sidecar = JSON.parse(SIDECAR_SOURCE) as Record<string, unknown>;
    sidecar.basis = "renders <header> and <aside> landmarks";
    const result = (await expand({ sidecarSource: JSON.stringify(sidecar) })) ?? "";
    expect(result).toContain("renders &lt;header&gt; and &lt;aside&gt; landmarks");
    expect(result).not.toContain("<header> and <aside> landmarks");
  });
});

describe("parseSidecar", () => {
  it("normalises the sidecar both gates read", () => {
    const sidecar = parseSidecar(SIDECAR, SIDECAR_SOURCE);
    expect(sidecar.role).toBe("none");
    expect(sidecar.responsive.behaviour).toEqual(["intrinsic-collapse", "band-scale"]);
    expect(sidecar.interaction.class).toBe("container");
    expect(sidecar.interaction.exceptions[0]?.requirement).toBe("keyboard-operate");
  });

  it("refuses an exception with no requirement — the gate names the same defect", () => {
    const sidecar = JSON.parse(SIDECAR_SOURCE) as Record<string, unknown>;
    const interaction = sidecar.interaction as { exceptions: unknown };
    interaction.exceptions = [{ because: "no requirement named" }];
    expect(() => parseSidecar(SIDECAR, JSON.stringify(sidecar))).toThrow("carries no requirement");
  });
});

describe("readMatrix", () => {
  it("reads the real matrices with their own key names", () => {
    const source = readFileSync(A11Y_CONTRACT, "utf8");
    const roles = readMatrix(source, "A11Y_EVIDENCE_MATRIX", "role", A11Y_CONTRACT);
    expect(roles.find((row) => row.key === "none")?.requirements).toEqual([
      "semantic-aria",
      "name",
      "contrast",
    ]);
    const classes = readMatrix(source, "INTERACTION_MATRIX", "class", A11Y_CONTRACT);
    expect(classes.find((row) => row.key === "container")?.requirements).toEqual([
      "keyboard-operate",
    ]);
  });

  it("refuses a file that no longer declares the matrix", () => {
    expect(() =>
      readMatrix("export const OTHER = 1;", "A11Y_EVIDENCE_MATRIX", "role", A11Y_CONTRACT),
    ).toThrow('no "export const A11Y_EVIDENCE_MATRIX = ');
  });

  it("refuses rows whose fields the obligations cannot name", () => {
    const source = 'export const M = [{ key: "none", obligations: ["a"] }] as const;';
    expect(() => readMatrix(source, "M", "role", A11Y_CONTRACT)).toThrow(
      "cannot name a row's duties",
    );
  });

  it("refuses a claim judged against a row the matrix does not define", () => {
    const source = 'export const M = [{ role: "none", requirements: ["semantic-aria"] }] as const;';
    const rows = readMatrix(source, "M", "role", A11Y_CONTRACT);
    expect(() => dutiesFor(rows, "img", "M", A11Y_CONTRACT)).toThrow('no M row carries "img"');
  });
});

describe("readComposition", () => {
  it("reads a quoted single-line claim with any character a sentence needs", () => {
    const markdown = '---\ncomposition: "A shell: rail, header, content."\n---\n# AppShell\n';
    expect(readComposition(markdown, PAGE)).toBe("A shell: rail, header, content.");
  });
});
