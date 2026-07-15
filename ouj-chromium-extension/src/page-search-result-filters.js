// 検索結果ページの絞り込み機能(テレビ/ラジオ・字幕ありのみ・未完了のみ・視聴途中のみ・年度・コース)
//
// 種別/字幕/視聴状況/年度/コースの判定にはcontentId単位のAPIリクエストが必要になるため、
// page-course-select-progress.jsと同様にIntersectionObserverで画面内に入った
// 項目だけを対象に、同時実行数を制限しながら遅延分類する。フィルタが1つも有効でない間は
// 未分類の項目も隠さず表示し続けるが、フィルタが有効な間は未分類の項目を分類完了まで
// 一旦隠す(isAnyResultFilterActive/applyFiltersToItem)。後から対象外と判明した項目が
// 表示済み一覧から脱落して下の項目が繰り上がる(=並びが入れ替わって見える)ことを防ぐため。
// ただし年度・コースの「選択肢一覧」自体はこの遅延分類を待たない。サイト全体の
// 授業一覧(loadYearCourseOptions)から直接求めるため、スクロールや個々の項目の
// 分類完了を待たずに揃う(選んだ年度・コースが今回の検索結果に無ければ0件表示になる)。
//
// 検索結果ページ(se=)だけでなく、動画一覧ページ(ca=の回一覧＝video-select)も同じ
// #common-list-content > ion-item[role="listitem"] 構造なので、この機構を流用する。
// video-selectは1科目内の回一覧のため媒体/字幕/年度/コースは全回で共通になり、これらで
// 絞ると全件が消えるだけになる。そこで video-select では視聴状況(未完了/視聴途中)フィルタ
// と並び替えのみを有効にし、媒体/字幕/年度/コース・最近の検索は出さない。分岐はlist要素上の
// oujFilterContext('search' | 'video-select')で行う(getSearchFilterState / renderFilterBar /
// classifySearchResultItem)。科目フォルダの一覧(series-select)は別DOMのため
// page-course-select-filters.jsで対応する。
//
// TODO: 並列作業向けのロジック/UI分割は保留中。renderFilterBar↔applyFilters/
// applySearchResultSort が双方向依存で、分割するとgetSearchFilterState等
// 約8関数＋定数をwindow.*で公開して呼び出し側も書き換える必要があり、
// window.前置が増えて可読性が下がるわりに並列作業の恩恵が小さいため見送った。
// 分割するなら「フィルターバー描画(chip/row生成)」と「分類・絞り込み・並び替え」の
// 2ファイルが候補。

const SEARCH_RESULT_FILTER_LIST_SELECTOR = '#common-list-content';

const SEARCH_FILTER_SETTINGS_KEYS = {
  media: 'searchFilterMedia', // {tv: boolean, radio: boolean}。テレビ/ラジオはOR条件。既定(未操作時)は両方ONで「すべて」、両方OFFにすると0件になる
  captionOnly: 'searchFilterCaptionOnly',
  // 「未完了のみ」= 視聴が完了していない(done以外)を表示。キー名は旧「未視聴のみ」の
  // ものを流用し、既存ユーザーの選択状態を引き継ぐ
  incompleteOnly: 'searchFilterUnwatchedOnly',
  partialOnly: 'searchFilterPartialOnly',
};

// テレビ/ラジオはAND条件の他フィルタと違いOR条件（どちらか一方でも合致すれば表示）なので、
// チップの色も変えて区別する
const MEDIA_FILTER_CHIP_COLOR = '#00897b';

// 媒体(テレビ/ラジオ)絞り込みの現在値を読む。{tv, radio}の真偽値。テレビ/ラジオは
// 全項目がどちらかに分類される排他的なOR条件なので、両方ONは「すべて表示」、
// 両方OFFは「どちらも要らない」＝0件表示になる。一度も操作していない(設定未保存=raw===null)
// 場合だけは両方ONを既定値にし、初回訪問時にいきなり0件になるのを防ぐ。旧形式
// ('all'|'tv'|'radio'の単一選択だった頃の設定値)が残っていれば新形式に読み替える
function getMediaFilterState(mediaKey) {
  const raw = window.getSetting(mediaKey, null);
  if (raw && typeof raw === 'object') return { tv: !!raw.tv, radio: !!raw.radio };
  if (raw === 'tv') return { tv: true, radio: false };
  if (raw === 'radio') return { tv: false, radio: true };
  return { tv: true, radio: true };
}

// 分類済み項目の媒体が現在の絞り込みで隠れる対象か。テレビ/ラジオ両方ONなら常に表示、
// 両方OFFなら('tv'/'radio'いずれとも一致しないため)常に隠れる
function isMediaFilterHidden(itemMedia, mediaState) {
  return !((mediaState.tv && itemMedia === 'tv') || (mediaState.radio && itemMedia === 'radio'));
}

// 検索キーワード履歴（最近の検索チップ用）
const SEARCH_KEYWORD_HISTORY_KEY = 'searchKeywordHistory';
const SEARCH_KEYWORD_HISTORY_MAX = 8;

// 年度・コースの絞り込みは検索ごとに選択肢が変わる（別検索に持ち越すと意図せず全件が
// 隠れる）ため、設定には保存せずlist要素上のプロパティ(oujYearFilter/oujCourseFilter、
// いずれも選択値の配列。複数選択可能で、空配列は「すべて」)で現在の検索結果表示中のみ保持する
function getSearchFilterState(list) {
  const incompleteOnly = window.getBooleanSetting(SEARCH_FILTER_SETTINGS_KEYS.incompleteOnly, false);
  const partialOnly = window.getBooleanSetting(SEARCH_FILTER_SETTINGS_KEYS.partialOnly, false);
  // video-select(1科目の回一覧)では媒体/字幕/年度/コースは全回共通。これらで絞ると全件が
  // 消えるだけ(例: プリセットで「ラジオのみ」を選んだままテレビ科目を開くと空になる)なので、
  // 保存済みの設定値に関わらず無効化し、視聴状況フィルタのみ効かせる。media は両方ONが
  // 「絞り込み無し」を表す値なので、無効化にはそちらを使う(両方OFFは0件を表す値になった)
  if (list && list.oujFilterContext === 'video-select') {
    return { media: { tv: true, radio: true }, captionOnly: false, incompleteOnly, partialOnly, year: [], courseId: [] };
  }
  return {
    media: getMediaFilterState(SEARCH_FILTER_SETTINGS_KEYS.media),
    captionOnly: window.getBooleanSetting(SEARCH_FILTER_SETTINGS_KEYS.captionOnly, false),
    incompleteOnly,
    partialOnly,
    year: (list && Array.isArray(list.oujYearFilter)) ? list.oujYearFilter : [],
    courseId: (list && Array.isArray(list.oujCourseFilter)) ? list.oujCourseFilter : [],
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

// 分類結果（字幕・視聴状況）を項目上に常時表示する小さなバッジ。
// テレビ/ラジオはサムネイルから自明なのでバッジには出さない
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
  if (item.dataset.oujCaption === '1') {
    html += makeBadge('字幕あり', '#e8f5e9', '#2e7d32');
  }
  if (item.dataset.oujWatchState === 'done') {
    html += makeBadge('✓ 視聴済み', '#dcedc8', '#33691e');
  } else if (item.dataset.oujWatchState === 'partial') {
    html += makeBadge(`途中 ${item.dataset.oujWatchPercent || ''}%`, '#fff3e0', '#e65100');
  }
  if (!html) return;
  badges.innerHTML = html;
  titleEl.appendChild(badges);
}

// 検索結果1件を分類する。分類できた項目のみdataset.oujClassified='done'になる。
// gateは呼び出し元(startSearchFilterObserver)がページ全体で共有する同時実行数ゲート。
// contextが'video-select'のときは媒体/字幕/年度/コースのフィルタが無効(全回共通のため)なので、
// それらの判定用リクエスト(isCaptionAvailableはDRMチケット発行を伴い重い)は省き、
// 視聴状況(getVideoViewingStatus)だけを取得する
async function classifySearchResultItem(item, gate, context = 'search') {
  const needMediaCaptionYear = context !== 'video-select';
  const contentId = window.extractContentIdFromThumbnail(item);
  if (!contentId) {
    item.dataset.oujClassified = 'unavailable';
    applyFiltersToItem(item);
    return;
  }
  try {
    if (needMediaCaptionYear) {
      // isRadioProgram/isCaptionAvailableは内部で同じgetCategoryDataFromContentId(同じ
      // contentId)を叩く。並列にすると初回(未キャッシュ)時に同じvod-contents APIへの
      // リクエストが重複してしまうため、あえて直列に実行し2回目以降はキャッシュを効かせる
      const isRadio = await gate.run(() => window.isRadioProgram(contentId));
      const captionOk = await gate.run(() => window.isCaptionAvailable(contentId));
      item.dataset.oujMedia = isRadio ? 'radio' : 'tv';
      item.dataset.oujCaption = captionOk ? '1' : '0';
    }
    const status = await gate.run(() => window.getVideoViewingStatus(contentId));
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
    if (needMediaCaptionYear) {
      // 年度・コースはキャッシュ済みのvod-content(上のisRadio等が既に取得済み)から得るので基本キャッシュヒット。
      // 年度(西暦下2桁)はdetailの1行目「科目名（'YY）」形式から抽出。年度の数字は全角のことが
      // 多い(utils/year.jsのextractYearFromCategoryNameと同じ判定基準)ため、半角\dだけの
      // 正規表現では拾えず年度絞り込みの選択肢が常に空になる不具合があった。
      // コースは動画の科目(categoryId)からさらに親カテゴリ(コース)を辿って求める
      // (getCourseForSubjectId。学部/大学院 → コース → 科目 → 回の階層で、科目単体より
      // 粒度の粗いコース単位で絞り込みたいという要望のため科目そのものは使わない)
      const videoData = await gate.run(() => window.getVideoData(contentId));
      if (videoData) {
        const detailLine = (videoData.detail || '').split('\n')[0] || '';
        const yearMatch = detailLine.match(/[（(][’'‘`]?([0-9０-９]{2})[）)]/);
        if (yearMatch) item.dataset.oujYear = yearMatch[1].replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xFEE0));
        const course = videoData.categoryId ? await window.getCourseForSubjectId(videoData.categoryId) : null;
        if (course) item.dataset.oujCourseId = String(course.categoryId);
      }
    }
    item.dataset.oujClassified = 'done';
  } catch (error) {
    item.dataset.oujClassified = 'unavailable';
  }
  applyFiltersToItem(item);
  applyBadgesToItem(item);
}

// 何らかのフィルタ条件が有効になっているか(絞り込みが1つも掛かっていない「すべて表示」
// 状態かどうか)。未分類項目の暫定表示可否の判定に使う。media は両方ON(=絞り込み無し)の
// 時だけ「有効でない」扱いにする(片方だけON、または両方OFF＝0件はどちらも絞り込みが効いている)
function isAnyResultFilterActive(state) {
  return !(state.media.tv && state.media.radio) || state.captionOnly ||
    state.incompleteOnly || state.partialOnly || state.year.length > 0 || state.courseId.length > 0;
}

// 分類済みの項目にフィルター条件を適用する。
// フィルタが1つも有効でなければ、未分類・分類不能の項目も判定を待たずそのまま表示する
// (絞り込みが無いなら隠す理由が無い)。
// 一方、フィルタが有効な間は未分類の項目を暫定的に表示せず、分類完了まで隠す。
// これは「未分類の項目もとりあえず表示し、分類完了後に対象外と判明したら隠す」という
// 以前の実装だと、スクロールにつれて表示済みの項目が次々と脱落し、下の項目が繰り上がる
// ことで一覧の並びが入れ替わったように見えてしまう不具合があったため
// (実際に報告された不具合)。分類完了まで隠すことで、対象外の項目がそもそも表示されず、
// 該当すると判明した項目だけが順次追加表示される自然な挙動になる
function applyFiltersToItem(item, state) {
  if (!state) state = getSearchFilterState(document.querySelector(SEARCH_RESULT_FILTER_LIST_SELECTOR));
  if (item.dataset.oujClassified !== 'done') {
    item.dataset.oujFilterHidden = isAnyResultFilterActive(state) ? 'true' : 'false';
    window.updateSearchResultItemVisibility(item);
    return;
  }
  let hidden = false;
  if (isMediaFilterHidden(item.dataset.oujMedia, state.media)) hidden = true;
  if (state.captionOnly && item.dataset.oujCaption !== '1') hidden = true;
  // 「未完了のみ」は視聴が完了していない(done以外＝未視聴＋視聴途中)を表示する
  if (state.incompleteOnly && item.dataset.oujWatchState === 'done') hidden = true;
  // 「視聴途中のみ」は途中まで見たものだけを表示する
  if (state.partialOnly && item.dataset.oujWatchState !== 'partial') hidden = true;
  // 年度で絞り込み（複数選択可。選択した年度のいずれかに合致すれば表示＝OR条件）
  if (state.year.length && !state.year.includes(item.dataset.oujYear)) hidden = true;
  // コースで絞り込み（複数選択可。選択したコースのいずれかに合致すれば表示＝OR条件）
  if (state.courseId.length && !state.courseId.includes(item.dataset.oujCourseId)) hidden = true;
  item.dataset.oujFilterHidden = hidden ? 'true' : 'false';
  window.updateSearchResultItemVisibility(item);
}

function applyFilters() {
  const list = document.querySelector(SEARCH_RESULT_FILTER_LIST_SELECTOR);
  if (!list) return;
  const state = getSearchFilterState(list);
  list.querySelectorAll(':scope > ion-item[role="listitem"]').forEach((item) => applyFiltersToItem(item, state));
}

// 年度・コースの選択肢は、検索結果に実際に含まれる項目の分類状況に関わらず、サイト全体の
// 授業一覧(カテゴリツリー)から一度だけ求めて使う。
// 以前は画面内に入って分類が終わった項目だけから選択肢を集めていたため、スクロールしないと
// 選択肢が増えない・全項目を分類し終えるまで「読み込み中」のままになるなど、項目数の多い
// 検索結果で不必要に待たされる不具合があった。授業一覧から直接求めれば分類を待つ必要が無く
// なるが、選択した年度・コースが今回の検索結果に1件も無く0件表示になることはある(許容する)。
// 検索ボックスの絞り込みパネル(search-box-filter-panel.js)と同じ
// createYearListData/getCourseGroups(utils/year.js・utils/categories.js)を再利用するため、
// 両パネルで選択肢が一致する
let cachedYearCourseOptions = null; // { yearOptions, courseOptions } (両方揃ってから確定)
let yearCourseOptionsPromise = null;

function loadYearCourseOptions() {
  if (cachedYearCourseOptions) return Promise.resolve(cachedYearCourseOptions);
  if (yearCourseOptionsPromise) return yearCourseOptionsPromise;
  yearCourseOptionsPromise = (async () => {
    let yearOptions = [];
    let courseOptions = [];
    try {
      if (typeof window.createYearListData === 'function') {
        const { yearBuckets } = await window.createYearListData();
        yearOptions = yearBuckets.map((b) => ({ value: String(b.year).slice(-2), label: `${b.year}年度` }));
      }
    } catch (e) { /* 取得失敗時は選択肢なし(=絞り込み無し)のまま */ }
    try {
      if (typeof window.getCourseGroups === 'function') {
        const groups = await window.getCourseGroups();
        const trim = (name) => (typeof window.trimCourseName === 'function') ? window.trimCourseName(name) : name;
        // 未ログイン(ゲスト)時は「01 テレビ」「02 ラジオ」がそれぞれ独立した大分類になり、
        // その下に同名の「OCW（全15回公開）」「授業科目(等)一覧（1回分のみ公開）」が
        // 別コースとして存在する。名前だけでは区別が付かないため、同名のコースが複数ある
        // 場合に限り所属する大分類名を付記して区別する。特定の文言(「テレビ」「OCW」等)を
        // 直接ハードコードすると表記が変わった時に効かなくなるため、あくまで名前の衝突検出で
        // 判定する(衝突していない通常の学部/大学院配下のコースには何も付けない)
        const raw = [];
        groups.forEach((g) => g.courses.forEach((c) => raw.push({ value: String(c.categoryId), label: trim(c.name), groupLabel: trim(g.parentName) })));
        const labelCounts = new Map();
        raw.forEach((c) => labelCounts.set(c.label, (labelCounts.get(c.label) || 0) + 1));
        raw.forEach((c) => {
          const label = labelCounts.get(c.label) > 1 ? `${c.label}（${c.groupLabel}）` : c.label;
          courseOptions.push({ value: c.value, label });
        });
        courseOptions.sort((a, b) => a.label.localeCompare(b.label, 'ja'));
      }
    } catch (e) { /* 取得失敗時は選択肢なし(=絞り込み無し)のまま */ }
    cachedYearCourseOptions = { yearOptions, courseOptions };
    return cachedYearCourseOptions;
  })();
  return yearCourseOptionsPromise;
}

// --- 並び替え機能 ---
// 「未視聴を優先」「視聴途中を優先」は全項目の分類(サーバーリクエスト)が必要になるため、
// ページ表示時に自動実行はせず、ユーザーがチップを明示的にクリックした時だけ発火させる。
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

// 'default'(サイト表示順) | 'newest'(新しい順) | 'unwatched'(未視聴を優先) | 'partial'(視聴途中を優先)
async function applySearchResultSort(list) {
  const sortMode = list.oujSortMode || 'default';
  const items = Array.from(list.querySelectorAll(':scope > ion-item[role="listitem"]'));
  if (items.length === 0) return;

  // 視聴状況で並べ替えるモードは全項目の視聴状況(サーバーリクエスト)が必要
  if (sortMode === 'unwatched' || sortMode === 'partial') {
    // 未分類の項目だけをまとめて分類する。既存のgateを共有し同時実行数を抑える
    const gate = list.__oujFilterGate || window.createConcurrencyGate(4);
    const context = list.oujFilterContext || 'search';
    // IntersectionObserverによって既に分類中(pending)の項目は、ここで再度
    // classifySearchResultItemを呼ぶと同じcontentIdへの分類リクエストが二重に走って
    // しまう。既存の分類Promiseがあればそれを待ち、無い項目だけ新規に分類する
    const needsClassification = items.filter((item) => item.dataset.oujClassified !== 'done' && item.dataset.oujClassified !== 'unavailable');
    await Promise.all(needsClassification.map((item) => {
      if (item.dataset.oujClassified === 'pending' && item.__oujClassifyPromise) {
        return item.__oujClassifyPromise;
      }
      item.dataset.oujClassified = 'pending';
      const promise = classifySearchResultItem(item, gate, context);
      item.__oujClassifyPromise = promise;
      return promise;
    }));
  }

  // 視聴状況の優先度で並べ替える。同順位内はサイト表示順を保つ
  const sortByWatchStateRank = (stateRank) =>
    items.slice().sort((a, b) => {
      const rankA = stateRank(a);
      const rankB = stateRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return Number(a.dataset.oujSiteOrder || 0) - Number(b.dataset.oujSiteOrder || 0);
    });

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
    sorted = sortByWatchStateRank((item) => {
      if (item.dataset.oujWatchState === 'done') return 2;
      if (item.dataset.oujWatchState === 'partial') return 1;
      return 0;
    });
  } else if (sortMode === 'partial') {
    // 視聴途中 → 未視聴 → 視聴済み の順に並べる（続きを見たいものを最優先）
    sorted = sortByWatchStateRank((item) => {
      if (item.dataset.oujWatchState === 'partial') return 0;
      if (item.dataset.oujWatchState === 'done') return 2;
      return 1;
    });
  } else {
    sorted = items.slice().sort((a, b) => Number(a.dataset.oujSiteOrder || 0) - Number(b.dataset.oujSiteOrder || 0));
  }

  sorted.forEach((item) => list.appendChild(item));
}

function buildFilterChip(label, isActive, onClick, activeColor = '#1976d2') {
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
    border: 1px solid ${isActive ? activeColor : '#ddd'};
    background: ${isActive ? activeColor : '#fff'};
    color: ${isActive ? '#fff' : '#333'};
    transition: background 0.2s, border-color 0.2s;
  `;
  chip.onmouseenter = () => {
    if (!isActive) chip.style.background = '#f0f0f0';
  };
  chip.onmouseleave = () => {
    chip.style.background = isActive ? activeColor : '#fff';
  };
  chip.onclick = onClick;
  return chip;
}

function renderFilterBar(list) {
  const old = document.getElementById('search-result-filter-bar');
  if (old) old.remove();

  const context = (list && list.oujFilterContext) || 'search';
  const isVideoSelect = context === 'video-select';
  const state = getSearchFilterState(list);
  const bar = document.createElement('div');
  bar.id = 'search-result-filter-bar';
  bar.style.cssText = `
    padding: 12px 16px 0 16px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  `;

  // 媒体・字幕・年度・コース・最近の検索は video-select(1科目の回一覧)では意味がないので出さない
  if (!isVideoSelect) {
    // テレビ/ラジオは他のAND条件チップと違いOR条件(どちらかON、両方ONで両方表示)なので独立トグルにする
    bar.appendChild(
      buildFilterChip('テレビ番組', state.media.tv, () => {
        window.saveSetting(SEARCH_FILTER_SETTINGS_KEYS.media, { tv: !state.media.tv, radio: state.media.radio });
        renderFilterBar(list);
        applyFilters();
      }, MEDIA_FILTER_CHIP_COLOR)
    );
    bar.appendChild(
      buildFilterChip('ラジオ番組', state.media.radio, () => {
        window.saveSetting(SEARCH_FILTER_SETTINGS_KEYS.media, { tv: state.media.tv, radio: !state.media.radio });
        renderFilterBar(list);
        applyFilters();
      }, MEDIA_FILTER_CHIP_COLOR)
    );

    bar.appendChild(
      buildFilterChip('字幕ありのみ', state.captionOnly, () => {
        window.saveSetting(SEARCH_FILTER_SETTINGS_KEYS.captionOnly, !state.captionOnly);
        renderFilterBar(list);
        applyFilters();
      })
    );
  }

  bar.appendChild(
    buildFilterChip('未完了のみ', state.incompleteOnly, () => {
      window.saveSetting(SEARCH_FILTER_SETTINGS_KEYS.incompleteOnly, !state.incompleteOnly);
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

  if (!isVideoSelect) bar.appendChild(buildYearCourseRow(list));
  bar.appendChild(buildSortRow(list));

  if (!isVideoSelect) {
    const keywordRow = buildSearchKeywordHistoryRow(list);
    if (keywordRow) bar.appendChild(keywordRow);
  }

  list.parentNode.insertBefore(bar, list);

  // サイト純正の並び替えドロップダウン(ion-item.sort)を隠す。拡張の「並び替え」行と
  // 二重になって紛らわしいため一本化する。純正のsort要素は検索結果と回一覧(=拡張の
  // 並び替え行を出すページ)にだけ存在し、科目一覧など他ページには無いことを実機で確認済み。
  // 純正の既定は「タイトル順」で、これが拡張の「サイト表示順」に相当するため、タイトル順の
  // 並びは失われない。サーバー再取得を伴う純正の切替を隠すことでサーバー負荷も抑えられる。
  hideNativeSortControl();
}

// サイト純正の並び替えUI(ion-item.sort)を非表示にする。Angularの再描画で作り直される
// ことがあるため、都度クエリして隠す(renderFilterBarとリスト変化監視の両方から呼ぶ)。
function hideNativeSortControl() {
  document.querySelectorAll('ion-item.sort').forEach((el) => {
    if (el.style.display !== 'none') el.style.display = 'none';
  });
}

// 年度・コースのチェックボックス複数選択ドロップダウン。選択肢が5〜30件程度と多く、
// テレビ/ラジオのような独立チップ方式では並べきれないため、ボタンをクリックすると
// チェックボックス一覧が開くカスタムドロップダウンにする。
// options: [{value, label}] / selected: 選択値の配列（呼び出し元が保持する配列を直接
// 書き換える。参照を保つことで、renderFilterBarを経由しない再描画(oujSetOptions)でも
// 選択状態を見失わない）
// isLoading: trueの間は選択肢0件でも「選択肢がありません」ではなく「読み込み中...」を出す。
// 分類はページ内の項目を画面内に入るたびに遅延実行するため、表示直後は大半が未分類で
// 選択肢が一時的に0件になる。この間も「選択肢がありません」と表示すると、後から分類が
// 進んで選択肢が増えても既にドロップダウンを閉じたユーザーには「選べない」ように見えて
// しまう(実際に報告された不具合)。分類中は区別して案内する
function buildMultiSelectDropdown({ label, options, selected, onChange, isLoading = false }) {
  let currentOptions = options;
  let currentIsLoading = isLoading;

  const wrapper = document.createElement('div');
  wrapper.className = 'ouj-multiselect';
  wrapper.style.cssText = 'position:relative;display:inline-block;';

  const button = document.createElement('button');
  button.type = 'button';
  button.style.cssText = 'font-size:13px;padding:5px 8px;border:1px solid #ddd;border-radius:8px;background:#fff;color:#333;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;text-align:left;';

  const panel = document.createElement('div');
  panel.className = 'ouj-multiselect-panel';
  panel.style.cssText = 'display:none;position:absolute;top:100%;left:0;z-index:100;margin-top:2px;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-height:260px;overflow-y:auto;min-width:180px;padding:4px 0;';

  function updateButtonText() {
    if (selected.length === 0) button.textContent = `${label}: すべて`;
    else if (selected.length === 1) {
      const opt = currentOptions.find((o) => o.value === selected[0]);
      button.textContent = `${label}: ${opt ? opt.label : selected[0]}`;
    } else button.textContent = `${label}: ${selected.length}件選択中`;
  }

  function renderPanelRows() {
    panel.innerHTML = '';
    if (currentOptions.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = currentIsLoading ? '読み込み中...' : '選択肢がありません';
      empty.style.cssText = 'padding:6px 12px;font-size:13px;color:#999;';
      panel.appendChild(empty);
      return;
    }
    currentOptions.forEach((opt) => {
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 12px;font-size:13px;color:#333;cursor:pointer;white-space:nowrap;';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selected.includes(opt.value);
      checkbox.addEventListener('change', () => {
        const idx = selected.indexOf(opt.value);
        if (checkbox.checked && idx === -1) selected.push(opt.value);
        else if (!checkbox.checked && idx !== -1) selected.splice(idx, 1);
        updateButtonText();
        onChange();
      });
      row.appendChild(checkbox);
      const text = document.createElement('span');
      text.textContent = opt.label;
      row.appendChild(text);
      panel.appendChild(row);
    });
  }

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = panel.style.display === 'none';
    // 他に開いているドロップダウンがあれば閉じる（年度・コースを同時に開かせない）
    document.querySelectorAll('.ouj-multiselect-panel').forEach((p) => { p.style.display = 'none'; });
    panel.style.display = willOpen ? 'block' : 'none';
  });

  wrapper.appendChild(button);
  wrapper.appendChild(panel);
  updateButtonText();
  renderPanelRows();
  ensureMultiSelectOutsideClickHandler();

  // 年度・コースは選択肢の取得(loadYearCourseOptions)が非同期のため、外部から
  // 開閉状態を保ったまま選択肢一覧・読み込み中フラグを後から差し替えられるようにする
  wrapper.oujSetOptions = (newOptions, newIsLoading = false) => {
    currentOptions = newOptions;
    currentIsLoading = newIsLoading;
    updateButtonText();
    renderPanelRows();
  };

  return wrapper;
}

// ドロップダウンの外側をクリックしたら開いているパネルを閉じる。パネルは
// renderFilterBarのたびに作り直されるため、リスナーはページに1つだけ登録する
function ensureMultiSelectOutsideClickHandler() {
  if (window.__oujMultiSelectOutsideClickInit) return;
  window.__oujMultiSelectOutsideClickInit = true;
  document.addEventListener('mousedown', (event) => {
    document.querySelectorAll('.ouj-multiselect-panel').forEach((panel) => {
      if (panel.style.display === 'none') return;
      const wrapper = panel.parentElement;
      if (wrapper && wrapper.contains(event.target)) return;
      panel.style.display = 'none';
    });
  }, true);
}

// 年度・コースの絞り込み行。選択肢はサイト全体の授業一覧(loadYearCourseOptions)から取得する。
// 初回はキャッシュがまだ無いため非同期取得を待つ間「読み込み中」を出し、取得できた時点で
// 差し替える。以降は再検索してもキャッシュを再利用するため即座に選択肢が揃う。複数選択可（OR条件）
function buildYearCourseRow(list) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;width:100%;margin-top:4px;';

  const isLoaded = !!cachedYearCourseOptions;

  const label = document.createElement('span');
  label.textContent = '絞り込み:';
  label.style.cssText = 'font-size:13px;color:#666;';
  row.appendChild(label);

  if (!Array.isArray(list.oujYearFilter)) list.oujYearFilter = [];
  if (!Array.isArray(list.oujCourseFilter)) list.oujCourseFilter = [];

  const yearDropdown = buildMultiSelectDropdown({
    label: '年度',
    options: isLoaded ? cachedYearCourseOptions.yearOptions : [],
    selected: list.oujYearFilter,
    onChange: applyFilters,
    isLoading: !isLoaded,
  });
  yearDropdown.id = 'search-filter-year';
  row.appendChild(yearDropdown);

  const courseDropdown = buildMultiSelectDropdown({
    label: 'コース',
    options: isLoaded ? cachedYearCourseOptions.courseOptions : [],
    selected: list.oujCourseFilter,
    onChange: applyFilters,
    isLoading: !isLoaded,
  });
  courseDropdown.id = 'search-filter-course';
  row.appendChild(courseDropdown);

  if (!isLoaded) {
    loadYearCourseOptions().then((options) => {
      if (yearDropdown.oujSetOptions) yearDropdown.oujSetOptions(options.yearOptions, false);
      if (courseDropdown.oujSetOptions) courseDropdown.oujSetOptions(options.courseOptions, false);
    });
  }

  return row;
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

// 並び替えチップ行。「未視聴を優先」「視聴途中を優先」は全項目の分類(サーバーリクエスト)が
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
    { value: 'partial', label: '視聴途中を優先' },
  ];
  sortOptions.forEach(({ value, label: optionLabel }) => {
    row.appendChild(
      buildFilterChip(optionLabel, sortMode === value, async () => {
        if (list.oujSortMode === value && !list.oujSortLoading) return;
        list.oujSortMode = value;
        list.oujSortLoading = value === 'unwatched' || value === 'partial';
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

function startSearchFilterObserver(context = 'search') {
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
        // applySearchResultSort等、他の呼び出し元が同じ項目を再分類せず
        // このPromiseを待てるように保持しておく
        item.__oujClassifyPromise = classifySearchResultItem(item, gate, context);
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

// 1つの#common-list-content要素にフィルターバーと監視をセットアップする。
// バーが消えている時の貼り直しでも再利用するため、要素単位で冪等に作る。
function setupSearchFilterBarOnList(list, context) {
  list.oujFilterContext = context;
  list.oujSortMode = 'default';
  list.oujSortLoading = false;
  const observer = startSearchFilterObserver(context);
  list.__oujFilterGate = observer.__oujGate;
  renderFilterBar(list);
  registerItemsForClassification(observer, list);

  // 無限スクロールで追加される項目にも監視対象を広げる。あわせて、このリストへの流し込みと
  // 同じタイミングでバーが消えた場合にも入れ直す(itemが流し込まれる=検索/回一覧ページなので安全)。
  // 監視は要素ごとに1度だけ張る(oujFilterObserverAttachedは要素単位のフラグ)。
  if (list.oujFilterObserverAttached) return;
  list.oujFilterObserverAttached = true;
  const mutationObserver = new MutationObserver(() => {
    if (!document.getElementById('search-result-filter-bar')) {
      renderFilterBar(list);
    }
    // 検索結果の流し込み・再描画のたびに純正の並び替えが復活しうるので隠し直す
    hideNativeSortControl();
    registerItemsForClassification(observer, list);
  });
  mutationObserver.observe(list, { childList: true });
}

// contextは 'search'(検索結果ページ) | 'video-select'(科目内の回一覧ページ)。
// video-selectでは検索キーワード履歴の記録・媒体/字幕/年度/コースフィルタを行わない
function initializeSearchResultFilters(context = 'search') {
  // 検索キーワードを履歴に記録（「最近の検索」チップ用。検索結果ページのみ）
  if (context === 'search') recordSearchKeyword();
  window.waitForElement(SEARCH_RESULT_FILTER_LIST_SELECTOR, (list) => {
    setupSearchFilterBarOnList(list, context);

    // 科目一覧(ca=)など、前ページの空の#common-list-contentが残っている状態から検索へ
    // 遷移すると、waitForElementはその古い空リストへ即コールバックする。Angularはその後
    // #common-list-content要素を検索結果用の新しい要素に「置き換える」ため、古い要素へ挿した
    // バーは新要素には無いまま残る(古い要素はDOMから外れる)。そこで描画が落ち着くまでの数秒間、
    // 同一URL(=まだこの検索ページ)である限り、現在の#common-list-contentにバーが無ければ
    // その時点の要素に対して貼り直す。別ページへ移動したらURLが変わるので何もしない
    // (content.js側が正しいバーを作り直す)。
    const startUrl = window.location.href;
    [120, 350, 700, 1400, 2800].forEach((ms) => setTimeout(() => {
      if (window.location.href !== startUrl) return;
      if (document.getElementById('search-result-filter-bar')) return;
      const current = document.querySelector(SEARCH_RESULT_FILTER_LIST_SELECTOR);
      if (current) setupSearchFilterBarOnList(current, context);
    }, ms));
  });
}

// 検索結果ページを開いている状態で、検索ボックスのクイック絞り込みパネル
// (search-box-filter-panel.js)からプリセットのトグルが変更された時に、
// 下部のフィルターバーと一覧表示を即座に追従させるためのヘルパー。
// 検索結果ページ以外ではlistが無いので何もしない。
function refreshSearchResultFilterUI() {
  // 既にフィルターバーが出ているページ(＝検索結果/回一覧)でのみ追従させる。
  // コース一覧など#common-list-contentだけ存在するページで新たにバーを出さないよう、
  // バーの有無で判定する（SPA遷移時のバー除去はcontent.jsが行う）
  if (!document.getElementById('search-result-filter-bar')) return;
  const list = document.querySelector(SEARCH_RESULT_FILTER_LIST_SELECTOR);
  if (!list) return;
  renderFilterBar(list);
  applyFilters();
}

window.initializeSearchResultFilters = initializeSearchResultFilters;
window.refreshSearchResultFilterUI = refreshSearchResultFilterUI;
// 検索ボックスのクイック絞り込みパネルから再利用する設定キー・履歴キー・チップ生成関数
window.OUJ_SEARCH_FILTER_KEYS = SEARCH_FILTER_SETTINGS_KEYS;
window.OUJ_SEARCH_KEYWORD_HISTORY_KEY = SEARCH_KEYWORD_HISTORY_KEY;
window.buildOujFilterChip = buildFilterChip;
// page-course-select-filters.jsの年度絞り込み(複数選択)から再利用する
window.buildOujMultiSelectDropdown = buildMultiSelectDropdown;
window.getOujMediaFilterState = getMediaFilterState;
window.OUJ_MEDIA_FILTER_CHIP_COLOR = MEDIA_FILTER_CHIP_COLOR;
