import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const date = new Date().toISOString().slice(0, 10);
const outRoot = process.env.QA_PWA_OUT ?? path.join(repoRoot, 'evidence', date, 'pwa');
const sites = [
  { id: 'routes', origin: 'http://localhost:4421' },
  { id: 'knowledge', origin: 'http://localhost:4422' },
  { id: 'tools', origin: 'http://localhost:4423' },
];

async function checkSite(browser, site) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  try {
    await page.goto(`${site.origin}/`, { waitUntil: 'load' });
    const ready = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { supported: false, controller: null, scriptURL: null };
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => setTimeout(() => resolve(null), 15000)),
      ]);
      return {
        supported: true,
        controller: Boolean(navigator.serviceWorker.controller),
        scriptURL: registration?.active?.scriptURL ?? registration?.installing?.scriptURL ?? null,
      };
    });
    await page.reload({ waitUntil: 'load' });
    const controlledAfterReload = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const cachedText = await page.locator('body').innerText();
    const cachedBanner = cachedText.includes('离线副本');
    await page.screenshot({ path: path.join(outRoot, `pwa-${site.id}-cached-home.png`) });
    await page.goto(`${site.origin}/en/search/`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    const fallbackText = await page.locator('body').innerText();
    const fallbackVisible = fallbackText.includes('当前离线') && fallbackText.includes('当前页面没有可用的离线副本');
    await page.screenshot({ path: path.join(outRoot, `pwa-${site.id}-offline-fallback.png`) });
    await context.setOffline(false);
    return {
      site: site.id,
      ready,
      controlledAfterReload,
      cachedBanner,
      cachedText: cachedText.slice(0, 120),
      fallbackVisible,
      fallbackText: fallbackText.slice(0, 160),
      consoleErrors,
      pageErrors,
    };
  } finally {
    await context.close();
  }
}

async function main() {
  await mkdir(outRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const results = [];
    for (const site of sites) results.push(await checkSite(browser, site));
    const checks = results.flatMap((result) => [
      {
        id: `${result.site}-service-worker-ready`,
        pass: result.ready.supported && Boolean(result.ready.scriptURL),
        detail: result.ready,
      },
      {
        id: `${result.site}-controller-after-reload`,
        pass: result.controlledAfterReload === true,
        detail: { before: result.ready.controller, after: result.controlledAfterReload },
      },
      {
        id: `${result.site}-cached-home-offline`,
        pass: result.cachedBanner,
        detail: result.cachedText,
      },
      {
        id: `${result.site}-uncached-offline-fallback`,
        pass: result.fallbackVisible,
        detail: result.fallbackText,
      },
      {
        id: `${result.site}-no-page-errors`,
        pass: result.pageErrors.length === 0,
        detail: result.pageErrors,
      },
      {
        id: `${result.site}-no-unexpected-console-errors`,
        pass: result.consoleErrors.every((text) => text.includes('ERR_INTERNET_DISCONNECTED')),
        detail: {
          expectedOfflineNetworkErrors: result.consoleErrors.filter((text) => text.includes('ERR_INTERNET_DISCONNECTED')).length,
          unexpected: result.consoleErrors.filter((text) => !text.includes('ERR_INTERNET_DISCONNECTED')),
        },
      },
    ]);
    const report = {
      generatedAt: new Date().toISOString(),
      browser: `Playwright Chromium ${browser.version()}`,
      note: 'Requires production builds (PREVIEW_UNREVIEWED=0); service workers are intentionally not registered on preview builds.',
      results,
      checks,
    };
    await writeFile(path.join(outRoot, 'pwa.json'), `${JSON.stringify(report, null, 2)}\n`);
    const failures = checks.filter((check) => !check.pass);
    if (failures.length > 0) {
      console.error(failures.map((failure) => `${failure.id}: ${JSON.stringify(failure.detail)}`).join('\n'));
      process.exitCode = 1;
    } else {
      console.log(`PWA offline checks passed for ${results.length} sites (${checks.length} checks)`);
    }
  } finally {
    await browser.close();
  }
}

await main();
