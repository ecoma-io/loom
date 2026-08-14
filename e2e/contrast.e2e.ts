import { test, expect } from "@playwright/test";
import { documentationPages } from "./docs-pages";

// One rendered-SVG contrast sweep per page, at WCAG 1.4.11's 3:1 floor for
// graphical objects. Two real defects hid behind the same pair of gaps, and
// this check exists because both did:
//
// - SVG paths are not text runs. axe's `color-contrast` rule measures text
//   and nothing else, so a stroke or fill that falls below the floor is
//   invisible to the accessibility suite no matter how broken it gets.
// - A disabled element is never evaluated at all. Dimming an unavailable
//   control with an opacity alpha is the idiomatic way to paint it, and it
//   is exactly what took Rating's stars from 7.53:1 to 2.36:1 (#29) and
//   Slider's filled range from 7.53:1 to ~2.3:1 (#40) — both below the 3:1
//   floor, both silent.
//
// So every page is swept by hand: each `<svg>` is measured against the
// background its ancestor chain actually composits over, and the ratio must
// meet the floor. The same walk is exact for this site because no element
// in it sits on a gradient — where one eventually does, a gradient has no
// single ratio to measure against, and that element is reported as skipped
// rather than guessed at.
//
// The one exemption is narrow and pinned. `disabled:opacity-50` on an
// ancestor exempts that SVG subtree — the Checkbox check, Pagination's edge
// chevrons, Editable's trigger and FileUpload's remove icon, each a
// decorative glyph whose function its button carries in an `aria-label`
// while the control is an inactive UI component, which 1.4.11 excepts. The
// signature matches only a class token carrying both words, and every
// component that owns one of those tokens asserts it verbatim in its own
// unit tests — so a data-bearing glyph can never borrow the exemption
// without the class-level pin failing first.

const measureInPage = () => {
  // Hoisted helpers: `page.evaluate` serialises the function body, so the
  // whole measurement lives inside the page and only the findings come back.
  return (() => {
    // Browsers may return colours in rgb(), rgba(), oklab(), or oklch().
    // The measurement needs sRGB channel values, so oklab/oklch are
    // converted through a temporary canvas to avoid maintaining the
    // transform by hand. rgb/rgba are parsed directly — the canvas
    // round-trip would lose precision on values that are already in the
    // right space.
    const _canvas = document.createElement("canvas");
    _canvas.width = 1;
    _canvas.height = 1;
    const _ctx = _canvas.getContext("2d")!;

    function toSRGB(str: string): { r: number; g: number; b: number; a: number } | null {
      const s = str.trim();
      // Fast path: rgb/rgba are already in sRGB.
      const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(s);
      if (rgb) {
        return {
          r: Number(rgb[1]),
          g: Number(rgb[2]),
          b: Number(rgb[3]),
          a: rgb[4] === undefined ? 1 : +rgb[4],
        };
      }
      // Slow path: any other format (oklab, oklch, named colour, hsl…).
      // Draw one pixel and read it back — the browser does the conversion.
      _ctx.clearRect(0, 0, 1, 1);
      _ctx.fillStyle = s;
      _ctx.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, alpha = 0] = _ctx.getImageData(0, 0, 1, 1).data;
      if (alpha === 0) return null;
      return { r, g, b, a: alpha / 255 };
    }

    // An SVG's graphical object paint comes from the inner elements that
    // actually carry fill or stroke attributes — not the <svg> root, whose
    // computed fill defaults to black when no attribute is present. A
    // lucide icon sets fill="none" stroke="currentColor" on the <svg>
    // itself, and that is measured correctly; but WindowControls' inline
    // SVGs set fill="currentColor" on <rect> and stroke="currentColor"
    // on <path> children, leaving the root at its default.
    //
    // The fix: walk every child with an explicit fill or stroke attribute
    // and measure its computed paint, then measure the <svg> root's own
    // fill/stroke if it carries either attribute. Deduplicate by colour
    // so the same paint is not measured twice.
    function paintsOf(svg: Element): { r: number; g: number; b: number; a: number }[] {
      const seen = new Set<string>();
      const paints: { r: number; g: number; b: number; a: number }[] = [];

      // Only measure a paint property when the element carries an explicit
      // attribute for it. Without one, the computed value is the SVG default
      // (black for fill, none for stroke) — not the colour the element
      // actually paints with.
      const collect = (el: Element, keys: readonly ("fill" | "stroke")[]) => {
        const c = getComputedStyle(el);
        for (const key of keys) {
          const val = c[key];
          if (val === "none" || val === "") continue;
          const color = toSRGB(val);
          if (!color || color.a === 0) continue;
          const k = `${key}:${String(color.r)},${String(color.g)},${String(color.b)},${color.a.toFixed(2)}`;
          if (seen.has(k)) continue;
          seen.add(k);
          paints.push(color);
        }
      };

      const rootKeys = (["fill", "stroke"] as const).filter((k) => svg.hasAttribute(k));
      if (rootKeys.length > 0) {
        collect(svg, rootKeys);
      }

      for (const child of svg.querySelectorAll("[fill],[stroke]")) {
        const childKeys = (["fill", "stroke"] as const).filter((k) => child.hasAttribute(k));
        collect(child, childKeys);
      }

      return paints;
    }

    function parseColor(str: string) {
      return toSRGB(str);
    }
    function linear(v: number) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    function luminance(c: { r: number; g: number; b: number }) {
      return 0.2126 * linear(c.r) + 0.7152 * linear(c.g) + 0.0722 * linear(c.b);
    }
    function contrast(
      a: { r: number; g: number; b: number },
      b: { r: number; g: number; b: number },
    ) {
      const la = luminance(a);
      const lb = luminance(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }

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

    interface Failure {
      ratio: string;
      paint: string;
      background: string;
      svgClass: string;
    }
    const failures: Failure[] = [];
    let skipped = 0;

    for (const svg of document.querySelectorAll("svg")) {
      const computed = getComputedStyle(svg);
      if (computed.display === "none" || computed.visibility === "hidden") continue;

      const chain = ancestors(svg);
      if (isExempt(chain)) continue;
      if (sitsOnGradient(chain)) {
        skipped += 1;
        continue;
      }

      const paints = paintsOf(svg);
      if (paints.length === 0) continue;

      // Every ancestor's opacity wraps the whole subtree, so it multiplies
      // into the paint. The background is then composited from the root
      // down, each ancestor's colour blended in at its own effective alpha;
      // any alpha left over rests on the page's white ground.
      let paintAlpha = parseFloat(computed.opacity);
      for (const node of chain) paintAlpha *= parseFloat(getComputedStyle(node).opacity);
      if (paintAlpha === 0) continue;

      let canvas: { r: number; g: number; b: number; a: number } | null = null;
      for (const node of [...chain].reverse()) {
        const nodeComputed = getComputedStyle(node);
        const opacity = parseFloat(nodeComputed.opacity);
        const bg = parseColor(nodeComputed.backgroundColor);
        if (bg && bg.a > 0) {
          const a = bg.a * opacity;
          if (!canvas) canvas = { r: bg.r, g: bg.g, b: bg.b, a };
          else
            canvas = {
              r: bg.r * a + canvas.r * (1 - a),
              g: bg.g * a + canvas.g * (1 - a),
              b: bg.b * a + canvas.b * (1 - a),
              a: a + canvas.a * (1 - a),
            };
        }
      }
      canvas ??= { r: 255, g: 255, b: 255, a: 1 };
      if (canvas.a < 1) {
        canvas = {
          r: 255 * (1 - canvas.a) + canvas.r * canvas.a,
          g: 255 * (1 - canvas.a) + canvas.g * canvas.a,
          b: 255 * (1 - canvas.a) + canvas.b * canvas.a,
          a: 1,
        };
      }

      for (const paint of paints) {
        const p = { ...paint, a: paint.a * paintAlpha };
        const ratio = contrast(p, canvas);
        if (ratio < 3) {
          failures.push({
            ratio: ratio.toFixed(2),
            paint: `${String(p.r)},${String(p.g)},${String(p.b)} at alpha ${p.a.toFixed(2)}`,
            background: `${String(Math.round(canvas.r))},${String(Math.round(canvas.g))},${String(Math.round(canvas.b))}`,
            svgClass: (svg.getAttribute("class") ?? "").slice(0, 80),
          });
        }
      }
    }

    return { failures, skipped };
  })();
};

for (const page of documentationPages()) {
  const label = page === "." ? "/" : `/${page}`;

  for (const theme of ["light", "dark"] as const) {
    test(`${label} (${theme}) draws every SVG graphical object at WCAG 1.4.11's 3:1 floor`, async ({
      page: browserPage,
    }) => {
      // Tell VitePress which theme to start in. addInitScript runs after the
      // page has an origin but before VitePress's inline script, so the
      // localStorage key is set before first paint — Layout.vue's watchEffect
      // then mirrors it onto `data-theme`, reproducing the same state a real
      // user sees after toggling.
      await browserPage.addInitScript((t) => {
        localStorage.setItem("vitepress-theme-appearance", t);
      }, theme);
      await browserPage.goto(page);

      const { failures, skipped } = await browserPage.evaluate(measureInPage);

      // The message carries the measurement, not just the failure: which svg,
      // what it painted, what the composited background actually was, and the
      // ratio between them — the same shape of report the accessibility suite
      // builds for axe violations, so a red gate says what to fix.
      const report = failures
        .map((f) => `${f.ratio}:1 — ${f.svgClass} painted ${f.paint} on ${f.background}`)
        .join("\n");

      expect(failures, report).toEqual([]);

      // Nothing silently escapes the sweep. A gradient backdrop has no single
      // ratio, so the elements on one are counted rather than ignored.
      expect(skipped, `svgs skipped on a gradient backdrop: ${String(skipped)}`).toBe(0);
    });
  }
}
