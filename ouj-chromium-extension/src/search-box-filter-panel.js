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

// 年度・コースデータはカテゴリAPI(キャッシュ約12時間)を叩くため、パネルを開くたびに
// 取り直さず、最初に開いた時のPromiseを使い回す。
//  - yearBuckets: 年度セレクトの選択肢（createYearListData／utils/year.js）
//  - courseGroups: コースセレクトの選択肢（getCourseGroups／utils/categories.js。学部・大学院等でグループ化）
// ただし、ログイン/ログアウトで取得できる科目数が変わる(login-state.jsがcachedCategoriesData
// 自体は破棄・再取得する)ため、取得時点のログイン状態を記録しておき、次回呼び出し時に
// 状態が変わっていればこのPromiseも作り直す(そうしないとログイン前に一度パネルを開いた
// だけで、以降ログインしても年度・コースの選択肢がゲスト時点のまま固定されてしまう)。
let oujBrowseDataPromise = null;
let oujBrowseDataLoginState = null;
function getBrowseData() {
  const currentLoginState = (typeof window.getOujLoginState === 'function') ? window.getOujLoginState() : null;
  if (oujBrowseDataPromise && currentLoginState && currentLoginState !== 'unknown' && currentLoginState !== oujBrowseDataLoginState) {
    oujBrowseDataPromise = null;
  }
  if (!oujBrowseDataPromise) {
    oujBrowseDataLoginState = currentLoginState;
    const yearP = (typeof window.createYearListData === 'function')
      ? window.createYearListData().then((r) => (r && Array.isArray(r.yearBuckets)) ? r.yearBuckets : []).catch(() => [])
      : Promise.resolve([]);
    const courseP = (typeof window.getCourseGroups === 'function')
      ? window.getCourseGroups().catch(() => [])
      : Promise.resolve([]);
    oujBrowseDataPromise = Promise.all([yearP, courseP]).then(([yearBuckets, courseGroups]) => ({ yearBuckets, courseGroups }));
  }
  return oujBrowseDataPromise;
}

// パネル内の見出し(小さなラベル)を作る
function buildPanelSectionLabel(text) {
  const label = document.createElement('div');
  label.textContent = text;
  label.style.cssText = 'font-size:12px;font-weight:bold;color:#666;margin:0 0 6px 0;';
  return label;
}

// フォールバック用の簡易チップ生成（page-search-result-filters.jsが未ロードの場合）
function buildPanelChipFallback(label, isActive, onClick, activeColor = '#1976d2') {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.textContent = label;
  chip.style.cssText = `
    display:inline-flex;align-items:center;padding:6px 14px;margin:0 8px 8px 0;
    border-radius:16px;font-size:13px;cursor:pointer;
    border:1px solid ${isActive ? activeColor : '#ddd'};
    background:${isActive ? activeColor : '#fff'};color:${isActive ? '#fff' : '#333'};
  `;
  chip.onclick = onClick;
  return chip;
}
function makePanelChip(label, isActive, onClick, activeColor) {
  const builder = window.buildOujFilterChip || buildPanelChipFallback;
  return builder(label, isActive, onClick, activeColor);
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

// --- セクション2: 年度・コースで探す（キーワードなし） ---
// コース(生活と福祉コース・臨床心理学プログラム等)を選ぶと、そのコースの科目一覧(ca=)へ遷移する。
// 年度も選んでいれば、遷移先の科目一覧をその年度だけに絞り込む（window.__oujPendingCourseYear
// でpage-course-select-filters.jsへ受け渡す）。年度とコースは独立で、年度はコース候補を絞らない。
function buildBrowseSection() {
  const section = document.createElement('div');
  section.style.cssText = 'margin-bottom:10px;';
  section.appendChild(buildPanelSectionLabel('キーワードなしで探す（年度・コース）'));

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;';
  const selectStyle = 'font-size:13px;padding:6px 8px;border:1px solid #ddd;border-radius:8px;background:#fff;color:#333;max-width:100%;';

  const yearSelect = document.createElement('select');
  yearSelect.style.cssText = selectStyle;
  yearSelect.appendChild(new Option('年度: すべて', ''));
  yearSelect.disabled = true;

  const courseSelect = document.createElement('select');
  courseSelect.style.cssText = `${selectStyle}flex:1;min-width:200px;`;
  courseSelect.appendChild(new Option('読み込み中...', ''));
  courseSelect.disabled = true;

  row.appendChild(yearSelect);
  row.appendChild(courseSelect);
  section.appendChild(row);

  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:11px;color:#999;margin-top:4px;';
  hint.textContent = 'コースを選ぶとそのコースへ移動します（年度も選ぶと科目一覧をその年度で絞り込み）';
  section.appendChild(hint);

  const trim = (name) => (typeof window.trimCourseName === 'function') ? window.trimCourseName(name) : name;

  getBrowseData().then(({ yearBuckets, courseGroups }) => {
    // パネルが閉じている/作り直された場合は何もしない
    if (!section.isConnected) return;

    // 年度セレクト: 各年度を選択肢にする
    if (Array.isArray(yearBuckets) && yearBuckets.length > 0) {
      yearSelect.disabled = false;
      yearBuckets.forEach((b) => yearSelect.appendChild(new Option(`${b.year}年度`, String(b.year))));
    }

    // コースセレクト: 学部/大学院等でグループ化（optgroup）して選択肢にする
    courseSelect.innerHTML = '';
    if (!Array.isArray(courseGroups) || courseGroups.length === 0) {
      courseSelect.appendChild(new Option('コースデータを取得できませんでした', ''));
      return;
    }
    const totalCourses = courseGroups.reduce((n, g) => n + g.courses.length, 0);
    courseSelect.appendChild(new Option(`コースを選ぶ（${totalCourses}件）`, ''));
    courseGroups.forEach((group) => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = trim(group.parentName);
      group.courses.forEach((c) => optgroup.appendChild(new Option(trim(c.name), String(c.categoryId))));
      courseSelect.appendChild(optgroup);
    });
    courseSelect.disabled = false;

    courseSelect.addEventListener('change', () => {
      const categoryId = courseSelect.value;
      if (!categoryId) return;
      // 年度も選ばれていれば、遷移先の科目一覧をその年度で初期絞り込みするための一時フラグ。
      // 同一ドキュメント内のハッシュ遷移なのでwindow変数で受け渡せる（遷移先で読み取り後にクリア）
      window.__oujPendingCourseYear = yearSelect.value || '';
      window.location.href = `${OUJ_VOD_BASE_URL}?ca=${categoryId}`;
    });
  });

  return section;
}

// --- セクション3: 検索結果フィルタのプリセット ---
// 既存の検索結果フィルタ(page-search-result-filters.js)・科目一覧フィルタ
// (page-course-select-filters.js)と同じ設定キーを読み書きするため、ここで設定した
// トグルは次に検索結果・科目一覧・回一覧を開いた時にそのまま適用される。
function buildPresetSection() {
  const keys = window.OUJ_SEARCH_FILTER_KEYS;
  if (!keys) return null; // フィルタ本体が未ロードなら出さない

  const section = document.createElement('div');
  section.appendChild(buildPanelSectionLabel('絞り込み（検索結果・科目一覧に適用）'));

  const body = document.createElement('div');
  section.appendChild(body);

  const rerenderAndSync = () => {
    renderPresetBody(body, keys, rerenderAndSync);
    // 検索結果ページ・回一覧ページ(video-select)を開いていれば即座に反映する
    if (typeof window.refreshSearchResultFilterUI === 'function') {
      window.refreshSearchResultFilterUI();
    }
    // 科目フォルダ一覧ページ(series-select)を開いていれば即座に反映する
    if (typeof window.refreshCourseListFilterUI === 'function') {
      window.refreshCourseListFilterUI();
    }
  };
  renderPresetBody(body, keys, rerenderAndSync);
  return section;
}

function renderPresetBody(body, keys, onChange) {
  body.innerHTML = '';
  const getMedia = window.getOujMediaFilterState || ((key) => {
    const raw = window.getSetting(key, null);
    if (raw && typeof raw === 'object') return { tv: !!raw.tv, radio: !!raw.radio };
    if (raw === 'tv') return { tv: true, radio: false };
    if (raw === 'radio') return { tv: false, radio: true };
    return { tv: false, radio: false };
  });
  const media = getMedia(keys.media);
  const captionOnly = window.getBooleanSetting(keys.captionOnly, false);
  const incompleteOnly = window.getBooleanSetting(keys.incompleteOnly, false);
  const partialOnly = window.getBooleanSetting(keys.partialOnly, false);

  const chips = document.createElement('div');
  chips.style.cssText = 'display:flex;flex-wrap:wrap;';

  // テレビ/ラジオは他のAND条件チップと違いOR条件なので独立トグルにし、色も変えて区別する
  const mediaChipColor = window.OUJ_MEDIA_FILTER_CHIP_COLOR || '#00897b';
  chips.appendChild(makePanelChip('テレビ番組', media.tv, () => {
    window.saveSetting(keys.media, { tv: !media.tv, radio: media.radio });
    onChange();
  }, mediaChipColor));
  chips.appendChild(makePanelChip('ラジオ番組', media.radio, () => {
    window.saveSetting(keys.media, { tv: media.tv, radio: !media.radio });
    onChange();
  }, mediaChipColor));

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
  // 入力欄がDOMから外れた／非表示になったら閉じる。ヘッダー折りたたみを別タブの
  // storage同期やポップアップ経由で行うとmousedownを経由せず#searchTextが
  // display:noneになる。その場合isConnectedはtrueのまま（=以前は閉じられず、
  // 矩形が全ゼロになってパネルが左上隅に取り残された）ので、実描画の有無も見る。
  const rect = oujPanelInput.getBoundingClientRect();
  const hidden = !oujPanelInput.isConnected
    || oujPanelInput.offsetParent === null
    || (rect.width === 0 && rect.height === 0);
  if (hidden) { hideSearchBoxPanel(); return; }
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
  // （blurでは閉じないので、パネル内のselectやチップ操作を邪魔しない）。
  // キャプチャ相で登録することで、途中の固定UIがmousedownをstopPropagation
  // しても確実に閉じられる（パネル内クリックはpanel.contains判定で除外するため、
  // キャプチャ相でも誤って閉じることはない）。
  document.addEventListener('mousedown', (event) => {
    const panel = document.getElementById(SEARCH_BOX_PANEL_ID);
    if (!panel || panel.style.display === 'none') return;
    if (panel.contains(event.target)) return;
    if (event.target && event.target.id === 'searchText') return;
    hideSearchBoxPanel();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideSearchBoxPanel();
  });

  // 開いている間はスクロール/リサイズに追従させる（ヘッダーは固定なので通常は動かないが、
  // ヘッダー折りたたみ等のレイアウト変化に備える）
  window.addEventListener('scroll', repositionOpenPanel, true);
  window.addEventListener('resize', repositionOpenPanel);
}

window.initSearchBoxFilterPanel = initSearchBoxFilterPanel;
