import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const SOURCE = '/Users/jametirakarn/Downloads/Theerakarn Showreel.html';
const FONT_WEIGHTS: Record<string, string[]> = {
  Anuphan: ['400', '500', '700'],
  'IBM Plex Mono': ['400', '500'],
};

type ManifestEntry = { mime: string; compressed: boolean; data: string };

const html = readFileSync(process.argv[2] ?? SOURCE, 'utf8');

function bundlerBlock(type: string): string {
  const match = html.match(
    new RegExp(`<script type="__bundler/${type}">([\\s\\S]*?)</script>`),
  );
  if (!match) throw new Error(`missing __bundler/${type} block`);
  return match[1];
}

const manifest: Record<string, ManifestEntry> = JSON.parse(
  bundlerBlock('manifest'),
);
const template: string = JSON.parse(bundlerBlock('template'));

function assetBytes(uuid: string): Buffer {
  const entry = manifest[uuid];
  if (!entry) throw new Error(`manifest has no entry ${uuid}`);
  const raw = Buffer.from(entry.data, 'base64');
  return entry.compressed ? gunzipSync(raw) : raw;
}

mkdirSync('reference', { recursive: true });
mkdirSync('public/fonts', { recursive: true });
mkdirSync('src/styles', { recursive: true });

writeFileSync('reference/template.html', template);

const component = template.match(
  /<script type="text\/x-dc"[^>]*data-dc-script[^>]*>([\s\S]*?)<\/script>/,
);
if (!component) throw new Error('missing text/x-dc script');
writeFileSync('reference/showreel.component.js', component[1]);

const fontFacePattern = /\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g;
const fileByUuid = new Map<string, string>();
const rules: string[] = [];

for (const [, subset, rule] of template.matchAll(fontFacePattern)) {
  const family = rule.match(/font-family:\s*'([^']+)'/)?.[1];
  const weight = rule.match(/font-weight:\s*(\d+)/)?.[1];
  const uuid = rule.match(/url\("([^"]+)"\)/)?.[1];
  if (!family || !weight || !uuid) throw new Error(`unparsed rule: ${rule}`);
  if (!FONT_WEIGHTS[family]?.includes(weight)) continue;

  let file = fileByUuid.get(uuid);
  if (!file) {
    const slug = family.toLowerCase().replaceAll(' ', '-');
    file = `${slug}-${weight}-${subset}.woff2`;
    if (manifest[uuid]?.mime !== 'font/woff2') {
      throw new Error(`${uuid} is not a woff2 asset`);
    }
    writeFileSync(`public/fonts/${file}`, assetBytes(uuid));
    fileByUuid.set(uuid, file);
  }
  rules.push(
    `/* ${subset} */\n${rule.replace(`url("${uuid}")`, `url('/fonts/${file}')`)}`,
  );
}

writeFileSync('src/styles/fonts.css', `${rules.join('\n\n')}\n`);
execFileSync('bunx', ['biome', 'format', '--write', 'src/styles/fonts.css']);

console.log(
  `wrote ${fileByUuid.size} fonts, ${rules.length} @font-face rules, template ${template.length} chars, component ${component[1].length} chars`,
);
