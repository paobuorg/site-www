import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const date = new Date().toISOString().slice(0, 10);
const outRoot = process.env.QA_TRACK_OUT ?? path.join(repoRoot, 'evidence', date, 'track');
const toolUrl = 'http://localhost:4423/tools/track-convert/';
const enToolUrl = 'http://localhost:4423/en/tools/track-convert/';

const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RUNUP test" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>hang</name><trkseg>
    <trkpt lat="42.3601" lon="-71.0589"><ele>10</ele></trkpt>
    <trkpt lat="42.3610" lon="-71.0570"><ele>12</ele></trkpt>
    <trkpt lat="42.3620" lon="-71.0550"><ele>15</ele></trkpt>
  </trkseg></trk>
</gpx>`;

const hangingWorker = () => {
  const originalSetTimeout = window.setTimeout;
  window.setTimeout = function (callback, delay, ...args) {
    const adjusted = delay === 30000 ? 700 : delay === 10000 ? 350 : delay;
    return originalSetTimeout.call(this, callback, adjusted, ...args);
  };
  class HangingWorker {
    onmessage = null;
    onerror = null;
    postMessage() {}
    terminate() {
      this.terminated = true;
    }
  }
  Object.defineProperty(window, 'Worker', { configurable: true, value: HangingWorker });
};

async function submit(page) {
  await page.locator('#convert-file').setInputFiles({
    name: 'hang.gpx',
    mimeType: 'application/gpx+xml',
    buffer: Buffer.from(gpx),
  });
  await page.locator('[data-transform-run]').click();
}

async function inspect(page) {
  return page.evaluate(() => {
    const status = document.querySelector('[data-transform-status]');
    const error = document.querySelector('[data-transform-error]');
    const errorText = document.querySelector('[data-transform-error-text]');
    const run = document.querySelector('[data-transform-run]');
    const cancel = document.querySelector('[data-transform-cancel]');
    const progress = document.querySelector('[data-transform-progress]');
    return {
      status: status?.textContent?.trim() ?? '',
      errorVisible: Boolean(error && !error.hidden),
      errorText: errorText?.textContent?.trim() ?? '',
      runDisabled: Boolean(run?.disabled),
      cancelHidden: Boolean(cancel?.hidden),
      progressHidden: Boolean(progress?.hidden),
    };
  });
}

async function runScenario(browser, url, locale) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(hangingWorker);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await submit(page);
  await page.waitForTimeout(430);
  const slow = await inspect(page);
  await page.waitForTimeout(500);
  const timeout = await inspect(page);
  const screenshot = `track-timeout-${locale}.png`;
  await page.screenshot({ path: path.join(outRoot, screenshot) });
  await context.close();
  return {
    locale,
    url,
    slowHint: slow.status,
    slowHintShown: slow.status.length > 0 && slow.status !== timeout.status,
    timeoutStatus: timeout.status,
    timeoutError: timeout.errorText,
    timeoutErrorVisible: timeout.errorVisible,
    timedOut: /超时|too long/i.test(timeout.errorText),
    runEnabledAfterTimeout: !timeout.runDisabled,
    cancelHiddenAfterTimeout: timeout.cancelHidden,
    progressHiddenAfterTimeout: timeout.progressHidden,
    screenshot,
    consoleErrors,
    pageErrors,
  };
}

async function runCancelScenario(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(hangingWorker);
  const page = await context.newPage();
  await page.goto(toolUrl, { waitUntil: 'domcontentloaded' });
  await submit(page);
  await page.waitForTimeout(100);
  await page.locator('[data-transform-cancel]').click();
  await page.waitForTimeout(200);
  const state = await inspect(page);
  await context.close();
  return {
    cancelled: /取消|cancel/i.test(state.status),
    status: state.status,
    errorVisible: state.errorVisible,
    runEnabled: !state.runDisabled,
  };
}

async function main() {
  await mkdir(outRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const scenarios = [await runScenario(browser, toolUrl, 'zh-CN'), await runScenario(browser, enToolUrl, 'en')];
    const cancel = await runCancelScenario(browser);
    const checks = scenarios.flatMap((scenario) => [
      { id: `${scenario.locale}-slow-hint`, pass: scenario.slowHintShown, detail: scenario.slowHint },
      { id: `${scenario.locale}-timeout-text`, pass: scenario.timedOut, detail: scenario.timeoutError },
      { id: `${scenario.locale}-timeout-visible`, pass: scenario.timeoutErrorVisible, detail: scenario.timeoutStatus },
      {
        id: `${scenario.locale}-timeout-reset`,
        pass: scenario.runEnabledAfterTimeout && scenario.cancelHiddenAfterTimeout && scenario.progressHiddenAfterTimeout,
        detail: JSON.stringify({
          runEnabled: scenario.runEnabledAfterTimeout,
          cancelHidden: scenario.cancelHiddenAfterTimeout,
          progressHidden: scenario.progressHiddenAfterTimeout,
        }),
      },
      {
        id: `${scenario.locale}-no-page-errors`,
        pass: scenario.pageErrors.length === 0 && scenario.consoleErrors.length === 0,
        detail: JSON.stringify({ pageErrors: scenario.pageErrors, consoleErrors: scenario.consoleErrors }),
      },
    ]);
    checks.push({
      id: 'cancel-path',
      pass: cancel.cancelled && !cancel.errorVisible && cancel.runEnabled,
      detail: JSON.stringify(cancel),
    });
    const report = {
      generatedAt: new Date().toISOString(),
      browser: `Playwright Chromium ${browser.version()}`,
      note: [
        'A hanging Worker and shortened 10s/30s timers simulate slow processing; no large real file is uploaded.',
        'This verifies the UI timeout/cancel states, not worker CPU performance on a physical device.',
      ],
      scenarios,
      cancel,
      checks,
    };
    await writeFile(path.join(outRoot, 'track-timeout.json'), `${JSON.stringify(report, null, 2)}\n`);
    const failures = checks.filter((check) => !check.pass);
    if (failures.length > 0) {
      console.error(failures.map((failure) => `${failure.id}: ${failure.detail}`).join('\n'));
      process.exitCode = 1;
    } else {
      console.log(`track timeout checks passed (${checks.length})`);
    }
  } finally {
    await browser.close();
  }
}

await main();
