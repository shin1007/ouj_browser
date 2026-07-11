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
  partialOnly: 'searchFilterPartialOnly',
};

// 検索キーワード履歴（最近の検索チップ用）
const SEARCH_KEYWORD_HISTORY_KEY = 'searchKeywordHistory';
const SEARCH_KEYWORD_HISTORY_MAX = 8;

function getSearchFilterState() {
  return {
    media: window.getSetting(SEARCH_FILTER_SETTINGS_KEYS.media, 'all'),
    captionOnly: window.getBooleanSetting(SEARCH_FILTER_SETTINGS_KEYS.captionOnly, false),
    unwatchedOnly: window.getBooleanSetting(SEARCH_FILTER_SETTINGS_KEYS.unwatchedOnly, false),
    partialOnly: window.getBooleanSetting(SEARCH_FILTER_SETTINGS_KEYS.partialOnly, false),
  };
}

// 現在のURLから検索キーワード（se=パラメータ）を取り出して履歴に保存する。
// rawはURLに入っていたそのままの値（再検索時にそのまま使う）、labelは表示用のデコード済み文字列
function recordSearchKeyword() {
  const match = window.location.href.match(/[?&]se=([^&]+)/);
  if (!match) return;
  const raw = match[1];
  let label = raw;
  try {
    label = window.decodeURLComponentSafe(`se=${raw}`);
  } catch (e) { /* デコード失敗時はrawのまま表示 */ }
  if (!label || !label.trim()) return;
  let history = window.getSetting(SEARCH_KEYWORD_HISTORY_KEY, []);
  if (!Array.isArray(history)) history = [];
  history = history.filter((item) => item.label !== label);
  history.unshift({ raw, label });
  if (history.length > SEARCH_KEYWORD_HISTORY_MAX) history = history.slice(0, SEARCH_KEYWORD_HISTORY_MAX);
  window.saveSetting(SEARCH_KEYWORD_HISTORY_KEY, history);
}

// 分類結果（テレビ/ラジオ・字幕・視聴状況）を項目上に常時表示する小さなバッジ。
// フィルターを使わなくても一覧を見るだけで種別が分かるようにする
function applyBadgesToItem(item) {
  if (item.dataset.oujClassified !== 'done') return;
  if (item.querySelector('.ouj-result-badges')) return;
  const titleEl = item.querySelector('.list-content-title .title') || item.querySelector('.title');
  if (!titleEl) return;
  const badges = document.createElement('span');
  badges.className = 'ouj-result-badges';
  badges.style.cssText = 'display:inline-flex;gap:4px;margin-left:8px;vertical-align:middle;';
  const makeBadge = (text, bg, color) =>
    `<span style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:normal;background:${bg};color:${color};white-space:nowrap;">${text}</span>`;
  let html = '';
  html += item.dataset.oujMedia === 'radio'
    ? makeBadge('📻 ラジオ', '#e1f5fe', '#0277bd')
    : makeBadge('📺 テレビ', '#ede7f6', '#4527a0');
  if (item.dataset.oujCaption === '1') {
    html += makeBadge('字幕あり', '#e8f5e9', '#2e7d32');
  }
  if (item.dataset.oujWatchState === 'done') {
    html += makeBadge('✓ 視聴済み', '#dcedc8', '#33691e');
  } else if (item.dataset.oujWatchState === 'partial') {
    html += makeBadge(`途中 ${item.dataset.oujWatchPercent || ''}%`, '#fff3e0', '#e65100');
  }
  badges.innerHTML = html;
  titleEl.appendChild(badges);
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
    // 視聴状況は3値で持つ: unwatched(未視聴) / partial(視聴途中) / done(視聴済み)
    if (status && status.isFinished) {
      item.dataset.oujWatchState = 'done';
    } else if (status && status.currentTimeRate > 0) {
      item.dataset.oujWatchState = 'partial';
      item.dataset.oujWatchPercent = String(Math.floor(status.currentTimeRate * 100));
    } else {
      item.dataset.oujWatchState = 'unwatched';
    }
    // 既存の並び替え処理との互換用（未視聴を優先ソートで使用）
    item.dataset.oujUnwatched = status && status.isFinished ? '0' : '1';
    item.dataset.oujClassified = 'done';
  } catch (error) {
    item.dataset.oujClassified = 'unavailable';
  }
  applyFiltersToItem(item);
  applyBadgesToItem(item);
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
  // 「未視聴のみ」は視聴済み(done)を隠す（視聴途中は表示する）
  if (state.unwatchedOnly && item.dataset.oujWatchState === 'done') hidden = true;
  // 「視聴途中のみ」は途中まで見たものだけを表示する
  if (state.partialOnly && item.dataset.oujWatchState !== 'partial') hidden = true;
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
    // 未視聴 → 視聴途中 → 視聴済み の順に並べる
    const stateRank = (item) => {
      if (item.dataset.oujWatchState === 'done') return 2;
      if (item.dataset.oujWatchState === 'partial') return 1;
      return 0;
    };
    sorted = items.slice().sort((a, b) => {
      const rankA = stateRank(a);
      const rankB = stateRank(b);
      if (rankA !== rankB) return rankA - rankB;
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

  bar.appendChild(
    buildFilterChip('視聴途中のみ', state.partialOnly, () => {
      window.saveSetting(SEARCH_FILTER_SETTINGS_KEYS.partialOnly, !state.partialOnly);
      renderFilterBar(list);
      applyFilters();
    })
  );

  bar.appendChild(buildSortRow(list));

  const keywordRow = buildSearchKeywordHistoryRow(list);
  if (keywordRow) bar.appendChild(keywordRow);

  list.parentNode.insertBefore(bar, list);
}

// 「最近の検索」チップ行。クリックでそのキーワードの検索結果へ遷移する
function buildSearchKeywordHistoryRow(list) {
  const history = window.getSetting(SEARCH_KEYWORD_HISTORY_KEY, []);
  if (!Array.isArray(history) || history.length === 0) return null;
  // 現在表示中のキーワードは除いて表示する
  const currentMatch = window.location.href.match(/[?&]se=([^&]+)/);
  const currentRaw = currentMatch ? currentMatch[1] : '';
  const others = history.filter((item) => item.raw !== currentRaw);
  if (others.length === 0) return null;

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;width:100%;margin-top:4px;';

  const label = document.createElement('span');
  label.textContent = '最近の検索:';
  label.style.cssText = 'font-size:13px;color:#666;margin-right:8px;';
  row.appendChild(label);

  others.forEach((item) => {
    row.appendChild(
      buildFilterChip(item.label, false, () => {
        window.location.href = `https://v.ouj.ac.jp/view/ouj/#/navi/vod?se=${item.raw}`;
      })
    );
  });

  // 履歴のクリア
  const clearChip = buildFilterChip('× 履歴を消す', false, () => {
    window.saveSetting(SEARCH_KEYWORD_HISTORY_KEY, []);
    renderFilterBar(list);
  });
  clearChip.style.color = '#999';
  row.appendChild(clearChip);

  return row;
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
  // 検索キーワードを履歴に記録（「最近の検索」チップ用）
  recordSearchKeyword();
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
