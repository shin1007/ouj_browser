// メニュー設定
const MENU_CONFIG = {
  title: "拡張機能",
  items: [
    { id: "favorites", text: "お気に入り", icon: "star" },
    { id: "history", text: "履歴", icon: "time" },
    { id: "recommend", text: "おすすめ動画", icon: "play" }
  ]
};


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

// ロゴを待ってメニューを挿入する処理
function waitForLogoAndInsertMenu() {
  // console.log('waitForLogoAndInsertMenu: 開始');
  
  // 重複挿入防止フラグ（グローバル変数として管理）
  if (window.oujMenuInsertionInProgress) {
    // console.log('waitForLogoAndInsertMenu: メニュー挿入処理が既に進行中です。スキップします');
    return;
  }
  
      // 既にメニューが存在する場合はスキップ（aria-labelで検索）
    const existingMenu = document.querySelector('ion-list[aria-label="拡張機能"]');
    if (existingMenu) {
      // console.log('waitForLogoAndInsertMenu: 拡張機能メニューは既に存在します。スキップします');
      return;
    }
  
  // 挿入処理開始フラグを設定
  window.oujMenuInsertionInProgress = true;
  
  // 共通関数の存在をチェック
  if (typeof window.waitForElement !== 'function') {
    // console.log('waitForLogoAndInsertMenu: waitForElement関数が未定義、100ms後に再試行');
    window.oujMenuInsertionInProgress = false; // フラグをリセット
    setTimeout(waitForLogoAndInsertMenu, 100);
    return;
  }
  
  // console.log('waitForLogoAndInsertMenu: ロゴ要素の検索を開始');
  
  // ロゴの存在確認
  window.waitForElement('img.logo-img[src="./assets/images/icon_logo.png"]', (logo) => {
    
    // 既存の拡張機能メニュー要素を完全に削除
    const existingMenuLists = document.querySelectorAll('ion-list[aria-label="拡張機能"]');
    existingMenuLists.forEach(menuList => {
      menuList.remove();
    });
    
    // フォールバック: 古いIDで検索して削除
    const oldMenuTitle = document.getElementById('menu-title');
    if (oldMenuTitle) {
      const titleText = oldMenuTitle.textContent || oldMenuTitle.innerText || '';
      if (titleText.includes('拡張機能')) {
        oldMenuTitle.closest('.menu-list')?.remove();
      }
    }
    
    // 新しいIDで既存判定
    const existingMenuTitle = document.getElementById('ouj-extension-menu-title');
    if (existingMenuTitle) {
      // console.log('waitForLogoAndInsertMenu: 拡張機能メニューは既に挿入済みです');
      return;
    }
    
    
    // メニュー要素を作成
    const menuContainer = document.createElement('div');
    const menuHTML = createMenuHTML();
    menuContainer.innerHTML = menuHTML;
    const menuList = menuContainer.firstElementChild;
        
    // #menu要素の存在確認
    const menuElement = document.getElementById('menu');
    
    // 挿入位置を特定（複数のセレクタを試す）
    const settingList = findInsertionPosition();
    
    // console.log('waitForLogoAndInsertMenu: 最終的な挿入位置要素:', settingList);
    // console.log('waitForLogoAndInsertMenu: 挿入位置の親要素:', settingList?.parentNode);
    
    if (!settingList) {
      return;
    }
    
    // 設定リストの前に挿入
    settingList.parentNode.insertBefore(menuList, settingList);
    // console.log('waitForLogoAndInsertMenu: メニュー挿入完了。挿入された要素:', menuList);
    
    // 挿入直後に監視を開始（無限ループ対策付き）
    let reinsertionCount = 0;
    const maxReinsertions = 5;
    
    const startMonitoring = () => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) {
              return;
            }
            
            const isRemovedMenu = node.getAttribute?.('aria-label') === '拡張機能' || 
                                 node.querySelector?.('ion-list[aria-label="拡張機能"]');
            if (!isRemovedMenu) {
              return;
            }
            
            // console.log('waitForLogoAndInsertMenu: メニューが削除されました。再挿入を試行します');
            
            if (reinsertionCount >= maxReinsertions) {
              // console.log('waitForLogoAndInsertMenu: 最大再挿入回数に達しました。監視を停止します');
              observer.disconnect();
              return;
            }
            
            reinsertionCount++;
            // console.log(`waitForLogoAndInsertMenu: 再挿入試行 ${reinsertionCount}/${maxReinsertions}`);
            
            // 少し遅延してから再挿入
            setTimeout(() => {
              reinsertMenu(observer);
            }, 200); // より長い遅延
          });
        });
      });
      
      // メニューの親要素を監視
      const menuParent = settingList.parentNode;
      if (menuParent) {
        observer.observe(menuParent, { childList: true, subtree: true });
        // console.log('waitForLogoAndInsertMenu: メニュー削除監視を開始しました');
      }
      
      return observer;
    };
    
    // 監視を即座に開始
    const observer = startMonitoring();
    
    // 挿入確認のための遅延チェック
    setTimeout(() => {
      // console.log('waitForLogoAndInsertMenu: 遅延チェック開始');
      
      // 複数のセレクタでメニューの存在を確認
      const insertedMenuByAriaLabel = document.querySelector('ion-list[aria-label="拡張機能"]');
      const insertedMenuById = document.getElementById('ouj-extension-menu-title');
      const allMenuLists = document.querySelectorAll('#menu ion-list');
      
      if (insertedMenuByAriaLabel || insertedMenuById) {
        // console.log('waitForLogoAndInsertMenu: メニューが正常に挿入されました');
        return;
      }
      
      // #menu要素の現在の構造を確認
      const menuElement = document.getElementById('menu');
      if (menuElement) {
        // console.log('waitForLogoAndInsertMenu: #menu要素の現在のHTML:', menuElement.innerHTML.substring(0, 1000) + '...');
      }
      
      // 挿入に失敗した場合、再挿入を試行
      if (reinsertionCount >= maxReinsertions) {
        return;
      }
      
      reinsertionCount++;
      // console.log(`waitForLogoAndInsertMenu: 初回挿入失敗。再挿入を試行 ${reinsertionCount}/${maxReinsertions}`);
      setTimeout(() => {
        reinsertMenu();
      }, 100);
    }, 100);
    
    // イベントリスナーを追加
    addMenuEventListeners();
    // console.log('waitForLogoAndInsertMenu: 完了');
    
    // 挿入処理完了フラグをリセット
    window.oujMenuInsertionInProgress = false;
  });
}

// 挿入位置を特定する関数
function findInsertionPosition() {
  // 複数のセレクタを順番に試す
  const selectors = [
    '#menu > menu-navi > ion-content > div.scroll-content > ion-content > div.scroll-content > ion-list:nth-child(3)',
    '#menu ion-list:nth-child(3)',
    '#menu ion-list:last-child'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }
  
  // 最後の手段: 最初のion-listの前に挿入
  const allMenuLists = document.querySelectorAll('#menu ion-list');
  if (allMenuLists.length > 0) {
    return allMenuLists[0];
  }
  
  return null;
}

// メニューを再挿入する関数
function reinsertMenu(observer = null) {
  // 重複挿入防止チェック
  if (document.querySelector('ion-list[aria-label="拡張機能"]')) {
    // console.log('waitForLogoAndInsertMenu: 再挿入時に既にメニューが存在します。スキップします');
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
  // console.log('waitForLogoAndInsertMenu: メニューを再挿入しました');
  addMenuEventListeners();
  
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
function addMenuEventListeners() {
  const historyItem = document.getElementById('history-menu-item');
  if (historyItem) {
    historyItem.addEventListener('click', window.handleHistoryPanelOpen);
  }
  const favoritesItem = document.getElementById('favorites-menu-item');
  if (favoritesItem) {
    favoritesItem.addEventListener('click', window.handleFavoritesPanelOpen);
  }
  const recommendItem = document.getElementById('recommend-menu-item');
  if (recommendItem) {
    recommendItem.addEventListener('click', window.handleRecommendPanelOpen);
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
window.waitForLogoAndInsertMenu = waitForLogoAndInsertMenu;
