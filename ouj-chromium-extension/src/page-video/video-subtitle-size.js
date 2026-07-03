// 字幕表示時に動画が縮小されないようにする機能のON/OFFを切り替える
// 動画は常に本来のアスペクト比のまま表示し(video-subtitle-size.cssが担当)、
// 字幕パネルはその下に普通のブロックとして並ぶ。ここではプレイヤー全体
// (#player-area)の高さを、動画の実測の高さ＋字幕の実測の高さに合わせて
// 広げることで、動画を縮小せずに字幕を下に追加表示する。

(function () {
  const PLAYER_AREA_SELECTOR = '#player-area';
  let enabled = false;
  let observer = null;
  let resizeListenerAdded = false;
  let syncScheduled = false;

  // 字幕画像の「高さ ÷ コンテナ幅」の比率。これまで見た中の最大値を記録し、
  // 常にその高さぶんを確保する(一度確保した高さより縮めない)ことで、
  // 行数が変わるたびに高さがブレるのを防ぐ。
  // ただし、複数の話者が同時に表示される瞬間など測定がおかしくなりやすい
  // タイミングで異常値を拾ってしまうと、縮めない仕組みのせいでそれがずっと
  // 居座ってしまうため、明らかに字幕としてありえない大きさは採用しない。
  const MAX_CAPTION_RATIO = 0.35;
  let maxObservedCaptionRatio = 0;

  function getVisibleVideo(root) {
    const videos = root.querySelectorAll('video');
    for (const video of videos) {
      if (getComputedStyle(video).display !== 'none') return video;
    }
    return null;
  }

  function resetLayout(container) {
    if (!container) return;
    container.style.removeProperty('height');
    const captionEl = container.querySelector('.cls-sami-display');
    if (captionEl) {
      captionEl.style.removeProperty('min-height');
      captionEl.style.removeProperty('max-height');
    }
  }

  // これまで観測した字幕画像の高さの中の最大値を確保する高さとして採用する
  // (MAX_CAPTION_RATIOを超える明らかな異常値は無視する)
  function getReservedCaptionHeight(rawHeight, containerWidth) {
    const ratio = Math.min(rawHeight / containerWidth, MAX_CAPTION_RATIO);
    if (ratio > maxObservedCaptionRatio) {
      maxObservedCaptionRatio = ratio;
    }
    return maxObservedCaptionRatio * containerWidth;
  }

  function syncCaptionLayout() {
    if (!enabled) return;
    const container = document.querySelector(PLAYER_AREA_SELECTOR);
    if (!container) return;

    const theoContainer = container.querySelector('.theoplayer-container');
    const video = theoContainer ? getVisibleVideo(theoContainer) : null;
    const captionEl = container.querySelector('.cls-sami-display');
    // 字幕を包んでいる要素。話者ごとに[start]要素が同時に複数並ぶことがあるため、
    // 個々の画像ではなく、それらをまとめて包むこの要素全体の高さを測る。
    const captionContent = captionEl ? captionEl.querySelector('.cls-sami-display-div') : null;
    const hasActiveCue = captionContent ? !!captionContent.querySelector('[start]') : false;

    if (!theoContainer || !video || !captionContent || !hasActiveCue) {
      resetLayout(container);
      return;
    }

    // 前回設定したmin-height/max-heightが実測値に影響しないよう、測る前に一旦外す
    captionEl.style.removeProperty('min-height');
    captionEl.style.removeProperty('max-height');

    const videoHeight = video.getBoundingClientRect().height;
    const rawCaptionHeight = captionContent.getBoundingClientRect().height;
    if (!videoHeight || !rawCaptionHeight || rawCaptionHeight < 4) {
      resetLayout(container);
      return;
    }

    const reservedCaptionHeight = getReservedCaptionHeight(rawCaptionHeight, theoContainer.clientWidth);

    // 動画＋字幕がその時点の画面(ヘッダーの折りたたみ状態やスクロール位置を
    // 問わず、実際に見えている範囲)からはみ出さないよう、字幕側の高さを
    // 画面残り分に制限する。動画は縮小しない方針のため、削るのは常に字幕側。
    // ヘッダーの折りたたみはresizeイベントを発火させる作りになっているため、
    // 下のresizeリスナーで自動的に再計算される。
    const containerTop = container.getBoundingClientRect().top;
    const availableHeight = Math.max(window.innerHeight - containerTop, 0);
    const maxCaptionHeightForViewport = Math.max(availableHeight - videoHeight, 0);
    const cappedCaptionHeight = Math.min(reservedCaptionHeight, maxCaptionHeightForViewport);

    captionEl.style.setProperty('min-height', Math.round(cappedCaptionHeight) + 'px', 'important');
    captionEl.style.setProperty('max-height', Math.round(cappedCaptionHeight) + 'px', 'important');

    // コントロールバーは動画の時と同じくposition:absolute;bottom:0で
    // 一番下に重ねて表示させる(画面の高さを節約するため、専用のスペースは確保しない)
    const totalHeight = videoHeight + cappedCaptionHeight;
    container.style.setProperty('height', Math.round(totalHeight) + 'px', 'important');
  }

  function scheduleSync() {
    if (syncScheduled) return;
    syncScheduled = true;
    requestAnimationFrame(() => {
      syncScheduled = false;
      syncCaptionLayout();
    });
  }

  function startObserving() {
    window.waitForElement(PLAYER_AREA_SELECTOR, (container) => {
      if (!enabled) return;
      if (observer) observer.disconnect();
      observer = new MutationObserver(scheduleSync);
      // 属性(style/class)は監視しない: 自分自身がheight/min-height/max-heightを
      // 書き換えるため、attributesも見てしまうと無限に再計算がループしてしまう。
      // 字幕の切り替わりは新しい[start]要素の挿入(childList)で検知できる。
      observer.observe(container, {
        childList: true,
        subtree: true,
      });
      syncCaptionLayout();
    });
    if (!resizeListenerAdded) {
      resizeListenerAdded = true;
      window.addEventListener('resize', scheduleSync);
    }
  }

  function applyCaptionShrinkFix(isEnabled) {
    enabled = isEnabled;
    document.documentElement.classList.toggle('ouj-caption-no-shrink', enabled);

    if (observer) {
      observer.disconnect();
      observer = null;
    }
    resetLayout(document.querySelector(PLAYER_AREA_SELECTOR));
    // 動画が変わると字幕画像のスケールも変わりうるので、記録した最大値をリセットする
    maxObservedCaptionRatio = 0;

    if (enabled) startObserving();
  }

  // グローバル関数として公開
  window.applyCaptionShrinkFix = applyCaptionShrinkFix;
})();
