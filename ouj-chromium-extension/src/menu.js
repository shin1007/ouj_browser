// メニュー設定
const MENU_CONFIG = {
  title: "拡張機能",
  items: [
    { id: "history", text: "履歴", icon: "time" },
    { id: "favorites", text: "お気に入り", icon: "star" },
    { id: "recommend", text: "おすすめ動画", icon: "play" } // 追加
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
      
      // console.log('waitForLogoAndInsertMenu: 遅延チェック - aria-labelセレクタ結果:', insertedMenuByAriaLabel);
      // console.log('waitForLogoAndInsertMenu: 遅延チェック - IDセレクタ結果:', insertedMenuById);
      // console.log('waitForLogoAndInsertMenu: 遅延チェック - 全ion-list要素数:', allMenuLists.length);
      
      // 全ion-list要素の詳細をログ出力
      // allMenuLists.forEach((list, index) => {
      //   console.log(`waitForLogoAndInsertMenu: 遅延チェック - ion-list[${index}]:`, list);
      //   console.log(`waitForLogoAndInsertMenu: 遅延チェック - ion-list[${index}]のクラス:`, list.className);
      //   console.log(`waitForLogoAndInsertMenu: 遅延チェック - ion-list[${index}]のaria-label:`, list.getAttribute('aria-label'));
      // });
      
      if (insertedMenuByAriaLabel || insertedMenuById) {
        // console.log('waitForLogoAndInsertMenu: メニューが正常に挿入されました');
        return;
      }
      
      // console.error('waitForLogoAndInsertMenu: メニューの挿入に失敗しました');
      // console.log('waitForLogoAndInsertMenu: DOM構造を確認中...');
      
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

// 履歴リストを日付順で描画する関数
function renderHistoryListByDate(filteredItems) {
  if (!filteredItems.length) {
    return '<li class="history-empty">該当する履歴はありません</li>';
  }
  
  // 日時順（新しい順）でフラットに表示
  const sortedItems = filteredItems.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return sortedItems.map((item, index) => {
    const date = new Date(item.date);
    const dateStr = date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    const title = item.title || `コース (ID: ${item.categoryId})`;
    return `<li class="history-item" data-category-id="${item.categoryId}" tabindex="0" role="button" aria-label="${title}を開く">
      <div class="history-item-content">
        <div class="history-title">${title}</div>
        <div class="history-date">${dateStr}</div>
      </div>
      <button class="history-delete-btn" data-date="${item.date}" data-category-id="${item.categoryId}" aria-label="${title}を履歴から削除" title="削除">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
        </svg>
      </button>
      <svg class="history-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </li>`;
  }).join('');
}

// 履歴リストをグループ順で描画する関数
function renderHistoryListByGroup(filteredItems) {
  if (!filteredItems.length) {
    return '<li class="history-empty">該当する履歴はありません</li>';
  }
  
  // 日付ごとにグループ化
  const groupedHistory = {};
  filteredItems.forEach(item => {
    const date = new Date(item.date);
    const dateKey = date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    if (!groupedHistory[dateKey]) {
      groupedHistory[dateKey] = [];
    }
    groupedHistory[dateKey].push(item);
  });

  // グループ化されたHTMLを生成（日付降順）
  const sortedGroups = Object.entries(groupedHistory).sort(([aDate], [bDate]) => {
    // 日付文字列をDateに変換して降順
    return new Date(bDate) - new Date(aDate);
  });

  const groupHtmls = sortedGroups.map(([dateKey, items]) => {
    // 各グループ内で新しい順にソート
    const sortedItems = items.sort((a, b) => new Date(b.date) - new Date(a.date));

    const itemsHtml = sortedItems.map((item, index) => {
      const date = new Date(item.date);
      const timeStr = date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const title = item.title || `コース (ID: ${item.categoryId})`;
      return `<li class="history-item" data-category-id="${item.categoryId}" tabindex="0" role="button" aria-label="${title}を開く">
        <div class="history-item-content">
          <div class="history-title">${title}</div>
          <div class="history-date">${timeStr}</div>
        </div>
        <button class="history-delete-btn" data-date="${item.date}" data-category-id="${item.categoryId}" aria-label="${title}を履歴から削除" title="削除">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
          </svg>
        </button>
        <svg class="history-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </li>`;
    }).join('');

    return `
      <div class="history-group">
        <div class="history-group-header">${dateKey}</div>
        <ul class="history-group-list">${itemsHtml}</ul>
      </div>
    `;
  });

  return groupHtmls.join('');
}

// メニューのイベントリスナーを追加
function addMenuEventListeners() {
  addHistoryMenuEventListener();
  addFavoritesMenuEventListener();
  addRecommendMenuEventListener();
}

// =========================
// 履歴関連の関数群
// =========================
function addHistoryMenuEventListener() {
  const historyItem = document.getElementById('history-menu-item');
  if (!historyItem) return;
  historyItem.addEventListener('click', async () => {
    // 既存パネルがあれば削除
    let panel = document.getElementById('history-list-panel');
    if (panel) {
      panel.remove();
    }
    // パネル生成
    panel = document.createElement('div');
    panel.id = 'history-list-panel';
    panel.className = 'history-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'history-panel-title');
    panel.setAttribute('aria-modal', 'true');
    
    // #mainの幅・スタイルを取得
    const main = document.getElementById('main');
    let mainWidth = '800px'; // デフォルト
    let mainBg = '#fff';
    let mainFont = '';
    let mainFontSize = '14px'; // デフォルト
    if (main) {
      const style = window.getComputedStyle(main);
      mainWidth = style.width;
      mainBg = style.backgroundColor;
      mainFont = style.fontFamily;
      mainFontSize = style.fontSize;
    }
    
    // モダンなスタイルを適用
    Object.assign(panel.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'min(90vw, 600px)',
      maxWidth: mainWidth,
      minHeight: '480px',
      maxHeight: '480px',
      height: '480px',
      background: (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? '#1a2230' : '#f9fafb',
      fontFamily: mainFont || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: mainFontSize || '14px',
      border: 'none',
      borderRadius: '12px 12px 0 0',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      padding: '0',
      zIndex: '9999',
      overflow: 'hidden',
      opacity: '0',
      transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    });

    // 履歴データを取得
    let history = [];
    try {
      history = window.getSetting('history', []);
    } catch (e) {
      history = [];
    }

    // 検索ボックスを追加
    let searchValue = '';
    // 検索ボックスのHTML（履歴）
    const searchBoxHtml = `
      <div class="history-search-box" style="background: #232c3a; border-radius: 10px; padding: 10px 18px; margin: 0 24px 14px 24px; box-shadow: 0 2px 8px rgba(30,40,60,0.18); border: 1.5px solid #3a4658;">
        <input id="history-search-input" type="text" placeholder="コース名・親カテゴリ名で検索" style="width: 100%; background: #232c3a; color: #fff; border: none; outline: none; font-size: 16px; padding: 10px 12px; border-radius: 6px; letter-spacing: 0.5px;">
      </div>
    `;

    // 履歴リストの描画関数
    async function renderHistoryList(filter = '', sortType = 'date') {
      let listHtml = '';
      if (history.length) {
        // contentIdごとに動画情報を取得
        const categories = await window.getCategoriesData();
        const videoItems = await Promise.all(history.map(async (item) => {
          if (!item.contentId) return null;
          let video = null;
          try {
            const url = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${item.contentId}`;
            video = await window.fetchWithCache(url, `cachedVodContent_${item.contentId}`) || {};
            if (!video.title) throw new Error('動画情報取得失敗');
          } catch (e) {
            // fetchWithCache失敗時は履歴から削除
            let history = [];
            try {
              history = window.getSetting('history', []);
            } catch (e) {
              history = [];
            }
            history = history.filter(h => h.contentId !== item.contentId);
            window.saveSetting('history', history);
            return null;
          }
          // video情報をitemに含めて返す
          return { ...item, video };
        }));
        // null除去
        const validVideoItems = videoItems.filter(Boolean);
        // 検索フィルタ適用
        const filteredItems = filter.trim() ? validVideoItems.filter(item => {
          const keyword = filter.trim().toLowerCase();
          return (item.video.title || '').toLowerCase().includes(keyword) || (item.video.categoryId && Array.isArray(categories) && categories.find(c => c.categoryId == item.video.categoryId)?.name?.toLowerCase().includes(keyword));
        }) : validVideoItems;
        // 新しい順
        const sortedItems = filteredItems.sort((a, b) => new Date(b.date) - new Date(a.date));
        listHtml = sortedItems.map(item => {
          const video = item.video;
          const title = video.title || `動画 (ID: ${item.contentId})`;
          let courseName = '';
          if (video.categoryId && Array.isArray(categories)) {
            const cat = categories.find(c => c.categoryId == video.categoryId);
            courseName = cat ? cat.name : '';
          }
          // サムネイル
          let thumb = '';
          if (item.contentId) {
            thumb = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${item.contentId}/thumbnail/large2`;
          }
          // 日付
          const date = new Date(item.date);
          const dateStr = date.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
          // ダーク/ライト配色
          const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          const cardBg = isDark ? '#232c3a' : '#fff';
          const cardText = isDark ? '#fff' : '#222';
          const cardSubText = isDark ? '#b0b8c9' : '#666';
          const barBg = isDark ? '#374151' : '#e5e7eb';
          const thumbBg = isDark ? '#444' : '#eee';
          const borderColor = isDark ? '#2d3748' : '#e5e7eb';
          const labelColor = isDark ? '#60a5fa' : '#3b82f6';
          // おすすめカードと同じ構造
          return `
            <div class="recommend-card" style="display:block;width:100%;background:${cardBg};border-radius:14px;box-shadow:0 2px 8px rgba(30,40,60,0.10);margin-bottom:8px;padding:0;position:relative;">
              <a href="https://v.ouj.ac.jp/view/ouj/#/navi/player?co=${item.contentId}&ct=V&ca=${video && video.categoryId ? video.categoryId : ''}" class="recommend-card-link" style="display:flex;align-items:flex-start;gap:16px;padding:16px 20px;text-decoration:none;color:inherit;position:relative;width:100%;">
                <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;width:110px;">
                  <div style="display:block;width:110px;height:62px;background:${thumbBg};border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(30,40,60,0.10);">
                    <img src="${thumb}" alt="サムネイル" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';">
                  </div>
                  <div style="font-size:10px;color:${labelColor};background:${labelColor}20;padding:2px 6px;border-radius:4px;text-align:center;font-weight:500;width:fit-content;margin:0 auto;">${dateStr}</div>
                </div>
                <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;justify-content:center;">
                  <div style="display:flex;align-items:baseline;gap:8px;">
                    <div style="font-size:15px;font-weight:600;color:${cardText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;">${title}</div>
                    <div style="font-size:12px;color:${cardSubText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;">${courseName || ''}</div>
                  </div>
                </div>
                <button class="history-delete-btn" data-date="${item.date}" data-content-id="${item.contentId}" aria-label="この履歴を削除" title="削除" style="position:absolute;top:12px;right:12px;background:none;border:none;cursor:pointer;z-index:2;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
                  </svg>
                </button>
              </a>
            </div>
          `;
        }).join('');
      } else {
        listHtml = '<div class="history-empty" style="color:#222;padding:16px;text-align:center;">履歴はありません</div>';
      }
      // パネルのリスト部分を書き換え
      const listContainer = panel.querySelector('.history-list');
      if (listContainer) {
        listContainer.innerHTML = listHtml;
      }
      
      // 全削除ボタンの表示/非表示を制御
      const clearAllBtn = panel.querySelector('#clear-all-history');
      if (clearAllBtn) {
        clearAllBtn.style.display = history.length > 0 ? 'flex' : 'none';
      }
      
      // 再度イベントリスナーを付与
      attachHistoryItemListeners();
      attachDeleteButtonListeners();
    }

    // 履歴項目のクリックイベントリスナー
    function attachHistoryItemListeners() {
      const historyItems = panel.querySelectorAll('.history-item');
      historyItems.forEach((item, index) => {
        // クリックイベント
        item.addEventListener('click', (event) => {
          // 削除ボタンがクリックされた場合は処理しない
          if (event.target.closest('.history-delete-btn')) {
            return;
          }
          event.preventDefault();
          const categoryId = item.getAttribute('data-category-id');
          if (categoryId) {
            // パネルを閉じてからページ遷移
            closePanel();
            // 少し遅延させてからページ遷移（アニメーション完了を待つ）
            setTimeout(() => {
              window.location.href = `https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=${categoryId}`;
            }, 200);
          }
        });

        // キーボードナビゲーション
        item.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            item.click();
          } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            const nextItem = historyItems[index + 1];
            if (nextItem) nextItem.focus();
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            const prevItem = historyItems[index - 1];
            if (prevItem) prevItem.focus();
          }
        });
      });
    }

    // 削除ボタンのイベントリスナー
    function attachDeleteButtonListeners() {
      const deleteBtns = panel.querySelectorAll('.history-delete-btn');
      deleteBtns.forEach(btn => {
        btn.onclick = (event) => {
          event.preventDefault();
          event.stopPropagation();
          const contentId = btn.getAttribute('data-content-id');
          console.log('[履歴削除] 削除ボタン押下: contentId=', contentId);
          let history = [];
          try {
            history = window.getSetting('history', []);
          } catch (e) {
            history = [];
          }
          const beforeCount = history.length;
          history = history.filter(item => item.contentId !== contentId);
          window.saveSetting('history', history);
          const afterCount = history.length;
          console.log(`[履歴削除] 履歴保存: before=${beforeCount}, after=${afterCount}`);
          // UIから該当カードを即時削除
          const card = btn.closest('.recommend-card');
          if (card) {
            card.remove();
            console.log('[履歴削除] カード要素をUIから削除しました');
          } else {
            console.log('[履歴削除] カード要素が見つかりませんでした');
          }
          // 履歴が空になった場合のみ再描画（空表示用）
          const listContainer = panel.querySelector('.history-list');
          if (listContainer && listContainer.children.length === 0) {
            console.log('[履歴削除] 履歴が空になったので空表示に切り替えます');
            listContainer.innerHTML = `<div class="history-empty" style="color:#222;padding:16px;text-align:center;">履歴はありません</div>`;
          }
        };
      });
    }

    // 履歴を全削除する関数
    async function clearAllHistory() {
      if (history.length === 0) return;
      
      // 共通化した確認ダイアログを使用
      if (typeof window.showConfirmDialog === 'function') {
        const confirmed = await window.showConfirmDialog(
          `履歴を全て削除しますか？（${history.length}件）`,
          '履歴の全削除'
        );
        if (confirmed) {
          history = [];
          window.saveSetting('history', history);
          renderHistoryList();
        }
      } else {
        // フォールバック: 従来のconfirmを使用
        if (confirm(`履歴を全て削除しますか？（${history.length}件）`)) {
          history = [];
          window.saveSetting('history', history);
          renderHistoryList();
        }
      }
    }

    // パネルHTML
    panel.innerHTML = `
      <div class="history-panel-header">
        <h3 id="history-panel-title" class="history-panel-title">
          <ion-icon name="time" class="history-panel-icon" aria-hidden="true"></ion-icon>
          履歴一覧
        </h3>
        <div class="history-panel-actions">
          <button id="clear-all-history" class="history-clear-all-btn" aria-label="履歴を全て削除" title="全削除">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
            </svg>
          </button>
          <button id="close-history-list-panel" class="history-panel-close" aria-label="パネルを閉じる">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      ${searchBoxHtml}
      <div class="history-panel-content">
        <ul class="history-list"></ul>
      </div>
    `;
    document.body.appendChild(panel);

    // アニメーション効果を追加
    requestAnimationFrame(() => {
      panel.style.opacity = '1';
      panel.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    // 常に日時順（新しい順）で表示
    let currentSortType = 'date';
    renderHistoryList('', currentSortType);

    // パネルを閉じる共通関数
    const closePanel = () => {
      panel.style.opacity = '0';
      panel.style.transform = 'translate(-50%, -50%) scale(0.95)';
      setTimeout(() => {
        panel.remove();
        document.removeEventListener('click', closePanelOnOutsideClick);
        document.removeEventListener('keydown', closePanelOnEscape);
      }, 200);
    };
    
    // パネル外クリックで閉じる機能
    const closePanelOnOutsideClick = (event) => {
      // モーダルが出ている場合はパネルを閉じない
      if (document.getElementById('confirm-dialog')) return;
      if (!panel.contains(event.target)) {
        closePanel();
      }
    };
    
    // エスケープキーで閉じる機能
    const closePanelOnEscape = (event) => {
      if (event.key === 'Escape') {
        closePanel();
      }
    };
    
    // イベントリスナーを追加（少し遅延させてパネル表示後のクリックを検知）
    setTimeout(() => {
      document.addEventListener('click', closePanelOnOutsideClick);
      document.addEventListener('keydown', closePanelOnEscape);
    }, 100);
    
    // 閉じるボタンのイベントリスナー
    document.getElementById('close-history-list-panel').onclick = () => {
      closePanel();
    };
    
    // 全削除ボタンのイベントリスナー
    document.getElementById('clear-all-history').onclick = () => {
      clearAllHistory();
    };

    // 検索ボックスのイベントリスナー
    const searchInput = panel.querySelector('#history-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchValue = e.target.value;
        renderHistoryList(searchValue, currentSortType);
      });
    }
  });
}

// 履歴をlocalStorageに保存する関数
function addHistoryEntry(contentId) {
  if (!contentId) return;
  // 最近の履歴追加をチェック（5秒以内の同じcontentIdは無視）
  const lastHistoryKey = `lastHistory_${contentId}`;
  const lastHistoryTime = window.getSetting(lastHistoryKey, 0);
  const now = Date.now();
  if (now - lastHistoryTime < 5000) {
    return;
  }
  const entry = {
    contentId,
    date: new Date().toISOString(),
  };
  let history = [];
  try {
    history = window.getSetting('history', []);
  } catch (e) {
    history = [];
  }
  // 既存の同じcontentIdは削除（重複防止）
  history = history.filter(item => item.contentId !== contentId);
  // 先頭に追加
  history.unshift(entry);
  // 最大30件まで
  if (history.length > 30) history = history.slice(0, 30);
  window.saveSetting('history', history);
  window.saveSetting(lastHistoryKey, now);
}

// =========================
// お気に入り関連の関数群
// =========================
function addFavoritesMenuEventListener() {
  const favoritesItem = document.getElementById('favorites-menu-item');
  if (!favoritesItem) return;
  favoritesItem.addEventListener('click', async () => {
    // 既存パネルがあれば削除
    let panel = document.getElementById('favorite-list-panel');
    if (panel) {
      panel.remove();
    }
    // パネル生成
    panel = document.createElement('div');
    panel.id = 'favorite-list-panel';
    panel.className = 'favorite-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'favorite-panel-title');
    panel.setAttribute('aria-modal', 'true');
    
    // #mainの幅・スタイルを取得
    const main = document.getElementById('main');
    let mainWidth = '800px'; // デフォルト
    let mainBg = '#fff';
    let mainFont = '';
    let mainFontSize = '14px'; // デフォルト
    if (main) {
      const style = window.getComputedStyle(main);
      mainWidth = style.width;
      mainBg = style.backgroundColor;
      mainFont = style.fontFamily;
      mainFontSize = style.fontSize;
    }
    
    // モダンなスタイルを適用
    Object.assign(panel.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'min(90vw, 600px)',
      maxWidth: mainWidth,
      minHeight: '480px',
      maxHeight: '480px',
      height: '480px',
      background: (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? '#1a2230' : '#f9fafb',
      fontFamily: mainFont || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: mainFontSize || '14px',
      border: 'none',
      borderRadius: '12px 12px 0 0',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      padding: '0',
      zIndex: '9999',
      overflow: 'hidden',
      opacity: '0',
      transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    });
    // リスト部分の高さを調整（履歴パネルと統一）
    setTimeout(() => {
      const content = panel.querySelector('.favorite-panel-content');
      if (content) {
        // CSSファイルで設定済みのため、JavaScriptでの設定は不要
        // max-height: 60vh と overflow-y: auto がCSSで設定されている
      }
      // 空表示liにも高さ・中央寄せを適用
      const emptyLi = panel.querySelector('.favorite-empty');
      if (emptyLi) {
        emptyLi.style.minHeight = '100%';
        emptyLi.style.display = 'flex';
        emptyLi.style.alignItems = 'center';
        emptyLi.style.justifyContent = 'center';
        emptyLi.style.fontSize = '1.2em';
        emptyLi.style.color = '#b0b8c9';
      }
    }, 0);

    // お気に入りIDリスト取得
    const favorites = window.getSetting('favorites', []);
    // キャッシュされたカテゴリデータを取得
    const result = await chrome.storage.local.get(['cachedCategoriesData']);
    const cachedData = result.cachedCategoriesData;
    let categories = [];
    
    if (cachedData && cachedData.data) {
      categories = cachedData.data;
    } else {
      // キャッシュがない場合のみAPIから取得
      categories = await window.getCategoriesData();
    }
    
    if (!Array.isArray(categories)) categories = [];
    // ID→カテゴリ名辞書（文字列と数値の両方に対応）
    const idToName = {};
    categories.forEach(cat => { 
      // 文字列と数値の両方のキーで保存
      idToName[cat.categoryId] = cat.name;
      idToName[cat.categoryId.toString()] = cat.name;
    });
    


    // 検索ボックスを追加
    let searchValue = '';
    // 検索ボックスのHTML（お気に入り）
    const searchBoxHtml = `
      <div class="favorite-search-box" style="background: #232c3a; border-radius: 10px; padding: 10px 18px; margin: 0 24px 14px 24px; box-shadow: 0 2px 8px rgba(30,40,60,0.18); border: 1.5px solid #3a4658;">
        <input id="favorite-search-input" type="text" placeholder="コース名・親カテゴリ名で検索" style="width: 100%; background: #232c3a; color: #fff; border: none; outline: none; font-size: 16px; padding: 10px 12px; border-radius: 6px; letter-spacing: 0.5px;">
      </div>
    `;

    // ピン止め状態の取得・保存
    function getPinnedFavorites() {
      try {
        return window.getSetting('pinnedFavorites', []);
      } catch (e) {
        return [];
      }
    }
    function setPinnedFavorites(pinned) {
      window.saveSetting('pinnedFavorites', pinned);
    }

    // お気に入りリストの描画関数
    async function renderFavoriteList(filter = '') {
      // ピン止め情報を取得
      const pinnedFavorites = getPinnedFavorites();
      // 一覧HTML生成
      let listHtml = '';
      if (favorites.length) {
        // 各お気に入りについて親カテゴリ名も取得
        const favoriteItemsWithParent = await Promise.all(favorites.map(async (id) => {
          const categoryName = idToName[id];
          // 親カテゴリ名を取得
          const parentCategoryName = await window.getParentCategoryName(id);
          // カテゴリ名が見つからない場合は「不明なコース」と表示
          const displayName = categoryName || `不明なコース (ID: ${id})`;
          return {
            id: id,
            categoryName: displayName,
            parentCategoryName: parentCategoryName || 'その他',
            hasParent: !!parentCategoryName,
            pinned: pinnedFavorites.includes(id)
          };
        }));

        // 検索フィルタ適用
        const filteredItems = filter.trim() ? favoriteItemsWithParent.filter(item => {
          const keyword = filter.trim().toLowerCase();
          return item.categoryName.toLowerCase().includes(keyword) || item.parentCategoryName.toLowerCase().includes(keyword);
        }) : favoriteItemsWithParent;

        // ピン止めと非ピン止めで分ける
        const pinnedItems = filteredItems.filter(item => item.pinned);
        const unpinnedItems = filteredItems.filter(item => !item.pinned);

        // 親カテゴリごとにグループ化（非ピン止めのみ）
        const groupedFavorites = {};
        unpinnedItems.forEach(item => {
          const parentKey = item.parentCategoryName;
          if (!groupedFavorites[parentKey]) {
            groupedFavorites[parentKey] = [];
          }
          groupedFavorites[parentKey].push(item);
        });

        // グループ化されたHTMLを生成（親カテゴリ名の冒頭数値でソート）
        const sortedGroups = Object.entries(groupedFavorites).sort(([aName], [bName]) => {
          const aNum = parseInt(aName.match(/^[0-9]+/)?.[0] || '0', 10);
          const bNum = parseInt(bName.match(/^[0-9]+/)?.[0] || '0', 10);
          return aNum - bNum;
        });

        // ピン止めリストHTML
        let pinnedHtml = '';
        if (pinnedItems.length) {
          pinnedHtml = `
            <div class="favorite-group">
              <div class="favorite-group-header" style="display:flex;align-items:center;gap:6px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;"><path d="M6 3v12l6-3 6 3V3"/></svg>
                ピン止め
              </div>
              <ul class="favorite-group-list">
                ${pinnedItems.map(item => `
                  <li class="favorite-item" data-category-id="${item.id}" tabindex="0" role="button" aria-label="${item.categoryName}を開く">
                    <div class="favorite-item-content">
                      <div class="favorite-child-category">${item.categoryName}</div>
                    </div>
                    <button class="favorite-pin-btn" data-category-id="${item.id}" aria-label="ピンを外す" title="ピンを外す" style="background:none;border:none;cursor:pointer;padding:0 8px;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="${item.pinned ? '#ffd600' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M6 3v12l6-3 6 3V3"/></svg>
                    </button>
                    <svg class="favorite-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                  </li>
                `).join('')}
              </ul>
            </div>
          `;
        }

        // 通常グループHTML
        const groupHtmls = sortedGroups.map(([parentName, items]) => {
          // 各グループ内で項目名の冒頭数値で昇順ソート
          const sortedItems = items.sort((a, b) => {
            const aNum = parseInt(a.categoryName.match(/^[0-9]+/)?.[0] || '0', 10);
            const bNum = parseInt(b.categoryName.match(/^[0-9]+/)?.[0] || '0', 10);
            return aNum - bNum;
          });
          const itemsHtml = sortedItems.map(item => {
              return `<li class="favorite-item" data-category-id="${item.id}" tabindex="0" role="button" aria-label="${parentName}の${item.categoryName}を開く">
                <div class="favorite-item-content">
                  <div class="favorite-child-category">${item.categoryName}</div>
                </div>
              <button class="favorite-pin-btn" data-category-id="${item.id}" aria-label="${item.pinned ? 'ピンを外す' : 'ピン止め'}" title="${item.pinned ? 'ピンを外す' : 'ピン止め'}" style="background:none;border:none;cursor:pointer;padding:0 8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="${item.pinned ? '#ffd600' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M6 3v12l6-3 6 3V3"/></svg>
              </button>
              <svg class="favorite-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
              </li>`;
          }).join('');
          return `
            <div class="favorite-group">
              <div class="favorite-group-header">${parentName}</div>
              <ul class="favorite-group-list">${itemsHtml}</ul>
            </div>
          `;
        });

        listHtml = pinnedHtml + groupHtmls.join('');
        if (!filteredItems.length) {
          listHtml = '<li class="favorite-empty">該当するお気に入りはありません</li>';
        }
      } else {
        listHtml = '<li class="favorite-empty">お気に入りはありません</li>';
      }
      // パネルのリスト部分を書き換え
      const listContainer = panel.querySelector('.favorite-list');
      if (listContainer) {
        listContainer.innerHTML = listHtml;
      }
      // 再度イベントリスナーを付与
      attachFavoriteItemListeners();
      attachPinButtonListeners();
    }

    // ピンボタンのイベントリスナー
    function attachPinButtonListeners() {
      const pinButtons = panel.querySelectorAll('.favorite-pin-btn');
      pinButtons.forEach(button => {
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          const categoryId = button.getAttribute('data-category-id');
          let pinned = getPinnedFavorites();
          if (pinned.includes(categoryId)) {
            pinned = pinned.filter(id => id !== categoryId);
          } else {
            pinned.push(categoryId);
          }
          setPinnedFavorites(pinned);
          renderFavoriteList(searchValue);
        });
      });
    }

    // パネルHTML
    panel.innerHTML = `
      <div class="favorite-panel-header">
        <h3 id="favorite-panel-title" class="favorite-panel-title">お気に入りコース一覧</h3>
        <button id="close-favorite-list-panel" class="favorite-panel-close" aria-label="パネルを閉じる">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      ${searchBoxHtml}
      <div class="favorite-panel-content">
        <ul class="favorite-list"></ul>
      </div>
    `;
    document.body.appendChild(panel);

    // アニメーション効果を追加
    requestAnimationFrame(() => {
      panel.style.opacity = '1';
      panel.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    // お気に入り項目のクリックイベントリスナー
    function attachFavoriteItemListeners() {
      const favoriteItems = panel.querySelectorAll('.favorite-item');
      favoriteItems.forEach((item, index) => {
        // クリックイベント
        item.addEventListener('click', (event) => {
          event.preventDefault();
          const categoryId = item.getAttribute('data-category-id');
          if (categoryId) {
            // パネルを閉じてからページ遷移
            closePanel();
            // 少し遅延させてからページ遷移（アニメーション完了を待つ）
            setTimeout(() => {
              window.location.href = `https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=${categoryId}`;
            }, 200);
          }
        });

        // キーボードナビゲーション
        item.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            item.click();
          } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            const nextItem = favoriteItems[index + 1];
            if (nextItem) nextItem.focus();
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            const prevItem = favoriteItems[index - 1];
            if (prevItem) prevItem.focus();
          }
        });
      });
    }

    // 検索ボックスのイベントリスナー
    const searchInput = panel.querySelector('#favorite-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchValue = e.target.value;
        renderFavoriteList(searchValue);
      });
    }

    // 初回リスト描画
    renderFavoriteList('');
    
    // パネルを閉じる共通関数
    const closePanel = () => {
      panel.style.opacity = '0';
      panel.style.transform = 'translate(-50%, -50%) scale(0.95)';
      setTimeout(() => {
        panel.remove();
        document.removeEventListener('click', closePanelOnOutsideClick);
        document.removeEventListener('keydown', closePanelOnEscape);
      }, 200);
    };
    
    // パネル外クリックで閉じる機能
    const closePanelOnOutsideClick = (event) => {
      // モーダルが出ている場合はパネルを閉じない
      if (document.getElementById('confirm-dialog')) return;
      if (!panel.contains(event.target)) {
        closePanel();
      }
    };
    
    // エスケープキーで閉じる機能
    const closePanelOnEscape = (event) => {
      if (event.key === 'Escape') {
        closePanel();
      }
    };
    
    // イベントリスナーを追加（少し遅延させてパネル表示後のクリックを検知）
    setTimeout(() => {
      document.addEventListener('click', closePanelOnOutsideClick);
      document.addEventListener('keydown', closePanelOnEscape);
    }, 100);
    
    // 閉じるボタンのイベントリスナー
    document.getElementById('close-favorite-list-panel').onclick = () => {
      closePanel();
    };
  });
}

// =========================
// おすすめ関連の関数群
// =========================
function addRecommendMenuEventListener() {
  const recommendItem = document.getElementById('recommend-menu-item');
  if (!recommendItem) return;
  recommendItem.addEventListener('click', async () => {
    // 既存パネルがあれば削除
    let panel = document.getElementById('recommend-list-panel');
    if (panel) {
      panel.remove();
    }
    // パネル生成
    panel = document.createElement('div');
    panel.id = 'recommend-list-panel';
    panel.className = 'recommend-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'recommend-panel-title');
    panel.setAttribute('aria-modal', 'true');
    // #mainの幅・スタイルを取得
    const main = document.getElementById('main');
    let mainWidth = '800px'; // デフォルト
    let mainFont = '';
    let mainFontSize = '14px'; // デフォルト
    if (main) {
      const style = window.getComputedStyle(main);
      mainWidth = style.width;
      mainFont = style.fontFamily;
      mainFontSize = style.fontSize;
    }
    // モダンなスタイルを適用
    Object.assign(panel.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'min(90vw, 600px)',
      maxWidth: mainWidth,
      minHeight: '480px',
      maxHeight: '480px',
      height: '480px',
      background: (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? '#1a2230' : '#f9fafb',
      fontFamily: mainFont || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: mainFontSize || '14px',
      border: 'none',
      borderRadius: '12px 12px 0 0',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      padding: '0',
      zIndex: '9999',
      overflow: 'hidden',
      opacity: '0',
      transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    });
    // ローディング表示（ダミーカード付き）
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const cardBg = isDark ? '#232c3a' : '#fff';
    const cardText = isDark ? '#fff' : '#222';
    const cardSubText = isDark ? '#b0b8c9' : '#666';
    const barBg = isDark ? '#374151' : '#e5e7eb';
    const thumbBg = isDark ? '#444' : '#eee';
    
    // ダミーカードのHTML
    const dummyCards = Array.from({ length: 5 }, (_, i) => `
      <div class="recommend-card" style="display:block;width:100%;background:${cardBg};border-radius:14px;box-shadow:0 2px 8px rgba(30,40,60,0.10);margin-bottom:8px;padding:0;opacity:0.7;">
        <div style="display:flex;align-items:flex-start;gap:16px;padding:16px 20px;">
          <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;width:110px;">
            <div style="display:block;width:110px;height:62px;background:${thumbBg};border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(30,40,60,0.10);animation:pulse 1.5s ease-in-out infinite;"></div>
            <div style="font-size:10px;color:${isDark ? '#60a5fa' : '#3b82f6'};background:${isDark ? '#60a5fa20' : '#3b82f620'};padding:2px 6px;border-radius:4px;text-align:center;font-weight:500;width:fit-content;margin:0 auto;animation:pulse 1.5s ease-in-out infinite;">取得中</div>
          </div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;justify-content:center;">
            <div style="display:flex;align-items:baseline;gap:8px;">
              <div style="font-size:15px;font-weight:600;color:${cardText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;height:18px;background:${barBg};border-radius:4px;animation:pulse 1.5s ease-in-out infinite;"></div>
              <div style="font-size:12px;color:${cardSubText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;height:14px;background:${barBg};border-radius:4px;width:80px;animation:pulse 1.5s ease-in-out infinite;"></div>
            </div>
            <div style="font-size:12px;color:${cardSubText};margin:2px 0 4px 0;text-align:left;height:36px;background:${barBg};border-radius:4px;animation:pulse 1.5s ease-in-out infinite;"></div>
            <div style="height:7px;background:${barBg};border-radius:4px;overflow:hidden;width:100%;margin-top:4px;box-shadow:0 1px 2px rgba(30,40,60,0.08);animation:pulse 1.5s ease-in-out infinite;"></div>
          </div>
        </div>
      </div>
    `).join('');
    
    panel.innerHTML = `
      <div class="history-panel-header">
        <h3 id="recommend-panel-title" class="history-panel-title">
          <ion-icon name="play" class="history-panel-icon" aria-hidden="true"></ion-icon>
          おすすめ動画
        </h3>
        <button id="close-recommend-list-panel" class="history-panel-close" aria-label="パネルを閉じる">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="history-panel-content">
        <div class="history-list">
          ${dummyCards}
        </div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      </style>
    `;
    document.body.appendChild(panel);
    // アニメーション効果を追加
    requestAnimationFrame(() => {
      panel.style.opacity = '1';
      panel.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    
    // リスト部分の高さを調整（履歴パネルと統一）
    setTimeout(() => {
      const content = panel.querySelector('.history-panel-content');
      if (content) {
        // CSSファイルで設定済みのため、JavaScriptでの設定は不要
        // max-height: 60vh と overflow-y: auto がCSSで設定されている
      }
    }, 0);
    
    // パネルを閉じる共通関数
    const closePanel = () => {
      panel.style.opacity = '0';
      panel.style.transform = 'translate(-50%, -50%) scale(0.95)';
      setTimeout(() => {
        panel.remove();
      }, 200);
    };
    // パネル外クリックで閉じる機能
    const closePanelOnOutsideClick = (event) => {
      if (document.getElementById('confirm-dialog')) return;
      if (!panel.contains(event.target)) {
        closePanel();
      }
    };
    // エスケープキーで閉じる機能
    const closePanelOnEscape = (event) => {
      if (event.key === 'Escape') {
        closePanel();
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closePanelOnOutsideClick);
      document.addEventListener('keydown', closePanelOnEscape);
    }, 100);
    // 閉じるボタンのイベントリスナー
    document.getElementById('close-recommend-list-panel').onclick = () => {
      closePanel();
    };
    // おすすめ動画リスト生成処理
    (async () => {
      let favorites = (typeof window.getFavorites === 'function') ? window.getFavorites() : [];
      let history = (typeof window.getSetting === 'function') ? window.getSetting('history', []) : [];
      
      if (!favorites.length && !history.length) {
        panel.querySelector('.recommend-panel-content').innerHTML = '<li class="recommend-empty">お気に入りコースと履歴がありません</li>';
        return;
      }
      
      // カテゴリリストを取得
      let categories = [];
      try {
        if (typeof window.getCategoriesData === 'function') {
          categories = await window.getCategoriesData();
        }
      } catch (e) { }
      
      // 類似コース検索関数
      function findSimilarCourses(targetNames, allCategories, excludeIds, targetSummaries) {
        // --- 改良版: 履歴除外＆概要も比較対象に ---
        const similarCourses = [];
        const allScores = [];
        const seenCategoryIds = new Set();
        for (const category of allCategories) {
          if (excludeIds.has(category.categoryId)) continue;
          if (seenCategoryIds.has(category.categoryId)) continue; // 重複除外
          const categoryName = category.name.replace(/^[0-9]+\s*/, '').replace(/\s[0-9]+[A-Za-z０-９ａ-ｚＡ-Ｚ]*$/, '');
          const categorySummary = (category.summary || '').replace(/\s+/g, '');
          let maxScore = 0;
          for (const targetName of targetNames) {
            const score = calculateSimilarity(targetName, categoryName, category, allCategories);
            maxScore = Math.max(maxScore, score);
          }
          // 概要同士も比較
          if (targetSummaries && categorySummary) {
            for (const targetSummary of targetSummaries) {
              const score = calculateSimilarity(targetSummary, categorySummary, category, allCategories);
              maxScore = Math.max(maxScore, score * 0.8); // 概要はやや低めの重み
            }
          }
          allScores.push({categoryId: category.categoryId, name: categoryName, score: maxScore});
          if (maxScore > 0.1) {
            similarCourses.push({ category, score: maxScore });
            seenCategoryIds.add(category.categoryId);
          }
        }
        // スコア分布（上位10件）
        const sortedScores = allScores.sort((a, b) => b.score - a.score);
        // console.log('【類似コース検索】全カテゴリ数:', allCategories.length);
        // console.log('【類似コース検索】閾値超え候補数:', similarCourses.length);
        // console.log('【類似コース検索】スコア上位10件:', sortedScores.slice(0, 10));
        const result = similarCourses.sort((a, b) => b.score - a.score).slice(0, 5).map(item => item.category);
        // console.log('【類似コース検索】最終表示件数:', result.length, result);
        return result;
      }

      // N-gram生成
      function ngrams(str, n) {
        const s = str.replace(/\s/g, '');
        const grams = [];
        for (let i = 0; i < s.length - n + 1; i++) {
          grams.push(s.slice(i, i + n));
        }
        return grams;
      }
      // Jaccard係数
      function jaccard(a, b) {
        const setA = new Set(a);
        const setB = new Set(b);
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        return union.size === 0 ? 0 : intersection.size / union.size;
      }
      // Levenshtein距離
      function levenshtein(a, b) {
        const m = a.length, n = b.length;
        const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
          for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
            else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
          }
        }
        return dp[m][n];
      }
      // 総合類似度計算
      function calculateSimilarity(str1, str2, category, allCategories) {
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();
        // 1. カテゴリ親ID一致で加点
        let catScore = 0;
        if (category.parentCategoryId && allCategories) {
          for (const c of allCategories) {
            if (c.name === str1 && c.parentCategoryId && c.parentCategoryId === category.parentCategoryId) {
              catScore = 0.3; // 親カテゴリ一致で加点
              break;
            }
          }
        }
        // 2. N-gram Jaccard
        const ngramA = ngrams(s1, 2);
        const ngramB = ngrams(s2, 2);
        const ngramScore = jaccard(ngramA, ngramB); // 0〜1
        // 3. Levenshtein距離（短いほど高スコア）
        const levDist = levenshtein(s1, s2);
        const maxLen = Math.max(s1.length, s2.length);
        const levScore = maxLen === 0 ? 0 : 1 - (levDist / maxLen); // 0〜1
        // 4. 既存の部分一致・共通単語スコア
        let baseScore = 0;
        if (s1 === s2) baseScore = 1.0;
        else if (s1.includes(s2) || s2.includes(s1)) baseScore = 0.8;
        else {
          const words1 = s1.split(/[\s・、]/).filter(w => w.length > 1);
          const words2 = s2.split(/[\s・、]/).filter(w => w.length > 1);
          let commonWords = 0;
          for (const word1 of words1) {
            for (const word2 of words2) {
              if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
                commonWords++;
              }
            }
          }
          if (commonWords > 0) baseScore = commonWords / Math.max(words1.length, words2.length);
        }
        // 5. 総合スコア（重み付けは調整可）
        return Math.max(
          baseScore,
          0.4 * ngramScore + 0.3 * levScore + catScore
        );
      }
      
      let recommendList = [];
      let usedCategoryIds = new Set(); // 重複チェック用
      
      // 1. 履歴の上位2つを優先的に追加
      for (let i = 0; i < Math.min(2, history.length); i++) {
        const historyItem = history[i];
        const categoryId = historyItem.categoryId;
        
        if (usedCategoryIds.has(categoryId)) continue; // 重複チェック
        
        // コース内動画リスト取得
        const cacheKey = `cachedVodContents_${categoryId}`;
        let videos = [];
        try {
          if (typeof window.fetchWithCache === 'function') {
            videos = await window.fetchWithCache(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${categoryId}&offset=0&limit=30&sortType=1&sortOrder=asc`, cacheKey);
          }
        } catch (e) {}
        if (!Array.isArray(videos) || !videos.length) continue;
        
        // 進捗95%未満の最初の動画を探す（並列取得）
        const contentIds = videos.map(v => v.contentId);
        const statusList = await window.getMultipleVideoViewingStatus(contentIds);
        let found = null;
        let foundStatus = null;
        for (let j = 0; j < videos.length; j++) {
          const status = statusList[j];
          if (status.currentTimeRate < 0.95) {
            found = videos[j];
            foundStatus = status;
            break;
          }
        }
        if (found) {
          recommendList.push({ ...found, progress: foundStatus ? foundStatus.currentTimeRate : 0, source: 'history' });
          usedCategoryIds.add(categoryId);
        }
      }
      
      // 2. お気に入りから5個を追加（履歴で使用済みのコースは除外）
      if (favorites.length) {
        // 履歴で使用済みのコースIDを収集
        const historyUsedCategoryIds = new Set();
        for (const item of recommendList) {
          if (item.source === 'history') {
            historyUsedCategoryIds.add(item.categoryId);
          }
        }
        
        // シャッフル
        favorites = favorites.slice();
        for (let i = favorites.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [favorites[i], favorites[j]] = [favorites[j], favorites[i]];
        }
        
        for (const categoryId of favorites) {
          if (recommendList.length >= 7) break; // 履歴2個 + お気に入り5個まで
          if (usedCategoryIds.has(categoryId)) continue; // 重複チェック
          if (historyUsedCategoryIds.has(categoryId)) {
            // console.log('お気に入りコースが履歴と重複のため除外:', categoryId);
            continue; // 履歴で使用済みのコースは除外
          }
          
          // コース内動画リスト取得
          const cacheKey = `cachedVodContents_${categoryId}`;
          let videos = [];
          try {
            if (typeof window.fetchWithCache === 'function') {
              videos = await window.fetchWithCache(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${categoryId}&offset=0&limit=30&sortType=1&sortOrder=asc`, cacheKey);
            }
          } catch (e) {}
          if (!Array.isArray(videos) || !videos.length) continue;
          
          // 進捗95%未満の最初の動画を探す（並列取得）
          const contentIds = videos.map(v => v.contentId);
          const statusList = await window.getMultipleVideoViewingStatus(contentIds);
          let found = null;
          let foundStatus = null;
          for (let i = 0; i < videos.length; i++) {
            const status = statusList[i];
            if (status.currentTimeRate < 0.95) {
              found = videos[i];
              foundStatus = status;
              break;
            }
          }
          if (found) {
            recommendList.push({ ...found, progress: foundStatus ? foundStatus.currentTimeRate : 0, source: 'favorites' });
            usedCategoryIds.add(categoryId);
          }
        }
      }
      
      // 3. 類似コースから5個を追加（動画レベルでの重複を避ける）
      if (categories.length > 0) {
        // 履歴とお気に入りのコース名・概要を収集
        const targetNames = [];
        const targetSummaries = [];
        const usedNames = new Set();
        for (const historyItem of history.slice(0, 3)) {
          const cat = categories.find(c => c.categoryId == historyItem.categoryId);
          if (cat) {
            const cleanName = cat.name.replace(/^[0-9]+\s*/, '').replace(/\s[0-9]+[A-Za-z０-９ａ-ｚＡ-Ｚ]*$/, '');
            if (!usedNames.has(cleanName)) {
              targetNames.push(cleanName);
              usedNames.add(cleanName);
            }
            if (cat.summary) targetSummaries.push(cat.summary);
          }
        }
        for (const categoryId of favorites.slice(0, 3)) {
          const cat = categories.find(c => c.categoryId == categoryId);
          if (cat) {
            const cleanName = cat.name.replace(/^[0-9]+\s*/, '').replace(/\s[0-9]+[A-Za-z０-９ａ-ｚＡ-Ｚ]*$/, '');
            if (!usedNames.has(cleanName)) {
              targetNames.push(cleanName);
              usedNames.add(cleanName);
            }
            if (cat.summary) targetSummaries.push(cat.summary);
          }
        }
        // usedCategoryIds（履歴・お気に入り）を除外対象に
        const similarCategories = findSimilarCourses(targetNames, categories, usedCategoryIds, targetSummaries);
        // 類似コースの重複・履歴・お気に入りとの重複を徹底除外
        const uniqueSimilarCategories = [];
        const seenIds = new Set([...usedCategoryIds]);
        const seenNames = new Set();
        let idDupCount = 0, nameDupCount = 0;
        function normalizeName(name) {
          return name.replace(/[\s\(（\)）'’'"'"0-9０-９a-zA-Zａ-ｚＡ-Ｚ]/g, '').toLowerCase();
        }
        // 履歴・お気に入りのコース名（正規化）も重複除外対象に追加
        for (const historyItem of history) {
          const cat = categories.find(c => c.categoryId == historyItem.categoryId);
          if (cat) seenNames.add(normalizeName(cat.name));
        }
        for (const favId of favorites) {
          const cat = categories.find(c => c.categoryId == favId);
          if (cat) seenNames.add(normalizeName(cat.name));
        }
        for (const cat of similarCategories) {
          if (seenIds.has(cat.categoryId)) {
            idDupCount++;
            // console.log('【類似コース重複除外:ID】categoryId:', cat.categoryId, cat.name);
            continue;
          }
          const normName = normalizeName(cat.name);
          if (seenNames.has(normName)) {
            nameDupCount++;
            // console.log('【類似コース重複除外:コース名】', cat.name);
            continue;
          }
          uniqueSimilarCategories.push(cat);
          seenIds.add(cat.categoryId);
          seenNames.add(normName);
        }
        // console.log('【類似コース重複除外:ID件数】', idDupCount);
        // console.log('【類似コース重複除外:コース名件数】', nameDupCount);
        // console.log('【類似コース最終表示リスト】', uniqueSimilarCategories);
        
        // 履歴とお気に入りで使用済みのコースIDを収集
        const historyAndFavoritesUsedCategoryIds = new Set();
        for (const item of recommendList) {
          if (item.source === 'history' || item.source === 'favorites') {
            historyAndFavoritesUsedCategoryIds.add(item.categoryId);
          }
        }
        
        let similarCount = 0;
        for (const category of uniqueSimilarCategories) {
          if (recommendList.length >= 12) break; // 履歴2個 + お気に入り5個 + 類似5個まで
          
          const categoryId = category.categoryId;
          if (historyAndFavoritesUsedCategoryIds.has(categoryId)) {
            // console.log('類似コースが履歴・お気に入りと重複のため除外:', categoryId);
            continue; // 履歴・お気に入りで使用済みのコースは除外
          }
          
          // コース内動画リスト取得
          const cacheKey = `cachedVodContents_${categoryId}`;
          let videos = [];
          try {
            if (typeof window.fetchWithCache === 'function') {
              videos = await window.fetchWithCache(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${categoryId}&offset=0&limit=30&sortType=1&sortOrder=asc`, cacheKey);
            }
          } catch (e) {}
          if (!Array.isArray(videos) || !videos.length) continue;
          
          // 進捗95%未満の最初の動画を探す（並列取得）
          const contentIds = videos.map(v => v.contentId);
          const statusList = await window.getMultipleVideoViewingStatus(contentIds);
          let found = null;
          let foundStatus = null;
          for (let i = 0; i < videos.length; i++) {
            const status = statusList[i];
            if (status.currentTimeRate < 0.95) {
              found = videos[i];
              foundStatus = status;
              break;
            }
          }
          if (found) {
            const videoWithSource = { 
              ...found, 
              categoryId: categoryId, // 明示的にcategoryIdを設定
              progress: foundStatus ? foundStatus.currentTimeRate : 0, 
              source: 'similar' 
            };
            // console.log('類似コース動画データ:', videoWithSource);
            recommendList.push(videoWithSource);
            usedCategoryIds.add(categoryId); // コースレベルでの重複チェック
            similarCount++;
          }
        }
        
        // 類似コースが見つからない場合のフォールバック
        if (similarCount === 0) {
          // console.log('類似コースが見つからないため、お気に入りから追加の動画を取得');
          // お気に入りから追加の動画を取得（重複を避けて）
          for (const categoryId of favorites) {
            if (recommendList.length >= 12) break;
            if (usedCategoryIds.has(categoryId)) continue;
            
            const cacheKey = `cachedVodContents_${categoryId}`;
            let videos = [];
            try {
              if (typeof window.fetchWithCache === 'function') {
                videos = await window.fetchWithCache(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${categoryId}&offset=0&limit=30&sortType=1&sortOrder=asc`, cacheKey);
              }
            } catch (e) {}
            if (!Array.isArray(videos) || !videos.length) continue;
            
            const contentIds = videos.map(v => v.contentId);
            const statusList = await window.getMultipleVideoViewingStatus(contentIds);
            let found = null;
            let foundStatus = null;
            for (let i = 0; i < videos.length; i++) {
              const status = statusList[i];
              if (status.currentTimeRate < 0.95) {
                found = videos[i];
                foundStatus = status;
                break;
              }
            }
            if (found) {
              const videoWithSource = { 
                ...found, 
                categoryId: categoryId,
                progress: foundStatus ? foundStatus.currentTimeRate : 0, 
                source: 'favorites' 
              };
              // console.log('フォールバック動画データ:', videoWithSource);
              recommendList.push(videoWithSource);
              usedCategoryIds.add(categoryId);
            }
          }
        }
      }
      let isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      let listHtml = recommendList.map(item => {
        // サムネイル画像
        let thumb = '';
        // console.log('おすすめ動画 - 動画データ:', item);
        // console.log('おすすめ動画 - summary:', item.summary);
        
        // 1. まずcontentIdからサムネイルURLを生成（最優先）
        if (item.contentId) {
          thumb = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${item.contentId}/thumbnail/large2`;
          // console.log('おすすめ動画 - contentIdから生成したサムネイルURL:', thumb);
        }
        
        // 2. 生成したURLがない場合のみ、APIから取得したデータを使用
        if (!thumb) {
          thumb = item.thumbnailUrl || item.imageUrl || '';
          // console.log('おすすめ動画 - APIから取得したサムネイルURL:', thumb);
        }
        
        // 3. それでもない場合の代替手段
        if (!thumb && item.contentId) {
          thumb = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${item.contentId}/thumbnail`;
          // console.log('おすすめ動画 - 代替サムネイルURL:', thumb);
        }
        // コース名（カテゴリ名）
        let courseName = '';
        if (Array.isArray(categories) && item.categoryId) {
          const cat = categories.find(c => c.categoryId == item.categoryId);
          courseName = cat ? cat.name : '';
          courseName = courseName.replace(/^[0-9]+\s*/, '');
          courseName = courseName.replace(/\s[0-9]+[A-Za-z０-９ａ-ｚＡ-Ｚ]*$/, '');
          // console.log('コース名取得:', { categoryId: item.categoryId, courseName: courseName, source: item.source });
        }
        
        // ソース表示（履歴 or お気に入り or 類似）
        let sourceLabel, sourceColor;
        if (item.source === 'history') {
          sourceLabel = '履歴';
          sourceColor = isDark ? '#60a5fa' : '#3b82f6';
        } else if (item.source === 'favorites') {
          sourceLabel = 'お気に入り';
          sourceColor = isDark ? '#fbbf24' : '#f59e0b';
        } else if (item.source === 'similar') {
          sourceLabel = '類似';
          sourceColor = isDark ? '#10b981' : '#059669';
        }
        // 進捗バー
        let progress = item.progress || 0;
        const progressPercent = Math.floor(progress * 100);
        // ダーク/ライト配色
        const cardBg = isDark ? '#232c3a' : '#fff';
        const cardText = isDark ? '#fff' : '#222';
        const cardSubText = isDark ? '#b0b8c9' : '#666';
        const barBg = isDark ? '#374151' : '#e5e7eb';
        const barFg = isDark ? '#60a5fa' : '#3b82f6';
        const thumbBg = isDark ? '#444' : '#eee';
        const borderColor = isDark ? '#2d3748' : '#e5e7eb';
        // カード全体を<a>にする
        return `
          <a href="https://v.ouj.ac.jp/view/ouj/#/navi/player?co=${item.contentId}&ct=V&ca=${item.categoryId}" class="recommend-card" style="display:block;width:100%;background:${cardBg};border-radius:14px;box-shadow:0 2px 8px rgba(30,40,60,0.10);transition:all 0.2s ease;cursor:pointer;text-decoration:none;margin-bottom:8px;padding:0;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 16px rgba(30,40,60,0.15)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(30,40,60,0.10)'">
            <div style=\"display:flex;align-items:flex-start;gap:16px;padding:16px 20px;\">
              <div style=\"display:flex;flex-direction:column;gap:4px;flex-shrink:0;width:110px;\">
                <div style=\"display:block;width:110px;height:62px;background:${thumbBg};border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(30,40,60,0.10);\">
                  ${thumb ? `<img src=\"${thumb}\" alt=\"サムネイル\" style=\"width:100%;height:100%;object-fit:cover;\" onerror=\"this.style.display='none';this.nextElementSibling.style.display='inline-block';\">` : ''}
                  <span style=\"display:${thumb ? 'none' : 'inline-block'};width:100%;height:100%;background:${thumbBg};background-image:url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 96 54\" fill=\"%23ccc\"><rect width=\"96\" height=\"54\" fill=\"%23f0f0f0\"/><text x=\"48\" y=\"27\" text-anchor=\"middle\" dy=\".3em\" font-family=\"Arial\" font-size=\"12\" fill=\"%23999\">動画</text></svg>');background-size:cover;background-position:center;\"></span>
                </div>
                <div style=\"font-size:10px;color:${sourceColor};background:${sourceColor}20;padding:2px 6px;border-radius:4px;text-align:center;font-weight:500;width:fit-content;margin:0 auto;\">${sourceLabel}</div>
              </div>
                                <div style=\"flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;justify-content:center;\">
              <div style=\"display:flex;align-items:baseline;gap:8px;\">
                <div style=\"font-size:15px;font-weight:600;color:${cardText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;\">${item.title}</div>
                <div style=\"font-size:12px;color:${cardSubText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;\">${courseName}</div>
              </div>
              <div style=\"font-size:12px;color:${cardSubText};margin:2px 0 4px 0;text-align:left;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;line-height:1.5;\">${item.summary && item.summary.trim() ? item.summary.replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'サマリー情報なし'}</div>
              <div style=\"height:7px;background:${barBg};border-radius:4px;overflow:hidden;width:100%;margin-top:4px;box-shadow:0 1px 2px rgba(30,40,60,0.08);\">
                <div style=\"width:${progressPercent}%;height:100%;background:${barFg};\"></div>
              </div>
            </div>
          </div>
        </a>
      `;
    }).join('');
    if (!listHtml) listHtml = `<div class=\"history-empty\" style=\"color:${isDark ? '#fff' : '#222'};padding:16px;text-align:center;\">おすすめ動画はありません（全て再生済み）</div>`;
    panel.querySelector('.history-panel-content').innerHTML = `<div class=\"history-list\">${listHtml}</div>`;

    // 追加: リンククリックでパネルを閉じる
    const recommendLinks = panel.querySelectorAll('.recommend-card');
    recommendLinks.forEach(link => {
      link.addEventListener('click', () => {
        // パネルを閉じる
        closePanel();
      });
    });
  })();
});
}

// グローバル関数として公開
window.waitForLogoAndInsertMenu = waitForLogoAndInsertMenu;
window.addHistoryEntry = addHistoryEntry;