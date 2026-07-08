// メニュー設定
const MENU_CONFIG = {
  title: "拡張機能",
  items: [
    { id: "favorites", text: "お気に入り", icon: "star" },
    { id: "history", text: "履歴", icon: "time" },
    { id: "recommend", text: "おすすめ動画", icon: "play" },
    { id: "year", text: "年度別", icon: "calendar" },
    { id: "darkmode", text: "ダークモード", icon: "moon" }
  ]
};
const LEFT_SELECTOR = '#menu > menu-navi > ion-content > div.scroll-content > ion-content > div.scroll-content > ion-list:nth-child(3)';
const POPOVER_SELECTOR = 'body > ion-app > ion-popover > div > div.popover-content > div > menu-navi > ion-content > div.scroll-content > ion-content > div.scroll-content > ion-list:nth-child(3)';


// メニューHTMLを生成する関数
function createMenuHTML() {
  const titleHTML = `
    <ion-item aria-hidden="true" class="item-header item item-block item-md" id="menu-title">
      <div class="item-inner">
        <div class="input-wrapper"><!---->
          <ion-label class="label label-md">
            <div class="icon-text">
                <div class="top-text-area">
                  ${MENU_CONFIG.title}
                </div>
            </div>
          </ion-label>
        </div><!---->
      </div>
      <div class="button-effect"></div>
    </ion-item>
  `;
  
  const itemsHTML = MENU_CONFIG.items.map(item => `
    <ion-item class="item-selectable item item-block item-md" id="${item.id}-menu-item">
      <div class="item-inner">
        <div class="input-wrapper"><!---->
          <ion-label class="label label-md">
            <button id="link-item-button" class="">
              <div class="icon-text">
                <div class="icon-area">
                  <ion-icon aria-hidden="true" name="${item.icon}" role="img" class="icon icon-md ion-md-${item.icon} item-icon" aria-label="${item.text}">
                  </ion-icon>
                </div>
                <div class="text-area">
                  ${item.text}${item.id === 'darkmode' ? ' <span class="ouj-darkmode-current-label"></span>' : ''}
                </div>
              </div>
            </button>
          </ion-label>
        </div><!---->
      </div>
      <div class="button-effect"></div>
    </ion-item>
  `).join('');
  
  return `
    <ion-list class="menu-list list list-md" role="list" aria-label="拡張機能">
      ${titleHTML}
      ${itemsHTML}
    </ion-list>
  `;
}
function startMenuOpeningMutationObserver() {
  if (window.oujMenuOpeningObserver) {
    return;
  }
  const ionApp = document.querySelector('ion-app');
  if (!ionApp) {
    // The <ion-app> element might not be available when the script first runs.
    // Log a warning and rely on subsequent executions (e.g., from URL changes) to set up the observer.
    console.warn('[OUJ拡張] <ion-app> element not found. Popover menu observer not attached.');
    return;
  }
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // ion-popoverが開かれたかどうかをチェック
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }
        if (node.tagName.toLowerCase() === 'ion-popover') {
          // 少し遅延してからメニュー挿入を試みる
          setTimeout(() => {
            insertPopoverMenu();
          }, 100);
        }
      });
      
    });
  });
  observer.observe(ionApp, { childList: true, subtree: true });
  window.oujMenuOpeningObserver = observer;
}
// ロゴを待ってメニューを挿入する処理
function insertLeftMenu() {
  // 重要な関数が設定されていなければ再実行
  if (typeof window.waitForElement !== 'function') {
    setTimeout(insertLeftMenu, 100);
    return;
  }
  // 重複挿入防止
  if (window.isLeftMenuInProgress) return;
  window.isLeftMenuInProgress = true;
  
  // ロゴの存在確認
  window.waitForElement('img.logo-img[src="./assets/images/icon_logo.png"]', (logo) => {
    try {
      // 既にメニューが存在する場合はスキップ（aria-labelで検索）
      insertMenu(LEFT_SELECTOR)
    } finally {
      // 挿入処理完了フラグをリセット（途中で例外が発生してもフラグを必ず戻す）
      window.isLeftMenuInProgress = false;
    }
  });
}
function insertMenu(selector){
  // 既にメニューが存在する場合はスキップ（aria-labelで検索）
  const existing = document.querySelector(selector);
  const isMenuInserted = existing && existing.getAttribute('aria-label') === '拡張機能';
  if (isMenuInserted) return;
  // メニュー要素を作成
  const menuList = createMenuList();
      
  // 設定リストの前に挿入
  const settingList = document.querySelector(selector);
  if (!settingList) return;
  settingList.parentNode.insertBefore(menuList, settingList);
}
function insertPopoverMenu() {
  insertMenu(POPOVER_SELECTOR);
}


// メニューを再挿入する関数
function reinsertMenu(observer = null) {
  // 重複挿入防止チェック
  if (document.querySelector('ion-list[aria-label="拡張機能"]')) {
    return;
  }
  
  const currentSettingList = findInsertionPosition();
  if (!currentSettingList) {
    return;
  }
  
  const newMenuContainer = document.createElement('div');
  newMenuContainer.innerHTML = createMenuHTML();
  const newMenuList = newMenuContainer.firstElementChild;
  currentSettingList.parentNode.insertBefore(newMenuList, currentSettingList);
  createMenuList();
  
  // 監視を継続する場合
  if (observer) {
    setTimeout(() => {
      const reinsertedMenu = document.querySelector('ion-list[aria-label="拡張機能"]');
      if (reinsertedMenu) {
        observer.observe(reinsertedMenu.parentNode, { childList: true, subtree: true });
      }
    }, 50);
  }
}

// メニューのイベントリスナーを追加
function createMenuList() {
  // メニュー要素を作成
  const menuContainer = document.createElement('div');
  menuContainer.innerHTML = createMenuHTML();
  const menuList = menuContainer.firstElementChild;
  const historyItem = menuList.querySelector('#history-menu-item');
  if (historyItem) {
    historyItem.addEventListener('click', window.handleHistoryPanelOpen);
  }
  const favoritesItem = menuList.querySelector('#favorites-menu-item');
  if (favoritesItem) {
    favoritesItem.addEventListener('click', window.handleFavoritesPanelOpen);
  }
  const recommendItem = menuList.querySelector('#recommend-menu-item');
  if (recommendItem) {
    recommendItem.addEventListener('click', window.handleRecommendPanelOpen);
  }
  const yearItem = menuList.querySelector('#year-menu-item');
  if (yearItem) {
    yearItem.addEventListener('click', window.handleYearMenuOpen);
  }
  const darkModeItem = menuList.querySelector('#darkmode-menu-item');
  if (darkModeItem) {
    updateDarkModeMenuLabel(darkModeItem);
    darkModeItem.addEventListener('click', () => {
      if (typeof window.cycleOujDarkModeSetting === 'function') {
        window.cycleOujDarkModeSetting((next) => updateDarkModeMenuLabel(darkModeItem, next));
      }
    });
  }
  return menuList;
}

// ヘッダー（拡張機能メニュー）内の「ダークモード」項目に、現在の設定値
// （自動／ライト／ダーク）をラベルとして表示する
function updateDarkModeMenuLabel(menuItemEl, settingValue) {
  const labelEl = menuItemEl.querySelector('.ouj-darkmode-current-label');
  if (!labelEl) return;
  const labels = window.OUJ_DARK_MODE_LABELS || { auto: '自動', light: 'ライト', dark: 'ダーク' };
  if (settingValue) {
    labelEl.textContent = `（${labels[settingValue] || labels.auto}）`;
    return;
  }
  if (typeof window.getOujDarkModeSetting === 'function') {
    window.getOujDarkModeSetting((setting) => {
      labelEl.textContent = `（${labels[setting] || labels.auto}）`;
    });
  }
}

// =========================
// saveSettingラッパーでキャッシュ更新
// =========================
(function() {
  const originalSaveSetting = window.saveSetting;
  window.saveSetting = function(key, value) {
    originalSaveSetting.apply(this, arguments);
    if (key === 'history' || key === 'favorites' || key === 'pinnedFavorites') {
      window.prefetchRecommendListData();
    }
  };
})();

// =========================
// 初期化時にプリフェッチ
// =========================
window.prefetchRecommendListData();


// =========================
// ヘッダー（画面上部のツールバー）への表示テーマ切替ボタン設置
// ロゴ画像(img.logo-img)を目印にツールバーを特定し、検索ボックスの右側に
// トグルボタンを挿入する。ロゴはinsertLeftMenuでも待機に使っている、
// 常に存在する信頼できるアンカー要素。
// =========================
const HEADER_DARKMODE_TOGGLE_CLASS = 'ouj-header-darkmode-toggle';
const HEADER_DARKMODE_ICONS = { auto: '🌓', light: '☀️', dark: '🌙' };

function insertHeaderDarkModeToggle() {
  if (typeof window.waitForElement !== 'function') {
    setTimeout(insertHeaderDarkModeToggle, 100);
    return;
  }
  window.waitForElement('img.logo-img[src="./assets/images/icon_logo.png"]', (logo) => {
    const toolbarContent = logo.closest('.toolbar-content');
    if (!toolbarContent) return;
    // 重複挿入防止
    if (toolbarContent.querySelector(`.${HEADER_DARKMODE_TOGGLE_CLASS}`)) return;

    // .vod-list-searchはflexで残り幅いっぱいに広がるため、その外側(afterend)に
    // 置くと折り返されてしまう。検索ボタン等と同じ行に収まるよう、内側の
    // .search-area（検索欄・検索ボタンを横並びにしているコンテナ）の末尾に入れる。
    const searchArea = toolbarContent.querySelector('.vod-list-search .search-area');

    const toggle = document.createElement('span');
    toggle.className = HEADER_DARKMODE_TOGGLE_CLASS;
    toggle.setAttribute('role', 'button');
    toggle.setAttribute('tabindex', '0');
    Object.assign(toggle.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      marginLeft: '8px',
      flexShrink: '0',
      cursor: 'pointer',
      borderRadius: '50%',
      fontSize: '18px',
      lineHeight: '1',
      userSelect: 'none'
    });

    const applyLabel = (setting) => {
      const labels = window.OUJ_DARK_MODE_LABELS || { auto: '自動', light: 'ライト', dark: 'ダーク' };
      toggle.textContent = HEADER_DARKMODE_ICONS[setting] || HEADER_DARKMODE_ICONS.auto;
      toggle.title = `表示テーマ: ${labels[setting] || labels.auto}（クリックで切替）`;
    };

    if (typeof window.getOujDarkModeSetting === 'function') {
      window.getOujDarkModeSetting(applyLabel);
    } else {
      applyLabel('auto');
    }

    const handleToggle = () => {
      if (typeof window.cycleOujDarkModeSetting === 'function') {
        window.cycleOujDarkModeSetting(applyLabel);
      }
    };
    toggle.addEventListener('click', handleToggle);
    toggle.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggle();
      }
    });

    if (searchArea) {
      searchArea.appendChild(toggle);
    } else {
      toolbarContent.appendChild(toggle);
    }
  });
}
window.insertHeaderDarkModeToggle = insertHeaderDarkModeToggle;

// =========================
// ヘッダー（ロゴ・検索バーの行）の折りたたみ機能
// 右端にボタンを設置し、クリックでヘッダー行（ion-header）自体をdisplay:noneで
// 完全に隠す。単にヘッダーを隠すだけだと下記2つの理由で画面下部に空白が
// 残ってしまうため、それぞれ打ち消す処理を行う。
// 1. Ionicはヘッダーの高さ分の余白をコンテンツ側の.scroll-content要素の
//    margin-topにインラインstyleで動的設定していることがある。折りたたみ時は
//    そのmargin-topも0にし、展開時は捕捉しておいた元の値に戻す（Ionic自身の
//    再計算に頼らない。Ionicはページ遷移等の特定のタイミングでしか
//    margin-topを再計算しないため）。
// 2. サイト本体のCSSで #main（class="navi-main-default"／"navi-main-no-side-menu"）と
//    左側の固定ナビ #menu（幅265pxのカテゴリー一覧ペイン）の両方に、
//    `max-height: calc(100% - 3.0em)` 等、ヘッダー分の高さを固定値で
//    差し引くルールが直接指定されている。ヘッダー表示中はこれがヘッダーの
//    実高さとちょうど帳尻が合っているが、ヘッダーを隠しても値は動的に
//    再計算されないため、隠した分がそのまま埋まらない空白として残ってしまう
//    （#mainだけ解除して#menuを解除し忘れると、右ペインだけ追従して左ペイン
//    下部にだけ空白が残る）。折りたたみ時はこの両方のmax-height制限を外し
//    （100%まで広げる）、展開時に解除して元のCSSルールに戻す。
// =========================
const HEADER_COLLAPSE_STORAGE_KEY = 'headerCollapsed';
const HEADER_COLLAPSE_TAB_ID = 'ouj-header-collapse-tab';
const HEADER_EXPAND_TAB_ID = 'ouj-header-expand-tab';

// ヘッダー折りたたみ時にmargin-topを退避・解除する対象要素を探す。
// 通常は.scroll-content（ion-contentの直下）だが、構造が違うケースに備えて
// 段階的にフォールバックする。
function getOujHeaderContentElement(headerEl) {
  if (!headerEl || !headerEl.parentElement) return null;
  const parent = headerEl.parentElement;
  const direct = Array.from(parent.children).find((el) => el.tagName === 'ION-CONTENT');
  if (direct) return direct;
  const nested = parent.querySelector('ion-content');
  if (nested) return nested;
  return document.querySelector('ion-content');
}

function getOujHeaderScrollElement(headerEl) {
  const contentEl = getOujHeaderContentElement(headerEl);
  if (!contentEl) return null;
  return contentEl.querySelector('.scroll-content') || contentEl;
}

function findOujHeaderElement(logo) {
  const navbarEl = logo.closest('ion-navbar') || logo.closest('.toolbar');
  if (!navbarEl) return null;
  return navbarEl.closest('ion-header') || navbarEl;
}

function applyOujHeaderCollapsed(collapsed) {
  if (typeof window.waitForElement !== 'function') return;
  window.waitForElement('img.logo-img[src="./assets/images/icon_logo.png"]', (logo) => {
    const headerEl = findOujHeaderElement(logo);
    if (!headerEl) return;
    const scrollEl = getOujHeaderScrollElement(headerEl);
    const mainEl = document.getElementById('main');
    // 左側の固定ナビ（id="menu"、カテゴリー一覧や拡張機能メニューを含む265px幅の
    // ペイン）にも、#mainと全く同じ `max-height: calc(100% - 3.0em)` がサイト側の
    // CSSで指定されている。#mainだけリセットすると右ペインは追従するが、#menu側は
    // ヘッダー分の高さが空白として下部に残ってしまうため、同様にリセットする。
    const menuEl = document.getElementById('menu');

    if (collapsed) {
      if (scrollEl && scrollEl.dataset.oujOrigMarginTop === undefined) {
        scrollEl.dataset.oujOrigMarginTop = scrollEl.style.marginTop || '';
      }
      headerEl.style.setProperty('display', 'none', 'important');
      if (scrollEl) scrollEl.style.setProperty('margin-top', '0px', 'important');
      if (mainEl) {
        mainEl.style.setProperty('max-height', '100%', 'important');
        mainEl.style.setProperty('height', '100%', 'important');
      }
      if (menuEl) {
        menuEl.style.setProperty('max-height', '100%', 'important');
        menuEl.style.setProperty('height', '100%', 'important');
      }
    } else {
      headerEl.style.removeProperty('display');
      if (scrollEl && scrollEl.dataset.oujOrigMarginTop !== undefined) {
        if (scrollEl.dataset.oujOrigMarginTop) {
          scrollEl.style.setProperty('margin-top', scrollEl.dataset.oujOrigMarginTop);
        } else {
          scrollEl.style.removeProperty('margin-top');
        }
        delete scrollEl.dataset.oujOrigMarginTop;
      }
      if (mainEl) {
        mainEl.style.removeProperty('max-height');
        mainEl.style.removeProperty('height');
      }
      if (menuEl) {
        menuEl.style.removeProperty('max-height');
        menuEl.style.removeProperty('height');
      }
    }

    // ヘッダーの表示/非表示に連動してレイアウトを再計算するコンポーネントが
    // サイト側に存在するため（PlayerComponent等、複数箇所でwindow:resizeを
    // 購読している）、念のためresizeイベントを発火させて追従させる。
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });

    const collapseTab = document.getElementById(HEADER_COLLAPSE_TAB_ID);
    if (collapseTab) collapseTab.style.display = collapsed ? 'none' : 'flex';
    const expandTab = document.getElementById(HEADER_EXPAND_TAB_ID);
    if (expandTab) expandTab.style.display = collapsed ? 'flex' : 'none';
  });
}

function cycleOujHeaderCollapsed() {
  chrome.storage.sync.get([HEADER_COLLAPSE_STORAGE_KEY], (result) => {
    const next = !result[HEADER_COLLAPSE_STORAGE_KEY];
    chrome.storage.sync.set({ [HEADER_COLLAPSE_STORAGE_KEY]: next }, () => {
      applyOujHeaderCollapsed(next);
    });
  });
}

// 折りたたみ用（▲）・展開用（▼）タブを共通のスタイルで生成する。
// どちらもヘッダー内部（ion-navbarなど）には置かず、常にdocument.bodyの
// 直接の子として配置する。ion-navbar.toolbarにはサイト側CSSで
// `transform: translateZ(0)` が指定されており、position:fixedな子要素は
// ビューポートではなくそのtransformされた祖先を基準に配置されてしまう
// （CSSの仕様上、transformを持つ要素は子孫のfixed要素の包含ブロックになる）。
// ヘッダー内に置くと2つのタブの左右位置がズレる原因になっていたため、
// 両方をbody直下に置き、同じtop/right/サイズを指定することで、
// 折りたたみ⇔展開で同じ場所にタブが表示されるようにしている。
function createOujHeaderTab({ id, title, text, onClick }) {
  const tab = document.createElement('div');
  tab.id = id;
  tab.setAttribute('role', 'button');
  tab.setAttribute('tabindex', '0');
  tab.title = title;
  tab.textContent = text;
  Object.assign(tab.style, {
    position: 'fixed',
    top: '0',
    right: '12px',
    zIndex: '2147483000',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '18px',
    background: 'rgba(0, 0, 0, 0.6)',
    color: '#fff',
    fontSize: '11px',
    lineHeight: '1',
    borderRadius: '0 0 8px 8px',
    cursor: 'pointer',
    userSelect: 'none'
  });
  tab.addEventListener('click', onClick);
  tab.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  });
  document.body.appendChild(tab);
  return tab;
}

function ensureHeaderCollapseTabs() {
  if (document.getElementById(HEADER_EXPAND_TAB_ID)) return;
  createOujHeaderTab({ id: HEADER_COLLAPSE_TAB_ID, title: 'ヘッダーを折りたたむ', text: '▲', onClick: cycleOujHeaderCollapsed });
  createOujHeaderTab({ id: HEADER_EXPAND_TAB_ID, title: 'ヘッダーを表示', text: '▼', onClick: cycleOujHeaderCollapsed });
}

function insertHeaderCollapseToggle() {
  if (typeof window.waitForElement !== 'function') {
    setTimeout(insertHeaderCollapseToggle, 100);
    return;
  }
  ensureHeaderCollapseTabs();
  window.waitForElement('img.logo-img[src="./assets/images/icon_logo.png"]', () => {
    // SPA遷移でヘッダーやコンテンツのDOMが作り直された場合に備え、
    // ページ遷移のたびに現在の設定値を適用し直す。
    chrome.storage.sync.get([HEADER_COLLAPSE_STORAGE_KEY], (result) => {
      applyOujHeaderCollapsed(!!result[HEADER_COLLAPSE_STORAGE_KEY]);
    });
  });
}
window.insertHeaderCollapseToggle = insertHeaderCollapseToggle;

// ポップアップ等、他のタブでの変更もリアルタイムに反映
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes[HEADER_COLLAPSE_STORAGE_KEY]) {
    applyOujHeaderCollapsed(!!changes[HEADER_COLLAPSE_STORAGE_KEY].newValue);
  }
});

// アイコンやSVGのHTMLを共通化
function getIconHtml(type, filled = false) {
  switch (type) {
    case 'share':
      return `<svg width="16" height="12" viewBox="0 0 24 24" fill="${filled ? 'white' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;
    default:
      return '';
  }
}
window.getIconHtml = getIconHtml;
window.insertLeftMenu = insertLeftMenu;
window.startMenuOpeningMutationObserver = startMenuOpeningMutationObserver;