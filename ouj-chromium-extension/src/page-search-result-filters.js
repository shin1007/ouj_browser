// 検索結果ページの絞り込みチップ機能(テレビ/ラジオ・字幕ありのみ・未視聴のみ)
//
// 種別/字幕/視聴状況の判定にはcontentId単位のAPIリクエストが必要になるため、
// page-course-select-progress.jsと同様にIntersectionObserverで画面内に入った
// 項目だけを対象に、同時実行数を制限しながら遅延分類する。未分類の項目は
// フィルターで隠さず表示し続け、分類が完了した時点で個別に再評価する。

const SEARCH_RESULT_FILTER_LIST_SELECTOR = '#common-list-content';

const SEARCH_FILTER_SETTINGS_KEYS = {
  media: 'searchFilterMedia', // 'all' | 'tv' | 'radio'
  captionOnly: 'searchFilterCaptionOnly',
  unwatchedOnly: 'searchFilterUnwatchedOnly',
};

function getSearchFilterState() {
  return {
    media: window.getSetting(SEARCH_FILTER_SETTINGS_KEYS.media, 'all'),
    captionOnly: window.getBooleanSetting(SEARCH_FILTER_SETTINGS_KEYS.captionOnly, false),
    unwatchedOnly: window.getBooleanSetting(SEARCH_FILTER_SETTINGS_KEYS.unwatchedOnly, false),
  };
}

// 検索結果1件を分類する。分類できた項目のみdataset.oujClassified='done'になる。
// gateは呼び出し元(startSearchFilterObserver)がページ全体で共有する同時実行数ゲート
async function classifySearchResultItem(item, gate) {
  const contentId = window.extractContentIdFromThumbnail(item);
  if (!contentId) {
    item.dataset.oujClassified = 'unavailable';
    applyFiltersToItem(item);
    return;
  }
  try {
    // isRadioProgram/isCaptionAvailableは内部で同じgetCategoryDataFromContentId(同じ
    // contentId)を叩く。並列にすると初回(未キャッシュ)時に同じvod-contents APIへの
    // リクエストが重複してしまうため、あえて直列に実行し2回目以降はキャッシュを効かせる
    const isRadio = await gate.run(() => window.isRadioProgram(contentId));
    const captionOk = await gate.run(() => window.isCaptionAvailable(contentId));
    const status = await gate.run(() => window.getVideoViewingStatus(contentId));
    item.dataset.oujMedia = isRadio ? 'radio' : 'tv';
    item.dataset.oujCaption = captionOk ? '1' : '0';
    item.dataset.oujUnwatched = status && status.isFinished ? '0' : '1';
    item.dataset.oujClassified = 'done';
  } catch (error) {
    item.dataset.oujClassified = 'unavailable';
  }
  applyFiltersToItem(item);
}

// 分類済みの項目にのみフィルター条件を適用する。未分類・分類不能の項目は隠さない
function applyFiltersToItem(item, state = getSearchFilterState()) {
  if (item.dataset.oujClassified !== 'done') {
    item.dataset.oujFilterHidden = 'false';
    window.updateSearchResultItemVisibility(item);
    return;
  }
  let hidden = false;
  if (state.media !== 'all' && item.dataset.oujMedia !== state.media) hidden = true;
  if (state.captionOnly && item.dataset.oujCaption !== '1') hidden = true;
  if (state.unwatchedOnly && item.dataset.oujUnwatched !== '1') hidden = true;
  item.dataset.oujFilterHidden = hidden ? 'true' : 'false';
  window.updateSearchResultItemVisibility(item);
}

function applyFilters() {
  const list = document.querySelector(SEARCH_RESULT_FILTER_LIST_SELECTOR);
  if (!list) return;
  const state = getSearchFilterState();
  list.querySelectorAll(':scope > ion-item[role="listitem"]').forEach((item) => applyFiltersToItem(item, state));
}

// --- 並び替え機能 ---
// 「未視聴を優先」は全項目の分類(サーバーリクエスト)が必要になるため、ページ表示時に
// 自動実行はせず、ユーザーがチップを明示的にクリックした時だけ発火させる。
// 選択状態も設定として永続化はせず(次回訪問時に意図せず一括classifyが走るのを防ぐため)、
// list要素上のプロパティとして現在の検索結果表示中のみ保持する。

// 一覧の表示順(サイトが返した元の順番)をitemごとに記録しておく。並び替え後に
// 「サイト表示順」へ戻すため、無限スクロールで項目が追加されるたびに呼び出す想定
function assignSiteOrderIndexes(list) {
  if (list.oujSiteOrderCounter === undefined) list.oujSiteOrderCounter = 0;
  list.querySelectorAll(':scope > ion-item[role="listitem"]').forEach((item) => {
    if (item.dataset.oujSiteOrder !== undefined) return;
    item.dataset.oujSiteOrder = String(list.oujSiteOrderCounter++);
  });
}

// 'default'(サイト表示順) | 'newest'(新しい順) | 'unwatched'(未視聴を優先)
async function applySearchResultSort(list) {
  const sortMode = list.oujSortMode || 'default';
  const items = Array.from(list.querySelectorAll(':scope > ion-item[role="listitem"]'));
  if (items.length === 0) return;

  if (sortMode === 'unwatched') {
    // 未分類の項目だけをまとめて分類する。既存のgateを共有し同時実行数を抑える
    const gate = list.__oujFilterGate || window.createConcurrencyGate(4);
    const unclassified = items.filter((item) => item.dataset.oujClassified !== 'done' && item.dataset.oujClassified !== 'unavailable');
    await Promise.all(unclassified.map((item) => classifySearchResultItem(item, gate)));
  }

  let sorted;
  if (sortMode === 'newest') {
    // コンテンツIDは新しいコンテンツほど大きい値になる傾向があるため、追加リクエストなしで近似できる
    sorted = items.slice().sort((a, b) => {
      const idA = Number(window.extractContentIdFromThumbnail(a)) || 0;
      const idB = Number(window.extractContentIdFromThumbnail(b)) || 0;
      return idB - idA;
    });
  } else if (sortMode === 'unwatched') {
    sorted = items.slice().sort((a, b) => {
      const unwatchedA = a.dataset.oujUnwatched === '1' ? 0 : 1;
      const unwatchedB = b.dataset.oujUnwatched === '1' ? 0 : 1;
      if (unwatchedA !== unwatchedB) return unwatchedA - unwatchedB;
      return Number(a.dataset.oujSiteOrder || 0) - Number(b.dataset.oujSiteOrder || 0);
    });
  } else {
    sorted = items.slice().sort((a, b) => Number(a.dataset.oujSiteOrder || 0) - Number(b.dataset.oujSiteOrder || 0));
  }

  sorted.forEach((item) => list.appendChild(item));
}

function buildFilterChip(label, isActive, onClick) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.textContent = label;
  chip.style.cssText = `
    display: inline-flex;
    align-items: center;
    padding: 6px 14px;
    margin: 0 8px 8px 0;
    border-radius: 16px;
    font-size: 13px;
    cursor: pointer;
    border: 1px solid ${isActive ? '#1976d2' : '#ddd'};
    background: ${isActive ? '#1976d2' : '#fff'};
    color: ${isActive ? '#fff' : '#333'};
    transition: background 0.2s, border-color 0.2s;
  `;
  chip.onmouseenter = () => {
    if (!isActive) chip.style.background = '#f0f0f0';
  };
  chip.onmouseleave = () => {
    chip.style.background = isActive ? '#1976d2' : '#fff';
  };
  chip.onclick = onClick;
  return chip;
}

function renderFilterBar(list) {
  const old = document.getElementById('search-result-filter-bar');
  if (old) old.remove();

  const state = getSearchFilterState();
  const bar = document.createElement('div');
  bar.id = 'search-result-filter-bar';
  bar.style.cssText = `
    padding: 12px 16px 0 16px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  `;

  const mediaOptions = [
    { value: 'all', label: 'すべて' },
    { value: 'tv', label: 'テレビのみ' },
    { value: 'radio', label: 'ラジオのみ' },
  ];
  mediaOptions.forEach(({ value, label }) => {
    bar.appendChild(
      buildFilterChip(label, state.media === value, () => {
        window.saveSetting(SEARCH_FILTER_SETTINGS_KEYS.media, value);
        renderFilterBar(list);
        applyFilters();
      })
    );
  });

  bar.appendChild(
    buildFilterChip('字幕ありのみ', state.captionOnly, () => {
      window.saveSetting(SEARCH_FILTER_SETTINGS_KEYS.captionOnly, !state.captionOnly);
      renderFilterBar(list);
      applyFilters();
    })
  );

  bar.appendChild(
    buildFilterChip('未視聴のみ', state.unwatchedOnly, () => {
      window.saveSetting(SEARCH_FILTER_SETTINGS_KEYS.unwatchedOnly, !state.unwatchedOnly);
      renderFilterBar(list);
      applyFilters();
    })
  );

  bar.appendChild(buildSortRow(list));

  list.parentNode.insertBefore(bar, list);
}

// 並び替えチップ行。「未視聴を優先」だけは全項目の分類(サーバーリクエスト)が
// 必要になるため、クリックされた時だけ非同期で分類してから並び替える
function buildSortRow(list) {
  const sortMode = list.oujSortMode || 'default';
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;width:100%;margin-top:4px;';

  const label = document.createElement('span');
  label.textContent = '並び替え:';
  label.style.cssText = 'font-size:13px;color:#666;margin-right:8px;';
  row.appendChild(label);

  const sortOptions = [
    { value: 'default', label: 'サイト表示順' },
    { value: 'newest', label: '新しい順' },
    { value: 'unwatched', label: '未視聴を優先' },
  ];
  sortOptions.forEach(({ value, label: optionLabel }) => {
    row.appendChild(
      buildFilterChip(optionLabel, sortMode === value, async () => {
        if (list.oujSortMode === value && !list.oujSortLoading) return;
        list.oujSortMode = value;
        list.oujSortLoading = value === 'unwatched';
        renderFilterBar(list);
        await applySearchResultSort(list);
        list.oujSortLoading = false;
        renderFilterBar(list);
      })
    );
  });

  if (list.oujSortLoading) {
    const loading = document.createElement('span');
    loading.textContent = '並び替え中...';
    loading.style.cssText = 'font-size:12px;color:#999;margin-left:8px;';
    row.appendChild(loading);
  }

  return row;
}

function startSearchFilterObserver() {
  // SPA遷移(検索キーワード変更等)で#common-list-contentがまるごと再生成されるため、
  // 呼び出しのたびに古い監視インスタンス/ゲートを破棄して作り直す
  if (window.__oujSearchFilterObserver) {
    window.__oujSearchFilterObserver.disconnect();
  }
  // ページ内の全検索結果項目で共有する同時実行数ゲート。IntersectionObserverは
  // 初回表示時に画面内の項目をまとめて検知するため、項目ごとに個別の並列数を
  // 持たせると合計の同時リクエスト数が際限なく増えてしまう
  const gate = window.createConcurrencyGate(4);
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const item = entry.target;
        // 二重ガード: 既に分類済み/分類中の項目は再度キューに入れない
        if (item.dataset.oujClassified) return;
        item.dataset.oujClassified = 'pending';
        observer.unobserve(item);
        classifySearchResultItem(item, gate);
      });
    },
    { root: null, rootMargin: '150px 0px', threshold: 0 }
  );
  window.__oujSearchFilterObserver = observer;
  observer.__oujGate = gate;
  return observer;
}

function registerItemsForClassification(observer, list) {
  // 並び替え(「サイト表示順」「未視聴を優先」)で使う元の表示順インデックスを付与
  assignSiteOrderIndexes(list);
  list.querySelectorAll(':scope > ion-item[role="listitem"]').forEach((item) => {
    if (item.dataset.oujClassified) return;
    observer.observe(item);
  });
}

function initializeSearchResultFilters() {
  window.waitForElement(SEARCH_RESULT_FILTER_LIST_SELECTOR, (list) => {
    list.oujSortMode = 'default';
    list.oujSortLoading = false;
    const observer = startSearchFilterObserver();
    list.__oujFilterGate = observer.__oujGate;
    renderFilterBar(list);
    registerItemsForClassification(observer, list);

    // 無限スクロールで追加される項目にも監視対象を広げる
    if (list.oujFilterObserverAttached) return;
    list.oujFilterObserverAttached = true;
    const mutationObserver = new MutationObserver(() => {
      registerItemsForClassification(observer, list);
    });
    mutationObserver.observe(list, { childList: true });
  });
}

window.initializeSearchResultFilters = initializeSearchResultFilters;
