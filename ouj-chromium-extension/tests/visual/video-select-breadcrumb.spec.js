// 動画一覧ページ（video-select）で拡張機能が挿入するパンくずのお気に入りボタン
// （src/utils/breadcrumbs.js の addFavoriteButtonToBreadCrumbs）の表示テスト。
const { test, expect } = require('./fixtures');
const { gotoSeriesSelect, setDarkMode } = require('./helpers');

const categoryId = process.env.OUJ_TEST_MULTI_VIDEO_CATEGORY_ID;

test.skip(
  !categoryId,
  '.env に OUJ_TEST_MULTI_VIDEO_CATEGORY_ID を設定してください（.env.example参照）'
);

// browserContextはワーカー内の全テストで共有されるため、他のspecが変更した
// ダークモード設定が残っていることがある。実行順に依存しないよう固定する。
test.beforeEach(async ({ browserContext, extensionId }) => {
  await setDarkMode(browserContext, extensionId, 'light');
});

test('動画一覧 - パンくずのお気に入りボタン', async ({ page }) => {
  await gotoSeriesSelect(page, categoryId);

  const favoriteBtn = page.locator('#favorite-button');
  await favoriteBtn.waitFor({ state: 'visible', timeout: 15000 });

  const breadcrumbArea = favoriteBtn.locator('xpath=ancestor::li[1]');
  await expect(breadcrumbArea).toHaveScreenshot(
    'video-select-breadcrumb-favorite.png'
  );
});
