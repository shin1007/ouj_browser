// 動画再生ページで拡張機能が挿入するシェアボタン・前後動画リンク・設定パネルの表示テスト。
const { test, expect } = require('./fixtures');
const { gotoPlayer, setDarkMode } = require('./helpers');

const tvContentId = process.env.OUJ_TEST_TV_CONTENT_ID;
const tvCategoryId = process.env.OUJ_TEST_TV_CONTENT_CATEGORY_ID;
const radioContentId = process.env.OUJ_TEST_RADIO_CONTENT_ID;
const radioCategoryId = process.env.OUJ_TEST_RADIO_CONTENT_CATEGORY_ID;

test.skip(
  !tvContentId || !tvCategoryId,
  '.env に OUJ_TEST_TV_CONTENT_ID / OUJ_TEST_TV_CONTENT_CATEGORY_ID を設定してください（.env.example参照）'
);

// browserContextはワーカー内の全テストで共有されるため、他のspecが変更した
// ダークモード設定が残っていることがある。実行順に依存しないよう固定する。
test.beforeEach(async ({ browserContext, extensionId }) => {
  await setDarkMode(browserContext, extensionId, 'light');
});

test.describe('動画再生ページ（TV）', () => {
  test('シェアボタン', async ({ page }) => {
    await gotoPlayer(page, tvContentId, tvCategoryId);
    const shareButton = page.locator('.video-share-button');
    await shareButton.waitFor({ state: 'visible', timeout: 20000 });
    await expect(shareButton).toHaveScreenshot('player-share-button.png');
  });

  test('前後動画リンク', async ({ page }) => {
    await gotoPlayer(page, tvContentId, tvCategoryId);
    const prevNext = page.locator('#prev-next-links');
    await prevNext.waitFor({ state: 'visible', timeout: 20000 });
    await expect(prevNext).toHaveScreenshot('player-prev-next-links.png');
  });

  test('動画設定パネル', async ({ page }) => {
    await gotoPlayer(page, tvContentId, tvCategoryId);
    const settingsPanel = page.locator('#video-settings-panel');
    await settingsPanel.waitFor({ state: 'visible', timeout: 20000 });
    await expect(settingsPanel).toHaveScreenshot('player-settings-panel.png');
  });
});

test.describe('動画再生ページ（ラジオ）', () => {
  test.skip(
    !radioContentId || !radioCategoryId,
    'ラジオUIのテストは任意です。.env に OUJ_TEST_RADIO_CONTENT_ID / OUJ_TEST_RADIO_CONTENT_CATEGORY_ID を設定すると実行されます'
  );

  test('ラジオ番組オーバーレイ', async ({ page }) => {
    await gotoPlayer(page, radioContentId, radioCategoryId);
    const radioUi = page.locator('#radio-program-ui');
    await radioUi.waitFor({ state: 'visible', timeout: 20000 });
    await expect(radioUi).toHaveScreenshot('player-radio-ui.png');
  });
});
