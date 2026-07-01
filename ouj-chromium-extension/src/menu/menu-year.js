// 年度別機能（menu.jsから分離）
// カテゴリ名末尾の（'XX）から年度を抽出し、年度ごとのフォルダとして
// ネイティブなカテゴリー一覧ページ（右ペイン）と同じ見た目で表示する

const YEAR_RANGE_SIZE = 10; // 表示する年度数（当年を含む）

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

  categories.forEach((category) => {
    // 親として使われているカテゴリはフォルダであり、科目そのものではないので除外
    if (parentIdSet.has(category.categoryId)) return;
    const year = extractYearFromCategoryName(category.name);
    if (year === null || !buckets[year]) return;
    buckets[year].push(category);
  });

  const yearBuckets = years.map((year) => ({
    year,
    courses: buckets[year].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  }));

  return { yearBuckets };
}

// ネイティブのカテゴリー一覧ページと同じクラス構成のHTMLを組み立てる
function createYearShellHtml({ breadcrumbHtml, listHtml }) {
  return `
    <div class="scroll-content">
      <list-title>
        <div class="common-outer-main-content-area">
          <ion-title class="page-list-title common-list-title-bottom title title-md">
            <div class="toolbar-title toolbar-title-md">
              <span class="list-title-span" role="heading">動画</span>
            </div>
          </ion-title>
        </div>
      </list-title>
      <vod-list-navigator>
        <aside role="complementary">
          <div class="breadcrumbs">
            <ul aria-label="カテゴリーのパンくずリスト">${breadcrumbHtml}</ul>
          </div>
          <ion-list class="vod-category-list list list-md" id="year-category-list" role="list" aria-label="カテゴリー">
            ${listHtml}
          </ion-list>
        </aside>
      </vod-list-navigator>
      <div role="main"></div>
    </div>
  `;
}

function buildYearFolderItemHtml(bucket) {
  // id="link-item-button" はサイト側のCSS（button#link-item-button）が
  // ボタンの背景を透明・全面リセットするために必要。外すとブラウザ標準の
  // 灰色ボタンが見えてしまう（ネイティブページも同じidを重複させて使っている）
  return `
    <ion-item class="item item-block item-md" role="listitem">
      <div class="item-inner">
        <div class="input-wrapper">
          <ion-label class="label label-md">
            <button class="child-category-button year-folder-button" id="link-item-button" data-year="${bucket.year}">
              <div class="icon-text">
                <div aria-hidden="true" class="icon-area">
                  <ion-icon name="folder" role="img" class="icon icon-md ion-md-folder item-icon" aria-label="folder"></ion-icon>
                </div>
                <div class="text-area">${bucket.year}年度（${bucket.courses.length}件）</div>
              </div>
            </button>
          </ion-label>
        </div>
      </div>
      <div class="button-effect"></div>
    </ion-item>
  `;
}

function buildYearCourseItemHtml(course) {
  const isFav = window.isFavorite(course.categoryId);
  const iconName = isFav ? 'star' : 'star-outline';
  const iconClass = isFav ? 'ion-md-star' : 'ion-md-star-outline';
  const summary = (course.summary || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // お気に入りボタンは<span role="button">にする。<button>の中に<button>を
  // ネストするとHTML仕様違反になり、innerHTMLで挿入した際にブラウザが外側の
  // buttonを強制的に閉じてタグ構造ごと崩れてしまう（ネイティブページはAngularが
  // DOM APIで直接ノードを組み立てているためこの自動修復が起きず問題にならない）
  return `
    <ion-item class="item item-block item-md" role="listitem">
      <div class="item-inner">
        <div class="input-wrapper">
          <ion-label class="label label-md">
            <button class="child-category-button year-course-button" id="link-item-button" data-category-id="${course.categoryId}">
              <div class="icon-text">
                <div aria-hidden="true" class="icon-area">
                  <ion-icon name="folder" role="img" class="icon icon-md ion-md-folder item-icon" aria-label="folder"></ion-icon>
                </div>
                <div class="text-area">${course.name}</div>
                <span class="favorite-btn" role="button" tabindex="0" title="お気に入り" data-category-id="${course.categoryId}" style="display: inline-flex; align-items: center; justify-content: center; padding: 2px 16px; border: none; background: transparent; cursor: pointer; border-radius: 8px; transition: background 0.2s; margin-left: 8px;">
                  <ion-icon name="${iconName}" class="icon icon-md ${iconClass} item-icon" aria-label="お気に入り" style="font-size:24px;"></ion-icon>
                </span>
              </div>
              ${summary ? `<div class="sub-icon-text"><div class="icon-area"></div><div class="text-area">${summary}</div></div>` : ''}
            </button>
          </ion-label>
        </div>
      </div>
      <div class="button-effect"></div>
    </ion-item>
  `;
}

let oujYearOverlayCleanup = null;

function removeYearOverlay() {
  const overlay = document.getElementById('ouj-year-overlay');
  if (overlay) overlay.remove();
  if (oujYearOverlayCleanup) {
    oujYearOverlayCleanup();
    oujYearOverlayCleanup = null;
  }
}

async function handleYearMenuOpen() {
  removeYearOverlay();
  const mainEl = document.getElementById('main');
  if (!mainEl) return;

  // #mainがposition:staticのままだと、オーバーレイのposition:absoluteが
  // body基準になってしまい右ペインからずれるため、position:relativeにしておく
  if (window.getComputedStyle(mainEl).position === 'static') {
    mainEl.style.position = 'relative';
  }

  const overlay = document.createElement('div');
  overlay.id = 'ouj-year-overlay';
  Object.assign(overlay.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    zIndex: '20',
    background: '#fff',
    overflowY: 'auto'
  });
  overlay.innerHTML = createYearShellHtml({
    breadcrumbHtml: '<li class="child-breadcrumb"><a href="javascript:void(0);">年度別</a></li>',
    listHtml: '<div style="padding:16px;color:#666;">読み込み中...</div>'
  });
  mainEl.appendChild(overlay);

  function renderFolders(yearBuckets) {
    let listHtml = yearBuckets.map(buildYearFolderItemHtml).join('');
    if (!listHtml) listHtml = '<div style="padding:16px;color:#666;">対象期間の講義が見つかりませんでした</div>';
    overlay.innerHTML = createYearShellHtml({
      breadcrumbHtml: '<li class="child-breadcrumb"><a href="javascript:void(0);">年度別</a></li>',
      listHtml
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
    let listHtml = bucket.courses.map(buildYearCourseItemHtml).join('');
    if (!listHtml) listHtml = '<div style="padding:16px;color:#666;">この年度の講義はありません</div>';
    overlay.innerHTML = createYearShellHtml({
      breadcrumbHtml: `
        <li class="child-breadcrumb"><a href="javascript:void(0);" id="year-breadcrumb-root">年度別</a></li>
        <li class="child-breadcrumb"><a href="javascript:void(0);">${bucket.year}年度</a></li>
      `,
      listHtml
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
          removeYearOverlay();
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

  const { yearBuckets } = await createYearListData();
  // オーバーレイが（ナビゲーション等で）既に閉じられていれば描画しない
  if (!document.body.contains(overlay)) return;
  renderFolders(yearBuckets);

  const closeOnNavigate = () => removeYearOverlay();
  window.addEventListener('hashchange', closeOnNavigate);
  window.addEventListener('popstate', closeOnNavigate);
  const closeOnOutsideClick = (event) => {
    // event.targetではなくcomposedPath()を使う。年度フォルダをクリックすると
    // renderCourses()がoverlay.innerHTMLを書き換えてクリック元のボタンをDOMから
    // 切り離すため、その後に発火するこのハンドラでevent.targetを見るとoverlay外
    // 判定になり、表示した講義一覧を直後に消してしまう不具合があった。
    // composedPath()はイベント発火時点の経路を保持するため、この問題が起きない。
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    if (!path.includes(overlay)) removeYearOverlay();
  };
  setTimeout(() => {
    document.addEventListener('click', closeOnOutsideClick);
  }, 100);

  oujYearOverlayCleanup = () => {
    window.removeEventListener('hashchange', closeOnNavigate);
    window.removeEventListener('popstate', closeOnNavigate);
    document.removeEventListener('click', closeOnOutsideClick);
  };
}

// グローバルwindowに関数を公開
window.extractYearFromCategoryName = extractYearFromCategoryName;
window.createYearListData = createYearListData;
window.handleYearMenuOpen = handleYearMenuOpen;
