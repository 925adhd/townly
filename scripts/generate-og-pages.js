import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const base = readFileSync(join(distDir, 'index.html'), 'utf8');

const routes = [
  {
    path: 'events',
    title: 'Events & Announcements — Grayson County Townly',
    description: 'See what\'s happening on the front porch — events, yard sales, announcements, and more.',
    url: 'https://www.townly.us/events',
  },
  {
    path: 'ask',
    title: 'Ask the Community — Grayson County Townly',
    description: 'Ask your neighbors for recommendations on local services, businesses, and more in Grayson County.',
    url: 'https://www.townly.us/ask',
  },
  {
    path: 'directory',
    title: 'Local Businesses — Grayson County Townly',
    description: 'Find and support local businesses in Grayson County.',
    url: 'https://www.townly.us/directory',
  },
];

for (const route of routes) {
  let html = base
    .replace(/(<meta property="og:title" content=")[^"]*(")/,   `$1${route.title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/,   `$1${route.description}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/,   `$1${route.url}$2`)
    .replace(/(<meta name="description" content=")[^"]*(")/,   `$1${route.description}$2`)
    .replace(/(<title>)[^<]*(<\/title>)/, `$1${route.title}$2`);

  const dir = join(distDir, route.path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  console.log(`Generated dist/${route.path}/index.html`);
}
