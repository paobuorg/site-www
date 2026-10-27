import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const date = new Date().toISOString().slice(0, 10);
const outRoot = process.env.QA_CROSS_SITE_OUT ?? path.join(repoRoot, 'evidence', date, 'cross-site');

const previewRoutes = process.env.QA_CROSS_SITE_START ?? 'http://localhost:4421';
const devRoutes = 'http://localhost:4321';
const knowledge = 'http://localhost:4322';
const tools = 'http://localhost:4323';

const productionHosts = new Map([
  ['paobu.org', 'http://localhost:4421'],
  ['learn.paobu.org', 'http://localhost:4422'],
  ['tools.paobu.org', 'http://localhost:4423'],
]);

async function mapProductionLinks(context) {
  await context.route(/^https:\/\/(?:paobu\.org|learn\.paobu\.org|tools\.paobu\.org)\//, async (route) => {
    const url = new URL(route.request().url());
    const localOrigin = productionHosts.get(url.hostname);
    if (!localOrigin) {
      await route.continue();
      return;
    }
    const target = `${localOrigin}${url.pathname}${url.search}`;
    const response = await route.fetch({ url: target });
    await route.fulfill({ response });
  });
}

async function usesProductionLinks() {
  const html = await (await fetch(`${previewRoutes}/zh-CN/`)).text();
  return html.includes('https://learn.paobu.org/');
}

function routedOrigins(productionLinks) {
  return productionLinks
    ? {
        routes: 'https://paobu.org',
        knowledge: 'https://learn.paobu.org',
        tools: 'https://tools.paobu.org',
      }
    : { routes: devRoutes, knowledge, tools };
}

function hostMatches(host, productionLinks, productionHost, localPort) {
  return productionLinks ? host.startsWith(productionHost) : host.startsWith(`localhost:${localPort}`);
}

const themeAtLoad = () => {
  window.__paobuThemeAtLoad = null;
  document.addEventListener('DOMContentLoaded', () => {
    window.__paobuThemeAtLoad = document.documentElement.dataset.theme ?? null;
  });
};

async function state(page) {
  return page.evaluate(() => ({
    url: location.href,
    host: location.hostname + ':' + location.port,
    path: location.pathname,
    lang: document.documentElement.lang,
    theme: document.documentElement.dataset.theme,
    preference: document.documentElement.dataset.themePreference,
    themeAtLoad: window.__paobuThemeAtLoad ?? null,
    h1: document.querySelector('h1')?.textContent?.trim() ?? '',
    active: document.querySelector('.primary-nav [aria-current="page"]')?.textContent?.trim() ?? '',
  }));
}

async function waitReady(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
}

async function runMainFlow(browser, productionLinks) {
  const origins = routedOrigins(productionLinks);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  if (productionLinks) await mapProductionLinks(context);
  await context.addInitScript(themeAtLoad);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`${page.url()} :: ${message.text()}`);
  });
  page.on('pageerror', (error) => pageErrors.push(`${page.url()} :: ${String(error)}`));
  const startUrl = productionLinks ? `${origins.routes}/zh-CN/` : `${previewRoutes}/zh-CN/`;
  await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
  await waitReady(page);
  const start = await state(page);
  await page.locator('[data-theme-toggle]').click();
  await page.waitForTimeout(250);
  const afterToggle = await state(page);
  const themeCookie = (await context.cookies()).find((cookie) => cookie.name === 'paobu_theme')?.value ?? null;

  await page.locator('.primary-nav a').filter({ hasText: '知识' }).first().click();
  await page.waitForURL(`${origins.knowledge}/zh-CN/`);
  await waitReady(page);
  const knowledgeZh = await state(page);

  await page.locator('[data-language-switch]').click();
  await page.waitForURL(`${origins.knowledge}/en/`);
  await waitReady(page);
  const knowledgeEn = await state(page);
  const localeCookie = (await context.cookies()).find((cookie) => cookie.name === 'paobu_locale')?.value ?? null;

  await page.locator('.primary-nav a').filter({ hasText: 'Tools' }).first().click();
  await page.waitForURL(`${origins.tools}/en/`);
  await waitReady(page);
  const toolsEn = await state(page);

  await page.locator('.primary-nav a').filter({ hasText: 'Routes' }).first().click();
  await page.waitForURL(`${origins.routes}/en/`);
  await waitReady(page);
  const backToRoutes = await state(page);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitReady(page);
  const afterReload = await state(page);

  await page.goBack({ waitUntil: 'domcontentloaded' });
  await waitReady(page);
  const afterBack = await state(page);

  await context.close();
  return {
    start,
    afterToggle,
    themeCookie,
    knowledgeZh,
    knowledgeEn,
    localeCookie,
    toolsEn,
    backToRoutes,
    afterReload,
    afterBack,
    consoleErrors,
    pageErrors,
  };
}

async function runCookieBlockedFlow(browser, productionLinks) {
  const origins = routedOrigins(productionLinks);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  if (productionLinks) await mapProductionLinks(context);
  await context.addInitScript(themeAtLoad);
  await context.addInitScript(() => {
    Object.defineProperty(Document.prototype, 'cookie', {
      configurable: true,
      get: () => '',
      set: () => {},
    });
  });
  const page = await context.newPage();
  const startUrl = productionLinks ? `${origins.routes}/zh-CN/` : `${previewRoutes}/zh-CN/`;
  await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
  await waitReady(page);
  await page.locator('[data-theme-toggle]').click();
  await page.waitForTimeout(250);
  const beforeClick = await state(page);
  const link = page.locator('.primary-nav a').filter({ hasText: '知识' }).first();
  const hrefBeforeClick = await link.getAttribute('href');
  await link.click();
  await page.waitForURL(`${origins.knowledge}/zh-CN/`);
  await waitReady(page);
  const afterClick = await state(page);
  await context.close();
  return { beforeClick, hrefBeforeClick, afterClick };
}

async function main() {
  await mkdir(outRoot, { recursive: true });
  const productionLinks = await usesProductionLinks();
  const browser = await chromium.launch({ headless: true });
  try {
    const main = await runMainFlow(browser, productionLinks);
    const cookieBlocked = await runCookieBlockedFlow(browser, productionLinks);
    const checks = [
      {
        id: 'theme-toggle-dark',
        pass: main.afterToggle.theme === 'dark' && main.afterToggle.preference === 'dark',
        detail: main.afterToggle,
      },
      {
        id: 'theme-cookie-shared',
        pass: main.themeCookie === 'dark',
        detail: main.themeCookie,
      },
      {
        id: 'knowledge-keeps-zh-theme',
        pass:
          hostMatches(main.knowledgeZh.host, productionLinks, 'learn.paobu.org', 4422) &&
          main.knowledgeZh.lang === 'zh-CN' &&
          main.knowledgeZh.theme === 'dark' &&
          main.knowledgeZh.themeAtLoad === 'dark',
        detail: main.knowledgeZh,
      },
      {
        id: 'language-switch-en',
        pass:
          main.knowledgeEn.path === '/en/' &&
          main.knowledgeEn.lang === 'en' &&
          main.knowledgeEn.theme === 'dark' &&
          main.localeCookie === 'en',
        detail: { page: main.knowledgeEn, localeCookie: main.localeCookie },
      },
      {
        id: 'tools-keeps-en-theme',
        pass:
          hostMatches(main.toolsEn.host, productionLinks, 'tools.paobu.org', 4423) &&
          main.toolsEn.lang === 'en' &&
          main.toolsEn.theme === 'dark' &&
          main.toolsEn.themeAtLoad === 'dark',
        detail: main.toolsEn,
      },
      {
        id: 'routes-return-keeps-en-theme',
        pass:
          hostMatches(main.backToRoutes.host, productionLinks, 'paobu.org', 4321) &&
          main.backToRoutes.lang === 'en' &&
          main.backToRoutes.theme === 'dark',
        detail: main.backToRoutes,
      },
      {
        id: 'reload-keeps-state',
        pass: main.afterReload.theme === 'dark' && main.afterReload.lang === 'en',
        detail: main.afterReload,
      },
      {
        id: 'history-back-keeps-state',
        pass:
          hostMatches(main.afterBack.host, productionLinks, 'tools.paobu.org', 4423) &&
          main.afterBack.theme === 'dark',
        detail: main.afterBack,
      },
      {
        id: 'cookie-blocked-theme-query',
        pass: cookieBlocked.afterClick.theme === 'dark' && cookieBlocked.afterClick.themeAtLoad === 'dark',
        detail: cookieBlocked,
      },
      {
        id: 'cross-site-href-uses-production-origin',
        pass: !productionLinks || cookieBlocked.hrefBeforeClick?.startsWith('https://learn.paobu.org/'),
        detail: { productionLinks, href: cookieBlocked.hrefBeforeClick },
      },
      {
        id: 'no-page-or-console-errors',
        pass: main.pageErrors.length === 0 && main.consoleErrors.length === 0,
        detail: { pageErrors: main.pageErrors, consoleErrors: main.consoleErrors },
      },
    ];
    const report = {
      generatedAt: new Date().toISOString(),
      browser: `Playwright Chromium ${browser.version()}`,
      note: [
        productionLinks
          ? 'The built pages carry https://paobu.org, https://learn.paobu.org and https://tools.paobu.org links. Each production host is mapped to its local 4421/4422/4423 preview server so the real production hrefs are exercised without DNS.'
          : 'Cross-site navigation uses the local dev origins from .env (4321/4322/4323), while the starting page is the 4421 preview.',
        'themeAtLoad is measured at DOMContentLoaded; it does not prove there is no single-frame paint before hydration.',
      ],
      main,
      cookieBlocked,
      checks,
    };
    await writeFile(path.join(outRoot, 'cross-site.json'), `${JSON.stringify(report, null, 2)}\n`);
    const failures = checks.filter((check) => !check.pass);
    if (failures.length > 0) {
      console.error(failures.map((failure) => `${failure.id}: ${JSON.stringify(failure.detail)}`).join('\n'));
      process.exitCode = 1;
    } else {
      console.log(`cross-site checks passed (${checks.length})`);
    }
  } finally {
    await browser.close();
  }
}

await main();
