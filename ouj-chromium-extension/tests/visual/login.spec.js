// ログイン画面に拡張機能が挿入する「遷移先案内」バナー（src/page-login.js の
// insertReferTo）の表示テスト。
//
// browserContextはワーカー内の全テストで共有されるため、このテストのために
// 一時的にログアウトさせたら、他のテストに影響しないよう最後にログイン状態へ戻す。
const { test, expect } = require('./fixtures');
const { ensureLoggedIn } = require('./auth');
const { setDarkMode } = require('./helpers');

// browserContextはワーカー内の全テストで共有されるため、他のspecが変更した
// ダークモード設定が残っていることがある。実行順に依存しないよう固定する。
test.beforeEach(async ({ browserContext, extensionId }) => {
  await setDarkMode(browserContext, extensionId, 'light');
});

test('ログイン画面 - 遷移先案内バナー', async ({ browserContext, page }) => {
  await browserContext.clearCookies();
  await page.goto('https://v.ouj.ac.jp/view/ouj/#/navi/home');

  const loginButton = page.locator('common-header button.login-button');
  await loginButton.waitFor({ state: 'visible', timeout: 15000 });
  await loginButton.click();
  await page.waitForURL(/sso\.ouj\.ac\.jp\/cas\/login/, { timeout: 15000 });

  await page
    .locator('#ouj-login-redirect-info')
    .waitFor({ state: 'attached', timeout: 15000 });

  await expect(page.locator('#usernameSection')).toHaveScreenshot(
    'login-redirect-info.png'
  );

  await ensureLoggedIn(browserContext);
});
