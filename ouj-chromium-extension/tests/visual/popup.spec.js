// ポップアップページ（src/popup/popup.html）はログイン不要で単体表示できるため、
// 実サイトへは一切アクセスせずにスクリーンショットを撮影する。
const { test, expect } = require('./fixtures');

const THEMES = ['auto', 'light', 'dark'];

for (const theme of THEMES) {
  test(`ポップアップ - テーマ:${theme} - アコーディオン閉`, async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page.selectOption('#theme-select', theme);
    await page.waitForTimeout(200);
    await expect(page.locator('#popup-container')).toHaveScreenshot(
      `popup-${theme}-closed.png`
    );
  });

  test(`ポップアップ - テーマ:${theme} - ライセンスアコーディオン開`, async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page.selectOption('#theme-select', theme);
    await page.click('#licenses-header');
    await page.waitForTimeout(200);
    await expect(page.locator('#popup-container')).toHaveScreenshot(
      `popup-${theme}-open.png`
    );
  });
}
