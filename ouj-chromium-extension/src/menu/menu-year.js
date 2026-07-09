// 年度別機能（menu.jsから分離）
// カテゴリ名末尾の（'XX）から年度を抽出し、年度ごとのフォルダとして
// ネイティブなカテゴリー一覧ページ（右ペイン）と同じ見た目で表示する
// オーバーレイの共通基盤はmenu-native-shell.jsを利用する

const YEAR_RANGE_SIZE = 15; // 表示する年度数（当年を含む）

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
 * 年度別のフォルダデータ（各年度に属する科目一覧）を生成する
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

  // 講義が1件もない年度はタップしても何も出せず無駄なフォルダになるため一覧から除外する
  const yearBuckets = years
    .map((year) => ({
      year,
      courses: buckets[year].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
    }))
    .filter((bucket) => bucket.courses.length > 0);

  return { yearBuckets };
}

function handleYearMenuOpen() {
  window.openNativeOverlay((overlay) => {
    function renderFolders(yearBuckets) {
      const itemsHtml = yearBuckets.map((bucket) => window.buildNativeCategoryItemHtml({
        text: `${bucket.year}年度（${bucket.courses.length}件）`,
        buttonClass: 'year-folder-button',
        dataAttrs: { year: bucket.year }
      })).join('');
      overlay.innerHTML = window.renderNativeShellHtml({
        breadcrumbHtml: window.buildNativeBreadcrumbHtml([{ text: '年度別' }]),
        asideListHtml: itemsHtml || '<div style="padding:16px;color:#666;">対象期間の講義が見つかりませんでした</div>'
      });
      overlay.querySelectorAll('.year-folder-button').forEach((btn) => {
        btn.addEventListener('click', () => {
          const year = parseInt(btn.getAttribute('data-year'), 10);
          const bucket = yearBuckets.find((b) => b.year === year);
          if (bucket) renderCourses(bucket, yearBuckets);
        });
      });
    }

    function renderCourses(bucket, yearBuckets) {
      const itemsHtml = bucket.courses.map((course) => window.buildNativeCategoryItemHtml({
        text: course.name,
        buttonClass: 'year-course-button',
        dataAttrs: { 'category-id': course.categoryId },
        extraHtml: window.buildFavoriteToggleHtml(course.categoryId, window.isFavorite(course.categoryId)),
        subText: course.summary || ''
      })).join('');
      overlay.innerHTML = window.renderNativeShellHtml({
        breadcrumbHtml: window.buildNativeBreadcrumbHtml([
          { text: '年度別', id: 'year-breadcrumb-root' },
          { text: `${bucket.year}年度` }
        ]),
        asideListHtml: itemsHtml || '<div style="padding:16px;color:#666;">この年度の講義はありません</div>'
      });

      const rootBreadcrumb = overlay.querySelector('#year-breadcrumb-root');
      if (rootBreadcrumb) {
        rootBreadcrumb.addEventListener('click', () => renderFolders(yearBuckets));
      }
      overlay.querySelectorAll('.year-course-button').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          if (event.target.closest('.favorite-btn')) return;
          const categoryId = btn.getAttribute('data-category-id');
          if (categoryId) {
            window.removeNativeOverlay();
            window.location.href = `https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=${categoryId}`;
          }
        });
      });
      overlay.querySelectorAll('.favorite-btn').forEach((favBtn) => {
        // favorite-btnは<span role="button">なので.disabledが使えず、
        // data属性で連打防止を行う
        const toggleFavorite = async (event) => {
          event.stopPropagation();
          event.preventDefault();
          if (favBtn.dataset.busy === '1') return;
          favBtn.dataset.busy = '1';
          const categoryId = favBtn.getAttribute('data-category-id');
          const newIsFavorite = await window.toggleFavorite(categoryId);
          const newIconName = newIsFavorite ? 'star' : 'star-outline';
          const newIconClass = newIsFavorite ? 'ion-md-star' : 'ion-md-star-outline';
          favBtn.innerHTML = `<ion-icon name="${newIconName}" class="icon icon-md ${newIconClass} item-icon" aria-label="お気に入り" style="font-size:24px;"></ion-icon>`;
          favBtn.dataset.busy = '';
        };
        favBtn.addEventListener('click', toggleFavorite);
        favBtn.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleFavorite(event);
          }
        });
      });
    }

    overlay.innerHTML = window.renderNativeShellHtml({
      breadcrumbHtml: window.buildNativeBreadcrumbHtml([{ text: '年度別' }]),
      asideListHtml: '<div style="padding:16px;color:#666;">読み込み中...</div>'
    });
    createYearListData().then(({ yearBuckets }) => {
      // オーバーレイが（ナビゲーション等で）既に閉じられていれば描画しない
      if (!document.body.contains(overlay)) return;
      renderFolders(yearBuckets);
    });
  });
}

// グローバルwindowに関数を公開
window.extractYearFromCategoryName = extractYearFromCategoryName;
window.createYearListData = createYearListData;
window.handleYearMenuOpen = handleYearMenuOpen;
