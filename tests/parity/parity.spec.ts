import { mkdirSync, writeFileSync } from 'node:fs';
import { type Browser, expect, type Page, test } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

// Pixel parity between the Astro port and the standalone reference bundle.
// Pages are compared after the showreel has initialised and after each scroll
// has settled; scrolling is never altered.
//
// Three masks are applied before screenshots, nothing else is edited:
// - The particle canvas is hidden in both pages. Its seeded layout matches,
//   but every particle drifts with wall-clock time (`Math.sin(t * .7 + ph)`),
//   so two loads never paint the same pixels. Particles are compared instead
//   as a coarse ink-density grid: drift (up to ~22 px) stays inside
//   neighbouring cells, while a misplaced formation moves ink between cells.
// - The reference's dashed `TODO` badges are hidden on the reference only: the
//   port does not ship them (plan Global Constraints).
// - The text column of How-I-work step 03 is removed in both pages: the
//   reference has only a TODO badge there and the port has the owner-approved
//   assumed copy, whose extra height would shift the other steps.
//
// Copy is also compared as text per scene, because a reworded line changes too
// few pixels for the screenshot threshold. Known, approved copy differences are
// listed in TEXT_FIXES.

const REFERENCE =
  process.env.REFERENCE_HTML ??
  'file:///Users/jametirakarn/Downloads/Theerakarn%20Showreel.html';
const SITE = 'http://localhost:4401';
const MAX_DIFF = 0.01;
const MAX_INK_DIFF = 0.02;
const INK_CELL = 48;
const MAX_INK_L1 = 0.05;
const MAX_INK_CELL = 0.15;
const SETTLE_MS = 1500;
const OUT = 'tests/parity/.out';

const MASK_BOTH =
  '[data-particles]{visibility:hidden}[data-step]:nth-of-type(3)>div{display:none!important}';
const MASK_REFERENCE = '[style*="dashed"]{display:none}';

type Lang = 'th' | 'en';
type Site = 'ref' | 'new';
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];
const SCENES: Record<Lang, number[]> = {
  th: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  en: [0, 2, 8],
};

mkdirSync(OUT, { recursive: true });

async function open(
  browser: Browser,
  site: Site,
  lang: Lang,
  viewport: { width: number; height: number },
  reducedMotion: 'reduce' | 'no-preference',
): Promise<Page> {
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  await page.goto(
    site === 'ref' ? REFERENCE : `${SITE}${lang === 'th' ? '/' : '/en/'}`,
  );
  // Initialised once the stages leave their sticky pre-init layout.
  await page.waitForFunction(() => {
    const stage = document.querySelector<HTMLElement>('[data-stage]');
    return (
      stage?.style.position === 'fixed' || stage?.style.position === 'relative'
    );
  });
  if (site === 'ref' && lang === 'en') await page.click('[data-lang-btn="en"]');
  await page.addStyleTag({
    content: site === 'ref' ? MASK_BOTH + MASK_REFERENCE : MASK_BOTH,
  });
  await page.waitForTimeout(SETTLE_MS);
  return page;
}

async function scrollToScene(page: Page, scene: number): Promise<void> {
  await page.evaluate((i) => {
    const sec = document.querySelectorAll<HTMLElement>('[data-scene]')[i];
    window.scrollTo(0, Math.round(sec.offsetTop + 0.5 * sec.offsetHeight));
  }, scene);
  await page.waitForTimeout(SETTLE_MS);
}

interface Ink {
  inked: number;
  grid: number[];
}

// Inked pixel count plus the alpha sum per INK_CELL x INK_CELL CSS-px cell.
function particleInk(page: Page): Promise<Ink> {
  return page.evaluate((cssCell) => {
    const canvas =
      document.querySelector<HTMLCanvasElement>('[data-particles]');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return { inked: -1, grid: [] };
    const { width, height } = canvas;
    const cell = Math.max(1, Math.round((cssCell * width) / innerWidth));
    const cols = Math.ceil(width / cell);
    const grid = new Array<number>(cols * Math.ceil(height / cell)).fill(0);
    const data = ctx.getImageData(0, 0, width, height).data;
    let inked = 0;
    for (let y = 0; y < height; y++) {
      const row = Math.floor(y / cell) * cols;
      for (let x = 0; x < width; x++) {
        const a = data[(y * width + x) * 4 + 3];
        if (a === 0) continue;
        inked++;
        grid[row + Math.floor(x / cell)] += a;
      }
    }
    return { inked, grid };
  }, INK_CELL);
}

// L1 distance of the normalised grids (0..2) and the largest single-cell
// difference relative to the reference's fullest cell.
function inkGridDistance(port: number[], ref: number[]) {
  const sum = (g: number[]) => g.reduce((s, v) => s + v, 0) || 1;
  const sp = sum(port);
  const sr = sum(ref);
  let l1 = 0;
  let cell = 0;
  for (let i = 0; i < ref.length; i++) {
    const d = Math.abs(port[i] / sp - ref[i] / sr);
    l1 += d;
    cell = Math.max(cell, d);
  }
  return { l1, cell: cell / (Math.max(...ref) / sr || 1) };
}

// Reference copy -> port copy, applied to whitespace-free text.
const TEXT_FIXES: Record<Lang, [string, string][]> = {
  th: [['\u2014', '-']],
  en: [
    ['\u2014', '-'],
    // Step 02's English line is cut off in the reference.
    ['shipitinw\u2026', 'shipitinworkingpieces,oneatatime.'],
  ],
};

function sceneText(page: Page, scene: number): Promise<string> {
  return page.evaluate(
    (i) =>
      document
        .querySelectorAll<HTMLElement>('[data-scene]')
        [i].innerText.replace(/\s+/g, ''),
    scene,
  );
}

function diffRatio(name: string, a: Buffer, b: Buffer): number {
  const pa = PNG.sync.read(a);
  const pb = PNG.sync.read(b);
  expect(`${pa.width}x${pa.height}`, `${name} screenshot size`).toBe(
    `${pb.width}x${pb.height}`,
  );
  const out = new PNG({ width: pa.width, height: pa.height });
  const changed = pixelmatch(pa.data, pb.data, out.data, pa.width, pa.height, {
    threshold: 0.1,
  });
  writeFileSync(`${OUT}/${name}.diff.png`, PNG.sync.write(out));
  const ratio = changed / (pa.width * pa.height);
  console.log(`${name}: ${(ratio * 100).toFixed(3)}%`);
  return ratio;
}

for (const viewport of VIEWPORTS) {
  for (const lang of ['th', 'en'] as const) {
    test(`scenes ${lang} ${viewport.width}x${viewport.height}`, async ({
      browser,
    }) => {
      const ref = await open(browser, 'ref', lang, viewport, 'no-preference');
      const port = await open(browser, 'new', lang, viewport, 'no-preference');
      for (const scene of SCENES[lang]) {
        await scrollToScene(ref, scene);
        await scrollToScene(port, scene);
        const name = `${lang}-${viewport.width}-s${scene}`;
        const ratio = diffRatio(
          name,
          await port.screenshot(),
          await ref.screenshot(),
        );
        expect.soft(ratio, name).toBeLessThanOrEqual(MAX_DIFF);
        const inkRef = await particleInk(ref);
        const inkPort = await particleInk(port);
        const grid = inkGridDistance(inkPort.grid, inkRef.grid);
        console.log(
          `${name} particles: ${inkPort.inked} vs ${inkRef.inked}, grid l1 ${grid.l1.toFixed(3)} cell ${grid.cell.toFixed(3)}`,
        );
        expect
          .soft(Math.abs(inkPort.inked - inkRef.inked), `${name} particles`)
          .toBeLessThanOrEqual(MAX_INK_DIFF * Math.max(inkRef.inked, 1));
        expect
          .soft(grid.l1, `${name} particle layout`)
          .toBeLessThanOrEqual(MAX_INK_L1);
        expect
          .soft(grid.cell, `${name} particle cell`)
          .toBeLessThanOrEqual(MAX_INK_CELL);
        let refText = await sceneText(ref, scene);
        for (const [from, to] of TEXT_FIXES[lang]) {
          refText = refText.replaceAll(from, to);
        }
        expect.soft(await sceneText(port, scene), `${name} text`).toBe(refText);
      }
    });
  }
}

for (const lang of ['th', 'en'] as const) {
  test(`reduced motion ${lang} full page`, async ({ browser }) => {
    const viewport = { width: 1440, height: 900 };
    const ref = await open(browser, 'ref', lang, viewport, 'reduce');
    const port = await open(browser, 'new', lang, viewport, 'reduce');
    const name = `${lang}-reduced`;
    const ratio = diffRatio(
      name,
      await port.screenshot({ fullPage: true }),
      await ref.screenshot({ fullPage: true }),
    );
    expect(ratio, name).toBeLessThanOrEqual(MAX_DIFF);
  });
}
