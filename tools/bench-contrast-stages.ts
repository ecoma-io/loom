/**
 * Stage-level contrast-walk micro-benchmark (ecoma-io/loom#363, phase V).
 *
 * Question: inside `e2e/contrast.e2e.ts`'s `measureInPage`, how much time is
 * DOM/style-engine access versus pure colour math? The answer decides whether
 * the sweep could ever leave the browser (pure extraction is only worth it if
 * the math dominates; if `getComputedStyle` dominates, the sweep needs a style
 * engine no matter where it runs).
 *
 * Run: `pnpm exec node --experimental-strip-types tools/bench-contrast-stages.ts`
 * Requires a built site (`docs/.vitepress/dist`) — served by `vitepress preview`
 * on the same port the root suite uses. Output: JSONL to stdout, one line per
 * page, with per-stage milliseconds and the counts that explain them.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

import { chromium } from "@playwright/test";
import { BASE } from "../docs/.vitepress/base.ts";
import { documentationPages } from "../e2e/docs-pages.ts";

// Deterministic sample of the real page list: every twelfth page after the
const PORT = 4173;

const BASE_URL = `http://localhost:${String(PORT)}${BASE}`;
// Deterministic sample of the real page list: every twelfth page after the
// alphabetical sort, which crosses all content classes the way the sweep does.
const SAMPLE = documentationPages().filter((_, i) => i % 12 === 0);

// Stage-instrumented copy of the contrast walk. Same traversal order and same
// style reads as `measureInPage` — only `performance.now()` calls added, so
// the split is attributable. `showRepaint`-style repaint waiting is not needed
// here: the bench compares stage costs, not pass/fail verdicts.
const bench = () => {
  return (() => {
    const t = { traverse: 0, paints: 0, composite: 0, ratio: 0 };
    const now = () => performance.now();
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d canvas context unavailable in this browser");
    const c2d: CanvasRenderingContext2D = ctx;

    function toSRGB(str: string): { r: number; g: number; b: number; a: number } | null {
      const s = str.trim();
      const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(s);
      if (rgb) {
        return {
          r: Number(rgb[1]),
          g: Number(rgb[2]),
          b: Number(rgb[3]),
          a: rgb[4] === undefined ? 1 : +rgb[4],
        };
      }
      c2d.clearRect(0, 0, 1, 1);
      c2d.fillStyle = s;
      c2d.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, alpha = 0] = c2d.getImageData(0, 0, 1, 1).data;
      if (alpha === 0) return null;
      return { r, g, b, a: alpha / 255 };
    }

    const linear = (v: number) =>
      (v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    const luminance = (c: { r: number; g: number; b: number }) =>
      0.2126 * linear(c.r) + 0.7152 * linear(c.g) + 0.0722 * linear(c.b);
    const contrast = (
      a: { r: number; g: number; b: number },
      b: { r: number; g: number; b: number },
    ) => {
      const la = luminance(a);
      const lb = luminance(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };

    const root = document.documentElement;
    const ancestors = (el: Element): Element[] => {
      const chain: Element[] = [];
      let node = el.parentElement;
      while (node && node !== root) {
        chain.push(node);
        node = node.parentElement;
      }
      return chain;
    };
    const isExempt = (chain: Element[]) =>
      chain.some((node) => {
        const cls = node.getAttribute("class");
        return cls !== null && /disabled.opacity-50|opacity-50.disabled/.test(cls);
      });
    const sitsOnGradient = (chain: Element[]) =>
      chain.some((node) => {
        const image = getComputedStyle(node).backgroundImage;
        return image !== "none" && image !== "";
      });

    let svgCount = 0;
    let computedReads = 0;
    let canvasConversions = 0;
    let ratioEvals = 0;

    let t0 = now();
    const svgs = [...document.querySelectorAll("svg")];
    t.traverse += now() - t0;

    for (const svg of svgs) {
      svgCount += 1;
      t0 = now();
      const computed = getComputedStyle(svg);
      const hidden = computed.display === "none" || computed.visibility === "hidden";
      const chain = ancestors(svg);
      const exempt = hidden || isExempt(chain);
      const gradient = !exempt && sitsOnGradient(chain);
      computedReads += 1 + chain.length;
      t.traverse += now() - t0;
      if (exempt || gradient) continue;

      t0 = now();
      const seen = new Set<string>();
      const paints: { r: number; g: number; b: number; a: number }[] = [];
      const collect = (el: Element, keys: readonly ("fill" | "stroke")[]) => {
        const c = getComputedStyle(el);
        computedReads += 1;
        for (const key of keys) {
          const val = c[key];
          if (val === "none" || val === "") continue;
          if (!val.startsWith("rgb")) canvasConversions += 1;
          const color = toSRGB(val);
          if (!color || color.a === 0) continue;
          const k = `${key}:${String(color.r)},${String(color.g)},${String(color.b)},${color.a.toFixed(2)}`;
          if (seen.has(k)) continue;
          seen.add(k);
          paints.push(color);
        }
      };
      const rootKeys = (["fill", "stroke"] as const).filter((k) => svg.hasAttribute(k));
      if (rootKeys.length > 0) collect(svg, rootKeys);
      for (const child of svg.querySelectorAll("[fill],[stroke]")) {
        const childKeys = (["fill", "stroke"] as const).filter((k) => child.hasAttribute(k));
        collect(child, childKeys);
      }
      t.paints += now() - t0;
      if (paints.length === 0) continue;

      t0 = now();
      let paintAlpha = parseFloat(computed.opacity);
      for (const node of chain) paintAlpha *= parseFloat(getComputedStyle(node).opacity);
      if (paintAlpha === 0) continue;
      let bg: { r: number; g: number; b: number; a: number } | null = null;
      for (const node of [...chain].reverse()) {
        const nodeComputed = getComputedStyle(node);
        computedReads += 1;
        const opacity = parseFloat(nodeComputed.opacity);
        const c = toSRGB(nodeComputed.backgroundColor);
        if (c && c.a > 0) {
          const a = c.a * opacity;
          if (!bg) bg = { r: c.r, g: c.g, b: c.b, a };
          else
            bg = {
              r: c.r * a + bg.r * (1 - a),
              g: c.g * a + bg.g * (1 - a),
              b: c.b * a + bg.b * (1 - a),
              a: a + bg.a * (1 - a),
            };
        }
      }
      bg ??= { r: 255, g: 255, b: 255, a: 1 };
      if (bg.a < 1) {
        bg = {
          r: 255 * (1 - bg.a) + bg.r * bg.a,
          g: 255 * (1 - bg.a) + bg.g * bg.a,
          b: 255 * (1 - bg.a) + bg.b * bg.a,
          a: 1,
        };
      }
      t.composite += now() - t0;

      t0 = now();
      for (const paint of paints) {
        const p = { ...paint, a: paint.a * paintAlpha };
        const ratio = contrast(p, bg);
        ratioEvals += 1;
        if (ratio < 3) {
          /* verdicts are not the bench's concern */
        }
      }
      t.ratio += now() - t0;
    }

    return {
      ...t,
      total: t.traverse + t.paints + t.composite + t.ratio,
      svgCount,
      computedReads,
      canvasConversions,
      ratioEvals,
    };
  })();
};

async function main() {
  // Serve the built site exactly as the root suite does.
  const preview = spawn("pnpm", ["exec", "vitepress", "preview", "docs", "--port", String(PORT)], {
    stdio: "ignore",
    detached: true,
  });
  try {
    const deadline = Date.now() + 30_000;
    let up = false;
    while (Date.now() < deadline && !up) {
      up = await fetch(BASE_URL)
        .then((r) => r.ok)
        .catch(() => false);
      if (!up) await sleep(300);
    }
    if (!up) throw new Error(`preview server never came up on ${String(PORT)}`);

    const browser = await chromium.launch();
    const page = await browser.newPage();
    for (const path of SAMPLE) {
      await page.goto(path === "." ? BASE_URL : `${BASE_URL}${path}`, { waitUntil: "load" });
      // One warm-up evaluation to pay JIT/first-style costs, then the measured pass.
      await page.evaluate(bench);
      const result = await page.evaluate(bench);
      console.log(JSON.stringify({ page: `/${path}`, ...result }));
    }
    await browser.close();
  } finally {
    try {
      const pid = preview.pid;
      if (pid !== undefined) process.kill(-pid, "SIGTERM");
    } catch {
      /* already gone */
    }
  }
}

await main();
