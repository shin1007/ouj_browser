// 科目一覧ページ(series-select＝コース選択後の科目フォルダ一覧)の絞り込みバー。
//
// 検索結果フィルタ(page-search-result-filters.js)と同じ設定キー・チップUI・年度複数選択
// (buildOujMultiSelectDropdown)・並び替え(サイト表示順/新しい順/未視聴を優先/視聴途中を優先)を
// 流用し、機能的に同等のバーを常時表示する。検索ボックスのクイック絞り込みパネル
// (search-box-filter-panel.js)で設定したプリセットも同じキーを見るため、そのままこのページに
// 反映される(このページ自体に専用バーがあるため、検索ボックスパネル側は重複を避けてこのバーが
// 出ている間は絞り込みセクションを出さない)。
//
// 判定材料の入手方法が2系統ある:
//   ・媒体(テレビ/ラジオ)・字幕: 各行の (テレビ・字幕) / (ラジオ) 等の表示テキストから
//     即座に判定できる(ネットワーク不要)。ページ表示時に全行へ適用する。
//   ・未完了/視聴途中: 科目内の各回の視聴状況が必要。getCategoryProgress
//     (page-course-select-progress.jsの「X/Y回視聴済み」バッジと同じキャッシュを共有)で
//     取得するが、リクエストを伴うため「未完了のみ/視聴途中のみ」または並び替え(未視聴/視聴途中を
//     優先)が実際に使われた時だけ、同時実行数を制限しつつ遅延取得する。未取得の行は隠さず表示し続ける。
//
// 回一覧(video-select)は検索結果と同じ#common-list-content構造のため
// page-search-result-filters.js側(context='video-select')で対応する。こちらは科目フォルダの
// 一覧という別DOM(#main div.icon-text)なので別ファイルにしている。

const COURSE_FILTER_BAR_ID = 'course-list-filter-bar';
const COURSE_FILTER_LOADING_ID = 'course-list-filter-loading';
// page-course-select-progress.js / page-course-select.js と同じ、科目フォルダ行の起点セレクタ
const COURSE_ITEM_SELECTOR = '#main div.icon-text > .icon-area';

// フィルタ対象の科目フォルダ行(ion-item)。setupCourseFilterRowsで作り直す
let courseFilterRows = [];

// 年度絞り込みの選択値（西暦4桁の文字列の配列。複数選択可・空配列はすべて）。媒体/字幕/
// 視聴状況と違い、コースごとに対象年度が異なり別コースへ持ち越すと意図せず全件が隠れるため、
// 設定には保存せずモジュール変数として現在表示中のコース内でのみ保持する（検索結果の年度絞り込みと
// 同方針）。検索ボックスパネルから「年度＋コース」で来た場合はwindow.__oujPendingCourseYearで
// 初期値を受け取る。buildOujMultiSelectDropdown(page-search-result-filters.js)に選択状態の
// 配列をそのまま渡して直接書き換えさせるため、以後は同じ配列を使い続け(.length=0でリセット)、
// 新しい配列に差し替えない
let courseYearFilter = [];

// 並び替え。'default'(サイト表示順) | 'newest'(新しい順) | 'unwatched'(未視聴を優先) |
// 'partial'(視聴途中を優先)。検索結果ページ(page-search-result-filters.js)のapplySearchResultSortと
// 同じ方針。ページ単位の状態のためモジュール変数として保持する
let courseSortMode = 'default';
let courseSortLoading = false;

// フォールバック用の設定キー(page-search-result-filters.jsが先に読み込まれていれば
// window.OUJ_SEARCH_FILTER_KEYSが使える。読み込み順の都合で未定義でも動くようにしておく)
function getCourseFilterKeys() {
  return window.OUJ_SEARCH_FILTER_KEYS || {
    media: 'searchFilterMedia',
    captionOnly: 'searchFilterCaptionOnly',
    incompleteOnly: 'searchFilterUnwatchedOnly',
    partialOnly: 'searchFilterPartialOnly',
  };
}

// 媒体(テレビ/ラジオ)絞り込みの現在値を読む。page-search-result-filters.jsが公開する
// 実装があればそれを使い、読み込み順の都合で未定義でも動くようフォールバックを持つ。
// 未操作(raw===null)時は両方ONを既定値にする(両方OFFは0件を表す値のため)
function getMediaFilterState(mediaKey) {
  if (typeof window.getOujMediaFilterState === 'function') return window.getOujMediaFilterState(mediaKey);
  const raw = window.getSetting(mediaKey, null);
  if (raw && typeof raw === 'object') return { tv: !!raw.tv, radio: !!raw.radio };
  if (raw === 'tv') return { tv: true, radio: false };
  if (raw === 'radio') return { tv: false, radio: true };
  return { tv: true, radio: true };
}

function getCourseFilterState() {
  const keys = getCourseFilterKeys();
  return {
    media: getMediaFilterState(keys.media),
    captionOnly: window.getBooleanSetting(keys.captionOnly, false),
    incompleteOnly: window.getBooleanSetting(keys.incompleteOnly, false),
    partialOnly: window.getBooleanSetting(keys.partialOnly, false),
    year: courseYearFilter,
  };
}

// 行の (テレビ・字幕) / (ラジオ) 等の表示テキストから媒体・字幕を判定する。
// media: 'tv' | 'radio' | ''(不明) / caption: '1'(あり) | '0'(なし) | ''(不明)
function parseCourseMediaCaption(subText) {
  const text = subText || '';
  let media = '';
  if (text.includes('ラジオ')) media = 'radio';
  else if (text.includes('テレビ')) media = 'tv';
  // 「(テレビ・字幕)」「(ラジオ・字幕)」の形で字幕ありを示す。媒体すら不明な行は字幕も不明扱い
  const caption = text.includes('字幕') ? '1' : (media ? '0' : '');
  return { media, caption };
}

// 媒体・字幕フィルタで隠れる行か。分類できた確定情報でのみ隠し、不明な行は隠さない。
// テレビ/ラジオはOR条件(どちらか一方でも合致すれば表示。両方ONは絞り込み無し、
// 両方OFFはどちらとも一致しないため確定済みの行は全て隠れる＝0件)
function isCourseMediaCaptionHidden(row, state) {
  const media = state.media;
  if (row.dataset.oujCourseMedia &&
      !((media.tv && row.dataset.oujCourseMedia === 'tv') || (media.radio && row.dataset.oujCourseMedia === 'radio'))) {
    return true;
  }
  if (state.captionOnly && row.dataset.oujCourseCaption === '0') return true;
  return false;
}

// 視聴状況フィルタで隠れる行か。視聴状況が未取得(oujCourseWatchClass!=='done')の行は隠さない
function isCourseWatchHidden(row, state) {
  if (row.dataset.oujCourseWatchClass !== 'done') return false;
  const watchState = row.dataset.oujCourseWatchState;
  if (state.incompleteOnly && watchState === 'complete') return true;
  if (state.partialOnly && watchState !== 'partial') return true;
  return false;
}

// 年度フィルタで隠れる行か（複数選択可。選択した年度のいずれかに合致すれば表示＝OR条件）。
// 年度は科目名末尾の（'YY）から判定済み(oujCourseYear)。年度不明の科目(oujCourseYearが空)は、
// 年度を指定すると隠れる（該当年度と確定できないため）
function isCourseYearHidden(row, state) {
  if (!state.year.length) return false;
  return !state.year.includes(row.dataset.oujCourseYear);
}

function applyCourseFiltersToRow(row, state) {
  const hidden = isCourseMediaCaptionHidden(row, state)
    || isCourseWatchHidden(row, state)
    || isCourseYearHidden(row, state);
  row.style.display = hidden ? 'none' : '';
}

// 1科目の視聴状況を集計してwatchStateを確定させる。
// complete(全回視聴済み) / partial(一部だけ進行) / unstarted(未着手)
async function classifyCourseWatch(row, gate) {
  const categoryId = row.oujCourseCategoryId;
  try {
    const progress = await window.getCategoryProgress(categoryId, gate);
    if (!progress) {
      row.dataset.oujCourseWatchState = 'unstarted';
    } else {
      const { finishedCount, total, statuses } = progress;
      const anyStarted = statuses.some((s) => s && (s.isFinished || s.currentTimeRate > 0));
      if (finishedCount >= total) row.dataset.oujCourseWatchState = 'complete';
      else if (anyStarted) row.dataset.oujCourseWatchState = 'partial';
      else row.dataset.oujCourseWatchState = 'unstarted';
    }
  } catch (error) {
    // 取得できない科目は未着手扱い(＝隠さない安全側)
    row.dataset.oujCourseWatchState = 'unstarted';
  }
  row.dataset.oujCourseWatchClass = 'done';
  applyCourseFiltersToRow(row, getCourseFilterState());
}

// rowの視聴状況分類を開始する。既に分類中(pending)の行は、その場で新規に呼ぶと同じ
// categoryIdへのリクエストが二重に走ってしまうため、既存のPromiseがあればそれを使い回す
// (検索結果ページのclassifySearchResultItem呼び出し元と同じ方針)
function classifyCourseWatchDeduped(row, gate) {
  if (row.dataset.oujCourseWatchClass === 'pending' && row.__oujCourseClassifyPromise) {
    return row.__oujCourseClassifyPromise;
  }
  row.dataset.oujCourseWatchClass = 'pending';
  const promise = classifyCourseWatch(row, gate);
  row.__oujCourseClassifyPromise = promise;
  return promise;
}

// 視聴状況フィルタがONのとき、まだ視聴状況を取得していない行をまとめて分類する。
// 媒体・字幕・年度で既に隠れる行は無駄なリクエストを避けるため対象外にする（サーバー負荷最小化）
async function classifyCourseWatchForActiveFilter(rows, state) {
  const targets = rows.filter((row) =>
    row.dataset.oujCourseWatchClass !== 'done' &&
    row.dataset.oujCourseWatchClass !== 'pending' &&
    !isCourseMediaCaptionHidden(row, state) &&
    !isCourseYearHidden(row, state)
  );
  if (targets.length === 0) return;
  setCourseFilterLoading(true);
  // 科目一覧全体で共有する同時実行数ゲート。科目ごとに個別の並列数を持たせると
  // 合計の同時リクエスト数が際限なく増えてしまう
  const gate = window.createConcurrencyGate(4);
  await Promise.all(targets.map((row) => classifyCourseWatchDeduped(row, gate)));
  setCourseFilterLoading(false);
}

function applyCourseFilters() {
  const state = getCourseFilterState();
  courseFilterRows.forEach((row) => applyCourseFiltersToRow(row, state));
  if (state.incompleteOnly || state.partialOnly) {
    // 遅延分類(取得できた行から順に隠れていく)。完了を待つ必要はない
    classifyCourseWatchForActiveFilter(courseFilterRows, state);
  }
}

// 並び替え。「未視聴を優先」「視聴途中を優先」は全行の視聴状況(サーバーリクエスト)が必要になるため、
// ユーザーが並び替えチップを明示的にクリックした時だけ発火させる(検索結果ページのapplySearchResultSortと同方針)
async function applyCourseSort() {
  const rows = courseFilterRows;
  if (rows.length === 0) return;

  if (courseSortMode === 'unwatched' || courseSortMode === 'partial') {
    const targets = rows.filter((row) => row.dataset.oujCourseWatchClass !== 'done');
    if (targets.length > 0) {
      setCourseFilterLoading(true);
      const gate = window.createConcurrencyGate(4);
      await Promise.all(targets.map((row) => classifyCourseWatchDeduped(row, gate)));
      setCourseFilterLoading(false);
    }
  }

  const sortByWatchStateRank = (stateRank) =>
    rows.slice().sort((a, b) => {
      const rankA = stateRank(a);
      const rankB = stateRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return Number(a.dataset.oujCourseSiteOrder || 0) - Number(b.dataset.oujCourseSiteOrder || 0);
    });

  let sorted;
  if (courseSortMode === 'newest') {
    // categoryIdは新しく追加された科目ほど大きい値になる傾向があるため、追加リクエストなしで近似できる
    sorted = rows.slice().sort((a, b) => (Number(b.oujCourseCategoryId) || 0) - (Number(a.oujCourseCategoryId) || 0));
  } else if (courseSortMode === 'unwatched') {
    // 未視聴 → 視聴途中 → 視聴済み の順に並べる
    sorted = sortByWatchStateRank((row) => {
      if (row.dataset.oujCourseWatchState === 'complete') return 2;
      if (row.dataset.oujCourseWatchState === 'partial') return 1;
      return 0;
    });
  } else if (courseSortMode === 'partial') {
    // 視聴途中 → 未視聴 → 視聴済み の順に並べる（続きを見たいものを最優先）
    sorted = sortByWatchStateRank((row) => {
      if (row.dataset.oujCourseWatchState === 'partial') return 0;
      if (row.dataset.oujCourseWatchState === 'complete') return 2;
      return 1;
    });
  } else {
    sorted = rows.slice().sort((a, b) => Number(a.dataset.oujCourseSiteOrder || 0) - Number(b.dataset.oujCourseSiteOrder || 0));
  }

  const container = getCourseListContainer();
  if (!container) return;
  sorted.forEach((row) => container.appendChild(row));
}

// 科目フォルダ行を集めて、媒体・字幕を確定させ、categoryIdを紐付ける
function setupCourseFilterRows(childCategories, items) {
  courseFilterRows = [];
  const minLength = Math.min(childCategories.length, items.length);
  for (let i = 0; i < minLength; i++) {
    const item = items[i];
    const category = childCategories[i];
    const row = item.closest('ion-item[role="listitem"]') || item.closest('ion-item');
    if (!row) continue;
    row.oujCourseCategoryId = category.categoryId;
    const button = item.closest('button');
    const subEl = (button || row).querySelector('.sub-icon-text .text-area');
    const { media, caption } = parseCourseMediaCaption(subEl ? subEl.textContent : '');
    row.dataset.oujCourseMedia = media;
    row.dataset.oujCourseCaption = caption;
    // 年度は科目名末尾の（'YY）から判定（ネットワーク不要）。抽出できない科目は空にする
    const year = (typeof window.extractYearFromCategoryName === 'function')
      ? window.extractYearFromCategoryName(category.name)
      : null;
    row.dataset.oujCourseYear = year ? String(year) : '';
    // 視聴状況は必要時に取得。再セットアップ時は既存の分類結果を保持する
    if (row.dataset.oujCourseWatchClass === undefined) row.dataset.oujCourseWatchClass = 'none';
    // 並び替え「サイト表示順」に戻すための元の表示順インデックス
    row.dataset.oujCourseSiteOrder = String(i);
    courseFilterRows.push(row);
  }
}

// 現在の科目フォルダ行に含まれる年度の一覧（新しい順）。年度セレクトの選択肢用
function collectCourseYears() {
  const years = new Set();
  courseFilterRows.forEach((row) => {
    if (row.dataset.oujCourseYear) years.add(row.dataset.oujCourseYear);
  });
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
}

// フィルタバーを挿入する科目リストのコンテナ(ion-list)を得る
function getCourseListContainer() {
  const item = document.querySelector(COURSE_ITEM_SELECTOR);
  if (!item) return null;
  return item.closest('ion-list') || (item.closest('ion-item') && item.closest('ion-item').parentElement) || null;
}

function makeCourseChip(label, isActive, onClick, activeColor = '#1976d2') {
  const builder = window.buildOujFilterChip;
  if (typeof builder === 'function') return builder(label, isActive, onClick, activeColor);
  // page-search-result-filters.js未ロード時のフォールバック
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.textContent = label;
  chip.style.cssText = `display:inline-flex;align-items:center;padding:6px 14px;margin:0 8px 8px 0;border-radius:16px;font-size:13px;cursor:pointer;border:1px solid ${isActive ? activeColor : '#ddd'};background:${isActive ? activeColor : '#fff'};color:${isActive ? '#fff' : '#333'};`;
  chip.onclick = onClick;
  return chip;
}

function setCourseFilterLoading(loading) {
  const el = document.getElementById(COURSE_FILTER_LOADING_ID);
  if (el) el.style.display = loading ? 'inline' : 'none';
}

function renderCourseFilterBar() {
  const old = document.getElementById(COURSE_FILTER_BAR_ID);
  if (old) old.remove();

  const list = getCourseListContainer();
  if (!list || !list.parentNode) return;

  const keys = getCourseFilterKeys();
  const state = getCourseFilterState();
  const bar = document.createElement('div');
  bar.id = COURSE_FILTER_BAR_ID;
  bar.style.cssText = 'padding:12px 16px 4px 16px;display:flex;flex-wrap:wrap;align-items:center;';

  const onChange = () => {
    renderCourseFilterBar();
    applyCourseFilters();
  };

  const label = document.createElement('span');
  label.textContent = '絞り込み:';
  label.style.cssText = 'font-size:13px;color:#666;margin-right:8px;';
  bar.appendChild(label);

  // テレビ/ラジオは他のAND条件チップと違いOR条件なので独立トグルにし、色も変えて区別する
  const mediaChipColor = window.OUJ_MEDIA_FILTER_CHIP_COLOR || '#00897b';
  bar.appendChild(makeCourseChip('テレビ番組', state.media.tv, () => {
    window.saveSetting(keys.media, { tv: !state.media.tv, radio: state.media.radio });
    onChange();
  }, mediaChipColor));
  bar.appendChild(makeCourseChip('ラジオ番組', state.media.radio, () => {
    window.saveSetting(keys.media, { tv: state.media.tv, radio: !state.media.radio });
    onChange();
  }, mediaChipColor));

  bar.appendChild(makeCourseChip('字幕ありのみ', state.captionOnly, () => {
    window.saveSetting(keys.captionOnly, !state.captionOnly);
    onChange();
  }));
  bar.appendChild(makeCourseChip('未完了のみ', state.incompleteOnly, () => {
    window.saveSetting(keys.incompleteOnly, !state.incompleteOnly);
    onChange();
  }));
  bar.appendChild(makeCourseChip('視聴途中のみ', state.partialOnly, () => {
    window.saveSetting(keys.partialOnly, !state.partialOnly);
    onChange();
  }));

  // 年度の複数選択ドロップダウン（このコースに含まれる年度のみ）。年度が1つも取れない場合は出さない。
  // 検索結果ページと同じbuildOujMultiSelectDropdown(page-search-result-filters.js)を再利用し、
  // courseYearFilter配列を直接書き換えさせる。値の変更はバー全体を作り直さずapplyCourseFiltersのみ呼ぶ
  const years = collectCourseYears();
  if (years.length > 0 && typeof window.buildOujMultiSelectDropdown === 'function') {
    const yearDropdown = window.buildOujMultiSelectDropdown({
      label: '年度',
      options: years.map((y) => ({ value: y, label: `${y}年度` })),
      selected: courseYearFilter,
      onChange: applyCourseFilters,
    });
    yearDropdown.id = 'course-filter-year';
    bar.appendChild(yearDropdown);
  }

  const loading = document.createElement('span');
  loading.id = COURSE_FILTER_LOADING_ID;
  loading.textContent = '絞り込み中...';
  loading.style.cssText = 'font-size:12px;color:#999;margin-left:4px;display:none;';
  bar.appendChild(loading);

  bar.appendChild(buildCourseSortRow());

  list.parentNode.insertBefore(bar, list);
}

// 並び替えチップ行。検索結果ページ(page-search-result-filters.jsのbuildSortRow)と同じ4種
function buildCourseSortRow() {
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
    { value: 'partial', label: '視聴途中を優先' },
  ];
  sortOptions.forEach(({ value, label: optionLabel }) => {
    row.appendChild(makeCourseChip(optionLabel, courseSortMode === value, async () => {
      if (courseSortMode === value && !courseSortLoading) return;
      courseSortMode = value;
      courseSortLoading = value === 'unwatched' || value === 'partial';
      renderCourseFilterBar();
      await applyCourseSort();
      courseSortLoading = false;
      renderCourseFilterBar();
    }));
  });

  if (courseSortLoading) {
    const loading = document.createElement('span');
    loading.textContent = '並び替え中...';
    loading.style.cssText = 'font-size:12px;color:#999;margin-left:8px;';
    row.appendChild(loading);
  }

  return row;
}

// 検索ボックスのプリセットパネルなどからトグルが変わった時に、科目一覧の
// バーと絞り込みを即座に追従させるヘルパー。科目一覧ページ以外(＝バーが出ていない)では何もしない。
// （バーはSPA遷移時にcontent.jsが除去するため、バーの有無で「今この画面が科目一覧か」を判定する。
//  courseFilterRowsは前ページの分が残っていることがあり判定に使えない）
function refreshCourseListFilterUI() {
  if (!document.getElementById(COURSE_FILTER_BAR_ID)) return;
  renderCourseFilterBar();
  applyCourseFilters();
}

async function initializeCourseListFilters(startUrl) {
  // 上限なしにリトライするため、待っている間に別ページへ遷移したら打ち切る
  // (遷移先ページの分はcontent.js経由でこの関数が改めて呼ばれる)
  if (startUrl === undefined) startUrl = window.location.href;
  if (window.location.href !== startUrl) return;
  if (typeof window.getChildIds !== 'function' || typeof window.getCategoriesData !== 'function') {
    setTimeout(() => initializeCourseListFilters(startUrl), 100);
    return;
  }
  const ca = window.getCurrentCategoryId();
  if (!ca) return;
  // getCategoriesData/getChildIdsのawait中に別の科目一覧ページへ遷移すると、
  // childCategories(古いページのカテゴリ)とitems(新しいページのDOM、下のsetupCourseFilterRows)
  // がインデックスでずれてしまう。取得開始時点のURLと変わっていたら中断する
  // 子カテゴリがさらにフォルダ(summaryなし)の場合は科目一覧ではないため何もしない
  // （page-course-select-progress.js / page-course-select.js と同じ判定基準）
  const categories = await window.getCategoriesData();
  const childCategories = await window.getChildIds(ca);
  if (window.location.href !== startUrl) return;
  const hasSummaryInChildren = childCategories.some((child) => {
    const cat = categories.find((c) => c.categoryId === child.categoryId);
    return cat && cat.summary;
  });
  if (!hasSummaryInChildren) {
    // 科目一覧ではない(コース一覧などのフォルダページ)。前ページの行情報を残すと
    // refreshCourseListFilterUI等が誤作動しうるためクリアする
    courseFilterRows = [];
    return;
  }

  const items = document.querySelectorAll(COURSE_ITEM_SELECTOR);
  if (!items.length) {
    setTimeout(() => initializeCourseListFilters(startUrl), 100);
    return;
  }

  setupCourseFilterRows(childCategories, items);
  // 年度絞り込みは別コースへ持ち越さない。検索ボックスパネルから「年度＋コース」で来た場合のみ、
  // その年度で初期絞り込みする（受け取ったら即クリアして次回以降に残さない）。courseYearFilterは
  // buildOujMultiSelectDropdownに参照を渡し続けるため、新しい配列に差し替えず中身だけ入れ替える
  courseYearFilter.length = 0;
  if (window.__oujPendingCourseYear) courseYearFilter.push(String(window.__oujPendingCourseYear));
  window.__oujPendingCourseYear = '';
  // 渡された年度がこのコースに存在しない場合は「すべて」に戻す（全科目が消えて空表示になるのを防ぐ）
  if (courseYearFilter.length && !collectCourseYears().includes(courseYearFilter[0])) {
    courseYearFilter.length = 0;
  }
  // 並び替えも別コースへ持ち越さない
  courseSortMode = 'default';
  courseSortLoading = false;
  renderCourseFilterBar();
  applyCourseFilters();
}

window.initializeCourseListFilters = initializeCourseListFilters;
window.refreshCourseListFilterUI = refreshCourseListFilterUI;
// search-box-all-subjects-panel.js が category.summary の同一形式のテキストから
// テレビ/ラジオ・字幕を判定するために再利用する
window.parseCourseMediaCaption = parseCourseMediaCaption;
