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
    // 既にメニューが存在する場合はスキップ（aria-labelで検索）
    insertMenu(LEFT_SELECTOR)
    // 挿入処理完了フラグをリセット
    window.isLeftMenuInProgress = false;
  });
}
function insertMenu(selector){
  // 既にメニューが存在する場合はスキップ（aria-labelで検索）
  const isMenuInserted = document.querySelector(selector).getAttribute('aria-label') === '拡張機能';
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