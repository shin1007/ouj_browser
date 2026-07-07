// 科目一覧ページ（series-select）で拡張機能が挿入するお気に入りボタン
// （src/page-course-select.js の addFavoriteButtonsToCategoryList）の表示テスト。
const { test, expect } = require('./fixtures');
const { gotoSeriesSelect, setDarkMode } = require('./helpers');

const categoryId = process.env.OUJ_TEST_SERIES_CATEGORY_ID;

test.skip(
  !categoryId,
  '.env に OUJ_TEST_SERIES_CATEGORY_ID を設定してください（.env.example参照）'
);

// browserContextはワーカー内の全テストで共有されるため、他のspec（home.spec.js等）が
// 変更したダークモード設定が残っていることがある。このテストはテーマを検証対象に
// していないため、実行順に依存しないよう明示的にlightへ固定する。
test.beforeEach(async ({ browserContext, extensionId }) => {
  await setDarkMode(browserContext, extensionId, 'light');
});

test('科目一覧 - お気に入りボタン', async ({ page }) => {
  await gotoSeriesSelect(page, categoryId);

  const favoriteBtn = page.locator('.favorite-btn').first();
  await favoriteBtn.waitFor({ state: 'visible', timeout: 15000 });

  // 未登録状態
  await expect(favoriteBtn).toHaveScreenshot('category-favorite-btn-off.png');

  // 登録状態
  await favoriteBtn.click();
  await expect(favoriteBtn).toHaveScreenshot('category-favorite-btn-on.png');
});
