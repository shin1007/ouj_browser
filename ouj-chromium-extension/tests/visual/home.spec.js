// ホームページで拡張機能が挿入する左メニュー・ヘッダーのダークモード切替/
// ヘッダー折り畳みトグルの表示テスト。
const { test, expect } = require('./fixtures');
const { gotoHome, setDarkMode, ensureSideMenuOpen } = require('./helpers');

for (const theme of ['light', 'dark']) {
  test(`ホーム画面 - 拡張機能メニュー - ${theme}モード`, async ({
    browserContext,
    page,
    extensionId,
  }) => {
    await setDarkMode(browserContext, extensionId, theme);
    await gotoHome(page);
    await ensureSideMenuOpen(page);

    await expect(
      page.locator('ion-list[aria-label="拡張機能"]:visible').first()
    ).toHaveScreenshot(`home-menu-${theme}.png`);
  });

  test(`ホーム画面 - ヘッダートグル - ${theme}モード`, async ({
    browserContext,
    page,
    extensionId,
  }) => {
    await setDarkMode(browserContext, extensionId, theme);
    await gotoHome(page);

    const toolbar = page.locator('.toolbar-content:visible').first();
    await expect(toolbar).toHaveScreenshot(`home-header-toolbar-${theme}.png`);
  });
}
