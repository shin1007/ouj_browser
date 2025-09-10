// メニュー設定
const MENU_CONFIG = {
  title: "拡張機能",
  items: [
    { id: "favorites", text: "お気に入り", icon: "star" },
    { id: "history", text: "履歴", icon: "time" },
    { id: "recommend", text: "おすすめ動画", icon: "play" }
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
                  ${item.text}
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
  return menuList;
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


// アイコンやSVGのHTMLを共通化
function getIconHtml(type) {
  switch (type) {
    case 'history':
      return '<ion-icon name="time" class="history-panel-icon" aria-hidden="true"></ion-icon>';
    case 'favorite':
      return '<ion-icon name="star" class="history-panel-icon" aria-hidden="true"></ion-icon>';
    case 'recommend':
      return '<ion-icon name="play" class="history-panel-icon" aria-hidden="true"></ion-icon>';
    case 'delete':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
      </svg>`;
    case 'close':
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>`;
    case 'pin':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v12l6-3 6 3V3"/></svg>`;
    case 'arrow':
      return `<svg class="history-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;
    default:
      return '';
  }
}
window.getIconHtml = getIconHtml;
window.insertLeftMenu = insertLeftMenu;
window.startMenuOpeningMutationObserver = startMenuOpeningMutationObserver;