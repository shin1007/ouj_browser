// 検索結果ページの重複表示を非表示にする機能
//
// 放送大学の科目には、同じ講義が別カテゴリ（例:「情報コース」と「心理と教育コース」）に
// 別のコンテンツIDで重複登録されているものがある。検索結果には両方が出てきてしまい、
// 見た目上まったく同じ講義が2件並ぶことがある。
// 一覧ページ各項目の「01 教養学部 > 07 情報コース > 021 ユーザ調査法（'20） 1570390a」
// のようなパンくずラベル末尾の数字（エイリアス番号。末尾のアルファベット違いは同一講義の
// 別登録を示す）が同じで、かつタイトルが同一なら同一講義とみなして片方を隠す。
// これはmenu-recommendation.js（おすすめ動画の重複回避）で使っているのと同じ判定基準。

const SEARCH_RESULT_LIST_SELECTOR = '#common-list-content';

function getSearchResultDedupKey(item) {
    const categoryLabel = item.querySelector('.content-category');
    const titleEl = item.querySelector('.title');
    if (!categoryLabel || !titleEl) return null;
    const aliasMatch = categoryLabel.textContent.trim().match(/([0-9]+)[A-Za-z]?\s*$/);
    if (!aliasMatch) return null;
    const title = titleEl.textContent.trim();
    if (!title) return null;
    return `${aliasMatch[1]}::${title}`;
}

// 重複排除機能と絞り込みチップ機能(page-search-result-filters.js)がどちらも
// item.style.displayを直接書き換えると、互いの非表示状態を上書きしてしまう。
// そのため各機能はdataset(oujDupHidden/oujFilterHidden)に自分の判定結果だけを
// 記録し、最終的な表示切り替えはこの共通関数に一本化する。
function updateSearchResultItemVisibility(item) {
    const hidden = item.dataset.oujDupHidden === 'true' || item.dataset.oujFilterHidden === 'true';
    item.style.display = hidden ? 'none' : '';
}

function hideDuplicateSearchResults() {
    const list = document.querySelector(SEARCH_RESULT_LIST_SELECTOR);
    if (!list) return;
    const seenKeys = new Set();
    list.querySelectorAll(':scope > ion-item[role="listitem"]').forEach((item) => {
        const key = getSearchResultDedupKey(item);
        if (!key) {
            item.dataset.oujDupHidden = 'false';
            updateSearchResultItemVisibility(item);
            return;
        }
        if (seenKeys.has(key)) {
            item.dataset.oujDupHidden = 'true';
        } else {
            seenKeys.add(key);
            item.dataset.oujDupHidden = 'false';
        }
        updateSearchResultItemVisibility(item);
    });
}

// 検索結果一覧は無限スクロールで随時項目が追加され、並び替えでも再描画されるため、
// MutationObserverで一覧の変化を監視し続けて都度重複排除をかけ直す。
function startSearchResultDedupObserver() {
    window.waitForElement(SEARCH_RESULT_LIST_SELECTOR, (list) => {
        hideDuplicateSearchResults();
        if (list.oujDedupObserverAttached) return;
        list.oujDedupObserverAttached = true;
        const observer = new MutationObserver(() => {
            hideDuplicateSearchResults();
        });
        observer.observe(list, { childList: true });
    });
}

window.startSearchResultDedupObserver = startSearchResultDedupObserver;
window.updateSearchResultItemVisibility = updateSearchResultItemVisibility;
