// 検索ボックスのクイック絞り込みパネル(search-box-filter-panel.js)で、キーワード欄が
// 空のまま絞り込みプリセットのチップ(テレビ/ラジオ・字幕あり・未完了・視聴途中)を操作した
// 瞬間に呼ばれ、ネイティブ風パネル(menu/menu-native-shell.js)で全科目中の該当科目を一覧表示する。
//
// 放送大学サイト自身の検索はキーワードが空だと0件になり、拡張もサイトの検索結果DOMに
// 相乗りしてフィルタしているだけ(page-search-result-filters.js)なので、キーワードが
// 無い場合はサイトに頼れない。一方、テレビ/ラジオ・字幕・年度の判定はカテゴリAPI
// (utils/categories.js の getCategoriesData。既にキャッシュ済み)のsummary/name欄だけで
// 完結し追加通信が不要なため、この3条件は全科目分を即座に判定できる。未完了/視聴途中のみ
// 視聴進捗の取得(getCategoryProgress)が必要なので、お気に入りパネルの視聴回数バッジと
// 同様にIntersectionObserverで画面内に入った科目だけを遅延取得する(全科目を一斉に取得すると
// サーバー負荷が大きすぎるため、page-course-select-filters.jsのような即時一括分類はしない)。

const ALL_SUBJECTS_PANEL_ID = 'all-subjects-filter';

// 科目単位の視聴状況(getCategoryProgressの結果)をcategoryId単位でキャッシュする。
// パネルを閉じずにチップ操作で再描画しても取得済みの分は再リクエストしない
let oujAllSubjectsProgressCache = new Map();
let oujAllSubjectsProgressGate = null;
let oujAllSubjectsProgressObserver = null;

function getOujAllSubjectsProgressGate() {
  if (!oujAllSubjectsProgressGate) oujAllSubjectsProgressGate = window.createConcurrencyGate(4);
  return oujAllSubjectsProgressGate;
}

// 全科目(=他の科目の親として使われていない末端カテゴリ)を、重複登録(同じ講義が複数コースに
// 登録されているもの)を除いて返す。判定基準はutils/year.jsのcreateYearListDataと同じ
async function getAllSubjectItems() {
  const categories = await window.getCategoriesData();
  if (!Array.isArray(categories)) return [];
  const parentIds = await window.categoriesUsedAsParent();
  const parentIdSet = new Set(parentIds);
  const byId = new Map(categories.map((c) => [c.categoryId, c]));

  const usedAliasNumbers = new Set();
  const items = [];
  categories.forEach((category) => {
    if (parentIdSet.has(category.categoryId)) return; // フォルダ(コース等)は除外、末端の科目のみ対象
    const aliasNum = window.extractCategoryAliasNumber ? window.extractCategoryAliasNumber(category) : null;
    if (aliasNum) {
      if (usedAliasNumbers.has(aliasNum)) return; // 複数コースへの重複登録は先に見つかった1件のみ採用
      usedAliasNumbers.add(aliasNum);
    }
    const parent = category.parentId ? byId.get(category.parentId) : null;
    const { media, caption } = window.parseCourseMediaCaption(category.summary || '');
    items.push({
      categoryId: category.categoryId,
      name: category.name,
      summary: category.summary || '',
      parentName: parent ? parent.name : 'その他',
      media,
      caption,
      year: window.extractYearFromCategoryName(category.name),
    });
  });
  return items;
}

// 媒体・字幕・年度の絞り込み。不明(空文字)な項目は隠さない安全側の判定
// (page-course-select-filters.jsのisCourseMediaCaptionHidden/isCourseYearHiddenと同じ基準)
function passesAllSubjectsStaticFilters(item, state) {
  const media = state.media;
  if ((media.tv || media.radio) && item.media &&
      !((media.tv && item.media === 'tv') || (media.radio && item.media === 'radio'))) {
    return false;
  }
  if (state.captionOnly && item.caption === '0') return false;
  if (state.year && String(item.year || '') !== state.year) return false;
  return true;
}

// 視聴状況の絞り込み。未分類(watchStateが無い)の項目は隠さない
function passesAllSubjectsWatchFilter(watchState, state) {
  if (!watchState) return true;
  if (state.incompleteOnly && watchState === 'complete') return false;
  if (state.partialOnly && watchState !== 'partial') return false;
  return true;
}

// getCategoryProgressの結果から視聴状況を確定する。
// complete(全回視聴済み) / partial(一部だけ進行) / unstarted(未着手)
function classifyAllSubjectsWatchState(progress) {
  if (!progress) return 'unstarted';
  const { finishedCount, total, statuses } = progress;
  if (finishedCount >= total) return 'complete';
  const anyStarted = statuses.some((s) => s && (s.isFinished || s.currentTimeRate > 0));
  return anyStarted ? 'partial' : 'unstarted';
}

function buildAllSubjectsProgressBadgeHtml(categoryId) {
  return `<span class="all-subjects-progress-badge" data-category-id="${categoryId}" style="display:inline-flex;align-items:center;margin-left:8px;padding:2px 10px;border-radius:12px;font-size:12px;color:#666;background:#eee;white-space:nowrap;"></span>`;
}

function fillAllSubjectsProgressBadge(badge, watchState) {
  if (watchState === 'complete') {
    badge.textContent = '視聴済み';
    badge.style.background = '#dcedc8';
    badge.style.color = '#33691e';
  } else if (watchState === 'partial') {
    badge.textContent = '視聴途中';
    badge.style.background = '#e3f2fd';
    badge.style.color = '#1565c0';
  } else {
    badge.remove();
  }
}

function buildAllSubjectsItemHtml(item) {
  return window.buildNativeCategoryItemHtml({
    text: item.name,
    buttonClass: 'all-subjects-course-button',
    dataAttrs: { 'category-id': item.categoryId },
    extraHtml: buildAllSubjectsProgressBadgeHtml(item.categoryId),
    subText: item.summary || ''
  });
}

// 親カテゴリ(コース)名でグループ化し、名前先頭の番号でソートする(getCourseGroupsと同じ並び方針)
function groupAllSubjectsByParent(items) {
  const groups = new Map();
  items.forEach((item) => {
    const key = item.parentName || 'その他';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  const numPrefix = (name) => {
    const m = (name || '').match(/^\s*([0-9]+)/);
    return m ? parseInt(m[1], 10) : 9999;
  };
  return Array.from(groups.entries())
    .map(([name, groupItems]) => ({ name, items: groupItems.slice().sort((a, b) => a.name.localeCompare(b.name, 'ja')) }))
    .sort((a, b) => numPrefix(a.name) - numPrefix(b.name));
}

function buildAllSubjectsGroupedListHtml(items) {
  if (!items.length) return '<div style="padding:16px;color:#666;">条件に合う科目がありません</div>';
  const groups = groupAllSubjectsByParent(items);
  return groups
    .map((group) => window.buildNativeSectionHeaderHtml(group.name) + group.items.map(buildAllSubjectsItemHtml).join(''))
    .join('');
}

function buildAllSubjectsFilterSummaryText(state, count) {
  const parts = [];
  if (state.media.tv) parts.push('テレビ番組');
  if (state.media.radio) parts.push('ラジオ番組');
  if (state.captionOnly) parts.push('字幕ありのみ');
  if (state.incompleteOnly) parts.push('未完了のみ');
  if (state.partialOnly) parts.push('視聴途中のみ');
  if (state.year) parts.push(`${state.year}年度`);
  const condition = parts.length ? parts.join('・') : '条件なし（全科目）';
  return `絞り込み: ${condition}（${count}件）`;
}

function buildAllSubjectsYearOptions(selectEl, items, currentValue) {
  if (!selectEl) return;
  const years = Array.from(new Set(items.map((i) => i.year).filter(Boolean))).sort((a, b) => b - a);
  selectEl.innerHTML = '';
  selectEl.appendChild(new Option('年度: すべて', ''));
  years.forEach((y) => selectEl.appendChild(new Option(`${y}年度`, String(y))));
  selectEl.value = currentValue || '';
  if (selectEl.selectedIndex === -1) selectEl.value = '';
}

// パネル本体の描画。openNativeOverlayのrenderコールバックとして渡す
function renderAllSubjectsPanel(overlay) {
  let allItems = [];
  let filterValue = '';
  let yearFilter = '';

  function currentFilterState() {
    const keys = window.OUJ_SEARCH_FILTER_KEYS;
    return {
      media: window.getOujMediaFilterState(keys.media),
      captionOnly: window.getBooleanSetting(keys.captionOnly, false),
      incompleteOnly: window.getBooleanSetting(keys.incompleteOnly, false),
      partialOnly: window.getBooleanSetting(keys.partialOnly, false),
      year: yearFilter,
    };
  }

  function wireRowClicks() {
    overlay.querySelectorAll('.all-subjects-course-button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const categoryId = btn.getAttribute('data-category-id');
        if (!categoryId) return;
        window.removeNativeOverlay();
        window.location.href = `https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=${categoryId}`;
      });
    });
  }

  // 視聴状況バッジの遅延計算(画面内に入った科目だけ、同時実行数を制限しつつ取得)。
  // 分類が完了し、現在の絞り込みで表示対象外になった行はその場で隠す(全体の再描画はしない)
  function wireProgressBadges() {
    if (oujAllSubjectsProgressObserver) oujAllSubjectsProgressObserver.disconnect();
    oujAllSubjectsProgressObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const badge = entry.target;
        oujAllSubjectsProgressObserver.unobserve(badge);
        const categoryId = badge.dataset.categoryId;
        window.getCategoryProgress(categoryId, getOujAllSubjectsProgressGate())
          .then((result) => {
            const watchState = classifyAllSubjectsWatchState(result);
            oujAllSubjectsProgressCache.set(String(categoryId), watchState);
            if (!badge.isConnected) return;
            fillAllSubjectsProgressBadge(badge, watchState);
            if (!passesAllSubjectsWatchFilter(watchState, currentFilterState())) {
              const row = badge.closest('ion-item');
              if (row) row.style.display = 'none';
            }
          })
          .catch(() => {
            oujAllSubjectsProgressCache.set(String(categoryId), 'unstarted');
          });
      });
    }, { root: null, rootMargin: '150px 0px', threshold: 0 });

    overlay.querySelectorAll('.all-subjects-progress-badge').forEach((badge) => {
      const categoryId = badge.dataset.categoryId;
      if (oujAllSubjectsProgressCache.has(String(categoryId))) {
        fillAllSubjectsProgressBadge(badge, oujAllSubjectsProgressCache.get(String(categoryId)));
        return;
      }
      oujAllSubjectsProgressObserver.observe(badge);
    });
  }

  function renderList() {
    const state = currentFilterState();
    const keyword = filterValue.trim().toLowerCase();
    const visible = allItems.filter((item) => {
      if (!passesAllSubjectsStaticFilters(item, state)) return false;
      const cached = oujAllSubjectsProgressCache.get(String(item.categoryId));
      if (!passesAllSubjectsWatchFilter(cached, state)) return false;
      if (keyword && !item.name.toLowerCase().includes(keyword) && !item.parentName.toLowerCase().includes(keyword)) return false;
      return true;
    });
    const listEl = overlay.querySelector('#all-subjects-native-list');
    if (listEl) listEl.innerHTML = buildAllSubjectsGroupedListHtml(visible);
    const summaryEl = overlay.querySelector('#all-subjects-filter-summary');
    if (summaryEl) summaryEl.textContent = buildAllSubjectsFilterSummaryText(state, visible.length);
    wireRowClicks();
    wireProgressBadges();
  }

  overlay.innerHTML = window.renderNativeShellHtml({
    breadcrumbHtml: window.buildNativeBreadcrumbHtml([{ text: '絞り込み検索（全科目）' }]),
    extraAsideHtml: `
      ${window.buildNativeSearchBoxHtml({ id: 'all-subjects-native-search', placeholder: '科目名・コース名で絞り込み' })}
      <div id="all-subjects-filter-summary" style="padding:0 20px 8px 20px;font-size:12px;color:#666;"></div>
      <div style="padding:0 20px 12px 20px;">
        <!-- TODO: 検索結果ページ(page-search-result-filters.jsのbuildMultiSelectDropdown)と
             同様に複数年度選択に対応させる余地がある。今回は検索結果ページのみ対応
             （要望範囲外のため見送り）。全科目パネルはコース(parentName)での絞り込みselect自体も
             未実装（現状はグループ見出し表示のみ）なので、対応するならコース側も合わせて検討する -->
        <select id="all-subjects-year-select" style="font-size:13px;padding:5px 8px;border:1px solid #ddd;border-radius:8px;background:#fff;color:#333;">
          <option value="">年度: すべて</option>
        </select>
      </div>
    `,
    asideListHtml: '<div id="all-subjects-native-list" style="padding:16px;color:#666;">読み込み中...</div>'
  });

  const searchInput = overlay.querySelector('#all-subjects-native-search');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      filterValue = event.target.value;
      renderList();
    });
  }

  const yearSelect = overlay.querySelector('#all-subjects-year-select');
  if (yearSelect) {
    yearSelect.addEventListener('change', () => {
      yearFilter = yearSelect.value;
      renderList();
    });
  }

  getAllSubjectItems().then((items) => {
    if (!overlay.isConnected) return; // 取得中にパネルが閉じられていれば何もしない
    allItems = items;
    buildAllSubjectsYearOptions(yearSelect, allItems, yearFilter);
    renderList();
  });
}

// 全科目絞り込みパネルを開く。search-box-filter-panel.jsのプリセットチップ操作の
// たびに(既に開いていても)呼ばれる。openNativeOverlayは呼び出しの都度、既存の
// オーバーレイと「パネル外クリックで閉じる」監視を破棄してから新しく組み立てる仕様
// (menu-native-shell.js)なので、ここで毎回呼び直すことで、パネルの外側(検索ボックスの
// クイック絞り込みパネル)にあるチップ操作が直後に「パネル外クリック」と誤判定されて
// 即座に閉じてしまう事態を避けている。取得済みの視聴進捗(oujAllSubjectsProgressCache)は
// モジュール変数として残るため、開き直しても再取得は発生しない
function handleAllSubjectsFilterPanelOpen() {
  window.openNativeOverlay(renderAllSubjectsPanel, ALL_SUBJECTS_PANEL_ID);
}

window.handleAllSubjectsFilterPanelOpen = handleAllSubjectsFilterPanelOpen;
