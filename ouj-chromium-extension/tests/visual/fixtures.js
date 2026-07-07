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

// DRM(Widevine)保護された動画を実際にデコードして検証したいプロジェクト(名前が
// drm- で始まるもの)専用の起動オプション。理由:
// 1. Playwright付属のChromiumはWidevine CDMを同梱していないため、DRM動画は
//    常にMEDIA_ERR_SRC_NOT_SUPPORTEDで再生に失敗する。
// 2. 実Google Chrome(Stable)はコマンドライン経由のアンパックド拡張機能読み込み
//    (--load-extension)自体を許可しない(デベロッパーモードやポリシーとも無関係に
//    無視される)。一方Microsoft Edge(同じChromiumベースのStable版)は許可される。
// 3. Playwrightはデフォルトで--disable-component-updateを付与するが、これが
//    あるとChromeに同梱済みのWidevine CDMがプロファイルに登録されず、結局DRM
//    再生に失敗する。ignoreDefaultArgsで外す必要がある。
// 通常の(動画デコードを必要としない)スクリーンショットテストは、既存のベースライン
// 画像がChromiumのフォントレンダリングに基づいているため、そのままChromiumを使う。
function isDrmProject(projectName) {
  return projectName.startsWith('drm-');
}

const test = base.extend({
  browserContext: [
    async ({}, use, workerInfo) => {
      const launchOptions = {
        headless: false,
        args: [
          `--disable-extensions-except=${EXTENSION_PATH}`,
          `--load-extension=${EXTENSION_PATH}`,
        ],
      };
      if (isDrmProject(workerInfo.project.name)) {
        launchOptions.channel = 'msedge';
        launchOptions.ignoreDefaultArgs = ['--disable-extensions', '--disable-component-update'];
      }
      const context = await chromium.launchPersistentContext('', launchOptions);
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
