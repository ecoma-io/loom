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
    function paintOf(
      computed: CSSStyleDeclaration,
    ): { r: number; g: number; b: number; a: number } | null {
      // A lucide glyph paints with `fill: none` and a `stroke`, a filled
      // shape (Rating's stars) paints with `fill`. Measure whichever is
      // opaque.
      for (const key of ["fill", "stroke"] as const) {
        const match = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/.exec(computed[key]);
        if (match) {
          const a = match[4] === undefined ? 1 : parseFloat(match[4]);
          if (a > 0) return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a };
        }
      }
      return null;
    }
    function parseColor(str: string) {
      const match = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/.exec(str);
      if (!match) return null;
      return {
        r: Number(match[1]),
        g: Number(match[2]),
        b: Number(match[3]),
        a: match[4] === undefined ? 1 : +match[4],
      };
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

      const paint = paintOf(computed);
      if (!paint) continue;

      // Every ancestor's opacity wraps the whole subtree, so it multiplies
      // into the paint. The background is then composited from the root
      // down, each ancestor's colour blended in at its own effective alpha;
      // any alpha left over rests on the page's white ground.
      let paintAlpha = parseFloat(computed.opacity);
      for (const node of chain) paintAlpha *= parseFloat(getComputedStyle(node).opacity);
      if (paintAlpha === 0) continue;
      const p = { ...paint, a: paint.a * paintAlpha };

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

    return { failures, skipped };
  })();
};

for (const page of documentationPages()) {
  const label = page === "." ? "/" : `/${page}`;

  for (const theme of ["light", "dark"] as const) {
    test(`${label} (${theme}) draws every SVG graphical object at WCAG 1.4.11's 3:1 floor`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(page);

      // Set the theme before measuring. Loom's dark tokens are a symmetric
      // set, so contrast must be verified independently in each.
      await browserPage.evaluate((t) => {
        document.documentElement.setAttribute("data-theme", t);
      }, theme);

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
