// 各specファイルで共通に使うナビゲーション・待機・ダークモード切替のヘルパー。
// セレクタは src/menu/menu.js, src/content.js, src/utils/helpers.js の実装に合わせている。
const { expect } = require('@playwright/test');

const BASE_URL = 'https://v.ouj.ac.jp/view/ouj/#';

// content.js の main() は拡張機能が有効なすべてのページで insertLeftMenu() を
// 呼び出し、拡張機能メニュー（aria-label="拡張機能"）を挿入する。
// これの出現を「拡張機能の初期化完了」の合図として利用する。
async function waitForExtensionReady(page) {
  await page
    .locator('ion-list[aria-label="拡張機能"]')
    .first()
    .waitFor({ state: 'attached', timeout: 15000 });
}

// 狭い画面幅（モバイル）ではサイドメニューが折りたたまれ、代わりにヘッダー下の
// 「MENU」トグル（ion-toolbar.menu-toolbar）をクリックしてポップオーバーとして
// 開く必要がある。デスクトップ幅では拡張機能メニューが常時表示されているため、
// その場合は何もしない。
async function ensureSideMenuOpen(page) {
  const visibleMenu = page.locator('ion-list[aria-label="拡張機能"]:visible');
  if ((await visibleMenu.count()) > 0) {
    return;
  }
  const menuToggle = page.locator('ion-toolbar.menu-toolbar');
  if ((await menuToggle.count()) > 0) {
    await menuToggle.first().click();
    await visibleMenu.first().waitFor({ state: 'visible', timeout: 15000 });
  }
}

async function gotoHome(page) {
  await page.goto(`${BASE_URL}/navi/home`);
  await waitForExtensionReady(page);
}

async function gotoSeriesSelect(page, categoryId) {
  await page.goto(`${BASE_URL}/navi/vod?ca=${categoryId}`);
  await waitForExtensionReady(page);
}

async function gotoPlayer(page, contentId, categoryId) {
  // ct=V（コンテンツ種別=動画）が無いとサイト側が「指定したコンテンツはありません」
  // として弾く。拡張機能自身のURL生成（menu-history.js, menu-recommendation.js）
  // でも常にct=Vが付与されている。
  await page.goto(
    `${BASE_URL}/navi/player?co=${contentId}&ct=V&ca=${categoryId}`
  );
  await waitForExtensionReady(page);
}

// ポップアップページ（chrome-extension://<id>/popup/popup.html）で表示テーマを
// 切り替える。実際のユーザー操作と同じ経路（chrome.storage.onChanged）を通すため、
// content.js側のdark-mode.jsが反応するまで少し待つ。
async function setDarkMode(context, extensionId, theme) {
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await popupPage.selectOption('#theme-select', theme);
  await popupPage.waitForTimeout(300);
  await popupPage.close();
}

const MENU_ITEM_IDS = {
  favorites: 'favorites-menu-item',
  history: 'history-menu-item',
  recommend: 'recommend-menu-item',
  year: 'year-menu-item',
};

// お気に入り/履歴/おすすめ/年度別パネル（#ouj-native-overlay）を開き、
// 一覧の非同期読み込みが完了するまで待つ。
async function openMenuOverlay(page, kind) {
  const itemId = MENU_ITEM_IDS[kind];
  if (!itemId) {
    throw new Error(`未知のメニュー種別です: ${kind}`);
  }
  await ensureSideMenuOpen(page);
  // LEFT_SELECTOR（常設サイドメニュー）とPOPOVER_SELECTOR（モバイル用）の
  // どちらか実際に表示されている方をクリックする。
  await page.locator(`#${itemId}:visible`).first().click();

  const overlay = page.locator('#ouj-native-overlay');
  await overlay.waitFor({ state: 'visible', timeout: 15000 });
  await expect(overlay.getByText('読み込み中')).toHaveCount(0, {
    timeout: 15000,
  });
  return overlay;
}

module.exports = {
  BASE_URL,
  waitForExtensionReady,
  ensureSideMenuOpen,
  gotoHome,
  gotoSeriesSelect,
  gotoPlayer,
  setDarkMode,
  openMenuOverlay,
};
