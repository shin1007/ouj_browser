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

// 共通の動画カード描画関数
function renderVideoCard({
  contentId,
  categoryId,
  title,
  courseName,
  summary,
  progress = 0,
  dateStr = '',
  showDelete = false,
  onDelete = null,
  cardType = 'history', // 'history' or 'recommend'
  isDark = false,
  sourceLabel = '',
  sourceColor = ''
}) {
  const cardBg = isDark ? '#232c3a' : '#fff';
  const cardText = isDark ? '#fff' : '#222';
  const cardSubText = isDark ? '#b0b8c9' : '#666';
  const barBg = isDark ? '#374151' : '#e5e7eb';
  const barFg = isDark ? '#60a5fa' : '#3b82f6';
  const thumbBg = isDark ? '#444' : '#eee';
  const borderColor = isDark ? '#2d3748' : '#e5e7eb';
  const labelColor = isDark ? '#60a5fa' : '#3b82f6';
  const progressPercent = Math.floor(progress * 100);
  const thumb = contentId ? `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${contentId}/thumbnail/large2` : '';
  return `
    <div class="recommend-card" style="display:block;width:100%;background:${cardBg};border-radius:14px;box-shadow:0 2px 8px rgba(30,40,60,0.10);margin-bottom:8px;padding:0;position:relative;">
      <a href="https://v.ouj.ac.jp/view/ouj/#/navi/player?co=${contentId}&ct=V&ca=${categoryId || ''}" class="recommend-card-link" style="display:flex;align-items:flex-start;gap:16px;padding:16px 20px;text-decoration:none;color:inherit;position:relative;width:100%;">
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;width:110px;">
          <div style="display:block;width:110px;height:62px;background:${thumbBg};border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(30,40,60,0.10);">
            <img src="${thumb}" alt="サムネイル" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';">
          </div>
          <div style="font-size:10px;color:${cardType === 'history' ? labelColor : sourceColor};background:${cardType === 'history' ? labelColor : sourceColor}20;padding:2px 6px;border-radius:4px;text-align:center;font-weight:500;width:fit-content;margin:0 auto;">
            ${cardType === 'history' ? dateStr : sourceLabel}
          </div>
        </div>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;justify-content:center;">
          <div style="display:flex;align-items:baseline;gap:8px;">
            <div style="font-size:15px;font-weight:600;color:${cardText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;">${title}</div>
            <div style="font-size:12px;color:${cardSubText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;">${courseName || ''}</div>
          </div>
          <div style="font-size:12px;color:${cardSubText};margin:2px 0 4px 0;text-align:left;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;line-height:1.5;">${summary && summary.trim() ? summary.replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'サマリー情報なし'}</div>
          <div style="height:7px;background:${barBg};border-radius:4px;overflow:hidden;width:100%;margin-top:4px;box-shadow:0 1px 2px rgba(30,40,60,0.08);">
            <div style="width:${progressPercent}%;height:100%;background:${barFg};"></div>
          </div>
        </div>
        ${showDelete ? `<button class="history-delete-btn" data-content-id="${contentId}" aria-label="この履歴を削除" title="削除" style="position:absolute;top:12px;right:12px;background:none;border:none;cursor:pointer;z-index:2;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
          </svg>
        </button>` : ''}
      </a>
    </div>
  `;
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
function handleHistoryPanelOpen() {
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
  let mainWidth = '800px';
  let mainFont = '';
  let mainFontSize = '14px';
  if (main) {
    const style = window.getComputedStyle(main);
    mainWidth = style.width;
    mainFont = style.fontFamily;
    mainFontSize = style.fontSize;
  }
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
  // 検索ボックスのHTML
  const searchBoxHtml = `
    <div class="history-search-box" style="background: #232c3a; border-radius: 10px; padding: 10px 18px; margin: 0 24px 14px 24px; box-shadow: 0 2px 8px rgba(30,40,60,0.18); border: 1.5px solid #3a4658;">
      <input id="history-search-input" type="text" placeholder="コース名・親カテゴリ名で検索" style="width: 100%; background: #232c3a; color: #fff; border: none; outline: none; font-size: 16px; padding: 10px 12px; border-radius: 6px; letter-spacing: 0.5px;">
    </div>
  `;
  panel.innerHTML = window.createCommonPanelHTML({
    id: 'history-list-panel',
    className: 'history-panel',
    title: '履歴一覧',
    iconHtml: '<ion-icon name="time" class="history-panel-icon" aria-hidden="true"></ion-icon>',
    searchBoxHtml: searchBoxHtml,
    listHtml: '',
    closeBtnId: 'close-history-list-panel',
    contentClass: 'history-panel-content',
    listClass: 'history-list'
  });
  document.body.appendChild(panel);
  requestAnimationFrame(() => {
    panel.style.opacity = '1';
    panel.style.transform = 'translate(-50%, -50%) scale(1)';
  });
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
  const closePanelOnOutsideClick = (event) => {
    if (document.getElementById('confirm-dialog')) return;
    if (!panel.contains(event.target)) {
      closePanel();
    }
  };
  const closePanelOnEscape = (event) => {
    if (event.key === 'Escape') {
      closePanel();
    }
  };
  setTimeout(() => {
    document.addEventListener('click', closePanelOnOutsideClick);
    document.addEventListener('keydown', closePanelOnEscape);
  }, 100);
  document.getElementById('close-history-list-panel').onclick = () => {
    closePanel();
  };
  // 履歴リスト生成・描画
  generateAndRenderHistoryList(panel, closePanel);
}

async function generateAndRenderHistoryList(panel, closePanel) {
  const historyListData = await createHistoryListData();
  renderHistoryListHtml(panel, closePanel, historyListData);
}

// 履歴リストの取得・整形
async function createHistoryListData() {
  let history = [];
  try {
    history = window.getSetting('history', []);
  } catch (e) {
    history = [];
  }
  const categories = await window.getCategoriesData();
  const videoItems = await Promise.all(history.map(async (item) => {
    if (!item.contentId) return null;
    let video = null;
    try {
      const url = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${item.contentId}`;
      video = await window.fetchWithCache(url, `cachedVodContent_${item.contentId}`) || {};
      if (!video.title) throw new Error('動画情報取得失敗');
    } catch (e) {
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
    return { ...item, video };
  }));
  const validVideoItems = videoItems.filter(Boolean);
  return { history, categories, validVideoItems };
}

// HTML描画・イベント登録
function renderHistoryListHtml(panel, closePanel, { history, categories, validVideoItems }) {
  let searchValue = '';
  let currentSortType = 'date';
  async function renderHistoryList(filter = '', sortType = 'date') {
    let listHtml = '';
    if (history.length) {
      const filteredItems = filter.trim() ? validVideoItems.filter(item => {
        const keyword = filter.trim().toLowerCase();
        return (item.video.title || '').toLowerCase().includes(keyword) || (item.video.categoryId && Array.isArray(categories) && categories.find(c => c.categoryId == item.video.categoryId)?.name?.toLowerCase().includes(keyword));
      }) : validVideoItems;
      const sortedItems = filteredItems.sort((a, b) => new Date(b.date) - new Date(a.date));
      listHtml = sortedItems.map(item => {
        const video = item.video;
        const title = video.title || `動画 (ID: ${item.contentId})`;
        let courseName = '';
        if (video.categoryId && Array.isArray(categories)) {
          const cat = categories.find(c => c.categoryId == video.categoryId);
          courseName = cat ? cat.name : '';
          courseName = courseName.replace(/^[0-9]+\s*/, '');
          courseName = courseName.replace(/\s[0-9]+[A-Za-z０-９ａ-ｚＡ-Ｚ]*$/, '');
        }
        const summary = video.summary || '';
        const progress = item.progress || 0;
        const date = new Date(item.date);
        const dateStr = date.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return renderVideoCard({
          contentId: item.contentId,
          categoryId: video.categoryId,
          title,
          courseName,
          summary,
          progress,
          dateStr,
          showDelete: true,
          cardType: 'history',
          isDark
        });
      }).join('');
    } else {
      listHtml = '<div class="history-empty" style="color:#222;padding:16px;text-align:center;">履歴はありません</div>';
    }
    const listContainer = panel.querySelector('.history-list');
    if (listContainer) {
      listContainer.innerHTML = listHtml;
      const cards = listContainer.querySelectorAll('.recommend-card');
      cards.forEach(card => {
        card.addEventListener('click', (event) => {
          if (event.target.closest('.history-delete-btn')) return;
          closePanel();
        });
      });
    }
    const clearAllBtn = panel.querySelector('#clear-all-history');
    if (clearAllBtn) {
      clearAllBtn.style.display = history.length > 0 ? 'flex' : 'none';
    }
    attachHistoryItemListeners();
    attachDeleteButtonListeners();
  }
  function attachHistoryItemListeners() {
    const historyItems = panel.querySelectorAll('.history-item');
    historyItems.forEach((item, index) => {
      item.addEventListener('click', (event) => {
        if (event.target.closest('.history-delete-btn')) {
          return;
        }
        event.preventDefault();
        const categoryId = item.getAttribute('data-category-id');
        if (categoryId) {
          closePanel();
          setTimeout(() => {
            window.location.href = `https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=${categoryId}`;
          }, 200);
        }
      });
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
  function attachDeleteButtonListeners() {
    const deleteBtns = panel.querySelectorAll('.history-delete-btn');
    deleteBtns.forEach(btn => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const contentId = btn.getAttribute('data-content-id');
        let history = [];
        try {
          history = window.getSetting('history', []);
        } catch (e) {
          history = [];
        }
        history = history.filter(item => item.contentId !== contentId);
        window.saveSetting('history', history);
        const card = btn.closest('.recommend-card');
        if (card) {
          card.remove();
        }
        const listContainer = panel.querySelector('.history-list');
        if (listContainer && listContainer.children.length === 0) {
          listContainer.innerHTML = `<div class=\"history-empty\" style=\"color:#222;padding:16px;text-align:center;\">履歴はありません</div>`;
        }
      };
    });
  }
  async function clearAllHistory() {
    if (history.length === 0) return;
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
      if (confirm(`履歴を全て削除しますか？（${history.length}件）`)) {
        history = [];
        window.saveSetting('history', history);
        renderHistoryList();
      }
    }
  }
  setTimeout(() => {
    const clearAllBtn = panel.querySelector('#clear-all-history');
    if (clearAllBtn) {
      clearAllBtn.onclick = () => {
        clearAllHistory();
      };
    }
  }, 0);
  const searchInput = panel.querySelector('#history-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchValue = e.target.value;
      renderHistoryList(searchValue, currentSortType);
    });
  }
  renderHistoryList('', currentSortType);
}

function addHistoryMenuEventListener() {
  const historyItem = document.getElementById('history-menu-item');
  if (!historyItem) return;
  historyItem.addEventListener('click', handleHistoryPanelOpen);
}

// =========================
// お気に入り関連の関数群
// =========================
function handleFavoritesPanelOpen() {
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
  let mainWidth = '800px';
  let mainFont = '';
  let mainFontSize = '14px';
  if (main) {
    const style = window.getComputedStyle(main);
    mainWidth = style.width;
    mainFont = style.fontFamily;
    mainFontSize = style.fontSize;
  }
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
  // 検索ボックスのHTML
  const searchBoxHtml = `
    <div class="favorite-search-box" style="background: #232c3a; border-radius: 10px; padding: 10px 18px; margin: 0 24px 14px 24px; box-shadow: 0 2px 8px rgba(30,40,60,0.18); border: 1.5px solid #3a4658;">
      <input id="favorite-search-input" type="text" placeholder="コース名・親カテゴリ名で検索" style="width: 100%; background: #232c3a; color: #fff; border: none; outline: none; font-size: 16px; padding: 10px 12px; border-radius: 6px; letter-spacing: 0.5px;">
    </div>
  `;
  panel.innerHTML = window.createCommonPanelHTML({
    id: 'favorite-list-panel',
    className: 'favorite-panel',
    title: 'お気に入りコース一覧',
    iconHtml: '',
    searchBoxHtml: searchBoxHtml,
    listHtml: '',
    closeBtnId: 'close-favorite-list-panel',
    contentClass: 'favorite-panel-content',
    listClass: 'favorite-list'
  });
  document.body.appendChild(panel);
  requestAnimationFrame(() => {
    panel.style.opacity = '1';
    panel.style.transform = 'translate(-50%, -50%) scale(1)';
  });
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
  const closePanelOnOutsideClick = (event) => {
    if (document.getElementById('confirm-dialog')) return;
    if (!panel.contains(event.target)) {
      closePanel();
    }
  };
  const closePanelOnEscape = (event) => {
    if (event.key === 'Escape') {
      closePanel();
    }
  };
  setTimeout(() => {
    document.addEventListener('click', closePanelOnOutsideClick);
    document.addEventListener('keydown', closePanelOnEscape);
  }, 100);
  document.getElementById('close-favorite-list-panel').onclick = () => {
    closePanel();
  };
  // お気に入りリスト生成・描画
  generateAndRenderFavoriteList(panel, closePanel);
}

async function generateAndRenderFavoriteList(panel, closePanel) {
  const favoriteListData = await createFavoriteListData();
  renderFavoriteListHtml(panel, closePanel, favoriteListData);
}

// お気に入りリストの取得・整形
async function createFavoriteListData() {
  const favorites = window.getSetting('favorites', []);
  const result = await chrome.storage.local.get(['cachedCategoriesData']);
  const cachedData = result.cachedCategoriesData;
  let categories = [];
  if (cachedData && cachedData.data) {
    categories = cachedData.data;
  } else {
    categories = await window.getCategoriesData();
  }
  if (!Array.isArray(categories)) categories = [];
  const idToName = {};
  categories.forEach(cat => {
    idToName[cat.categoryId] = cat.name;
    idToName[cat.categoryId.toString()] = cat.name;
  });
  function getPinnedFavorites() {
    try {
      return window.getSetting('pinnedFavorites', []);
    } catch (e) {
      return [];
    }
  }
  const pinnedFavorites = getPinnedFavorites();
  const favoriteItemsWithParent = await Promise.all(favorites.map(async (id) => {
    const categoryName = idToName[id];
    const parentCategoryName = await window.getParentCategoryName(id);
    const displayName = categoryName || `不明なコース (ID: ${id})`;
    return {
      id: id,
      categoryName: displayName,
      parentCategoryName: parentCategoryName || 'その他',
      hasParent: !!parentCategoryName,
      pinned: pinnedFavorites.includes(id)
    };
  }));
  return { favorites, categories, idToName, favoriteItemsWithParent };
}

// HTML描画・イベント登録
function renderFavoriteListHtml(panel, closePanel, { favorites, categories, idToName, favoriteItemsWithParent }) {
  let searchValue = '';
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
  async function renderFavoriteList(filter = '') {
    const pinnedFavorites = getPinnedFavorites();
    let listHtml = '';
    if (favorites.length) {
      const filteredItems = filter.trim() ? favoriteItemsWithParent.filter(item => {
        const keyword = filter.trim().toLowerCase();
        return item.categoryName.toLowerCase().includes(keyword) || item.parentCategoryName.toLowerCase().includes(keyword);
      }) : favoriteItemsWithParent;
      const pinnedItems = filteredItems.filter(item => item.pinned);
      const unpinnedItems = filteredItems.filter(item => !item.pinned);
      const groupedFavorites = {};
      unpinnedItems.forEach(item => {
        const parentKey = item.parentCategoryName;
        if (!groupedFavorites[parentKey]) {
          groupedFavorites[parentKey] = [];
        }
        groupedFavorites[parentKey].push(item);
      });
      const sortedGroups = Object.entries(groupedFavorites).sort(([aName], [bName]) => {
        const aNum = parseInt(aName.match(/^[0-9]+/)?.[0] || '0', 10);
        const bNum = parseInt(bName.match(/^[0-9]+/)?.[0] || '0', 10);
        return aNum - bNum;
      });
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
      const groupHtmls = sortedGroups.map(([parentName, items]) => {
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
    const listContainer = panel.querySelector('.favorite-list');
    if (listContainer) {
      listContainer.innerHTML = listHtml;
    }
    attachFavoriteItemListeners();
    attachPinButtonListeners();
  }
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
  function attachFavoriteItemListeners() {
    const favoriteItems = panel.querySelectorAll('.favorite-item');
    favoriteItems.forEach((item, index) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        const categoryId = item.getAttribute('data-category-id');
        if (categoryId) {
          closePanel();
          setTimeout(() => {
            window.location.href = `https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=${categoryId}`;
          }, 200);
        }
      });
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
  const searchInput = panel.querySelector('#favorite-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchValue = e.target.value;
      renderFavoriteList(searchValue);
    });
  }
  renderFavoriteList('');
}

function addFavoritesMenuEventListener() {
  const favoritesItem = document.getElementById('favorites-menu-item');
  if (!favoritesItem) return;
  favoritesItem.addEventListener('click', handleFavoritesPanelOpen);
}

// =========================
// おすすめ関連の関数群
// =========================
function handleRecommendPanelOpen() {
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
  panel.innerHTML = window.createCommonPanelHTML({
    id: 'recommend-list-panel',
    className: 'recommend-panel',
    title: 'おすすめ動画',
    iconHtml: '<ion-icon name="play" class="history-panel-icon" aria-hidden="true"></ion-icon>',
    searchBoxHtml: '',
    listHtml: dummyCards, // ローディング時はダミーカード
    closeBtnId: 'close-recommend-list-panel',
    contentClass: 'history-panel-content',
    listClass: 'history-list'
  });
  document.body.appendChild(panel);
  // アニメーション効果を追加
  requestAnimationFrame(() => {
    panel.style.opacity = '1';
    panel.style.transform = 'translate(-50%, -50%) scale(1)';
  });
  setTimeout(() => {
    const content = panel.querySelector('.history-panel-content');
    if (content) {
      // CSSファイルで設定済みのため、JavaScriptでの設定は不要
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
  const closePanelOnOutsideClick = (event) => {
    if (document.getElementById('confirm-dialog')) return;
    if (!panel.contains(event.target)) {
      closePanel();
    }
  };
  const closePanelOnEscape = (event) => {
    if (event.key === 'Escape') {
      closePanel();
    }
  };
  setTimeout(() => {
    document.addEventListener('click', closePanelOnOutsideClick);
    document.addEventListener('keydown', closePanelOnEscape);
  }, 100);
  document.getElementById('close-recommend-list-panel').onclick = () => {
    closePanel();
  };
  // おすすめリスト生成・描画
  generateAndRenderRecommendList(panel, closePanel);
}

async function generateAndRenderRecommendList(panel, closePanel) {
  const recommendListData = await createRecommendListData();
  renderRecommendListHtml(panel, closePanel, recommendListData);
}

// おすすめリストの取得・整形
async function createRecommendListData() {
  let favorites = (typeof window.getFavorites === 'function') ? window.getFavorites() : [];
  let history = (typeof window.getSetting === 'function') ? window.getSetting('history', []) : [];
  let categories = [];
  try {
    if (typeof window.getCategoriesData === 'function') {
      categories = await window.getCategoriesData();
    }
  } catch (e) { }
  let recommendList = [];
  let usedCategoryIds = new Set();
  const usedContentIds = new Set();
  let historyRecommendCount = 0;
  for (let i = 0; i < history.length && historyRecommendCount < 2; i++) {
    const historyItem = history[i];
    const { contentId, progress, date } = historyItem;
    if (!contentId || usedContentIds.has(contentId)) {
      continue;
    }
    let video = null;
    try {
      const url = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${contentId}`;
      video = await window.fetchWithCache(url, `cachedVodContent_${contentId}`) || {};
    } catch (e) { continue; }
    if (!video || !video.contentId) {
      continue;
    }
    if (progress < 0.95) {
      recommendList.push({
        ...video,
        progress,
        source: 'history',
        dateStr: new Date(date).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      });
      usedContentIds.add(contentId);
      usedCategoryIds.add(video.categoryId);
      historyRecommendCount++;
      continue;
    } else {
      const categoryId = video.categoryId;
      if (!categoryId) {
        continue;
      }
      const cacheKey = `cachedVodContents_${categoryId}`;
      let videos = [];
      try {
        if (typeof window.fetchWithCache === 'function') {
          videos = await window.fetchWithCache(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${categoryId}&offset=0&limit=30&sortType=1&sortOrder=asc`, cacheKey);
        }
      } catch (e) { }
      if (!Array.isArray(videos) || !videos.length) {
        continue;
      }
      const idx = videos.findIndex(v => v.contentId == contentId);
      if (idx !== -1 && idx + 1 < videos.length) {
        const nextVideo = videos[idx + 1];
        if (nextVideo && !usedContentIds.has(nextVideo.contentId) && !history.some(h => h.contentId == nextVideo.contentId)) {
          recommendList.push({
            ...nextVideo,
            progress: 0,
            source: 'history',
            dateStr: ''
          });
          usedContentIds.add(nextVideo.contentId);
          usedCategoryIds.add(nextVideo.categoryId);
          historyRecommendCount++;
        }
      }
    }
  }
  if (favorites.length) {
    const historyUsedCategoryIds = new Set();
    for (const item of recommendList) {
      if (item.source === 'history') {
        historyUsedCategoryIds.add(item.categoryId);
      }
    }
    favorites = favorites.slice();
    for (let i = favorites.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [favorites[i], favorites[j]] = [favorites[j], favorites[i]];
    }
    for (const categoryId of favorites) {
      if (recommendList.length >= 7) break;
      if (usedCategoryIds.has(categoryId)) continue;
      if (historyUsedCategoryIds.has(categoryId)) {
        continue;
      }
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
        recommendList.push({ ...found, progress: foundStatus ? foundStatus.currentTimeRate : 0, source: 'favorites' });
        usedCategoryIds.add(categoryId);
      }
    }
  }
  if (categories.length > 0) {
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
    function findSimilarCourses(targetNames, allCategories, excludeIds, targetSummaries) {
      const similarCourses = [];
      const allScores = [];
      const seenCategoryIds = new Set();
      for (const category of allCategories) {
        if (excludeIds.has(category.categoryId)) continue;
        if (seenCategoryIds.has(category.categoryId)) continue;
        const categoryName = category.name.replace(/^[0-9]+\s*/, '').replace(/\s[0-9]+[A-Za-z０-９ａ-ｚＡ-Ｚ]*$/, '');
        const categorySummary = (category.summary || '').replace(/\s+/g, '');
        let maxScore = 0;
        for (const targetName of targetNames) {
          const score = calculateSimilarity(targetName, categoryName, category, allCategories);
          maxScore = Math.max(maxScore, score);
        }
        if (targetSummaries && categorySummary) {
          for (const targetSummary of targetSummaries) {
            const score = calculateSimilarity(targetSummary, categorySummary, category, allCategories);
            maxScore = Math.max(maxScore, score * 0.8);
          }
        }
        allScores.push({categoryId: category.categoryId, name: categoryName, score: maxScore});
        if (maxScore > 0.1) {
          similarCourses.push({ category, score: maxScore });
          seenCategoryIds.add(category.categoryId);
        }
      }
      const sortedScores = allScores.sort((a, b) => b.score - a.score);
      const result = similarCourses.sort((a, b) => b.score - a.score).slice(0, 5).map(item => item.category);
      return result;
    }
    function ngrams(str, n) {
      const s = str.replace(/\s/g, '');
      const grams = [];
      for (let i = 0; i < s.length - n + 1; i++) {
        grams.push(s.slice(i, i + n));
      }
      return grams;
    }
    function jaccard(a, b) {
      const setA = new Set(a);
      const setB = new Set(b);
      const intersection = new Set([...setA].filter(x => setB.has(x)));
      const union = new Set([...setA, ...setB]);
      return union.size === 0 ? 0 : intersection.size / union.size;
    }
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
    function calculateSimilarity(str1, str2, category, allCategories) {
      const s1 = str1.toLowerCase();
      const s2 = str2.toLowerCase();
      let catScore = 0;
      if (category.parentCategoryId && allCategories) {
        for (const c of allCategories) {
          if (c.name === str1 && c.parentCategoryId && c.parentCategoryId === category.parentCategoryId) {
            catScore = 0.3;
            break;
          }
        }
      }
      const ngramA = ngrams(s1, 2);
      const ngramB = ngrams(s2, 2);
      const ngramScore = jaccard(ngramA, ngramB);
      const levDist = levenshtein(s1, s2);
      const maxLen = Math.max(s1.length, s2.length);
      const levScore = maxLen === 0 ? 0 : 1 - (levDist / maxLen);
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
      return Math.max(
        baseScore,
        0.4 * ngramScore + 0.3 * levScore + catScore
      );
    }
    const similarCategories = findSimilarCourses(targetNames, categories, usedCategoryIds, targetSummaries);
    const uniqueSimilarCategories = [];
    const seenIds = new Set([...usedCategoryIds]);
    const seenNames = new Set();
    function normalizeName(name) {
      return name.replace(/[\s\(（\)）'’"'"0-9０-９a-zA-Zａ-ｚＡ-Ｚ]/g, '').toLowerCase();
    }
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
        continue;
      }
      const normName = normalizeName(cat.name);
      if (seenNames.has(normName)) {
        continue;
      }
      uniqueSimilarCategories.push(cat);
      seenIds.add(cat.categoryId);
      seenNames.add(normName);
    }
    const historyAndFavoritesUsedCategoryIds = new Set();
    for (const item of recommendList) {
      if (item.source === 'history' || item.source === 'favorites') {
        historyAndFavoritesUsedCategoryIds.add(item.categoryId);
      }
    }
    let similarCount = 0;
    for (const category of uniqueSimilarCategories) {
      if (recommendList.length >= 12) break;
      const categoryId = category.categoryId;
      if (historyAndFavoritesUsedCategoryIds.has(categoryId)) {
        continue;
      }
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
          source: 'similar' 
        };
        recommendList.push(videoWithSource);
        usedCategoryIds.add(categoryId);
        similarCount++;
      }
    }
    if (similarCount === 0) {
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
          recommendList.push(videoWithSource);
          usedCategoryIds.add(categoryId);
        }
      }
    }
  }
  return recommendList;
}

function renderRecommendListHtml(panel, closePanel, recommendList) {
  let categories = [];
  if (typeof window.getCategoriesData === 'function') {
    window.getCategoriesData().then(cats => { categories = cats; render(); });
  } else {
    render();
  }
  function render() {
    let isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    let listHtml = recommendList.map(item => {
      let thumb = '';
      if (item.contentId) {
        thumb = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${item.contentId}/thumbnail/large2`;
      }
      if (!thumb) {
        thumb = item.thumbnailUrl || item.imageUrl || '';
      }
      if (!thumb && item.contentId) {
        thumb = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${item.contentId}/thumbnail`;
      }
      let courseName = '';
      if (Array.isArray(categories) && item.categoryId) {
        const cat = categories.find(c => c.categoryId == item.categoryId);
        courseName = cat ? cat.name : '';
        courseName = courseName.replace(/^[0-9]+\s*/, '');
        courseName = courseName.replace(/\s[0-9]+[A-Za-z０-９ａ-ｚＡ-Ｚ]*$/, '');
      }
      let sourceLabel = '', sourceColor = '';
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
      const summary = item.summary || '';
      let progress = item.progress || 0;
      const dateStr = item.dateStr || '';
      return renderVideoCard({
        contentId: item.contentId,
        categoryId: item.categoryId,
        title: item.title,
        courseName,
        summary,
        progress,
        dateStr,
        showDelete: false,
        cardType: 'recommend',
        isDark,
        sourceLabel,
        sourceColor
      });
    }).join('');
    if (!listHtml) listHtml = `<div class=\"history-empty\" style=\"color:${isDark ? '#fff' : '#222'};padding:16px;text-align:center;\">おすすめ動画はありません（全て再生済み）</div>`;
    panel.querySelector('.history-panel-content').innerHTML = `<div class=\"history-list\">${listHtml}</div>`;
    const recommendLinks = panel.querySelectorAll('.recommend-card');
    recommendLinks.forEach(link => {
      link.addEventListener('click', () => {
        closePanel();
      });
    });
    console.log('[おすすめ描画] recommendList:', recommendList.map(item => ({
      contentId: item.contentId,
      source: item.source,
      progress: item.progress,
      title: item.title,
      dateStr: item.dateStr
    })));
  }
}

function addRecommendMenuEventListener() {
  const recommendItem = document.getElementById('recommend-menu-item');
  if (!recommendItem) return;
  recommendItem.addEventListener('click', handleRecommendPanelOpen);
}

// グローバル関数として公開
window.waitForLogoAndInsertMenu = waitForLogoAndInsertMenu;
window.addHistoryEntry = addHistoryEntry;