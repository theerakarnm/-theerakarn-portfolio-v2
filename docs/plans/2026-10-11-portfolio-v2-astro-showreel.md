# Portfolio v2 - Astro Showreel Implementation Plan

> **Run with:** `/execute-plan docs/plans/2026-10-11-portfolio-v2-astro-showreel.md`
>
> **For the executing agent:** Implement track-by-track. Parallel tracks each get their own `treehouse get --lease` worktree.
> Steps use checkbox (`- [ ]`) syntax; tick them as you go.
> Run `## Preflight` BEFORE task 1 and report anything down.

**Goal:** Rebuild the standalone `Theerakarn Showreel.html` as an Astro static site that is a pixel-and-motion-exact clone, ranks for the owner's name variants (SEO + AI-engine optimisation), and ships as a production Docker image behind the host's nginx.
**Architecture:** Astro 7 static output, two routes (`/` Thai, `/en/` English) rendered at build time with only the active language in the DOM. One vanilla TypeScript client module ports the reference `Component` class (GSAP + ScrollTrigger + DrawSVG + Lenis + canvas particles); React and the `<x-dc>` runtime are dropped. A `site.ts` content module is the single source of truth for facts used by the markup, JSON-LD, `llms.txt` and the sitemap. Image = bun build stage, then `nginxinc/nginx-unprivileged` serving `dist/` with pre-compressed assets.
**Tech Stack:** bun 1.3.x, Astro 7, `@astrojs/sitemap`, gsap 3.13+ (includes DrawSVGPlugin), lenis, Biome 2, Playwright (+ pixelmatch/pngjs) for parity and OG image, Docker, nginx.
**Spec:** none - planned from conversation (reference file: `/Users/jametirakarn/Downloads/Theerakarn Showreel.html`)
**Base commit:** d336f13
**Confidence:** 7/10 - motion/pixel parity of a 20 KB hand-written timeline script is mechanical but long; Docker cannot be built on this machine (docker not installed), so the image is only verified on the VM by the owner.
**NOT building:** extra pages (`/about`, case studies, blog); analytics; Search Console / Bing tokens; CI registry push; a CMS; the reference's editor tweak props UI (density/misregistration/grain become constants); client-side language toggle without navigation.

## Global Constraints

- Package manager and script runner: **bun** only (`bun install`, `bun run`, `bunx`). Commit `bun.lock`. No npm/pnpm lockfiles.
- Canonical origin: `https://theerakarnm.dev` (root). Thai at `/` (default, `x-default`), English at `/en/`. Trailing-slash URLs everywhere (`trailingSlash: 'always'`).
- Fidelity is "exact": same copy, colours (`#F2EFE8` paper, `#111` ink, riso `#F93427 #7C3AED #E8702A #1A57FF`), fonts (Anuphan 400/500/700, IBM Plex Mono 400/500), scene heights (`data-h` desktop, `data-m` below 700px), timelines and easings. Constants from the reference props: `density = 1`, `misregistration = 2` (px), `grain = true`.
- Reference text defect: the EN "Design it, then build it" description ends in `ship it in w…` followed by a dashed badge reading `TODO: rest of line was cut off`. Do NOT ship the badge. Complete the sentence as `Plan an architecture that can grow, then ship it in working pieces, one at a time.` (mirrors the TH line). Report this as an assumption in the PR/summary.
- Identity facts (verbatim from owner): English name `Theerakarn Maiwong`; Thai name `ธีรกานต์ ใหม่วงค์`; handle/alias `theerakarnm`. Also target `Theerakarn M.` and `Theerakarnm`. Company `Planthia Tech Co., Ltd.` (Founder, CEO and CTO). Location `Thailand`. Links: `https://github.com/theerakarnm`, `https://www.linkedin.com/in/theerakarnm`, `https://fastwork.co/user/theerakarnm`, `mailto:contact@theerakarnm.dev`, `mailto:theerakarnm@outlook.com`.
- No analytics, no third-party requests at runtime (fonts self-hosted; no Google Fonts `<link>`).
- Never use the em dash character in any file this plan creates; use `-`.
- Containers run as non-root; the image listens on 8080; the host nginx terminates TLS.
- Biome is the only lint/format tool (`bun run lint` must stay at 0 errors).
- Accessibility: split text keeps its full string for assistive tech and crawlers (see Task 5 Gotcha); respect `prefers-reduced-motion` exactly as the reference does (its `staticMode()`).

## Patterns to Mirror

No existing pattern in this repo (it holds one commit and a one-line README). Establishing new conventions:

- Files: `src/components/*.astro` PascalCase; `src/lib/*.ts` camelCase; scripts in `scripts/*.ts` run with `bun`.
- The reference is the source of truth for markup and motion. `reference/template.html` (Task 2) is the exact unpacked template; port from it by copy, not by memory.
- Reference runtime quirks that MUST be translated (verified by `rg` on the template):
  - `ref="{{ root }}"` on the root div: drop it, query the root by `[data-root]` instead.
  - `sc-camel-view-box`, `sc-camel-pattern-units`, `sc-camel-pattern-transform`, `sc-camel-preserve-aspect-ratio`, `sc-camel-base-frequency`, `sc-camel-num-octaves`, `sc-camel-stitch-tiles`: rename to real SVG attributes `viewBox`, `patternUnits`, `patternTransform`, `preserveAspectRatio`, `baseFrequency`, `numOctaves`, `stitchTiles`.
  - `style-hover="a:b;..."` on the contact buttons: move to a CSS `:hover` rule (class `.btn`), inline style stays for the resting state.
  - `<helmet>` block: becomes `Seo.astro` (Track C), not copied.
  - `data-l="th|en"` span pairs: render only the active language; apply the reference's TH rule (`letter-spacing:0; text-transform:none`) through `html[lang=th] ...` CSS instead of the JS loop in `init()`.

## Preflight

### DURABLE - true until the repo itself changes

- Repo is empty apart from `README.md` (`ls -la` shows `.git`, `README.md`). Consequence: Track A owns every shared file.
- Reference file is a "bundler" bundle: `<script type="__bundler/manifest">` (gzip+base64 assets: GSAP, ScrollTrigger, DrawSVG, Lenis, React, 12 woff2), `__bundler/template` (JSON string of the real page, 68 KB), `__bundler/ext_resources`. Evidence: parsed during planning.
- Reference already implements reduced-motion (`staticMode()`), mobile heights (`data-m`), and a `Intl.Segmenter('th')` text splitter. Consequence: the port keeps these, it does not invent them.
- `docker` and `nginx` are NOT installed on the planning machine (`which docker nginx` printed nothing). Consequence: Track D verifies by static checks here and by a `Verify - Human` build on the Linux VM.

### PERISHABLE - recapture before task 1

- Toolchain: `bun --version` (planned on 1.3.5), `node --version` (planned on v22.19.0). Needed by: everything.
- Latest versions seen while planning (re-run `npm view <pkg> version`): astro 7.3.8, @astrojs/sitemap 3.7.4, lenis 1.3.26, gsap 3.15.0, @biomejs/biome 2.5.15, @playwright/test 1.64.0. Use whatever `bun add` resolves; do not hand-pin to these.
- Playwright browsers installed: `ls ~/Library/Caches/ms-playwright` must list a chromium dir; otherwise `bunx playwright install chromium`. Needed by: Tasks 9, 13, 20.
- Reference file present: `test -f "/Users/jametirakarn/Downloads/Theerakarn Showreel.html"`. Needed by: Tasks 2 and 9.
- Free ports (one per track, never shared): A 4400, B 4401, C 4402, E 4403. Check: `lsof -i :4401` prints nothing.
- Baseline red count: repo has no code, so typecheck/lint/test baseline is 0/0/0 at `d336f13`. Re-run after Task 4 and record.
- Dependencies installed in THIS checkout: `test -d node_modules && bun run check` exits 0 (from Task 4 on).

## Execution

**Tracks:**
- Track A (`plan:portfolio-v2:track-a`) - Tasks 1-4. Foundation. Must merge first.
- Track B (`plan:portfolio-v2:track-b`) - Tasks 5-9. Showreel markup, motion engine, parity test. Depends on A merged. Parallel with C and D.
- Track C (`plan:portfolio-v2:track-c`) - Tasks 10-14. SEO and AIEO. Depends on A merged. Parallel with B and D.
- Track D (`plan:portfolio-v2:track-d`) - Tasks 15-17. Docker, nginx, compose, CI. Depends on A merged. Parallel with B and C.
- Track E (post-merge, main worktree) - Tasks 18-19. README and final verification. Depends on B + C + D merged.

**Merge order:** A, then B / C / D in any order, then E.
**Shared files:** `package.json` and `bun.lock` (Task 1 installs every dependency and declares every script up front, so B/C/D never run `bun add`), `astro.config.mjs` (Task 1, includes the sitemap integration), `biome.json` (Task 1), `src/layouts/Base.astro` (Task 4; it renders `<Seo />` and a default slot, B and C never edit it), `src/pages/index.astro` and `src/pages/en/index.astro` (Task 4; they import `Showreel` and `Seo`, B and C only edit the components), barrel/route registration: none, `.env.example`: none (no env vars).
**Worktree setup per track:** `WORKTREE=$(treehouse get --lease --lease-holder "plan:portfolio-v2:track-x"); cd "$WORKTREE"; bun install`
**Teardown:** `treehouse return "$WORKTREE"` after the track's branch is merged.

---

### Track A - Foundation

#### Task 1: Scaffold Astro with bun, Biome and declared scripts

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `biome.json`, `.gitignore`, `bun.lock` (generated)

**Interfaces:**
- Produces (scripts every later task calls, declared now even if their target file does not exist yet): `dev`, `build` (`astro build`), `check` (`astro check && biome check .`), `lint` (`biome check .`), `test` (`bun test tests/unit`), `test:parity` (`bunx playwright test tests/parity`), `check:seo` (`bun scripts/check-dist.ts`), `og` (`bun scripts/make-og.ts`), `extract-reference` (`bun scripts/extract-reference.ts`).
- Produces: `site` = `https://theerakarnm.dev`, `output: 'static'`, `trailingSlash: 'always'`, `build.format: 'directory'`, `compressHTML: true`, `i18n: { defaultLocale: 'th', locales: ['th','en'], routing: { prefixDefaultLocale: false } }`, sitemap integration with `i18n: { defaultLocale: 'th', locales: { th: 'th-TH', en: 'en-US' } }`.

**Gotcha:** `postbuild` is NOT declared here. Task 16 adds it together with `scripts/precompress.ts`, so every commit builds. All other scripts may point at not-yet-existing files because nothing calls them before their owning task.

**Steps:**
- [x] Step 1: `bun init -y` is NOT used. Write `package.json` with `"type": "module"`, `"private": true`, the scripts above (without `postbuild`), then run `bun add astro @astrojs/sitemap gsap lenis` and `bun add -d @biomejs/biome @astrojs/check typescript @playwright/test pixelmatch pngjs @types/pngjs @types/bun`.
- [x] Step 2: Write `astro.config.mjs`:
      ```js
      import sitemap from '@astrojs/sitemap';
      import { defineConfig } from 'astro/config';

      export default defineConfig({
        site: 'https://theerakarnm.dev',
        output: 'static',
        trailingSlash: 'always',
        build: { format: 'directory', inlineStylesheets: 'auto' },
        compressHTML: true,
        devToolbar: { enabled: false },
        i18n: { defaultLocale: 'th', locales: ['th', 'en'], routing: { prefixDefaultLocale: false } },
        integrations: [sitemap({ i18n: { defaultLocale: 'th', locales: { th: 'th-TH', en: 'en-US' } } })],
      });
      ```
- [x] Step 3: `bunx biome init`, then edit `biome.json`: formatter indent 2 spaces, single quotes, `files.includes` excludes `dist`, `reference`, `public`, `.astro`, `test-results`.
- [x] Step 4: `.gitignore`: `node_modules`, `dist`, `.astro`, `test-results`, `playwright-report`, `tests/parity/.out`.
- [x] Step 5: Verify - Run: `bunx astro --version && bunx biome check .` - Expected: prints an Astro version, Biome exits 0.
- [x] Step 6: Commit - `git commit -m "chore: scaffold astro project with bun and biome"`

#### Task 2: Unpack the reference into `reference/` and `public/fonts/`

**Files:**
- Create: `scripts/extract-reference.ts`, `reference/template.html`, `reference/showreel.component.js`, `public/fonts/*.woff2`, `src/styles/fonts.css`

**Interfaces:**
- Produces: `src/styles/fonts.css` - `@font-face` rules for Anuphan (400, 500, 700; thai, vietnamese, latin-ext, latin subsets) and IBM Plex Mono (400, 500), `font-display: swap`, `unicode-range` preserved, `src:` pointing at `/fonts/<family>-<weight>-<subset>.woff2`.
- Produces: `reference/template.html` (the unpacked page template, exact) and `reference/showreel.component.js` (the `text/x-dc` script body, exact). These two files are read-only sources for Track B.

**Gotcha:** The bundle maps each `@font-face` `src: url("<uuid>")` to a manifest entry; Anuphan 400/500/700 may share one woff2 per subset (variable font), so de-duplicate by uuid. Weights 400/500/700 only. Name files from the `/* subset */` comment above each rule plus the family and weight.

**Steps:**
- [x] Step 1: Write `scripts/extract-reference.ts`: read the HTML, regex out the three `<script type="__bundler/...">` blocks, `JSON.parse` the manifest and template, for entries with `compressed: true` `gunzipSync(Buffer.from(data,'base64'))`, write the `font/woff2` entries to `public/fonts/` under readable names, write `reference/template.html` from the template string, and write the inner text of the `<script type="text/x-dc" data-dc-script>` block to `reference/showreel.component.js`. Generate `src/styles/fonts.css` from the template's `<style>` `@font-face` blocks with each `url("<uuid>")` replaced by the new `/fonts/...` path.
      > Deviation: Anuphan 400/500/700 share one woff2 per subset, so each Anuphan file is named after the first weight seen (`anuphan-400-<subset>.woff2`) and all three weight rules point at it. IBM Plex Mono keeps every subset the template ships (including cyrillic, cyrillic-ext). The script runs `biome format --write` on the generated `fonts.css` so `bun run lint` stays at 0 errors.
- [x] Step 2: Run `bun run extract-reference`.
- [x] Step 3: Verify - Run: `ls public/fonts | wc -l; rg -c "@font-face" src/styles/fonts.css; rg -n "\x{2014}" src/styles` - Expected: at least 8 font files, a font-face count equal to the number of unique family/weight/subset rules in the template, and no em dash in `src/styles/` (`reference/` keeps the original copy verbatim and is excluded from this rule).
- [x] Step 4: Commit - `git commit -m "chore: unpack showreel reference and self-host fonts"`

#### Task 3: Content module and i18n helpers

**Files:**
- Create: `src/content/site.ts`, `src/lib/i18n.ts`, `tests/unit/i18n.test.ts`

**Interfaces:**
- Produces in `src/content/site.ts`:
  ```ts
  export type Lang = 'th' | 'en';
  export const SITE_URL = 'https://theerakarnm.dev';
  export const person: {
    name: { en: 'Theerakarn Maiwong'; th: 'ธีรกานต์ ใหม่วงค์' };
    alternateNames: string[];            // ['Theerakarnm','theerakarnm','Theerakarn M.','Theerakarn Maiwong','ธีรกานต์ ใหม่วงค์']
    jobTitle: Record<Lang, string>;      // Founder, CEO and CTO
    email: string[];                     // contact@theerakarnm.dev, theerakarnm@outlook.com
    sameAs: string[];                    // github, linkedin, fastwork
    knowsAbout: string[];
    description: Record<Lang, string>;
  };
  export const org: { name: 'Planthia Tech Co., Ltd.'; url: string; description: Record<Lang, string> };
  export const projects: { id: 'tenerie' | 'munmuang' | 'buddy' | 'friday'; name: string; url: string; description: Record<Lang, string> }[];
  ```
- Produces in `src/lib/i18n.ts`:
  ```ts
  export function pathFor(lang: Lang): string;          // 'th' -> '/', 'en' -> '/en/'
  export function absoluteUrl(lang: Lang): string;      // SITE_URL + pathFor(lang)
  export function otherLang(lang: Lang): Lang;
  ```

**Steps:**
- [x] Step 1: Copy project names, URLs and descriptions from `reference/template.html` scenes 2-5 (Tenerie `https://tenerie.eukron.com/`, MunMuang `https://munmuang.eukron.com/`, Buddy Glasses `https://buddy-glasses.com/`, FridayMerch `https://www.fridaymerch.store/`) into `projects`; copy the TH and EN premise/role lines into `person.description` and `jobTitle`. `knowsAbout`: web applications, backend services, cloud infrastructure, full-stack development, tech consulting, LINE bots, AI assistants (adjust to what the reference scenes say).
- [x] Step 2: Write `tests/unit/i18n.test.ts` asserting `pathFor('th') === '/'`, `pathFor('en') === '/en/'`, `absoluteUrl('en') === 'https://theerakarnm.dev/en/'`, `otherLang('th') === 'en'`.
- [x] Step 3: Verify - Run: `bun run test` - Expected: 4 pass, 0 fail
- [x] Step 4: Commit - `git commit -m "feat: add site content module and i18n helpers"`

#### Task 4: Layout skeleton, stubs and both routes

**Files:**
- Create: `src/layouts/Base.astro`, `src/components/Seo.astro` (stub), `src/components/Showreel.astro` (stub), `src/pages/index.astro`, `src/pages/en/index.astro`, `src/styles/global.css`, `public/favicon.svg`

**Interfaces:**
- Consumes: `Lang`, `pathFor`, `absoluteUrl` (Task 3); `src/styles/fonts.css` (Task 2).
- Produces (frozen, B and C implement behind these):
  - `Seo.astro` props: `{ lang: Lang }` - renders everything that belongs in `<head>` except charset/viewport.
  - `Showreel.astro` props: `{ lang: Lang }` - renders the page body content.
  - `Base.astro` props: `{ lang: Lang }`, default slot - renders `<html lang={lang}>`, `<head>` with charset, viewport, `<Seo lang={lang} />`, imports `fonts.css` and `global.css`, and `<body><slot /></body>`.

**Steps:**
- [x] Step 1: Write the three files above. `global.css` sets only the reset from the reference (`* {margin:0;padding:0;box-sizing:border-box}`) and `body { background:#F2EFE8 }`. Stubs render `<main>stub</main>` and `<title>stub</title>`.
      > Deviation: `astro check` refuses typescript ^7 (installed by Task 1), so typescript is downgraded to ^6 (`bun add -d typescript@^6`), and `tsconfig.json` gains `compilerOptions.types: ["bun"]` so `bun:test` resolves.
      > Deviation: Biome cannot see `.astro` template usage of frontmatter imports/variables, so `biome.json` gets an override for `**/*.astro` turning off `noUnusedImports` and `noUnusedVariables`.
- [x] Step 2: `src/pages/index.astro` is `<Base lang="th"><Showreel lang="th" /></Base>`; `src/pages/en/index.astro` is the same with `en`. `favicon.svg`: a 32px square `#111` with a `#F93427` plus mark (reuse the Premise scene's plus).
- [x] Step 3: Verify - Run: `bun run check && bun run build && test -f dist/index.html && test -f dist/en/index.html && test -f dist/sitemap-index.xml` - Expected: all exit 0
- [x] Step 4: Commit - `git commit -m "feat: add layout skeleton and th/en routes"`

---

### Track B - Showreel port

#### Task 5: Chrome, global CSS and scenes 0-1

**Files:**
- Create: `src/components/Split.astro`, `src/components/Chrome.astro`, `src/components/scenes/Opening.astro`, `src/components/scenes/Premise.astro`, `src/lib/split.ts`, `tests/unit/split.test.ts`
- Modify: `src/components/Showreel.astro` (anchor: stub `<main>`), `src/styles/global.css` (append)

**Interfaces:**
- Consumes: `Lang` (Task 3), `person` (Task 3), the Showreel stub contract (Task 4).
- Produces: `src/lib/split.ts`
  ```ts
  export type SplitMode = 'word' | 'char';
  export function splitText(text: string, mode: SplitMode, locale?: string): string[]; // Intl.Segmenter segments, whitespace removed
  ```
  and `Split.astro` props `{ text: string; mode: SplitMode; tag?: 'span' | 'h1' | 'h2' | 'p' }` rendering `<tag aria-label={text} data-split={mode}>` containing one `<span data-w aria-hidden="true" style="display:inline-block">` per segment plus an absolutely-positioned zero-size space text node between word spans.

**Gotcha:** The reference splits at runtime and strips whitespace, so `textContent` of a split element loses its spaces; crawlers that read `textContent` would index `ThemeraKarn...` glued words. Fix: split at build time in `Split.astro` AND keep a real space character between word spans inside a `<span aria-hidden="true" class="gap"> </span>` styled `position:absolute;width:0;height:0;overflow:hidden`. The reference visually separates words with `margin-right:.3em` on the previous span; keep that and do not let the gap occupy width. The rest of the section markup is copied from `reference/template.html` (`id="s0"`, `id="s1"`, `<header>`, `<footer>`, `data-particles` canvas, `data-grain` SVG): only the `data-l` pairs collapse to the active language and `sc-camel-*` attributes are renamed (see Patterns to Mirror). Footer `href="#s8"` stays.

**Steps:**
- [ ] Step 1: Write `tests/unit/split.test.ts` first: `splitText('Founder, CEO & CTO','word')` returns tokens whose join with a single space equals `'Founder, CEO & CTO'` after punctuation segments are rejoined as the reference does; `splitText('THEERAKARN','char')` has length 10; a Thai string's segments joined with `''` equals the input with spaces removed. Run it and watch it fail.
- [ ] Step 2: Implement `splitText` with `new Intl.Segmenter(locale ?? 'th', { granularity: mode === 'char' ? 'grapheme' : 'word' })`, dropping segments that match `/^\s+$/`.
- [ ] Step 3: Implement `Split.astro` and `Chrome.astro` (header with the TH/EN control as two `<a>` links styled like the reference buttons, active language has `background:#111;color:#F2EFE8`; footer; grain SVG; canvas). The language links are `<a href={pathFor('th')} hreflang="th" lang="th">TH</a>` and `<a href={pathFor('en')} hreflang="en" lang="en">EN</a>`, with `aria-current="page"` on the active one.
- [ ] Step 4: Port scenes 0 and 1 from `reference/template.html` into `Opening.astro` and `Premise.astro`, taking `lang` and choosing the string inline (`lang === 'th' ? ... : ...`) for text that is not in `site.ts`. Opening's name block is the page `<h1>` (`THEERAKARN` / `MAIWONG` as two `Split mode="char"` lines inside one `<h1>`). Add the `html[lang=th] ...` rule to `global.css` that reproduces the reference's `init()` TH loop (`letter-spacing:0; text-transform:none` on Thai-language spans) and an `.btn:hover` rule (used in Task 7).
- [ ] Step 5: Mount `<Chrome />`, `<Opening />`, `<Premise />` inside `Showreel.astro` under a root `<div data-root style="position:relative;font-family:'Anuphan',sans-serif;color:#111;background:#F2EFE8">`.
- [ ] Step 6: Verify - Run: `bun run test && bun run check` - Expected: unit tests pass; 0 type or lint errors.
- [ ] Step 7: Verify - Run: `bun run build && rg -c "data-scene" dist/index.html` - Expected: `2` (scenes 0 and 1 present so far).
- [ ] Step 8: Commit - `git commit -m "feat: port showreel chrome and opening/premise scenes"`

#### Task 6: Reel scenes 2-5 (Tenerie, MunMuang, Buddy Glasses, FridayMerch)

**Files:**
- Create: `src/components/scenes/Reel.astro`, `src/components/scenes/art/TenerieArt.astro`, `src/components/scenes/art/MunMuangArt.astro`, `src/components/scenes/art/BuddyArt.astro`, `src/components/scenes/art/FridayArt.astro`
- Modify: `src/components/Showreel.astro` (anchor: `<Premise />`)

**Interfaces:**
- Consumes: `projects`, `Lang` (Task 3); `Split` (Task 5).
- Produces: `Reel.astro` props `{ id: 'tenerie' | 'munmuang' | 'buddy' | 'friday'; index: 2 | 3 | 4 | 5; lang: Lang }` rendering `<section id="s{index}" data-scene="{index}" data-h data-m data-kind="{id}" data-screen-label ...>` with the shared reel frame (`data-art`, `data-ink`, `data-key`, `data-text`, `data-title`, `data-desc`, `data-meta`, `data-link`) and the per-kind art as a child component. Each art component carries the `data-bar`, `data-dot`, `data-messy`, `data-clean`, `data-row`, `data-count`, `data-tilt` hooks that `tlReel` in `reference/showreel.component.js` queries.

**Gotcha:** `data-kind` values drive `tlReel`; they are `tenerie`, `munmuang`, `buddy`, `friday` in the reference - copy exactly. Every `<a data-link>` to a project is a real `<a href>` with `rel="noopener"` for external targets. Project title is an `<h2>`. SVG `<defs>` ids (`htT`, `notchM`, ...) must stay unique per page; keep the reference ids.

**Steps:**
- [ ] Step 1: Diff the four reel sections in `reference/template.html` to see what is shared versus per-kind; move the shared frame into `Reel.astro` and each differing art block into its `art/*.astro` component, copying SVG/HTML verbatim apart from the attribute renames.
- [ ] Step 2: Fill title/description/meta/link from `projects` (`site.ts`) so the facts live in one place; non-fact strings (labels such as meta chips) are copied from the template per language.
- [ ] Step 3: Add the four `<Reel />` calls after `<Premise />` in `Showreel.astro`.
- [ ] Step 4: Verify - Run: `bun run check && bun run build && rg -c "data-scene" dist/index.html` - Expected: 0 errors, count `6`.
- [ ] Step 5: Commit - `git commit -m "feat: port reel scenes for tenerie munmuang buddy and friday"`

#### Task 7: Scenes 6-8 (How I work, End credits, Contact)

**Files:**
- Create: `src/components/scenes/How.astro`, `src/components/scenes/Credits.astro`, `src/components/scenes/Contact.astro`
- Modify: `src/components/Showreel.astro` (anchor: last `<Reel />`)

**Interfaces:**
- Consumes: `person`, `org`, `Split`, `Lang`.
- Produces: three section components with ids `s6`, `s7`, `s8` and attributes exactly as in the template (`data-h` 260/460/200, `data-m` 190/?/170 - copy from the template; do not guess).

**Gotcha:** The credits roll (`data-roll`) is a long text block (Starring as, Now, Previously, Cast, Production, Thailand, Featuring, Find me). It is real content and stays in the DOM as semantic text (use `<h2>` for the scene heading and definition-like markup that still looks identical). The EN "Design it, then build it" description is fixed per Global Constraints. The contact buttons carry `class="btn"` with the hover colours that `style-hover` defined in the template.

**Steps:**
- [ ] Step 1: Port `id="s6"`, `id="s7"`, `id="s8"` from `reference/template.html`.
- [ ] Step 2: Replace `style-hover` with `.btn:hover` / `.btn--solid:hover` rules in `global.css` (values read from the template: solid `background:#F93427;color:#111`, outline `background:#111;color:#F2EFE8`).
- [ ] Step 3: Mount in `Showreel.astro`.
- [ ] Step 4: Verify - Run: `bun run check && bun run build && rg -c "data-scene" dist/index.html && rg -c "data-scene" dist/en/index.html && rg -c "TODO|cut off" dist` - Expected: `9`, `9`, and no `TODO`/`cut off` hits (rg exits 1 with no matches).
- [ ] Step 5: Commit - `git commit -m "feat: port how-i-work credits and contact scenes"`

#### Task 8: Motion engine - port the Component class to vanilla TypeScript

**Files:**
- Create: `src/scripts/showreel.ts`, `src/scripts/particles.ts`
- Modify: `src/components/Showreel.astro` (anchor: end of file; add `<script>import '../scripts/showreel';</script>`)

**Interfaces:**
- Consumes: `reference/showreel.component.js` (source of truth), DOM hooks from Tasks 5-7.
- Produces: `startShowreel(root: HTMLElement): () => void` from `showreel.ts` (returns teardown); `particles.ts` exports the particle allocation, formation building and `draw(t)` that the class used (`allocParticles`, `sizeCanvas`, `mk`, `scatterPts`, formations, `draw`).

**Gotcha:** Translate, do not redesign. Keep: `NAMES`, `INK`, `rng(7)` seeded generator, Lenis `lerp: 0.11`, `gsap.ticker.fps(60)` and `lagSmoothing(0)`, per-section timelines with `scrub: true` and `invalidateOnRefresh`, the "sections become `position:fixed` stages toggled by `visibility`" structure, mobile detection `innerWidth < 700` choosing `data-m` heights and 650 vs 1700 particles, DPR cap (1.5 mobile, 2 desktop), the `ST` `refresh` listener that remeasures and rebuilds formations, the reduced-motion `staticMode()` path. Removed: React, `DCLogic`, `renderVals`, the `wait()` polling for globals (use ES imports `gsap`, `gsap/ScrollTrigger`, `gsap/DrawSVGPlugin`, `lenis`), the `this.split()` / `setLang()` / `data-l` display toggling (done at build time), and `props` (use constants `DENSITY = 1`, `MISREG = 2`, `GRAIN = true`). Keep the font readiness wait: `document.fonts.load('700 80px Anuphan','THEERAKARN ก')` etc. with the 2.5 s race before `init()`. Before init, the page is plain static HTML (no hidden state), so the no-JS and pre-init states are readable.

**Steps:**
- [ ] Step 1: Create `showreel.ts` with `import gsap from 'gsap'; import { ScrollTrigger } from 'gsap/ScrollTrigger'; import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'; import Lenis from 'lenis';` and `gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);`. Port `init`, `teardown`, `measure`, `onScroll`, `buildTimelines`, `tlOpening`, `tlPremise`, `tlReel`, `tlHow`, `tlCredits`, `tlCta`, `applyTweaks` (grain/misregistration constants), `staticMode`, resize handling, the footer `[data-skip]` smooth scroll (`lenis.scrollTo(document.documentElement.scrollHeight, { duration: 2.2 })`).
- [ ] Step 2: Create `particles.ts` from the `allocParticles` ... `draw` part of the reference class (read the remainder of `reference/showreel.component.js` past `scatterPts`; it contains the formations per scene and the frame `draw`).
- [ ] Step 3: The script guards single init and calls teardown on `pagehide`.
- [ ] Step 4: Verify - Run: `bun run check && bun run build` - Expected: 0 errors; `dist/_astro/*.js` exists and the largest JS chunk is under 150 KB gzip (`gzip -c dist/_astro/*.js | wc -c` per file).
- [ ] Step 5: Verify - Manual: run `bunx astro dev --port 4401`, open `http://localhost:4401/` with Playwright, scroll to 0%, 25%, 50%, 100% of `document.documentElement.scrollHeight` - Expected: footer counter shows `00`, then increases through `08`; no console errors; the particle canvas draws; stage visibility toggles per scene.
- [ ] Step 6: Commit - `git commit -m "feat: port showreel motion engine to typescript"`

#### Task 9: Parity test against the reference HTML

**Files:**
- Create: `tests/parity/parity.spec.ts`, `playwright.config.ts`

**Interfaces:**
- Consumes: reference file at `/Users/jametirakarn/Downloads/Theerakarn Showreel.html` (via `file://`), the dev server on port 4401.
- Produces: `bun run test:parity` - for viewport 1440x900 and 390x844, at each scene midpoint (`sections[i].offsetTop + 0.5 * height`) in TH, and at scenes 0, 2, 8 in EN, screenshots both pages after `window.scrollTo` plus 1500 ms settle, compares with `pixelmatch`, fails when more than 1.5 percent of pixels differ. Writes diffs to `tests/parity/.out/`. Also checks `reducedMotion: 'reduce'` full-page screenshots at 1440 width with the same tolerance.

**Gotcha:** EN on the reference is selected by clicking `[data-lang-btn="en"]`; on the new site by navigating to `/en/`. The reference loads over `file://`: React/GSAP come from the bundled manifest so it works offline. Disable the page's own smooth scroll effects by waiting, not by editing the page. Particles and grain are deterministic (seeded); if a diff is dominated by grain, mask the grain element identically in both pages before screenshotting (`[data-grain]{display:none}`) and state this in the test.

**Steps:**
- [ ] Step 1: Write `playwright.config.ts` (chromium only, `webServer` runs `bunx astro dev --port 4401`, reuse existing server off).
- [ ] Step 2: Write the spec with the matrix above.
- [ ] Step 3: Verify - Run: `bun run test:parity` - Expected: all cases pass at the 1.5 percent threshold. On failure, open the diffs in `tests/parity/.out/`, fix the port (not the threshold), re-run. Record the achieved max diff percentage in the commit body.
- [ ] Step 4: Commit - `git commit -m "test: add pixel parity test against showreel reference"`

---

### Track C - SEO and AIEO

#### Task 10: Head metadata (`Seo.astro`)

**Files:**
- Modify: `src/components/Seo.astro` (anchor: stub `<title>`)
- Create: `src/lib/seo.ts`

**Interfaces:**
- Consumes: `person`, `org`, `absoluteUrl`, `pathFor`, `otherLang` (Task 3).
- Produces: `seo.ts`
  ```ts
  export function seoFor(lang: Lang): { title: string; description: string; canonical: string; ogLocale: string; ogAlternate: string };
  ```
  Titles: TH `ธีรกานต์ ใหม่วงค์ (Theerakarn Maiwong) - Founder, CEO และ CTO Planthia Tech | Showreel`; EN `Theerakarn Maiwong (theerakarnm) - Founder, CEO & CTO of Planthia Tech | Showreel`. Descriptions start from the reference `<meta name="description">` and include the name variants naturally.

**Steps:**
- [x] Step 1: In `Seo.astro` render: `<title>`, description, `<link rel="canonical">`, `<link rel="alternate" hreflang="th|en|x-default">`, `robots` (`index,follow,max-image-preview:large,max-snippet:-1`), `author`, `theme-color #F2EFE8`, `og:title/description/type=website/url/image(/og.png, 1200x630, with alt)/locale/locale:alternate/site_name`, `twitter:card=summary_large_image` plus title/description/image, `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`, `<link rel="sitemap" href="/sitemap-index.xml">`, and `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the one latin and one thai Anuphan 700 file only. Render JSON-LD via `<script type="application/ld+json" set:html={...} />` from Task 11 (import added there).
      > Deviation: Titles shortened to fit Task 14's 20-70 char bound (parent decision): TH `ธีรกานต์ ใหม่วงค์ (Theerakarn Maiwong) - ผู้ก่อตั้ง Planthia Tech`, EN `Theerakarn Maiwong (theerakarnm) - Founder & CEO, Planthia Tech`. JSON-LD script wiring moved to Task 11 so this commit builds. Anuphan 700 preloads point at `anuphan-400-latin.woff2` and `anuphan-400-thai.woff2` (one file serves all weights).
- [x] Step 2: Verify - Run: `bun run check && bun run build && rg -n 'rel="canonical"|hreflang|og:image' dist/index.html dist/en/index.html` - Expected: each file has one canonical, three alternates, one og:image.
- [x] Step 3: Commit - `git commit -m "feat(seo): add head metadata, canonical and hreflang"`

#### Task 11: JSON-LD entity graph

**Files:**
- Create: `src/lib/jsonld.ts`, `tests/unit/jsonld.test.ts`
- Modify: `src/components/Seo.astro` (anchor: JSON-LD placeholder added in Task 10)

**Interfaces:**
- Consumes: `person`, `org`, `projects`, `absoluteUrl`, `SITE_URL`.
- Produces:
  ```ts
  export function jsonLd(lang: Lang): { '@context': 'https://schema.org'; '@graph': object[] };
  ```
  Graph nodes with stable `@id`s: `https://theerakarnm.dev/#person` (`Person`: `name` English, `alternateName` = `person.alternateNames`, `givenName`/`familyName`, `jobTitle`, `worksFor` -> `#org`, `url`, `image`, `email`, `sameAs`, `knowsAbout`, `nationality` omitted unless the owner confirms, `address` `{addressCountry:'TH'}`), `#org` (`Organization`/`Corporation`: `Planthia Tech Co., Ltd.`, `founder` -> `#person`, `url`), `#website` (`WebSite` with `inLanguage`, `publisher`), `#profile` (`ProfilePage`, `mainEntity` -> `#person`, `inLanguage` = lang, `dateModified` = build date), and one `CreativeWork`/`SoftwareApplication`-style node per project linked by `creator`.

**Gotcha:** Do not invent facts (no birth data, no education, no awards, no phone). Only use values from `site.ts`. Do not add `Review` or `AggregateRating`. `alternateName` carries every spelling the owner wants to rank for.

**Steps:**
- [x] Step 1: Write `tests/unit/jsonld.test.ts`: for both languages `JSON.stringify` parses back; the graph contains exactly one node with `@type` `Person` whose `alternateName` includes `Theerakarnm` and `ธีรกานต์ ใหม่วงค์` and whose `sameAs` has 3 URLs; every `@id` referenced (`worksFor`, `founder`, `mainEntity`) exists in the graph.
      > Deviation: Test also follows `creator` and `publisher` references, not only `worksFor`/`founder`/`mainEntity`.
- [x] Step 2: Implement `jsonld.ts` and wire it into `Seo.astro`.
      > Deviation: `org.url` is empty, so the `Corporation` node omits `url`. Person `email` uses `mailto:` URIs; JSON in the script tag escapes `<` as `\u003c`.
- [x] Step 3: Verify - Run: `bun run test` - Expected: all unit tests pass.
- [x] Step 4: Commit - `git commit -m "feat(seo): add schema.org person and organization graph"`

#### Task 12: robots.txt, llms.txt, llms-full.txt and sitemap

**Files:**
- Create: `src/pages/robots.txt.ts`, `src/pages/llms.txt.ts`, `src/pages/llms-full.txt.ts`

**Interfaces:**
- Consumes: `person`, `org`, `projects`, `SITE_URL`.
- Produces: static endpoints. `robots.txt`: `User-agent: *` `Allow: /`; explicit `Allow: /` blocks for `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `Claude-User`, `Claude-SearchBot`, `PerplexityBot`, `Perplexity-User`, `Google-Extended`, `Applebot-Extended`, `CCBot`; `Sitemap: https://theerakarnm.dev/sitemap-index.xml`. `llms.txt` follows the llms.txt convention (H1 name, blockquote summary, sections with links). `llms-full.txt` is a plain Markdown biography in English and Thai: who he is, name spellings ("also written Theerakarnm, theerakarnm, Theerakarn M., ธีรกานต์ ใหม่วงค์"), role, company, each project with URL and one-paragraph description, contact and profile links.

**Steps:**
- [x] Step 1: Implement the three `GET` endpoints with `export const GET = () => new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })`; build bodies from `site.ts` so facts are not duplicated.
      > Deviation: Endpoints typed as `APIRoute`. Thai name spellings in `llms-full.txt` come from `person.alternateNames`; no fact is hardcoded outside `site.ts`.
- [x] Step 2: Verify - Run: `bun run build && ls dist/robots.txt dist/llms.txt dist/llms-full.txt dist/sitemap-index.xml dist/sitemap-0.xml && rg -c "xhtml:link" dist/sitemap-0.xml` - Expected: all files exist; sitemap contains hreflang alternates (count at least 2).
      > Deviation: `rg -c` counts lines and the sitemap is one minified line (prints 1); `rg -o xhtml:link dist/sitemap-0.xml | wc -l` prints 4 (th-TH + en-US on both URLs), which satisfies the intent.
- [x] Step 3: Commit - `git commit -m "feat(aieo): add robots, llms.txt, llms-full.txt"`

#### Task 13: Open Graph image

**Files:**
- Create: `scripts/make-og.ts`, `scripts/og-template.html`, `public/og.png`

**Interfaces:**
- Consumes: self-hosted fonts in `public/fonts/` (Task 2).
- Produces: `public/og.png` 1200x630, paper background `#F2EFE8`, outlined `THEERAKARN MAIWONG` in Anuphan 700, role line in IBM Plex Mono, the riso four-circle mark. Committed to git so the build never needs a browser.

**Steps:**
- [x] Step 1: Write the HTML template (inline CSS, `@font-face` pointing at `file://` paths of `public/fonts`), and `make-og.ts` which launches Playwright chromium at 1200x630, loads the template, waits `document.fonts.ready`, screenshots to `public/og.png`.
      > Deviation: `@font-face` uses paths relative to the template (`../public/fonts/...`), which resolve to `file://` URLs when Playwright loads the template from disk. Anuphan latin file serves 400-700. The four-circle mark is a 2x2 cluster of the four riso colours with `mix-blend-mode: multiply`. Playwright 1.64 needed `bunx playwright install chromium` (headless shell 1248).
- [x] Step 2: Run `bun run og`.
- [x] Step 3: Verify - Manual: attach `public/og.png` with `attach_image` - Expected: readable name, no clipped text, correct fonts.
- [x] Step 4: Verify - Run: `file public/og.png` - Expected: `PNG image data, 1200 x 630`.
- [x] Step 5: Commit - `git commit -m "feat(seo): add open graph image"`

#### Task 14: Built-output SEO assertions

**Files:**
- Create: `scripts/check-dist.ts`

**Interfaces:**
- Consumes: `dist/` after `bun run build`.
- Produces: `bun run check:seo` exit 0 only when, for `dist/index.html` and `dist/en/index.html`: exactly one `<h1>`; exactly one `<title>` of 20-70 chars; description 70-180 chars; canonical equals the expected absolute URL; hreflang set is `th`, `en`, `x-default` and reciprocal; the JSON-LD block parses and has a `Person` with every alias; every `og:*`/`twitter:*` tag present and `og:image` URL resolves to a file in `dist/`; `<html lang>` matches; no `href` points at `localhost`; every internal `href` resolves to a file in `dist/`; `robots.txt` references the sitemap; the visible text of the page (HTML stripped, `aria-hidden` gap spaces included) contains `Theerakarn` and, for TH, `ธีรกานต์`.

**Steps:**
- [x] Step 1: Implement with `node:fs` and a small regex/`cheerio`-free parser (HTML is generated, regex on tags is acceptable here); print one line per failing assertion.
      > Deviation: `bun scripts/check-dist.ts [distDir]` takes an optional dist directory (defaults to `dist/`) so the proxy run below can point at a patched copy. Visible text strips tags to `''` so char-split spans rejoin; the Latin `Theerakarn` match is case-insensitive (the `<h1>` is uppercase `THEERAKARN`).
- [ ] Step 2: Verify - Run: `bun run build && bun run check:seo` - Expected: exit 0, and a negative control: temporarily delete the canonical link from `dist/index.html` and re-run - Expected: exit 1 naming the canonical assertion; then rebuild.
      > Deviation: Expected unsatisfiable at this task; errors confined to `src/components/Showreel.astro` (still the `<main>stub</main>` stub: no `<h1>`, no name in visible text), owned by Task 5 (Track B). Real `dist/` run: exit 1 with only those 5 lines (h1 x2, visible-text x3). Proxy: a copy of `dist/` with an injected `<h1>` holding the names passes (exit 0); negative control on both the copy and the real `dist/` (canonical deleted) exits 1 naming the canonical assertion; rebuilt afterwards.
      > Deviation: the reference has no visible `ธีรกานต์` anywhere, so the TH visible-text assertion will stay red after Track B merges unless Track B/E renders the Thai name in the TH body.
- [x] Step 3: Commit - `git commit -m "test(seo): add built-output seo assertions"`

---

### Track D - Docker and deploy

#### Task 15: Container nginx config

**Files:**
- Create: `deploy/nginx/default.conf`

**Interfaces:**
- Produces: a server block for `nginxinc/nginx-unprivileged`: `listen 8080;` root `/usr/share/nginx/html`; `try_files $uri $uri/ =404` with `index index.html` (directory URLs `/` and `/en/`); `gzip_static on; gzip on;` for text types (`gzip_vary on`); `location /_astro/ { add_header Cache-Control "public, max-age=31536000, immutable"; }`; `location /fonts/ { same immutable }`; HTML `Cache-Control: no-cache`; `/healthz` returns `200 ok` with `access_log off`; headers `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `X-Frame-Options DENY`, `Permissions-Policy`, and a `Content-Security-Policy` that allows `'self'`, inline styles (the page uses heavy inline `style=`), `data:` images, and the mailto/external links; `error_page 404 /404.html;`; `server_tokens off;`; `.txt`/`.xml` served with correct types (`text/plain; charset=utf-8`).

**Gotcha:** The page uses inline `style=` attributes and Astro inline scripts may be emitted; the CSP must include `style-src 'self' 'unsafe-inline'` and a script policy that matches what `dist/index.html` actually contains. Check `rg "<script" dist/index.html` and pick `script-src 'self'` only if no inline script is emitted; otherwise add the specific `sha256-` hashes or set `inlineStylesheets`/script bundling so none are inline. Do not use `'unsafe-inline'` for scripts.

**Steps:**
- [ ] Step 1: Write the config. Add `src/pages/404.astro` is NOT part of this track; if `dist/404.html` does not exist, the `error_page` line is dropped and nginx's default 404 is used (no cross-track edits).
- [ ] Step 2: Verify - Run: `rg -n "listen 8080|gzip_static|immutable|healthz|server_tokens off" deploy/nginx/default.conf` - Expected: all five present.
- [ ] Step 3: Commit - `git commit -m "feat(deploy): add container nginx config"`

#### Task 16: Production Dockerfile and pre-compression

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `scripts/precompress.ts`
- Modify: `package.json` (anchor: `"scripts"`, add `"postbuild": "bun scripts/precompress.ts"`)

**Interfaces:**
- Consumes: `deploy/nginx/default.conf` (Task 15), `bun run build` output.
- Produces: `Dockerfile` (multi-stage):
  1. `FROM oven/bun:1 AS deps` - copy `package.json bun.lock`, `bun install --frozen-lockfile`.
  2. `FROM deps AS build` - copy sources, `bun run build` (runs `postbuild` precompress).
  3. `FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime` (pin the exact current stable tag found at execution time and record it) - `COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html`, `COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf`, `EXPOSE 8080`, `USER 101`, `HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1`, OCI labels.
  `precompress.ts`: for every `.html .css .js .svg .xml .txt .json` file under `dist/` write a `.gz` sibling with `zlib.gzipSync(buf, { level: 9 })` (skip files under 256 bytes).
  `.dockerignore`: `node_modules dist .astro .git docs reference tests playwright-report test-results *.md` except `README.md` not needed.

**Gotcha:** The Playwright dependency must not run in the image build (it is a dev dependency used by tests); `bun install --frozen-lockfile` installs dev deps too, which is fine for a build stage, but `postinstall` must not download browsers. The final image must contain only `dist/` and nginx config. `docker` is not installed on the planning machine.

**Steps:**
- [ ] Step 1: Write the three files and the `postbuild` script.
- [ ] Step 2: Verify - Run: `bun run build && find dist -name "*.html.gz" | head -2 && gzip -t dist/index.html.gz` - Expected: `.gz` siblings exist and `gzip -t` exits 0.
- [ ] Step 3: Verify - Run: `docker build -t portfolio-v2:test . && docker run --rm -d -p 18080:8080 --name pv2 portfolio-v2:test && sleep 2 && curl -sI localhost:18080/ | head -1 && curl -s localhost:18080/healthz && curl -sI -H "Accept-Encoding: gzip" localhost:18080/ | rg -i content-encoding && docker exec pv2 id -u && docker stop pv2` - Expected (only if Docker is available; it is not on the planning machine): `HTTP/1.1 200 OK`, `ok`, `Content-Encoding: gzip`, uid `101`. If Docker is still absent, mark this step as awaiting human and rely on the next step.
- [ ] Step 4: 👤 Verify - Human: on the Linux VM run the Step 3 command block - Expected: same outputs as Step 3 - Proxy: Step 2 (`gzip -t` on the pre-compressed build) plus Task 15 Step 2 (config contents).
- [ ] Step 5: Commit - `git commit -m "feat(deploy): add production dockerfile and asset pre-compression"`

#### Task 17: Compose file, host nginx vhost and CI

**Files:**
- Create: `compose.yaml`, `deploy/nginx-host/theerakarnm.dev.conf`, `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `compose.yaml` - service `web`: `build: .`, `image: portfolio-v2:latest`, `restart: unless-stopped`, `ports: ["127.0.0.1:8080:8080"]`, `read_only: true`, `tmpfs: [/tmp, /var/cache/nginx, /var/run]`, `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`, `healthcheck` reusing the image's, `mem_limit: 128m`.
  Host vhost: `server` on 80 redirecting to HTTPS; `server` on 443 `http2` for `theerakarnm.dev`, certificate paths in the standard certbot location (`/etc/letsencrypt/live/theerakarnm.dev/`), HSTS `max-age=31536000; includeSubDomains`, `proxy_pass http://127.0.0.1:8080;` with `proxy_set_header Host/X-Forwarded-*`, brotli (`brotli on; brotli_types ...`) guarded by a comment that the module must be installed, and `www.theerakarnm.dev` 301 to the apex.
  CI: on push and PR - `oven-sh/setup-bun`, `bun install --frozen-lockfile`, `bun run check`, `bun run test`, `bun run build`, `bun run check:seo`. No registry push (the VM builds from source with `docker compose up -d --build`).

**Steps:**
- [ ] Step 1: Write the three files.
- [ ] Step 2: Verify - Run: `bun -e "for (const f of ['compose.yaml','.github/workflows/ci.yml']) Bun.YAML.parse(await Bun.file(f).text())"` - Expected: exits 0 (both files parse).
- [ ] Step 3: Commit - `git commit -m "feat(deploy): add compose, host nginx vhost and ci"`

---

### Track E - Integration (after A, B, C, D are merged)

#### Task 18: README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: the real scripts and files from all tracks.

**Steps:**
- [ ] Step 1: Rewrite `README.md` (one sentence per line, no em dashes) with: what the project is and what the reference is; stack; scene map (9 scenes, heights); commands (`bun install`, `bun run dev`, `bun run build`, `bun run check`, `bun run test`, `bun run test:parity`, `bun run check:seo`, `bun run og`, `bun run extract-reference`); project layout; how to re-extract the reference; i18n routing (`/` TH, `/en/` EN, hreflang); SEO and AIEO section (name variants targeted, JSON-LD graph, `llms.txt`, `robots.txt` bot policy, sitemap, what to submit manually: Google Search Console and Bing Webmaster after first deploy); deploy section (Docker build, `docker compose up -d --build`, host nginx vhost install steps, certbot, how to update); performance targets; decisions and assumptions (constants, the completed EN sentence, no analytics).
- [ ] Step 2: Verify - Run: `rg -n "TBD|TODO|\x{2014}" README.md` - Expected: no matches; `rg -c "bun run" README.md` at least 8.
- [ ] Step 3: Commit - `git commit -m "docs: rewrite readme for the astro showreel"`

#### Task 19: Whole-site verification

**Files:**
- none (verification only; fixes go back to the owning task's files)

**Steps:**
- [ ] Step 1: Verify - Run: `bun install --frozen-lockfile && bun run check && bun run test && bun run build && bun run check:seo` - Expected: all exit 0.
- [ ] Step 2: Verify - Run: `bun run test:parity` - Expected: all cases pass.
- [ ] Step 3: Verify - Manual: serve `dist` (`bunx serve dist -p 4403`), run Lighthouse (`bunx lighthouse http://localhost:4403/ --only-categories=performance,accessibility,best-practices,seo --preset=desktop --chrome-flags="--headless" --output=json`) for `/` and `/en/` - Expected: SEO 100, Accessibility at least 95, Best Practices at least 95, Performance at least 90 (mobile preset at least 80). Failures are fixed in the owning task, not by lowering targets.
- [ ] Step 4: Verify - Manual: Playwright with JavaScript disabled loads `/` and `/en/` - Expected: the `<h1>`, all nine scene headings and contact links are in the DOM text; page is readable (static HTML).
- [ ] Step 5: Verify - Manual: Playwright `reducedMotion: 'reduce'` full-page screenshot of `/` - Expected: no pinned stages, canvas hidden, content stacked and readable.
- [ ] Step 6: 👤 Verify - Human: on the Linux VM: `docker compose up -d --build`, install the host vhost, `curl -I https://theerakarnm.dev/` - Expected: `200`, `content-encoding` gzip or br, HSTS header; then in a browser scroll the full reel on desktop and a phone - Expected: motion matches the reference - Proxy: Step 1 (`check:seo`), Step 2 (`test:parity`) and Task 16 Step 2.
- [ ] Step 7: 👤 Verify - Human: after first deploy submit `https://theerakarnm.dev/sitemap-index.xml` in Google Search Console and Bing Webmaster Tools, request indexing for `/` and `/en/` - Expected: both URLs accepted - Proxy: Task 12 Step 2 (sitemap + hreflang present in build).
