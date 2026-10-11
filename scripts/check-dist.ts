import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { type Lang, person, SITE_URL } from '../src/content/site';
import { absoluteUrl } from '../src/lib/i18n';

const dist = process.argv[2] ?? join(import.meta.dir, '..', 'dist');
const failures: string[] = [];

const fail = (file: string, message: string) => {
  failures.push(`${file}: ${message}`);
};

const decode = (text: string) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');

const attrsOf = (tag: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  for (const match of tag.matchAll(
    /([\w:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g,
  )) {
    attrs[match[1].toLowerCase()] = decode(
      match[2] ?? match[3] ?? match[4] ?? '',
    );
  }
  return attrs;
};

const tagsOf = (html: string, name: string) =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) =>
    attrsOf(m[0].slice(name.length + 1)),
  );

const metaContent = (html: string, key: string): string[] =>
  tagsOf(html, 'meta')
    .filter((attrs) => attrs.name === key || attrs.property === key)
    .map((attrs) => attrs.content ?? '');

const distFileFor = (pathname: string): string => {
  const clean = decodeURIComponent(pathname.split(/[?#]/)[0]);
  const target = join(dist, clean);
  return clean.endsWith('/') ? join(target, 'index.html') : target;
};

const resolvesInDist = (pathname: string) => {
  const file = distFileFor(pathname);
  return existsSync(file) && statSync(file).isFile();
};

const internalPath = (href: string): string | undefined => {
  if (href.startsWith(SITE_URL)) return href.slice(SITE_URL.length) || '/';
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  return undefined;
};

const ogTags = [
  'og:title',
  'og:description',
  'og:type',
  'og:url',
  'og:image',
  'og:image:alt',
  'og:locale',
  'og:locale:alternate',
  'og:site_name',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
];

const expectedAlternates: Record<string, string> = {
  th: absoluteUrl('th'),
  en: absoluteUrl('en'),
  'x-default': absoluteUrl('th'),
};

const alternatesByPage = new Map<Lang, Record<string, string>>();

function checkPage(lang: Lang, relative: string) {
  const file = relative;
  const html = readFileSync(join(dist, relative), 'utf8');

  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  if (h1Count !== 1) fail(file, `expected exactly one <h1>, found ${h1Count}`);

  const titles = [...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)].map((m) =>
    decode(m[1]).trim(),
  );
  if (titles.length !== 1) {
    fail(file, `expected exactly one <title>, found ${titles.length}`);
  } else if (titles[0].length < 20 || titles[0].length > 70) {
    fail(file, `title length ${titles[0].length} not in 20-70`);
  } else if (lang === 'th' && !titles[0].includes(person.name.th)) {
    fail(file, `<title> lacks the Thai name "${person.name.th}"`);
  }

  const descriptions = metaContent(html, 'description');
  if (descriptions.length !== 1) {
    fail(file, `expected one meta description, found ${descriptions.length}`);
  } else if (descriptions[0].length < 70 || descriptions[0].length > 180) {
    fail(file, `description length ${descriptions[0].length} not in 70-180`);
  } else if (lang === 'th' && !descriptions[0].includes(person.name.th)) {
    fail(file, `meta description lacks the Thai name "${person.name.th}"`);
  }

  const links = tagsOf(html, 'link');
  const canonicals = links.filter((l) => l.rel === 'canonical');
  if (canonicals.length !== 1 || canonicals[0].href !== absoluteUrl(lang)) {
    fail(
      file,
      `canonical must be exactly one ${absoluteUrl(lang)}, found [${canonicals.map((l) => l.href).join(', ')}]`,
    );
  }

  const alternates: Record<string, string> = {};
  for (const link of links.filter((l) => l.rel === 'alternate' && l.hreflang)) {
    alternates[link.hreflang] = link.href;
  }
  alternatesByPage.set(lang, alternates);
  const hreflangs = Object.keys(alternates).sort().join(',');
  if (hreflangs !== 'en,th,x-default') {
    fail(file, `hreflang set must be th, en, x-default, found ${hreflangs}`);
  }
  for (const [key, href] of Object.entries(expectedAlternates)) {
    if (alternates[key] !== href) {
      fail(
        file,
        `hreflang ${key} must point at ${href}, found ${alternates[key]}`,
      );
    }
  }

  const jsonLdBlocks = [
    ...html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  if (jsonLdBlocks.length !== 1) {
    fail(file, `expected one JSON-LD block, found ${jsonLdBlocks.length}`);
  } else {
    try {
      const data = JSON.parse(jsonLdBlocks[0][1]);
      const people = (data['@graph'] ?? []).filter(
        (node: { '@type'?: string }) => node['@type'] === 'Person',
      );
      const aliases: string[] = people[0]?.alternateName ?? [];
      const missing = person.alternateNames.filter((n) => !aliases.includes(n));
      if (people.length !== 1) {
        fail(file, `JSON-LD must have one Person, found ${people.length}`);
      } else if (missing.length > 0) {
        fail(file, `JSON-LD Person is missing aliases: ${missing.join(', ')}`);
      } else if (
        lang === 'th' &&
        people[0].name !== person.name.th &&
        !aliases.includes(person.name.th)
      ) {
        fail(file, `JSON-LD Person lacks the Thai name "${person.name.th}"`);
      }
    } catch (error) {
      fail(file, `JSON-LD does not parse: ${error}`);
    }
  }

  for (const key of ogTags) {
    const values = metaContent(html, key);
    if (values.length !== 1 || values[0] === '') {
      fail(file, `expected one non-empty ${key}, found ${values.length}`);
    }
  }
  const ogImage = metaContent(html, 'og:image')[0];
  if (ogImage) {
    const path = internalPath(ogImage);
    if (!path || !resolvesInDist(path)) {
      fail(file, `og:image ${ogImage} does not resolve to a file in dist`);
    }
  }

  const htmlLang = html.match(/<html\b[^>]*\blang="([^"]*)"/i)?.[1];
  if (htmlLang !== lang)
    fail(file, `<html lang> must be ${lang}, found ${htmlLang}`);

  const hrefs = [...html.matchAll(/\bhref="([^"]*)"/gi)].map((m) =>
    decode(m[1]),
  );
  for (const href of hrefs) {
    if (/localhost|127\.0\.0\.1/i.test(href)) {
      fail(file, `href points at localhost: ${href}`);
      continue;
    }
    const path = internalPath(href);
    if (path && !resolvesInDist(path)) {
      fail(file, `internal href does not resolve in dist: ${href}`);
    }
  }

  const body = html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? '';
  const visible = decode(
    body
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ''),
  );
  if (!/theerakarn/i.test(visible))
    fail(file, 'visible text lacks "Theerakarn"');
}

checkPage('th', 'index.html');
checkPage('en', 'en/index.html');

for (const [lang, alternates] of alternatesByPage) {
  for (const [otherLang, otherAlternates] of alternatesByPage) {
    if (alternates[otherLang] && otherAlternates[lang] !== absoluteUrl(lang)) {
      fail(
        `${lang}`,
        `hreflang not reciprocal: ${otherLang} page does not link back to ${lang}`,
      );
    }
  }
}

const robotsPath = join(dist, 'robots.txt');
const robots = existsSync(robotsPath) ? readFileSync(robotsPath, 'utf8') : '';
if (!robots.includes(`Sitemap: ${SITE_URL}/sitemap-index.xml`)) {
  fail('robots.txt', 'does not reference the sitemap');
}

if (failures.length > 0) {
  for (const line of failures) console.error(`FAIL ${line}`);
  process.exit(1);
}
console.log('check:seo passed');
