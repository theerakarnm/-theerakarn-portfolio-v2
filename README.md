# portfolio-v2

Theerakarn Maiwong's portfolio showreel, rebuilt as a static Astro site.
It is a pixel-and-motion-exact port of the standalone file `Theerakarn Showreel.html`, a hand-written single-page scroll reel.
The site ships as a production Docker image behind the host nginx at `https://theerakarnm.dev`.
Thai is the default language at `/`, English lives at `/en/`.

## Stack

- bun 1.3.x is the only package manager and script runner.
- Astro 7 with static output and two build-time routes.
- GSAP 3 (ScrollTrigger and DrawSVG) plus Lenis smooth scroll, driven by one vanilla TypeScript client module.
- A seeded canvas particle field ported from the reference.
- Biome 2 for lint and format.
- Playwright with pixelmatch and pngjs for the pixel parity test.
- Docker: a bun build stage, then `nginxinc/nginx-unprivileged` serving pre-compressed `dist/` on port 8080.

## Scene map

The reel is nine scenes, each a `<section>` with a scroll length in vh units.
`data-h` is the desktop length and `data-m` applies below a 700 px viewport width.

| Scene | id | data-h | data-m |
| --- | --- | --- | --- |
| 00 Opening | s0 | 320 | 220 |
| 01 Premise | s1 | 260 | 190 |
| 02 Reel: Tenerie | s2 | 320 | 220 |
| 03 Reel: MunMuang | s3 | 320 | 220 |
| 04 Reel: Buddy Glasses | s4 | 320 | 220 |
| 05 Reel: FridayMerch | s5 | 320 | 220 |
| 06 How I work | s6 | 260 | 200 |
| 07 End credits | s7 | 460 | 420 |
| 08 Contact | s8 | 200 | 170 |

## Commands

| Command | What it does |
| --- | --- |
| `bun install` | install dependencies |
| `bun run dev` | Astro dev server on `http://localhost:4321` |
| `bun run build` | `astro build`, then the `postbuild` hook writes `.gz` siblings for nginx `gzip_static` |
| `bun run check` | `astro check` plus `biome check .` |
| `bun run lint` | `biome check .` only |
| `bun run test` | unit tests (`bun test tests/unit`) |
| `bun run test:parity` | pixel parity test against the reference; it starts its own dev server on port 4401 |
| `bun run check:seo` | built-output SEO assertions; run it after `bun run build` |
| `bun run og` | regenerate `public/og.png` (1200x630) with Playwright |
| `bun run extract-reference` | unpack the reference bundle into `reference/`, `public/fonts/` and `src/styles/fonts.css` |

`bun run test:parity` needs a chromium install (`bunx playwright install chromium`) and the reference HTML, see the parity note under Decisions and assumptions.

## Project layout

```
src/
  components/          Chrome, Seo, Showreel, Split and scenes/ (one component per scene)
  content/site.ts      single source of truth for facts (person, org, projects, descriptions)
  layouts/Base.astro   html shell, renders <Seo> and the page slot
  lib/                 i18n helpers, head metadata, JSON-LD graph, text splitter
  pages/               index.astro (TH), en/index.astro, robots.txt.ts, llms.txt.ts, llms-full.txt.ts
  scripts/             showreel.ts (motion engine) and particles.ts (canvas field)
  styles/              fonts.css (self-hosted @font-face) and global.css
scripts/               extract-reference.ts, precompress.ts, make-og.ts, check-dist.ts
reference/             unpacked reference template and component (read-only porting source)
public/                fonts/, og.png, favicon.svg
tests/unit/            bun unit tests
tests/parity/          Playwright pixel parity test
deploy/nginx/          nginx config inside the container
deploy/nginx-host/     host nginx vhost for theerakarnm.dev
```

## Re-extracting the reference

`bun run extract-reference` reads `/Users/jametirakarn/Downloads/Theerakarn Showreel.html` by default and accepts a custom path as its first argument (`bun run extract-reference <path>`).
It is a self-contained "bundler" bundle: fonts, GSAP, Lenis and the page template are embedded in it.
The script writes `reference/template.html` and `reference/showreel.component.js` as the read-only porting sources, the woff2 files into `public/fonts/`, and regenerates `src/styles/fonts.css`.
After a re-extract, run `bun run build` and `bun run test:parity` to confirm nothing drifted.

## Languages and routing

- Thai is the default locale at `/`, English at `/en/`; both pages are rendered at build time with only the active language in the DOM.
- The header language control is two plain links with `hreflang` and `lang` attributes; there is no client-side toggle.
- Every page ships a canonical URL and reciprocal `hreflang` links for `th`, `en` and `x-default` (x-default points at the Thai page).
- URLs use a trailing slash everywhere (`trailingSlash: 'always'`, directory build format).
- The sitemap lists both URLs with their hreflang alternates.

## SEO and AIEO

- Name variants targeted: `Theerakarn Maiwong`, `Theerakarnm`, `theerakarnm`, `Theerakarn M.` and `ธีรกานต์ ใหม่วงค์`; they are `alternateName` entries in JSON-LD and appear across the llms copy.
- Each page has one JSON-LD `@graph`: `Person` (`#person`), `Corporation` (`#org`, Planthia Tech Co., Ltd.), `WebSite` (`#website`), `ProfilePage` (`#profile`) and one creative-work node per project linked by `creator`.
- `llms.txt` and `llms-full.txt` are build endpoints generated from `src/content/site.ts` (profile, full bilingual biography, projects, contact).
- `robots.txt` allows everyone, explicitly allows the common AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot) and points at the sitemap.
- The sitemap is `https://theerakarnm.dev/sitemap-index.xml`.
- The social card image is `public/og.png`; regenerate it with `bun run og` after changing copy or fonts.
- `bun run check:seo` asserts titles, descriptions, canonical, hreflang, JSON-LD aliases, Open Graph and Twitter tags, and internal links on the built output.
- After the first deploy, submit `https://theerakarnm.dev/sitemap-index.xml` in Google Search Console and Bing Webmaster Tools, then request indexing for `/` and `/en/`.

## Deploy

- The multi-stage `Dockerfile` builds with bun, pre-compresses text assets in `postbuild`, and serves `dist/` from `nginxinc/nginx-unprivileged:1.30.5-alpine` as non-root (uid 101) on port 8080 with a `/healthz` endpoint.
- Start it with `docker compose up -d --build`; compose binds only `127.0.0.1:8080`, runs read-only with dropped capabilities, and caps memory at 128 MB.
- Host nginx: install `deploy/nginx-host/theerakarnm.dev.conf` (for example as `/etc/nginx/sites-available/theerakarnm.dev.conf` with a `sites-enabled` symlink), then check with `nginx -t` and reload.
- TLS: certificates must exist at `/etc/letsencrypt/live/theerakarnm.dev/` and cover both `theerakarnm.dev` and `www.theerakarnm.dev`; issue them with certbot webroot mode, for example `certbot certonly --webroot -w /var/www/certbot -d theerakarnm.dev -d www.theerakarnm.dev`.
- The port 80 server block keeps `/.well-known/acme-challenge/` on `/var/www/certbot` so renewals keep working.
- The host brotli directives are commented out; uncomment them only after `nginx -V` lists the brotli module, otherwise nginx refuses to start.
- To update the site, pull the latest commit on the VM and run `docker compose up -d --build` again.
- CI (`.github/workflows/ci.yml`) runs install, check, test, build and check:seo on every push and pull request; nothing is pushed to a registry.

## Performance targets

- The whole motion engine is one JS chunk, target under 150 KB gzip (currently about 55 KB).
- Fonts are self-hosted woff2 with `font-display: swap`, and the two Anuphan files the first paint needs are preloaded.
- Text assets ship gzip pre-compressed and are served via nginx `gzip_static`.
- Lighthouse desktop targets: SEO 100, Accessibility at least 95, Best Practices at least 95, Performance at least 90; mobile Performance at least 80.

## Decisions and assumptions

- The reference's editor tweak props become constants: particle density 1, riso misregistration 2 px, film grain on.
- The EN line under "Design it, then build it" was cut off in the reference; the port completes it as "Plan an architecture that can grow, then ship it in working pieces, one at a time." to mirror the Thai line.
- The reference has only a dashed placeholder badge for How-I-work step 03; the port ships assumed copy that still needs owner review: EN "Ship it and keep it running" with "Deploy to production, watch it, and keep improving after launch.", TH "ส่งงานขึ้นใช้จริง แล้วดูแลต่อเนื่อง" with "นำขึ้นระบบจริง คอยติดตามผล และพัฒนาต่อหลังเปิดใช้งาน".
- The reference's dashed cut-off placeholder badges are dropped, none of them ship.
- The Thai name `ธีรกานต์ ใหม่วงค์` is never shown visibly (the reference does not show it either); it is kept in the title, meta description and JSON-LD so name searches find the site.
- No analytics and no third-party requests at runtime; fonts are self-hosted.
- The runtime image is pinned to `nginxinc/nginx-unprivileged:1.30.5-alpine`; containers run as uid 101 on port 8080, and the host nginx terminates TLS.
- The Docker image build has only been verified through podman by a reviewer; the owner still needs a `docker compose up -d --build` run on the Linux VM.
- The parity test needs the reference HTML at `/Users/jametirakarn/Downloads/Theerakarn Showreel.html`; set the `REFERENCE_HTML` environment variable to point somewhere else.
- In the parity test the particle canvas is hidden on both pages (particles drift with wall-clock time, so canvas ink density is compared instead), and the placeholder badges and the step 03 text column are masked; details are in the header of `tests/parity/parity.spec.ts`.
