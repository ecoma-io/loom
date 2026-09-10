// @vitest-environment node
//
// Node rather than the project-wide jsdom, for the same reason
// check-layout-obligations.test.ts opts out: the measurement is a pure
// function over template sources and directory trees, and these tests drive
// it with synthetic trees carrying known numbers, so every counting rule and
// every failure path is exercised rather than asserted from reading the code.
// The real templates' numbers are the docs page's to record; this suite pins
// the counter, not the baseline.
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  countStylesheetRules,
  facadeImports,
  measureEscapeRate,
  measureTemplate,
  readSfcSections,
  scanScript,
  scanTemplate,
} from "./measure-escape-rate.ts";

/** An SFC in the shape every template's App.vue carries: one script, one root template. */
function sfc(template: string, script = `import { Button } from "@ecoma-io/loom";`): string {
  return `<script setup lang="ts">\n${script}\n</script>\n\n<template>\n${template}\n</template>\n`;
}

const LOOM = new Set(["Button", "Select", "TextField"]);

describe("scanTemplate", () => {
  it("counts aria on a plain element, not on a Loom component — the latter is composition", () => {
    const signals = scanTemplate(
      `<nav aria-label="Starter"></nav>\n<Button aria-label="Go"></Button>`,
      LOOM,
    );
    expect(signals.ariaOnPlainElements).toBe(1);
  });

  it("counts role and bound :aria spellings on plain elements only", () => {
    const signals = scanTemplate(
      `<div role="tablist"></div>\n<span :aria-invalid="true"></span>\n<Tabs role="tablist"></Tabs>`,
      new Set(["Tabs"]),
    );
    expect(signals.ariaOnPlainElements).toBe(2);
  });

  it("never counts an attribute inside a markup comment — prose is not a claim", () => {
    const signals = scanTemplate(
      `<!-- no duplicated aria-label to fall out of sync -->\n<main></main>`,
      LOOM,
    );
    expect(signals.ariaOnPlainElements).toBe(0);
  });

  it("keeps scanning past a `>` inside a quoted expression", () => {
    const signals = scanTemplate(
      `<div v-else-if="rows.length > 0"></div>\n<p aria-hidden="true"></p>`,
      LOOM,
    );
    expect(signals.ariaOnPlainElements).toBe(1);
  });

  it("counts arbitrary values in static and bound class values, and no stock utility", () => {
    const signals = scanTemplate(
      `<div class="w-[9rem] flex items-center"></div>\n<div :class="wide ? 'max-w-[40ch]' : ''"></div>`,
      LOOM,
    );
    expect(signals.arbitraryValues).toBe(2);
  });

  it("counts one inline style per element that carries one", () => {
    const signals = scanTemplate(
      `<div style="color: red"></div>\n<span :style="{ color }"></span>`,
      LOOM,
    );
    expect(signals.inlineStyles).toBe(2);
  });

  it("counts every event binding — the seams the swap points sit at — and no v-model", () => {
    const signals = scanTemplate(
      [
        `<Button @click="load">Reload</Button>`,
        `<form @submit.prevent="save"></form>`,
        `<Select v-on:change="onChange"></Select>`,
        `<TextField v-model="name"></TextField>`,
      ].join("\n"),
      LOOM,
    );
    expect(signals.eventBindings).toBe(3);
  });

  it("counts tabindex as manual focus work", () => {
    const signals = scanTemplate(`<div tabindex="-1"></div>`, LOOM);
    expect(signals.focusWork).toBe(1);
  });

  it("recognises a kebab-spelled Loom component as Loom's, not a plain element", () => {
    const signals = scanTemplate(
      `<app-shell aria-label="Shell"></app-shell>`,
      new Set(["AppShell"]),
    );
    expect(signals.ariaOnPlainElements).toBe(0);
  });
});

describe("readSfcSections", () => {
  it("reads the whole root template — a nested slot template does not end it", () => {
    const sections = readSfcSections(
      sfc(`<Grid>\n<template #cell>{{ value }}</template>\n</Grid>`),
    );
    expect(sections?.template).toContain("#cell");
    expect(sections?.styleBlocks).toBe(0);
  });

  it("counts every style block in the file, however the tag is cased", () => {
    const source = `${sfc("<main></main>")}\n<style scoped>\n.a { color: red; }\n</style>\n<STYLE>\n.b { color: blue; }\n</STYLE>\n`;
    expect(readSfcSections(source)?.styleBlocks).toBe(2);
  });

  it("reads a script block spelled in upper case — block tags are case-insensitive", () => {
    const source = `<SCRIPT setup lang="ts">\nimport { Button } from "@ecoma-io/loom";\n</SCRIPT>\n\n<template>\n<Button/>\n</template>\n`;
    const sections = readSfcSections(source);
    expect(sections?.script).toContain("@ecoma-io/loom");
    expect(sections?.template).toContain("<Button/>");
  });

  it("reads a script whose end tag carries whitespace before the angle bracket", () => {
    const source = `<script setup lang="ts">\nimport { Button } from "@ecoma-io/loom";\n</script >\n\n<template>\n<Button/>\n</template>\n`;
    expect(readSfcSections(source)?.script).toContain("@ecoma-io/loom");
  });

  it("reads a script whose end tag carries attributes, quoted arrows included", () => {
    const source = `<script setup lang="ts">\nimport { Button } from "@ecoma-io/loom";\n</script \t\n bar>\n\n<template>\n<Button/>\n</template>\n`;
    expect(readSfcSections(source)?.script).toContain("@ecoma-io/loom");
    const quoted = `<script setup lang="ts">\nimport { Button } from "@ecoma-io/loom";\n</script bar=">">\n\n<template>\n<Button/>\n</template>\n`;
    expect(readSfcSections(quoted)?.script).toContain("@ecoma-io/loom");
  });

  it("refuses a file with no template block — there is nothing to measure", () => {
    expect(readSfcSections(`<script setup lang="ts"></script>\n`)).toBeNull();
  });
});

describe("facadeImports", () => {
  it("reads a multi-line import, dropping type specifiers and foreign specifiers", () => {
    const names = facadeImports(
      [
        `import {`,
        `  Button,`,
        `  DataGrid,`,
        `  type DataGridColumn,`,
        `} from "@ecoma-io/loom";`,
        `import { computed } from "vue";`,
      ].join("\n"),
    );
    expect(names).toEqual(["Button", "DataGrid"]);
  });
});

describe("scanScript", () => {
  it("counts each sortable column — the reorder obligation is per column", () => {
    const { sortableColumns, focusCalls } = scanScript(
      `const columns = [\n  { key: "name", sortable: true },\n  { key: "mrr", sortable: true },\n  { key: "email" },\n];`,
    );
    expect(sortableColumns).toBe(2);
    expect(focusCalls).toBe(0);
  });

  it("counts a programmatic focus call as manual focus work", () => {
    expect(scanScript(`field.value.focus();`).focusCalls).toBe(1);
  });
});

describe("countStylesheetRules", () => {
  it("measures zero for the contract's stylesheet — at-rule declarations only", () => {
    expect(
      countStylesheetRules(
        `/* The one stylesheet import a Loom host needs. */\n@import "@ecoma-io/loom/styles/global.css";\n\n@source "../../../packages/";\n`,
      ),
    ).toBe(0);
  });

  it("counts each CSS block a template writes, and ignores braces inside comments", () => {
    expect(
      countStylesheetRules(`/* {} */\n.card { color: red; }\n.actions { color: blue; }\n`),
    ).toBe(2);
  });

  it("counts an at-rule's block the same as a rule's — it is CSS the template owns", () => {
    expect(countStylesheetRules(`@media (min-width: 40rem) {\n  .card { color: red; }\n}\n`)).toBe(
      2,
    );
  });
});

describe("measureTemplate", () => {
  it("sums the signals into their categories with the known numbers", () => {
    const root = mkdtempSync(join(tmpdir(), "escape-rate-known-"));
    const dir = join(root, "probe");
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(
      join(dir, "src", "App.vue"),
      sfc(
        [
          `<nav aria-label="Side"></nav>`,
          `<div class="w-[9rem]" style="color: red"></div>`,
          `<Button @click="load">Reload</Button>`,
          `<Button @click="clear">Clear</Button>`,
        ].join("\n"),
        [
          `import { Button } from "@ecoma-io/loom";`,
          `const columns = [{ key: "name", sortable: true }, { key: "mrr", sortable: true }];`,
        ].join("\n"),
      ),
    );
    writeFileSync(
      join(dir, "src", "styles.css"),
      `@import "@ecoma-io/loom/styles/global.css";\n.card { color: red; }\n`,
    );

    const { measurement, failures } = measureTemplate("probe", dir);
    expect(failures).toEqual([]);
    expect(measurement?.signals).toEqual({
      arbitraryValues: 1,
      inlineStyles: 1,
      styleBlocks: 0,
      stylesheetRules: 1,
      ariaOnPlainElements: 1,
      eventBindings: 2,
      sortableColumns: 2,
      focusWork: 0,
    });
    expect(measurement?.categories).toEqual({
      "custom-css": 3,
      "manual-a11y": 1,
      behaviour: 4,
    });
  });

  it("fails loudly when a source the metric reads is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "escape-rate-missing-"));
    mkdirSync(join(root, "half", "src"), { recursive: true });
    writeFileSync(join(root, "half", "src", "App.vue"), sfc("<main></main>"));
    const { measurement, failures } = measureTemplate("half", join(root, "half"));
    expect(measurement).toBeNull();
    expect(failures).toEqual([
      "templates/half: missing src/styles.css — the stylesheet a template owns is part of the measure",
    ]);
  });

  it("fails loudly on an SFC whose markup cannot be read", () => {
    const root = mkdtempSync(join(tmpdir(), "escape-rate-notemplate-"));
    const dir = join(root, "broken");
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src", "App.vue"), `<script setup lang="ts"></script>\n`);
    writeFileSync(join(dir, "src", "styles.css"), `@import "x";\n`);
    const { measurement, failures } = measureTemplate("broken", dir);
    expect(measurement).toBeNull();
    expect(failures[0]).toContain("no readable <script>/<template> pair");
  });

  it("fails loudly on a page that does not consume the published package", () => {
    const root = mkdtempSync(join(tmpdir(), "escape-rate-nofacade-"));
    const dir = join(root, "stray");
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src", "App.vue"), sfc("<main></main>", `import { ref } from "vue";`));
    writeFileSync(join(dir, "src", "styles.css"), `@import "x";\n`);
    const { measurement, failures } = measureTemplate("stray", dir);
    expect(measurement).toBeNull();
    expect(failures[0]).toContain("imports nothing from @ecoma-io/loom");
  });
});

describe("measureEscapeRate", () => {
  it("measures every template, sorted, with per-template and per-category totals", () => {
    const root = mkdtempSync(join(tmpdir(), "escape-rate-tree-"));
    for (const name of ["beta", "alpha"]) {
      const dir = join(root, name);
      mkdirSync(join(dir, "src"), { recursive: true });
      writeFileSync(join(dir, "src", "App.vue"), sfc(`<Button @click="go">Go</Button>`));
      writeFileSync(join(dir, "src", "styles.css"), `@import "x";\n`);
    }
    const { measurements, failures } = measureEscapeRate(root);
    expect(failures).toEqual([]);
    expect(measurements.map((m) => m.name)).toEqual(["alpha", "beta"]);
    expect(measurements[0]?.categories).toEqual({
      "custom-css": 0,
      "manual-a11y": 0,
      behaviour: 1,
    });
  });

  it("names a template it cannot measure instead of reporting a partial baseline", () => {
    const root = mkdtempSync(join(tmpdir(), "escape-rate-mixed-"));
    const good = join(root, "good");
    mkdirSync(join(good, "src"), { recursive: true });
    writeFileSync(join(good, "src", "App.vue"), sfc("<main></main>"));
    writeFileSync(join(good, "src", "styles.css"), `@import "x";\n`);
    mkdirSync(join(root, "empty-dir"), { recursive: true });

    const { measurements, failures } = measureEscapeRate(root);
    expect(measurements.map((m) => m.name)).toEqual(["good"]);
    expect(failures).toEqual([
      "templates/empty-dir: missing src/App.vue — nothing to measure",
      "templates/empty-dir: missing src/styles.css — the stylesheet a template owns is part of the measure",
    ]);
  });

  it("fails on a directory with no template in it — an empty run reads like a passing one", () => {
    const root = mkdtempSync(join(tmpdir(), "escape-rate-none-"));
    const { measurements, failures } = measureEscapeRate(root);
    expect(measurements).toEqual([]);
    expect(failures).toEqual([
      "templates/: no template directories found — the metric exists because templates exist",
    ]);
  });

  it("fails when the tree it is pointed at does not exist", () => {
    const { failures } = measureEscapeRate(join(tmpdir(), "escape-rate-nowhere"));
    expect(failures[0]).toContain("no templates directory at");
  });
});
