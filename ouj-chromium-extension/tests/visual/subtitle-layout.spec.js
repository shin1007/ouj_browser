// 字幕を動画の外に出す機能(preventCaptionShrink / video-subtitle-size.js)が
// 他要素(タイトル・前後動画リンク・設定パネル)と重ならないかを、実DRM動画上で検証する。
// DRM動画のデコードにはWidevine CDMが必要なため、このspecは専用プロジェクト
// (drm-desktop/drm-mobile、channel:'msedge')でのみ実行される
// (playwright.config.js / tests/visual/fixtures.js 参照)。
const { test, expect } = require('./fixtures');
const { gotoPlayer, setDarkMode } = require('./helpers');

const tvContentId = process.env.OUJ_TEST_TV_CONTENT_ID;
const tvCategoryId = process.env.OUJ_TEST_TV_CONTENT_CATEGORY_ID;
const captionContentId = process.env.OUJ_TEST_CAPTION_CONTENT_ID;
const captionCategoryId = process.env.OUJ_TEST_CAPTION_CONTENT_CATEGORY_ID;

test.skip(
  !tvContentId || !tvCategoryId,
  '.env に OUJ_TEST_TV_CONTENT_ID / OUJ_TEST_TV_CONTENT_CATEGORY_ID を設定してください（.env.example参照）'
);

test.beforeEach(async ({ browserContext, extensionId }) => {
  await setDarkMode(browserContext, extensionId, 'light');
});

async function waitForVideoPlaying(page) {
  await page.waitForFunction(() => {
    const v = document.querySelector('.theoplayer-container video');
    return !!(v && v.videoWidth > 0);
  }, { timeout: 20000 });
}

async function waitForCaptionCue(page, timeout = 20000) {
  return page
    .waitForFunction(() => {
      const el = document.querySelector('.cls-sami-display .cls-sami-display-div');
      return !!(el && el.querySelector('[start]'));
    }, { timeout })
    .then(() => true)
    .catch(() => false);
}

// upperの下端がlowerの上端より下にはみ出していないか(重なっていないか)を確認する。
async function expectNoOverlap(page, upperSelector, lowerSelector) {
  const rects = await page.evaluate(
    ([upperSel, lowerSel]) => {
      const upper = document.querySelector(upperSel);
      const lower = document.querySelector(lowerSel);
      return {
        upperBottom: upper ? upper.getBoundingClientRect().bottom : null,
        lowerTop: lower ? lower.getBoundingClientRect().top : null,
      };
    },
    [upperSelector, lowerSelector]
  );
  if (rects.upperBottom == null || rects.lowerTop == null) return;
  expect(rects.upperBottom).toBeLessThanOrEqual(rects.lowerTop + 1);
}

test.describe('字幕表示時のレイアウト(動画の外に字幕を表示する機能)', () => {
  test('通常のDRM動画で他要素と重ならない', async ({ page }) => {
    await gotoPlayer(page, tvContentId, tvCategoryId);
    await waitForVideoPlaying(page);
    await page.waitForTimeout(1000);

    await expect(page.locator('html')).toHaveClass(/ouj-caption-no-shrink/);
    await expectNoOverlap(page, '#player-area', '#video-settings-panel');
    await expectNoOverlap(page, '#player-area', '#prev-next-links');
    await expectNoOverlap(page, '#player-area', '#content-detail-area > div.title');
  });

  test('設定OFFにすると従来レイアウトに戻り、ONに戻すと再適用される', async ({ page }) => {
    await gotoPlayer(page, tvContentId, tvCategoryId);
    await waitForVideoPlaying(page);

    const checkbox = page.locator('#prevent-caption-shrink');
    await checkbox.waitFor({ state: 'visible', timeout: 15000 });

    await checkbox.uncheck();
    await page.waitForTimeout(500);
    await expect(page.locator('html')).not.toHaveClass(/ouj-caption-no-shrink/);

    await checkbox.check();
    await page.waitForTimeout(500);
    await expect(page.locator('html')).toHaveClass(/ouj-caption-no-shrink/);
    await expectNoOverlap(page, '#player-area', '#video-settings-panel');
  });

  test('ダークモードでも他要素と重ならない', async ({ page, browserContext, extensionId }) => {
    await setDarkMode(browserContext, extensionId, 'dark');
    await gotoPlayer(page, tvContentId, tvCategoryId);
    await waitForVideoPlaying(page);
    await page.waitForTimeout(1000);
    await expectNoOverlap(page, '#player-area', '#video-settings-panel');
  });

  test.describe('実字幕トラック付きコンテンツ', () => {
    test.skip(
      !captionContentId || !captionCategoryId,
      '.env に OUJ_TEST_CAPTION_CONTENT_ID / OUJ_TEST_CAPTION_CONTENT_CATEGORY_ID を設定すると実行されます（.env.example参照）'
    );

    test('字幕が表示された状態で他要素と重ならない', async ({ page }) => {
      await gotoPlayer(page, captionContentId, captionCategoryId);
      await waitForVideoPlaying(page);
      // 字幕キューは再生位置が進むにつれてDOMに挿入されるため、実際に再生を進める必要がある
      await page.evaluate(() => {
        const v = document.querySelector('.theoplayer-container video');
        if (v) { v.muted = true; v.play().catch(() => {}); }
      });

      const hasCue = await waitForCaptionCue(page, 20000);
      expect(hasCue, '字幕キューが一定時間内に出現しませんでした').toBe(true);

      await expectNoOverlap(page, '#player-area', '#video-settings-panel');
      await expectNoOverlap(page, '#player-area', '#prev-next-links');
      await expectNoOverlap(page, '#player-area', '#content-detail-area > div.title');

      // 字幕の高さぶん、#player-areaが動画だけの高さより広がっていることを確認する
      const heights = await page.evaluate(() => {
        const playerArea = document.querySelector('#player-area');
        const video = document.querySelector('.theoplayer-container video');
        return {
          playerAreaHeight: playerArea ? playerArea.getBoundingClientRect().height : 0,
          videoHeight: video ? video.getBoundingClientRect().height : 0,
        };
      });
      expect(heights.playerAreaHeight).toBeGreaterThan(heights.videoHeight);
    });
  });
});
