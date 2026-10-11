import { chromium } from '@playwright/test';

const template = new URL('./og-template.html', import.meta.url).href;
const output = new URL('../public/og.png', import.meta.url).pathname;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.goto(template);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: output });
  console.log(`wrote ${output}`);
} finally {
  await browser.close();
}
