import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const EXTENSIONS = new Set([
  '.html',
  '.css',
  '.js',
  '.svg',
  '.xml',
  '.txt',
  '.json',
]);
const MIN_BYTES = 256;

let count = 0;
for (const entry of readdirSync(DIST, { recursive: true, encoding: 'utf8' })) {
  const file = join(DIST, entry);
  if (!EXTENSIONS.has(extname(file)) || !statSync(file).isFile()) continue;
  const buf = readFileSync(file);
  if (buf.length < MIN_BYTES) continue;
  writeFileSync(`${file}.gz`, gzipSync(buf, { level: 9 }));
  count++;
}

console.log(`precompress: wrote ${count} .gz files under ${DIST}/`);
