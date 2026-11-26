import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const outRoot = process.env.MOBILE_AUDIT_OUT ?? path.join(repoRoot, 'evidence', new Date().toISOString().slice(0, 10), 'mobile-overflow');
const sites = [
  { id: 'www', dir: 'site-www', origin: 'https://paobu.org', port: 4421 },
  { id: 'knowledge', dir: 'site-knowledge', origin: 'https://learn.paobu.org', port: 4422 },
  { id: 'tools', dir: 'site-tools', origin: 'https://tools.paobu.org', port: 4423 },
];

function localUrl(site, canonical) {
  const url = new URL(canonical, site.origin);
  if (url.origin !== site.origin) return null;
  return `http://localhost:${site.port}${url.pathname}${url.search}`;
}

const quick = process.argv.includes('--quick');
const widths = [320, 360, 390, 414];

const browser = await chromium.launch({ headless: true });
const results = [];
const failures = [];
for (const site of sites) {
  const sitemap = fs.readFileSync(path.join(repoRoot, '..', site.dir, 'dist', 'sitemap.xml'), 'utf8');
  const canonicalUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  for (const canonical of canonicalUrls) {
    const local = localUrl(site, canonical);
    if (!local) continue;
    const isTool = canonical.includes('/tools/');
    const isCompare = canonical.includes('/compare/');
    const checkWidths = widths;
    for (const width of checkWidths) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      try {
        await page.goto(local, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await page.waitForTimeout(150);
        const metrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        const overflow = metrics.scrollWidth > metrics.clientWidth + 1;
        results.push({ site: site.id, url: canonical, width, ...metrics, overflow });
        if (overflow) failures.push(`${site.id} ${width}px ${canonical} (${metrics.scrollWidth}/${metrics.clientWidth})`);
      } catch (error) {
        failures.push(`${site.id} ${width}px ${canonical} request failed: ${error.message.split('\n')[0]}`);
      } finally {
        await page.close();
      }
    }
  }
}
await browser.close();

fs.mkdirSync(outRoot, { recursive: true });
fs.writeFileSync(path.join(outRoot, 'mobile-overflow.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), results, failures }, null, 2)}\n`);
if (failures.length) {
  console.error(failures.join('\n'));
  console.error(`mobile overflow failed: ${failures.length} page/width combinations.`);
  process.exit(1);
}
console.log(`mobile overflow passed: ${results.length} page/width combinations.`);
