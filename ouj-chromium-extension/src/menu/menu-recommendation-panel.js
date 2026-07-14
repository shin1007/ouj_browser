// おすすめ機能の表示部分（パネル／HTML生成）。
// データ生成（アルゴリズム）は menu-recommendation.js を window 経由で利用する。
// ネイティブな動画一覧ページ（右ペイン）と同じ見た目で表示し、
// オーバーレイの共通基盤は menu-native-shell.js を利用する。

// 履歴・お気に入り・類似それぞれの表示件数を選ぶドロップダウン（ネイティブの
// 並び順選択ion-item.sortの位置を再利用する）
function buildRecommendTopHtml() {
  const historyLevel = window.getSetting('history-recommend-level', 2);
  const favoriteLevel = window.getSetting('favorite-recommend-level', 5);
  const similarLevel = window.getSetting('similar-recommend-level', 3);
  const createOptions = (selectedValue) => {
    let options = '';
    for (let i = 0; i <= 10; i++) {
      options += `<option value="${i}" ${i === selectedValue ? 'selected' : ''}>${i}</option>`;
    }
    return options;
  };
  return `
    <ion-item class="sort item item-block item-md">
      <div class="item-inner">
        <div class="input-wrapper">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0;width:100%;font-size:14px;color:#374151;">
            <label for="history-recommend-level">履歴から</label>
            <select id="history-recommend-level" title="履歴からのおすすめ表示数">${createOptions(historyLevel)}</select>
            <span>件</span>
            <label for="favorite-recommend-level">お気に入りから</label>
            <select id="favorite-recommend-level" title="お気に入りからのおすすめ表示数">${createOptions(favoriteLevel)}</select>
            <span>件</span>
            <label for="similar-recommend-level">類似から</label>
            <select id="similar-recommend-level" title="類似からのおすすめ表示数">${createOptions(similarLevel)}</select>
            <span>件</span>
          </div>
        </div>
      </div>
    </ion-item>
  `;
}

function buildRecommendItemHtml(item, categories) {
  const categoryPath = window.buildCategoryPathText(categories, item.categoryId);
  let sourceLabel = '';
  let sourceColor = '';
  if (item.source === 'history') {
    sourceLabel = '履歴';
    sourceColor = '#3b82f6';
  } else if (item.source === 'favorites') {
    sourceLabel = 'お気に入り';
    sourceColor = '#f59e0b';
  } else if (item.source === 'similar') {
    sourceLabel = '類似';
    sourceColor = '#059669';
  }
  const badgeHtml = sourceLabel
    ? `<span style="display:inline-block;font-size:11px;color:${sourceColor};background:${sourceColor}20;padding:2px 8px;border-radius:4px;font-weight:500;">${sourceLabel}</span>`
    : '';
  return window.buildNativeVideoItemHtml({
    contentId: item.contentId,
    categoryId: item.categoryId,
    title: item.title,
    summary: item.summary,
    categoryPath,
    rightAreaHtml: badgeHtml,
    progressPercent: Math.floor((item.progress || 0) * 100)
  });
}

function handleRecommendPanelOpen() {
  window.openNativeOverlay((overlay) => {
    let categories = [];

    function wireItemEvents() {
      overlay.querySelectorAll('.native-video-button').forEach((btn) => {
        btn.addEventListener('click', () => {
          // おすすめ動画はその動画自体の再生ページへ直接遷移する
          const contentId = btn.getAttribute('data-content-id');
          const categoryId = btn.getAttribute('data-category-id');
          if (contentId) {
            window.removeNativeOverlay();
            window.location.href = `https://v.ouj.ac.jp/view/ouj/#/navi/player?co=${contentId}&ct=V&ca=${categoryId || ''}`;
          }
        });
      });
    }

    function renderList(recommendList) {
      const listEl = overlay.querySelector('#common-list-content');
      if (listEl) {
        listEl.innerHTML = recommendList.length
          ? recommendList.map((item) => buildRecommendItemHtml(item, categories)).join('')
          : '<div style="padding:16px;color:#666;">おすすめ動画はありません（全て再生済み）</div>';
      }
      wireItemEvents();
    }

    // 3つのプルダウンを連続で変更すると、それぞれのrefresh()呼び出しが並行して
    // createRecommendListData()を実行する。完了順は開始順と限らないため、トークンで
    // 「一番新しい呼び出しの結果だけ」を反映する(先に開始したが後に完了した古い
    // 呼び出しの結果で、選択中の値と対応しない表示に上書きされるのを防ぐ)
    let refreshToken = 0;
    const refresh = () => {
      const myToken = ++refreshToken;
      window.createRecommendListData().then((recommendList) => {
        if (myToken !== refreshToken) return;
        window.oujRecommendCache = { data: recommendList, lastFetched: Date.now() };
        if (!document.body.contains(overlay)) return;
        renderList(recommendList);
      });
    };

    function wireDropdowns() {
      const setupDropdownListener = (id, settingKey) => {
        const dropdown = overlay.querySelector(`#${id}`);
        if (dropdown) {
          dropdown.addEventListener('change', (event) => {
            window.saveSetting(settingKey, parseInt(event.target.value, 10));
            refresh();
          });
        }
      };
      setupDropdownListener('history-recommend-level', 'history-recommend-level');
      setupDropdownListener('favorite-recommend-level', 'favorite-recommend-level');
      setupDropdownListener('similar-recommend-level', 'similar-recommend-level');
    }

    overlay.innerHTML = window.renderNativeShellHtml({
      breadcrumbHtml: window.buildNativeBreadcrumbHtml([{ text: 'おすすめ動画' }]),
      mainHtml: window.renderNativeVideoListMainHtml({
        topHtml: buildRecommendTopHtml(),
        itemsHtml: '<div style="padding:16px;color:#666;">読み込み中...</div>'
      })
    });
    wireDropdowns();

    window.getCategoriesData().then((cats) => {
      if (!document.body.contains(overlay)) return;
      categories = cats;
      if (window.oujRecommendCache && window.oujRecommendCache.data) {
        renderList(window.oujRecommendCache.data);
        // 裏で再取得も走らせておく（表示中の一覧はすぐには更新しない）
        window.prefetchRecommendListData();
      } else {
        refresh();
      }
    });
  });
}

// グローバルwindowに関数を公開
window.handleRecommendPanelOpen = handleRecommendPanelOpen;
