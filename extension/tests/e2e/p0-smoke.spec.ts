import { test, expect, chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const EXTENSION_PATH = path.resolve(process.cwd(), 'out');
const SYSTEM_CHROMIUM = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium';

function startFixtureServer(): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><html lang="en"><body><main><h1>Fixture Page</h1><button>Click me</button></main></body></html>');
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}

test('extension loads, passes SW<->content ping, and passes axe on all UI surfaces', async () => {
  const { server, url } = await startFixtureServer();
  const context = await chromium.launchPersistentContext('', {
    ...(fs.existsSync(SYSTEM_CHROMIUM) ? { executablePath: SYSTEM_CHROMIUM } : {}),
    headless: true,
    args: [
      '--headless=new',
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  try {
    let [sw] = context.serviceWorkers();
    if (!sw) {
      sw = await context.waitForEvent('serviceworker');
    }
    const extensionId = new URL(sw.url()).host;

    const webPage = await context.newPage();
    await webPage.goto(url, { waitUntil: 'load' });
    await webPage.bringToFront();
    await webPage.waitForTimeout(250);

    // Verify SW -> content script ping round-trip
    const pingResult = await sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (!tab.id) continue;
        try {
          const res = await chrome.tabs.sendMessage(tab.id, {
            v: 1,
            id: 'test-ping',
            type: 'content/ping',
            payload: {},
            ts: Date.now(),
          });
          if (res?.ok) return res;
        } catch {
          // Skip extension/non-injected tabs (e.g. onboarding.html)
        }
      }
      return { ok: false, reason: 'no_responding_content_tab' };
    });

    expect(pingResult).toMatchObject({ ok: true, runtime: 'content' });

    // Check popup, options, onboarding, and sidepanel render & pass axe WCAG 2.2 AA
    for (const route of ['popup.html', 'options.html', 'onboarding.html', 'sidepanel.html']) {
      const uiPage = await context.newPage();
      await uiPage.goto(`chrome-extension://${extensionId}/${route}`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(uiPage.locator('h1')).toBeVisible();

      const axeResults = await new AxeBuilder({ page: uiPage })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const seriousOrCritical = axeResults.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical'
      );
      expect(seriousOrCritical, `Axe violations on ${route}`).toEqual([]);
      await uiPage.close();
    }
  } finally {
    await context.close();
    server.close();
  }
});
