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

  // お気に入り登録状態（塗りつぶし★）の見た目を検証する。ブラウザプロファイルは
  // ワーカーごとに新規作成され、お気に入りは常に未登録から始まるため、明示的に登録する。
  const icon = favoriteBtn.locator('ion-icon');
  if ((await icon.getAttribute('name')) !== 'star') {
    await favoriteBtn.click();
    await expect(icon).toHaveAttribute('name', 'star');
    // クリックでマウスがボタン上に残るとホバー背景（onmouseoverハンドラ）が
    // ついたままスクリーンショットに写ってしまうため、無関係な場所にホバーし直す。
    await page.locator('body').hover({ position: { x: 0, y: 0 } });
  }

  // パンくずのタイトル文字列（可変幅の実データ）はフォント確定やIonicの
  // ページ遷移アニメーションの影響で表示直後は座標が揺れることがある。
  // 座標が数回連続で変化しなくなるまで待ってから、その位置でclipを固定する。
  await page.evaluate(() => document.fonts.ready);
  let box = await favoriteBtn.boundingBox();
  for (let stableCount = 0; stableCount < 3; ) {
    await page.waitForTimeout(200);
    const nextBox = await favoriteBtn.boundingBox();
    if (nextBox.x === box.x && nextBox.y === box.y) {
      stableCount++;
    } else {
      stableCount = 0;
    }
    box = nextBox;
  }

  // ボタンの実際の幅は27.78pxのような端数になっており、要素スクリーンショットは
  // 撮影のたびに端数の丸め方が28px/29pxでぶれて失敗することがある。そのため、
  // 座標を自前で整数に丸めた矩形をpage.screenshotのclipで指定して撮影し、
  // 丸め方のぶれを避ける。少し余白を持たせて、フォーカスリングなどが
  // 切れないようにする。
  const padding = 3;
  const clip = {
    x: Math.floor(box.x) - padding,
    y: Math.floor(box.y) - padding,
    width: Math.ceil(box.width) + padding * 2,
    height: Math.ceil(box.height) + padding * 2,
  };

  // パンくず全体（実サイトの動画タイトル等を含む<li>）を対象にすると、拡張機能と
  // 無関係なテキストのフォント描画差でも失敗しうるため、ボタン周辺のみを比較する。
  await expect(page).toHaveScreenshot('video-select-breadcrumb-favorite.png', {
    clip,
  });
});
