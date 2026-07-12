// 年度データのヘルパー（utils）
// カテゴリ名末尾の（'XX）から年度を抽出し、年度ごとに科目をまとめる。
// かつては専用のメニューパネル（年度別一覧）を描画していたが、検索ボックスの
// 絞り込みパネルで年度指定ができるようになったためパネルは廃止し、データ生成
// ロジックだけをutilsとして残した。現在の利用元:
//   - search-box-filter-panel.js（年度セレクトの選択肢）… createYearListData
//   - page-course-select-filters.js（科目一覧の年度絞り込み）… extractYearFromCategoryName
// categories.jsに依存するため、manifestのロード順はcategories.jsより後にする。

const YEAR_RANGE_SIZE = 15; // 対象とする年度数（当年を含む）

/**
 * 科目名末尾の（'XX）形式から年度（西暦）を抽出する
 * 全角/半角の数字、複数種のアポストロフィ（' ’ ‘ `）に対応する
 * @param {string} name - カテゴリ（科目）名
 * @returns {number|null} 西暦年度、抽出できない場合はnull
 */
function extractYearFromCategoryName(name) {
  if (!name) return null;
  const match = name.match(/[（(][’'‘`]([0-9０-９]{2})[）)]/);
  if (!match) return null;
  const halfWidthDigits = match[1].replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xFEE0));
  const twoDigitYear = parseInt(halfWidthDigits, 10);
  if (Number.isNaN(twoDigitYear)) return null;
  return 2000 + twoDigitYear;
}

/**
 * カテゴリのalias（例:「1570390a」）先頭の数字部分を取り出す
 * 同じ講義が複数カテゴリ（学部の異なるコース等）に重複登録されている場合、
 * 末尾のアルファベット違いで別カテゴリIDになっているだけのことが多い。
 * menu-recommendation.jsのおすすめ動画重複回避と同じ判定基準。
 * @param {Object} category
 * @returns {string|null}
 */
function extractCategoryAliasNumber(category) {
  const match = (category.alias || '').match(/^[0-9]+/);
  return match ? match[0] : null;
}

/**
 * 年度ごとにまとめた科目データ（各年度に属する科目一覧）を生成する
 */
async function createYearListData() {
  const categories = await window.getCategoriesData();
  if (!Array.isArray(categories)) return { yearBuckets: [] };

  const parentIds = await window.categoriesUsedAsParent();
  const parentIdSet = new Set(parentIds);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: YEAR_RANGE_SIZE }, (_, i) => currentYear - i);
  const buckets = {};
  years.forEach((year) => { buckets[year] = []; });

  // 同じ講義が複数カテゴリに重複登録されている場合、片方だけを表示する
  const usedAliasNumbers = new Set();
  categories.forEach((category) => {
    // 親として使われているカテゴリはフォルダであり、科目そのものではないので除外
    if (parentIdSet.has(category.categoryId)) return;
    const year = extractYearFromCategoryName(category.name);
    if (year === null || !buckets[year]) return;
    const aliasNum = extractCategoryAliasNumber(category);
    if (aliasNum) {
      if (usedAliasNumbers.has(aliasNum)) return;
      usedAliasNumbers.add(aliasNum);
    }
    buckets[year].push(category);
  });

  // 講義が1件もない年度は選択肢に出しても意味がないため除外する
  const yearBuckets = years
    .map((year) => ({
      year,
      courses: buckets[year].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
    }))
    .filter((bucket) => bucket.courses.length > 0);

  return { yearBuckets };
}

// グローバルwindowに関数を公開
window.extractYearFromCategoryName = extractYearFromCategoryName;
window.createYearListData = createYearListData;
