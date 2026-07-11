// 検索ボックス(#searchText)にフォーカスした時に、検索ボックス直下へ出すクイック絞り込みパネル。
//
// 放送大学サイトのキーワード検索はキーワードが空だと0件になり、年度や科目だけでは
// 絞り込めない。そこでキーワードを打たなくても、
//   1.「最近の検索」からの再検索
//   2. 年度→科目(カテゴリ)を選んでそのカテゴリの動画一覧(ca=)へ直接ジャンプ
//   3. 検索結果フィルタ(テレビ/ラジオ・字幕あり・未完了のみ等)の事前セット
// ができるようにする。
//
// ヘッダーの#searchTextは全ページ共通で存在し、SPA遷移で作り直されることがあるため、
// 個々の要素にリスナーを付けず、document階層のfocusin委譲で捕捉する（再バインド不要）。

const SEARCH_BOX_PANEL_ID = 'ouj-search-box-panel';
const OUJ_VOD_BASE_URL = 'https://v.ouj.ac.jp/view/ouj/#/navi/vod';

// 年度・科目データ(createYearListData)はカテゴリAPI(キャッシュ約12時間)を叩くため、
// パネルを開くたびに取り直さず、最初に開いた時のPromiseを使い回す。
let oujYearCourseDataPromise = null;
function getYearCourseData() {
  if (!oujYearCourseDataPromise) {
    oujYearCourseDataPromise = (typeof window.createYearListData === 'function')
      ? window.createYearListData().catch(() => ({ yearBuckets: [] }))
      : Promise.resolve({ yearBuckets: [] });
  }
  return oujYearCourseDataPromise;
}

// パネル内の見出し(小さなラベル)を作る
function buildPanelSectionLabel(text) {
  const label = document.createElement('div');
  label.textContent = text;
  label.style.cssText = 'font-size:12px;font-weight:bold;color:#666;margin:0 0 6px 0;';
  return label;
}

// フォールバック用の簡易チップ生成（page-search-result-filters.jsが未ロードの場合）
function buildPanelChipFallback(label, isActive, onClick) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.textContent = label;
  chip.style.cssText = `
    display:inline-flex;align-items:center;padding:6px 14px;margin:0 8px 8px 0;
    border-radius:16px;font-size:13px;cursor:pointer;
    border:1px solid ${isActive ? '#1976d2' : '#ddd'};
    background:${isActive ? '#1976d2' : '#fff'};color:${isActive ? '#fff' : '#333'};
  `;
  chip.onclick = onClick;
  return chip;
}
function makePanelChip(label, isActive, onClick) {
  const builder = window.buildOujFilterChip || buildPanelChipFallback;
  return builder(label, isActive, onClick);
}

// --- セクション1: 最近の検索 ---
function buildRecentSearchSection() {
  const historyKey = window.OUJ_SEARCH_KEYWORD_HISTORY_KEY || 'searchKeywordHistory';
  const history = window.getSetting(historyKey, []);
  if (!Array.isArray(history) || history.length === 0) return null;

  const section = document.createElement('div');
  section.style.cssText = 'margin-bottom:10px;';
  section.appendChild(buildPanelSectionLabel('最近の検索'));

  const chips = document.createElement('div');
  chips.style.cssText = 'display:flex;flex-wrap:wrap;';
  history.forEach((item) => {
    if (!item || !item.raw) return;
    chips.appendChild(makePanelChip(item.label || item.raw, false, () => {
      window.location.href = `${OUJ_VOD_BASE_URL}?se=${item.raw}`;
    }));
  });
  section.appendChild(chips);
  return section;
}

// --- セクション2: 年度・科目で探す（キーワードなし） ---
// 年度→科目のカスケード。科目を選ぶとそのカテゴリの動画一覧(ca=)へ遷移する。
function buildBrowseSection() {
  const section = document.createElement('div');
  section.style.cssText = 'margin-bottom:10px;';
  section.appendChild(buildPanelSectionLabel('キーワードなしで探す（年度・科目）'));

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;';
  const selectStyle = 'font-size:13px;padding:6px 8px;border:1px solid #ddd;border-radius:8px;background:#fff;color:#333;max-width:100%;';

  const yearSelect = document.createElement('select');
  yearSelect.style.cssText = selectStyle;
  yearSelect.appendChild(new Option('年度: すべて', ''));
  yearSelect.disabled = true;

  const courseSelect = document.createElement('select');
  courseSelect.style.cssText = `${selectStyle}flex:1;min-width:180px;`;
  courseSelect.appendChild(new Option('読み込み中...', ''));
  courseSelect.disabled = true;

  row.appendChild(yearSelect);
  row.appendChild(courseSelect);
  section.appendChild(row);

  // 選択中の年度に応じて科目の選択肢を組み直す
  const rebuildCourseOptions = (yearBuckets) => {
    const selectedYear = yearSelect.value;
    let courses;
    if (selectedYear) {
      const bucket = yearBuckets.find((b) => String(b.year) === String(selectedYear));
      courses = bucket ? bucket.courses.slice() : [];
    } else {
      // 年度指定なしは全年度の科目をまとめて表示（createYearListData側で重複排除済み）
      courses = yearBuckets.reduce((acc, b) => acc.concat(b.courses), []);
    }
    courses.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    courseSelect.innerHTML = '';
    courseSelect.appendChild(new Option(`科目を選ぶ（${courses.length}件）`, ''));
    courses.forEach((c) => courseSelect.appendChild(new Option(c.name, c.categoryId)));
  };

  getYearCourseData().then(({ yearBuckets }) => {
    // パネルが閉じている/作り直された場合は何もしない
    if (!section.isConnected) return;
    if (!Array.isArray(yearBuckets) || yearBuckets.length === 0) {
      courseSelect.innerHTML = '';
      courseSelect.appendChild(new Option('科目データを取得できませんでした', ''));
      return;
    }
    yearSelect.disabled = false;
    courseSelect.disabled = false;
    yearBuckets.forEach((b) => yearSelect.appendChild(new Option(`${b.year}年度`, b.year)));
    rebuildCourseOptions(yearBuckets);

    yearSelect.addEventListener('change', () => rebuildCourseOptions(yearBuckets));
    courseSelect.addEventListener('change', () => {
      const categoryId = courseSelect.value;
      if (categoryId) {
        window.location.href = `${OUJ_VOD_BASE_URL}?ca=${categoryId}`;
      }
    });
  });

  return section;
}

// --- セクション3: 検索結果フィルタのプリセット ---
// 既存の検索結果フィルタ(page-search-result-filters.js)と同じ設定キーを読み書きするため、
// ここで設定したトグルは次に検索結果を開いた時にそのまま適用される。
function buildPresetSection() {
  const keys = window.OUJ_SEARCH_FILTER_KEYS;
  if (!keys) return null; // フィルタ本体が未ロードなら出さない

  const section = document.createElement('div');
  section.appendChild(buildPanelSectionLabel('検索結果の絞り込み（次の検索から適用）'));

  const body = document.createElement('div');
  section.appendChild(body);

  const rerenderAndSync = () => {
    renderPresetBody(body, keys, rerenderAndSync);
    // 検索結果ページを開いていれば即座に反映する
    if (typeof window.refreshSearchResultFilterUI === 'function') {
      window.refreshSearchResultFilterUI();
    }
  };
  renderPresetBody(body, keys, rerenderAndSync);
  return section;
}

function renderPresetBody(body, keys, onChange) {
  body.innerHTML = '';
  const media = window.getSetting(keys.media, 'all');
  const captionOnly = window.getBooleanSetting(keys.captionOnly, false);
  const incompleteOnly = window.getBooleanSetting(keys.incompleteOnly, false);
  const partialOnly = window.getBooleanSetting(keys.partialOnly, false);

  const chips = document.createElement('div');
  chips.style.cssText = 'display:flex;flex-wrap:wrap;';

  [
    { value: 'all', label: 'すべて' },
    { value: 'tv', label: 'テレビのみ' },
    { value: 'radio', label: 'ラジオのみ' },
  ].forEach(({ value, label }) => {
    chips.appendChild(makePanelChip(label, media === value, () => {
      window.saveSetting(keys.media, value);
      onChange();
    }));
  });

  chips.appendChild(makePanelChip('字幕ありのみ', captionOnly, () => {
    window.saveSetting(keys.captionOnly, !captionOnly);
    onChange();
  }));
  chips.appendChild(makePanelChip('未完了のみ', incompleteOnly, () => {
    window.saveSetting(keys.incompleteOnly, !incompleteOnly);
    onChange();
  }));
  chips.appendChild(makePanelChip('視聴途中のみ', partialOnly, () => {
    window.saveSetting(keys.partialOnly, !partialOnly);
    onChange();
  }));

  body.appendChild(chips);
}

// --- パネル本体 ---
function getSearchBoxPanel() {
  let panel = document.getElementById(SEARCH_BOX_PANEL_ID);
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = SEARCH_BOX_PANEL_ID;
  panel.style.cssText = `
    position: fixed;
    z-index: 100000;
    box-sizing: border-box;
    max-height: 70vh;
    overflow-y: auto;
    padding: 12px 14px 4px 14px;
    background: #fff;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.18);
    display: none;
  `;
  document.body.appendChild(panel);
  return panel;
}

function renderSearchBoxPanelContent(panel) {
  panel.innerHTML = '';
  const sections = [
    buildRecentSearchSection(),
    buildBrowseSection(),
    buildPresetSection(),
  ].filter(Boolean);
  sections.forEach((s) => panel.appendChild(s));
}

function positionSearchBoxPanel(panel, input) {
  const rect = input.getBoundingClientRect();
  const margin = 8;
  const width = Math.min(Math.max(rect.width, 340), window.innerWidth - margin * 2);
  let left = rect.left;
  if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width;
  if (left < margin) left = margin;
  panel.style.top = `${rect.bottom + 4}px`;
  panel.style.left = `${left}px`;
  panel.style.width = `${width}px`;
}

let oujPanelInput = null;
function repositionOpenPanel() {
  const panel = document.getElementById(SEARCH_BOX_PANEL_ID);
  if (!panel || panel.style.display === 'none' || !oujPanelInput) return;
  if (!oujPanelInput.isConnected) { hideSearchBoxPanel(); return; }
  positionSearchBoxPanel(panel, oujPanelInput);
}

function showSearchBoxPanel(input) {
  const panel = getSearchBoxPanel();
  oujPanelInput = input;
  renderSearchBoxPanelContent(panel);
  positionSearchBoxPanel(panel, input);
  panel.style.display = 'block';
}

function hideSearchBoxPanel() {
  const panel = document.getElementById(SEARCH_BOX_PANEL_ID);
  if (panel) panel.style.display = 'none';
  oujPanelInput = null;
}

function initSearchBoxFilterPanel() {
  if (window.__oujSearchBoxPanelInit) return;
  window.__oujSearchBoxPanelInit = true;

  // フォーカスは要素ではなくdocumentのfocusin委譲で捕捉する（SPAで#searchTextが
  // 作り直されても再バインド不要）
  document.addEventListener('focusin', (event) => {
    const target = event.target;
    if (target && target.id === 'searchText') {
      showSearchBoxPanel(target);
    }
  });

  // パネル外のmousedownで閉じる。検索ボックス自身とパネル内は閉じない
  // （blurでは閉じないので、パネル内のselectやチップ操作を邪魔しない）
  document.addEventListener('mousedown', (event) => {
    const panel = document.getElementById(SEARCH_BOX_PANEL_ID);
    if (!panel || panel.style.display === 'none') return;
    if (panel.contains(event.target)) return;
    if (event.target && event.target.id === 'searchText') return;
    hideSearchBoxPanel();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideSearchBoxPanel();
  });

  // 開いている間はスクロール/リサイズに追従させる（ヘッダーは固定なので通常は動かないが、
  // ヘッダー折りたたみ等のレイアウト変化に備える）
  window.addEventListener('scroll', repositionOpenPanel, true);
  window.addEventListener('resize', repositionOpenPanel);
}

window.initSearchBoxFilterPanel = initSearchBoxFilterPanel;
