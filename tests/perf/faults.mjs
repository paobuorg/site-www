import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const date = new Date().toISOString().slice(0, 10);
const outRoot = process.env.PERF_OUT ?? path.join(repoRoot, 'evidence', date, 'perf');
const channel = process.env.QA_CHANNEL || undefined;

const homeUrl = 'http://localhost:4421/zh-CN/';
const routeUrl = 'http://localhost:4421/zh-CN/routes/boston/';
const searchUrl = 'http://localhost:4421/zh-CN/search/?q=%E9%A9%AC%E6%8B%89%E6%9D%BE';

const scenarios = [
  {
    id: 'webgl-disabled',
    url: homeUrl,
    init: () => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
        return original.call(this, type, ...args);
      };
    },
    waitMs: 1500,
  },
  {
    id: 'webgl-disabled-route',
    url: routeUrl,
    init: () => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
        return original.call(this, type, ...args);
      };
    },
    waitMs: 1500,
  },
  {
    id: 'save-data',
    url: homeUrl,
    init: () => {
      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        get: () => ({ saveData: true, effectiveType: '3g' }),
      });
    },
    waitMs: 1500,
  },
  {
    id: 'low-memory-hint',
    url: homeUrl,
    init: () => {
      Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 1.5 });
    },
    waitMs: 1500,
  },
  {
    id: 'imagery-failure',
    url: homeUrl,
    route: '**/textures/earth-blue-marble-2048.jpg',
    waitMs: 12000,
  },
  {
    id: 'storage-restricted',
    url: homeUrl,
    init: () => {
      const deny = () => {
        throw new Error('Storage is blocked');
      };
      Object.defineProperty(window, 'localStorage', { configurable: true, get: deny });
      Object.defineProperty(window, 'sessionStorage', { configurable: true, get: deny });
    },
    waitMs: 1500,
    actions: 'theme-toggle-and-search',
  },
  {
    id: 'cookies-blocked',
    url: homeUrl,
    init: () => {
      Object.defineProperty(Document.prototype, 'cookie', {
        configurable: true,
        get: () => '',
        set: () => {},
      });
    },
    waitMs: 1500,
    actions: 'theme-toggle-and-cross-site',
  },
];

async function inspect(page, withSearch) {
  return page.evaluate(
    ({ withSearch }) => {
      const fallback = document.querySelector('.globe-fallback, .route-map-fallback');
      const loading = document.querySelector('.globe-loading');
      const canvas = document.querySelector('canvas');
      const cards = [...document.querySelectorAll('[data-route-card]')];
      const routeLinks = [...document.querySelectorAll('a[href*="/routes/"]')].map((link) => link.getAttribute('href'));
      const search = document.querySelector('#site-search, #search-page-input');
      const main = document.querySelector('main');
      return {
        fallbackVisible: Boolean(fallback && !fallback.hidden),
        loadingHidden: !loading || loading.hidden || getComputedStyle(loading).display === 'none',
        canvasPresent: Boolean(canvas),
        canvasDisplay: canvas ? getComputedStyle(canvas).display : null,
        cesiumErrorPanels: document.querySelectorAll('.cesium-widget-errorPanel').length,
        routeCardCount: cards.length,
        routeCardVisible: cards.filter((card) => !card.hidden).length,
        routeLinks: [...new Set(routeLinks)].slice(0, 6),
        searchPresent: Boolean(search),
        mainTextLength: main ? main.innerText.trim().length : 0,
        theme: document.documentElement.dataset.theme,
        themePreference: document.documentElement.dataset.themePreference,
        searchResultCount: withSearch ? document.querySelectorAll('.search-result').length : null,
      };
    },
    { withSearch },
  );
}

async function main() {
  await mkdir(outRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel });
  const report = {
    generatedAt: new Date().toISOString(),
    browser: channel ? `Playwright ${channel}` : `Playwright Chromium ${browser.version()}`,
    notes: [
      'low-memory-hint uses navigator.deviceMemory, not real memory pressure; a real low-memory device test is still required.',
      'imagery-failure aborts the local base texture request; it does not validate a remote high-resolution imagery service.',
      'storage-restricted and cookies-blocked simulate browser policy; they are not a substitute for a real privacy-mode device.',
    ],
    results: [],
  };
  try {
    for (const scenario of scenarios) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addCookies([
        { name: 'paobu_theme', value: 'light', url: 'http://localhost:4421' },
        { name: 'paobu_theme', value: 'light', url: 'http://localhost:4422' },
        { name: 'paobu_theme', value: 'light', url: 'http://localhost:4423' },
      ]);
      if (scenario.init) await context.addInitScript(scenario.init);
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      const failedRequests = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => pageErrors.push(String(error)));
      page.on('requestfailed', (request) => {
        failedRequests.push(`${request.url()} ${request.failure()?.errorText ?? ''}`);
      });
      if (scenario.route) await page.route(scenario.route, (route) => route.abort('failed'));
      await page.goto(scenario.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(scenario.waitMs);

      let actions = null;
      if (scenario.actions === 'theme-toggle-and-search') {
        await page.locator('[data-theme-toggle]').first().click().catch(() => {});
        actions = { themeAfterToggle: await page.evaluate(() => document.documentElement.dataset.theme) };
      }
      if (scenario.actions === 'theme-toggle-and-cross-site') {
        await page.locator('[data-theme-toggle]').first().click().catch(() => {});
        actions = await page.evaluate(() => {
          const link = [...document.querySelectorAll('a[data-cross-site]')].find(
            (anchor) => new URL(anchor.href).origin !== location.origin,
          );
          const before = link?.getAttribute('href');
          link?.addEventListener('click', (event) => event.preventDefault(), { once: true });
          link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return {
            themeAfterToggle: document.documentElement.dataset.theme,
            crossSiteHrefBefore: before,
            crossSiteHrefAfter: link?.getAttribute('href'),
          };
        });
      }

      const facts = await inspect(page, false);
      report.results.push({
        id: scenario.id,
        url: scenario.url,
        actions,
        facts,
        pageErrors,
        consoleErrors,
        failedRequests: failedRequests.slice(0, 5),
        screenshot: `t16-${scenario.id}.png`,
      });
      await page.screenshot({
        path: path.join(outRoot, `t16-${scenario.id}.png`),
        fullPage: false,
        animations: 'disabled',
      });
      await context.close();
      console.log(`${scenario.id}: fallback=${facts.fallbackVisible} cards=${facts.routeCardCount} search=${facts.searchPresent}`);
    }

    const searchContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await searchContext.addCookies([{ name: 'paobu_theme', value: 'light', url: 'http://localhost:4421' }]);
    await searchContext.addInitScript(() => {
      const deny = () => {
        throw new Error('Storage is blocked');
      };
      Object.defineProperty(window, 'localStorage', { configurable: true, get: deny });
      Object.defineProperty(window, 'sessionStorage', { configurable: true, get: deny });
    });
    const searchPage = await searchContext.newPage();
    const searchErrors = [];
    searchPage.on('pageerror', (error) => searchErrors.push(String(error)));
    await searchPage.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await searchPage.waitForTimeout(2500);
    report.results.push({
      id: 'storage-restricted-search',
      url: searchUrl,
      facts: await inspect(searchPage, true),
      pageErrors: searchErrors,
      screenshot: 't16-storage-restricted-search.png',
    });
    await searchPage.screenshot({
      path: path.join(outRoot, 't16-storage-restricted-search.png'),
      fullPage: false,
      animations: 'disabled',
    });
    await searchContext.close();
  } finally {
    await browser.close();
  }

  const byId = Object.fromEntries(report.results.map((result) => [result.id, result]));
  report.assertions = [
    {
      id: 'webgl-disabled',
      pass:
        byId['webgl-disabled'].facts.fallbackVisible &&
        byId['webgl-disabled'].facts.routeCardVisible > 0 &&
        byId['webgl-disabled'].facts.searchPresent &&
        byId['webgl-disabled'].pageErrors.length === 0,
      detail: 'fallback shown, route cards and search remain usable',
    },
    {
      id: 'webgl-disabled-route',
      pass:
        byId['webgl-disabled-route'].facts.fallbackVisible &&
        byId['webgl-disabled-route'].facts.mainTextLength > 500 &&
        byId['webgl-disabled-route'].pageErrors.length === 0,
      detail: 'route page shows fallback and keeps its text content',
    },
    {
      id: 'save-data',
      pass:
        byId['save-data'].facts.fallbackVisible &&
        byId['save-data'].facts.routeCardVisible > 0 &&
        byId['save-data'].pageErrors.length === 0,
      detail: 'Save-Data skips WebGL without breaking the route list',
    },
    {
      id: 'low-memory-hint',
      pass:
        byId['low-memory-hint'].facts.fallbackVisible &&
        byId['low-memory-hint'].facts.routeCardVisible > 0 &&
        byId['low-memory-hint'].pageErrors.length === 0,
      detail: 'low deviceMemory hint skips WebGL without breaking the route list',
    },
    {
      id: 'imagery-failure',
      pass:
        byId['imagery-failure'].facts.fallbackVisible &&
        byId['imagery-failure'].facts.routeCardVisible > 0 &&
        byId['imagery-failure'].pageErrors.length === 0,
      detail: 'aborted texture request falls back while expected network errors are recorded',
    },
    {
      id: 'storage-restricted',
      pass:
        !byId['storage-restricted'].facts.fallbackVisible &&
        byId['storage-restricted'].actions.themeAfterToggle === 'dark' &&
        byId['storage-restricted'].pageErrors.length === 0,
      detail: 'theme toggle works when localStorage and sessionStorage throw',
    },
    {
      id: 'cookies-blocked',
      pass:
        !byId['cookies-blocked'].facts.fallbackVisible &&
        byId['cookies-blocked'].actions.themeAfterToggle === 'dark' &&
        String(byId['cookies-blocked'].actions.crossSiteHrefAfter).includes('uiTheme=dark') &&
        byId['cookies-blocked'].pageErrors.length === 0,
      detail: 'cross-site links carry theme through the query when cookies are blocked',
    },
    {
      id: 'storage-restricted-search',
      pass:
        byId['storage-restricted-search'].facts.searchResultCount > 0 &&
        byId['storage-restricted-search'].pageErrors.length === 0,
      detail: 'search still renders results when storage throws',
    },
  ];
  const failed = report.assertions.filter((assertion) => !assertion.pass);
  if (failed.length) {
    console.error(`fault assertion failures: ${failed.map((assertion) => assertion.id).join(', ')}`);
    process.exitCode = 1;
  }

  await writeFile(path.join(outRoot, 'faults.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`wrote ${outRoot}/faults.json`);
}

await main();
