// 拡張機能メニューから開くお気に入り/履歴/年度別パネル（#ouj-native-overlay）の表示テスト。
// 一覧の中身（コース名・進捗等）は実データ依存で経時変化するため、
// パネルの構造（枠・見出し・空状態メッセージ等）の崩れ検知を主目的とする。
const { test, expect } = require('./fixtures');
const { gotoHome, setDarkMode, openMenuOverlay } = require('./helpers');

const PANELS = [
  { kind: 'favorites', label: 'お気に入りパネル' },
  { kind: 'history', label: '履歴パネル' },
  { kind: 'year', label: '年度別パネル' },
];

for (const theme of ['light', 'dark']) {
  test.describe(`${theme}モード`, () => {
    for (const { kind, label } of PANELS) {
      test(label, async ({ browserContext, page, extensionId }) => {
        await setDarkMode(browserContext, extensionId, theme);
        await gotoHome(page);

        const overlay = await openMenuOverlay(page, kind);
        await expect(overlay).toHaveScreenshot(
          `menu-overlay-${kind}-${theme}.png`,
          {
            mask: [page.locator('.progress-bar-container')],
          }
        );
      });
    }
  });
}
