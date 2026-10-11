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
//   by the number of inked canvas pixels per scene.
// - The reference's dashed `TODO` badges are hidden on the reference only: the
//   port does not ship them (plan Global Constraints).
// - The text column of How-I-work step 03 is removed in both pages: the
//   reference has only a TODO badge there and the port has the owner-approved
//   assumed copy, whose extra height would shift the other steps.

const REFERENCE =
  'file:///Users/jametirakarn/Downloads/Theerakarn%20Showreel.html';
const SITE = 'http://localhost:4401';
const MAX_DIFF = 0.015;
const MAX_INK_DIFF = 0.02;
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

function inkedParticlePixels(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas =
      document.querySelector<HTMLCanvasElement>('[data-particles]');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return -1;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let inked = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) inked++;
    return inked;
  });
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
        const inkRef = await inkedParticlePixels(ref);
        const inkPort = await inkedParticlePixels(port);
        console.log(`${name} particles: ${inkPort} vs ${inkRef}`);
        expect
          .soft(Math.abs(inkPort - inkRef), `${name} particles`)
          .toBeLessThanOrEqual(MAX_INK_DIFF * Math.max(inkRef, 1));
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
