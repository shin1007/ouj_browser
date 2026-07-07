require('dotenv/config');
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/visual',
  // 実サイト（放送大学）へのアクセスを伴うため、多重アクセスや再試行での
  // 余計なリクエストを避ける。
  workers: 1,
  retries: 0,
  fullyParallel: false,
  reporter: 'html',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    actionTimeout: 15000,
    navigationTimeout: 30000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    // popup.spec.jsは実サイトへのログインが不要なため専用プロジェクトで実行する
    // （tests/visual/fixtures.js 側でプロジェクト名を見てログイン処理をスキップする）。
    {
      name: 'popup-desktop',
      testMatch: /popup\.spec\.js/,
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'popup-mobile',
      testMatch: /popup\.spec\.js/,
      use: { viewport: { width: 390, height: 844 } },
    },
    {
      name: 'desktop',
      testMatch: /.*\.spec\.js/,
      testIgnore: /popup\.spec\.js/,
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'mobile',
      testMatch: /.*\.spec\.js/,
      testIgnore: /popup\.spec\.js/,
      use: {
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
