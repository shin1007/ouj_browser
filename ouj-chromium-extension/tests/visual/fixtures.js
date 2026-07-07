// Chrome拡張機能（src/ 以下）を読み込んだ状態のブラウザコンテキストを提供するfixture。
// MV3拡張機能はheadlessモードでの読み込みが不安定なため、headed(headless:false)で起動する。
// 参考: https://playwright.dev/docs/chrome-extensions
//
// 放送大学のログインセッションはセッションCookie（ブラウザプロセスを終了すると
// 失われる種類）のため、テストごとにブラウザを起動し直す方式では毎回ログインが
// 必要になってしまう。そこで browserContext をworkerスコープにし、同じワーカー内の
// 全テストで同一のブラウザプロセス（＝ログイン済みセッション）を使い回す。
// （Playwright組み込みの"context"フィクスチャはtestスコープ固定で上書きできないため、
// 別名で定義している）
const path = require('path');
const { test: base, chromium } = require('@playwright/test');
const { ensureLoggedIn } = require('./auth');

const EXTENSION_PATH = path.join(__dirname, '..', '..', 'src');

const test = base.extend({
  browserContext: [
    async ({}, use, workerInfo) => {
      const context = await chromium.launchPersistentContext('', {
        headless: false,
        args: [
          `--disable-extensions-except=${EXTENSION_PATH}`,
          `--load-extension=${EXTENSION_PATH}`,
        ],
      });
      // popup.spec.js専用プロジェクトはログイン不要（実サイトへアクセスしないため）。
      if (!workerInfo.project.name.startsWith('popup-')) {
        await ensureLoggedIn(context);
      }
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],
  extensionId: [
    async ({ browserContext }, use) => {
      let [background] = browserContext.serviceWorkers();
      if (!background) {
        background = await browserContext.waitForEvent('serviceworker');
      }
      const extensionId = background.url().split('/')[2];
      await use(extensionId);
    },
    { scope: 'worker' },
  ],
  // 組み込みのpageフィクスチャを、workerスコープのbrowserContextから
  // テストごとに新しいタブを開く形に上書きする。
  page: async ({ browserContext }, use) => {
    const page = await browserContext.newPage();
    await use(page);
    await page.close();
  },
});

module.exports = { test, expect: test.expect };
