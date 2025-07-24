// メニュー設定
const MENU_CONFIG = {
  title: "拡張機能",
  items: [
    { id: "favorites", text: "お気に入り", icon: "star" },
    { id: "history", text: "履歴", icon: "time" },
    { id: "recommend", text: "おすすめ動画", icon: "play" } // 追加
  ]
};

// 共通カラーパレット・スタイル値
const COLOR_PALETTE = {
  lightBg: '#f9fafb',
  darkBg: '#1a2230',
  panelBorder: '1px solid rgba(255, 255, 255, 0.2)',
  panelShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  blue: '#3b82f6',
  blueDark: '#60a5fa',
  yellow: '#ffd600',
  red: '#dc2626',
  gray: '#374151',
  white: '#fff',
  black: '#222',
  inputBgLight: '#f9fafb',
  inputBgDark: '#232c3a',
  inputBorderLight: '#e5e7eb',
  inputBorderDark: '#374151',
};
const STYLE_VARS = {
  panelRadius: '12px 12px 0 0',
  panelMinWidth: 'min(90vw, 600px)',
  panelMinHeight: '480px',
  panelMaxHeight: '480px',
  panelPadding: '0',
  zIndex: 9999,
  transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
  backdrop: 'blur(10px)'
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
      // console.log(`waitForLogoAndInsertMenu: 遅延チェック - ion-list[${index}]:`, list);
      // console.log(`waitForLogoAndInsertMenu: 遅延チェック - ion-list[${index}]のクラス:`, list.className);
      // console.log(`waitForLogoAndInsertMenu: 遅延チェック - ion-list[${index}]のaria-label:`, list.getAttribute('aria-label'));
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
  const historyItem = document.getElementById('history-menu-item');
  if (historyItem) {
    historyItem.addEventListener('click', handleHistoryPanelOpen);
  }
  const favoritesItem = document.getElementById('favorites-menu-item');
  if (favoritesItem) {
    favoritesItem.addEventListener('click', handleFavoritesPanelOpen);
  }
  const recommendItem = document.getElementById('recommend-menu-item');
  if (recommendItem) {
    recommendItem.addEventListener('click', handleRecommendPanelOpen);
  }
}

/**
 * パネル生成・描画・閉じる処理を共通化
 * @param {Object} options
 * @param {string} options.id パネルID
 * @param {string} options.className パネルのクラス名
 * @param {string} options.title パネルタイトル
 * @param {string} options.iconHtml タイトル横のアイコンHTML
 * @param {string} options.actionHtml タイトル横のアクションHTML
 * @param {string} options.searchBoxHtml 検索ボックスHTML
 * @param {string} options.listHtml 初期リストHTML（ローディング用など）
 * @param {string} options.closeBtnId 閉じるボタンID
 * @param {string} options.contentClass パネル内コンテンツクラス
 * @param {string} options.listClass リストクラス
 * @param {function} options.fetchData データ取得関数（Promiseを返す）
 * @param {function} options.renderList リスト描画関数（panel, closePanel, data を受け取る）
 */
function openPanel({
  id,
  className,
  title,
  iconHtml,
  actionHtml = '',
  searchBoxHtml = '',
  listHtml = '',
  closeBtnId,
  contentClass,
  listClass,
  fetchData,
  renderList
}) {
  // 既存パネルがあれば削除
  let panel = document.getElementById(id);
  if (panel) panel.remove();

  // パネル生成
  panel = createPanel({ id, className, ariaLabelledby: `${id}-title` });

  // パネルHTML
  panel.innerHTML = window.createCommonPanelHTML({
    id,
    className,
    title,
    iconHtml,
    actionHtml,
    searchBoxHtml,
    listHtml,
    closeBtnId,
    contentClass,
    listClass
  });

  document.body.appendChild(panel);

  // アニメーション
  requestAnimationFrame(() => {
    panel.style.opacity = '1';
    panel.style.transform = 'translate(-50%, -50%) scale(1)';
  });

  // パネルを閉じる共通関数
  const closePanelRaw = () => {
    panel.style.opacity = '0';
    panel.style.transform = 'translate(-50%, -50%) scale(0.95)';
    setTimeout(() => {
      panel.remove();
    }, 200);
  };
  const closePanel = setupPanelCloseEvents(panel, closePanelRaw, closeBtnId);

  // データ取得→リスト描画
  if (typeof fetchData === 'function' && typeof renderList === 'function') {
    fetchData().then(data => {
      renderList(panel, closePanel, data);
  });
  }

  return panel;
}

// =========================
// 描画関数を先に配置
// =========================
function renderHistoryListHtml(panel, closePanel, { history, categories, validVideoItems }) {
  let searchValue = '';
  let currentSortType = 'date';
  async function renderHistoryList(filter = '', sortType = 'date') {
    let listHtml = '';
    if (history.length) {
      const filteredItems = filter.trim() ? validVideoItems.filter(item => {
        const keyword = filter.trim().toLowerCase();
        return (item.title || '').toLowerCase().includes(keyword) || (item.categoryId && Array.isArray(categories) && categories.find(c => c.categoryId == item.categoryId)?.name?.toLowerCase().includes(keyword));
      }) : validVideoItems;
      const sortedItems = filteredItems.sort((a, b) => new Date(b.date) - new Date(a.date));
      listHtml = sortedItems.map(item => {
        const title = item.title || `動画 (ID: ${item.contentId})`;
        let courseName = '';
        if (item.categoryId && Array.isArray(categories)) {
          const cat = categories.find(c => c.categoryId == item.categoryId);
          courseName = cat ? cat.name : '';
          courseName = courseName.replace(/^[0-9]+\s*/, '');
          courseName = courseName.replace(/\s[0-9]+[A-Za-z０-９ａ-ｚＡ-Ｚ]*$/, '');
        }
        const summary = item.summary || '';
        const progress = item.progress || 0;
        const date = new Date(item.date);
        const dateStr = date.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return renderVideoCard({
          contentId: item.contentId,
          categoryId: item.categoryId,
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
    // setupListItemEventsで共通化
    setupListItemEvents(panel, '.history-item', {
      onClick: (event, item) => {
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
      },
      onKeydown: (event, item, index, items) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          item.click();
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          const nextItem = items[index + 1];
          if (nextItem) nextItem.focus();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          const prevItem = items[index - 1];
          if (prevItem) prevItem.focus();
        }
      }
    });
    attachDeleteButtonListeners();
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
    // console.log('renderFavoriteList called');
    const pinnedFavorites = getPinnedFavorites();
    // 毎回最新のpinned状態を反映
    favoriteItemsWithParent.forEach(item => {
      item.pinned = pinnedFavorites.includes(item.id);
    });
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
              ${getIconHtml('pin')}
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
                  ${getIconHtml('arrow')}
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
            ${getIconHtml('arrow')}
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
    // setupListItemEventsで共通化
    setupListItemEvents(panel, '.favorite-item', {
      onClick: (event, item) => {
        event.preventDefault();
        const categoryId = item.getAttribute('data-category-id');
        if (categoryId) {
          closePanel();
          setTimeout(() => {
            window.location.href = `https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=${categoryId}`;
          }, 200);
        }
      },
      onKeydown: (event, item, index, items) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          item.click();
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          const nextItem = items[index + 1];
          if (nextItem) nextItem.focus();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          const prevItem = items[index - 1];
          if (prevItem) prevItem.focus();
        }
      }
    });
    attachPinButtonListeners();
  }
  function attachPinButtonListeners() {
    const pinButtons = panel.querySelectorAll('.favorite-pin-btn');
    // console.log('attachPinButtonListeners called', pinButtons.length);
    pinButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        // console.log('pin button clicked');
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
  // 検索ボックスイベント
  const searchInput = panel.querySelector('#favorite-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchValue = e.target.value;
      renderFavoriteList(searchValue);
    });
  }
  renderFavoriteList('');
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
    // setupListItemEventsで共通化
    setupListItemEvents(panel, '.recommend-card', {
      onClick: (event, item) => {
        closePanel();
      },
      onKeydown: (event, item, index, items) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          item.click();
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          const nextItem = items[index + 1];
          if (nextItem) nextItem.focus();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          const prevItem = items[index - 1];
          if (prevItem) prevItem.focus();
        }
      }
    });
    // console.log('[おすすめ描画] recommendList:', recommendList.map(item => ({
    //   contentId: item.contentId,
    //   source: item.source,
    //   progress: item.progress,
    //   title: item.title,
    //   dateStr: item.dateStr
    // })));
  }
}

// =========================
// データ取得関数を先に配置
// =========================
async function createHistoryListData() {
  let history = [];
  try {
    history = window.getSetting('history', []);
  } catch (e) {
    history = [];
  }
  const contentIds = history.map(item => item.contentId).filter(Boolean);
  const videoItems = await getPanelDataVideoPattern(contentIds);
  // contentIdでhistory情報とvideo情報をマージ
  const validVideoItems = videoItems.map(video => {
    const h = history.find(h => h.contentId == video.contentId) || {};
    return { ...video, progress: h.progress, date: h.date, contentId: video.contentId };
  });
  const categories = await window.getCategoriesData();
  return { history, categories, validVideoItems };
}

async function createFavoriteListData() {
  const favorites = window.getSetting('favorites', []);
  const { categories, idToName, items: favoriteItemsWithParent } = await getPanelDataCoursePattern(favorites);
  function getPinnedFavorites() {
    try {
      return window.getSetting('pinnedFavorites', []);
    } catch (e) {
      return [];
    }
  }
  const pinnedFavorites = getPinnedFavorites();
  // pinned情報を付与
  favoriteItemsWithParent.forEach(item => {
    item.pinned = pinnedFavorites.includes(item.id);
  });
  return { favorites, categories, idToName, favoriteItemsWithParent };
}

async function createRecommendListData() {
  let favorites = (typeof window.getFavorites === 'function') ? window.getFavorites() : [];
  let history = (typeof window.getSetting === 'function') ? window.getSetting('history', []) : [];
  const categories = await window.getCategoriesData();
  // console.log('[おすすめデバッグ] favorites:', favorites);
  // console.log('[おすすめデバッグ] history:', history);
  // console.log('[おすすめデバッグ] categories:', categories);

  const historyContentIds = history.map(item => item.contentId).filter(Boolean);
  const historyVideos = await getPanelDataVideoPattern(historyContentIds);
  // console.log('[おすすめデバッグ] historyVideos:', historyVideos);

  let recommendList = [];
  let usedCategoryIds = new Set();
  const usedContentIds = new Set();
  let historyRecommendCount = 0;
  for (let i = 0; i < history.length && historyRecommendCount < 2; i++) {
    const historyItem = history[i];
    const { contentId, progress, date } = historyItem;
    if (!contentId) {
      // console.log('[おすすめデバッグ] 履歴: contentIdなしで除外', historyItem);
      continue;
    }
    if (usedContentIds.has(contentId)) {
      // console.log('[おすすめデバッグ] 履歴: 既にusedContentIdsに含まれているため除外', contentId);
      continue;
    }
    let video = null;
    try {
      const url = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${contentId}`;
      video = await window.fetchWithCache(url, `cachedVodContent_${contentId}`) || {};
    } catch (e) { 
      // console.log('[おすすめデバッグ] 履歴: 動画情報取得失敗', contentId, e);
      continue; 
    }
    if (!video || !video.contentId) {
      // console.log('[おすすめデバッグ] 履歴: video情報なしで除外', video);
      continue;
    }
    if (progress < 0.95) {
      // console.log('[おすすめデバッグ] 履歴: progress<0.95で追加', video, 'progress:', progress);
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
        // console.log('[おすすめデバッグ] 履歴: categoryIdなしで除外', video);
        continue;
      }
      const cacheKey = `cachedVodContents_${categoryId}`;
      let videos = [];
      try {
        if (typeof window.fetchWithCache === 'function') {
          videos = await window.fetchWithCache(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${categoryId}&offset=0&limit=30&sortType=1&sortOrder=asc`, cacheKey);
        }
      } catch (e) { 
        // console.log('[おすすめデバッグ] 履歴: カテゴリ動画取得失敗', categoryId, e);
      }
      if (!Array.isArray(videos) || !videos.length) {
        // console.log('[おすすめデバッグ] 履歴: カテゴリ内動画なしで除外', categoryId);
        continue;
      }
      const idx = videos.findIndex(v => v.contentId == contentId);
      if (idx !== -1 && idx + 1 < videos.length) {
        const nextVideo = videos[idx + 1];
        if (nextVideo && !usedContentIds.has(nextVideo.contentId) && !history.some(h => h.contentId == nextVideo.contentId)) {
          // console.log('[おすすめデバッグ] 履歴: 次の動画を追加', nextVideo);
          recommendList.push({
            ...nextVideo,
            progress: 0,
            source: 'history',
            dateStr: ''
          });
          usedContentIds.add(nextVideo.contentId);
          usedCategoryIds.add(nextVideo.categoryId);
          historyRecommendCount++;
        } else {
          // console.log('[おすすめデバッグ] 履歴: 次の動画が条件に合わず除外', nextVideo);
        }
      } else {
        // console.log('[おすすめデバッグ] 履歴: 次の動画なしで除外', video);
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
      if (usedCategoryIds.has(categoryId)) {
        // console.log('[おすすめデバッグ] お気に入り: 既にusedCategoryIdsに含まれているため除外', categoryId);
        continue;
      }
      if (historyUsedCategoryIds.has(categoryId)) {
        // console.log('[おすすめデバッグ] お気に入り: historyUsedCategoryIdsに含まれているため除外', categoryId);
        continue;
      }
      const cacheKey = `cachedVodContents_${categoryId}`;
      let videos = [];
      try {
        if (typeof window.fetchWithCache === 'function') {
          videos = await window.fetchWithCache(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${categoryId}&offset=0&limit=30&sortType=1&sortOrder=asc`, cacheKey);
        }
      } catch (e) {
        // console.log('[おすすめデバッグ] お気に入り: カテゴリ動画取得失敗', categoryId, e);
      }
      if (!Array.isArray(videos) || !videos.length) {
        // console.log('[おすすめデバッグ] お気に入り: カテゴリ内動画なしで除外', categoryId);
        continue;
      }
      const contentIds = videos.map(v => v.contentId);
      const statusList = await window.getMultipleVideoViewingStatus(contentIds);
      let found = null;
      let foundStatus = null;
      for (let i = 0; i < videos.length; i++) {
        const status = statusList[i];
        if (status.currentTimeRate < 0.95) {
          found = videos[i];
          foundStatus = status;
          // console.log('[おすすめデバッグ] お気に入り: 未視聴動画を追加', found, foundStatus);
          break;
        } else {
          // console.log('[おすすめデバッグ] お気に入り: 視聴済みで除外', videos[i], status);
        }
      }
      if (found) {
        recommendList.push({ ...found, progress: foundStatus ? foundStatus.currentTimeRate : 0, source: 'favorites' });
        usedCategoryIds.add(categoryId);
      }
    }
  }
  // ...（類似コース部分も同様に詳細ログを追加可能）...
  // console.log('[おすすめデバッグ] 最終recommendList:', recommendList);
  return recommendList;
}

// =========================
// 履歴関連の関数群
// =========================
function handleHistoryPanelOpen() {
  openPanel({
    id: 'history-list-panel',
    className: 'history-panel',
    title: '履歴一覧',
    iconHtml: getIconHtml('history'),
    actionHtml: `<button id="clear-all-history" class="history-clear-all-btn" aria-label="履歴を全て削除" title="全削除" style="background:none;border:none;cursor:pointer;padding:0 8px;display:flex;align-items:center;">
      ${getIconHtml('delete')}
    </button>`,
    searchBoxHtml: createSearchBoxHtml('history'),
    listHtml: '',
    closeBtnId: 'close-history-list-panel',
    contentClass: 'history-panel-content',
    listClass: 'history-list',
    fetchData: createHistoryListData,
    renderList: renderHistoryListHtml
  });
}

// =========================
// お気に入り関連の関数群
// =========================
function handleFavoritesPanelOpen() {
  openPanel({
    id: 'favorite-list-panel',
    className: 'favorite-panel',
    title: 'お気に入りコース一覧',
    iconHtml: getIconHtml('favorite'),
    actionHtml: '',
    searchBoxHtml: createSearchBoxHtml('favorite'),
    listHtml: '',
    closeBtnId: 'close-favorite-list-panel',
    contentClass: 'favorite-panel-content',
    listClass: 'favorite-list',
    fetchData: createFavoriteListData,
    renderList: renderFavoriteListHtml
  });
}

// =========================
// おすすめ関連の関数群
// =========================
function handleRecommendPanelOpen() {
  // ダミーカードHTML生成は従来通り
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const cardBg = isDark ? '#232c3a' : '#fff';
  const cardText = isDark ? '#fff' : '#222';
  const cardSubText = isDark ? '#b0b8c9' : '#666';
  const barBg = isDark ? '#374151' : '#e5e7eb';
  const thumbBg = isDark ? '#444' : '#eee';
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
  openPanel({
    id: 'recommend-list-panel',
    className: 'recommend-panel',
    title: 'おすすめ動画',
    iconHtml: getIconHtml('recommend'),
    actionHtml: '',
    searchBoxHtml: '',
    listHtml: dummyCards,
    closeBtnId: 'close-recommend-list-panel',
    contentClass: 'history-panel-content',
    listClass: 'history-list',
    fetchData: createRecommendListData,
    renderList: renderRecommendListHtml
  });
}

// グローバル関数として公開
window.waitForLogoAndInsertMenu = waitForLogoAndInsertMenu;
window.addHistoryEntry = addHistoryEntry;

// 履歴をlocalStorageに保存する関数
async function addHistoryEntry(contentId) {
  if (!contentId) return;
  // 最近の履歴追加をチェック（5秒以内の同じcontentIdは無視）
  const lastHistoryKey = `lastHistory_${contentId}`;
  const lastHistoryTime = window.getSetting(lastHistoryKey, 0);
  const now = Date.now();
  if (now - lastHistoryTime < 5000) {
    return;
  }
  // 進捗取得（おすすめ機能と同じ方式）
  let progress = 0;
  try {
    if (window.getVideoViewingStatus) {
      const status = await window.getVideoViewingStatus(contentId, { cacheSeconds: 5 });
      progress = status.currentTimeRate || 0;
    }
  } catch (e) {}
  const entry = {
    contentId,
    date: new Date().toISOString(),
    progress
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
window.addHistoryEntry = addHistoryEntry;

// 検索ボックスHTML生成の共通関数
function createSearchBoxHtml(type) {
  const id = type === 'history' ? 'history-search-input' : 'favorite-search-input';
  const boxClass = type === 'history' ? 'history-search-box' : 'favorite-search-box';
  const placeholder = 'コース名・親カテゴリ名で検索';
  return `
    <div class="${boxClass}" style="background: #232c3a; border-radius: 10px; padding: 4px 12px; margin: 0 24px 10px 24px; box-shadow: 0 2px 8px rgba(30,40,60,0.18); border: 1.5px solid #3a4658;">
      <input id="${id}" type="text" placeholder="${placeholder}" style="width: 100%; background: #232c3a; color: #fff; font-size: 14px; padding: 6px 8px; border-radius: 6px; letter-spacing: 0.5px;">
    </div>
  `;
}

// パネルの閉じるイベントを共通化
function setupPanelCloseEvents(panel, closePanel, closeBtnId) {
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
  if (closeBtnId) {
    const closeBtn = document.getElementById(closeBtnId);
    if (closeBtn) {
      closeBtn.onclick = () => {
        closePanel();
      };
    }
  }
  // パネルが閉じられたらイベント解除
  const cleanup = () => {
    document.removeEventListener('click', closePanelOnOutsideClick);
    document.removeEventListener('keydown', closePanelOnEscape);
  };
  // closePanelをラップしてクリーンアップ
  return () => {
    closePanel();
    cleanup();
  };
}

// パネル生成・スタイル適用の共通関数
function createPanel({ id, className, ariaLabelledby, ariaModal = 'true', mainId = 'main' }) {
  let panel = document.getElementById(id);
  if (panel) panel.remove();
  panel = document.createElement('div');
  panel.id = id;
  panel.className = className;
  panel.setAttribute('role', 'dialog');
  if (ariaLabelledby) panel.setAttribute('aria-labelledby', ariaLabelledby);
  if (ariaModal) panel.setAttribute('aria-modal', ariaModal);
  // #mainの幅・スタイルを取得
  const main = document.getElementById(mainId);
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
  return panel;
}

// 汎用：パネル内リストアイテムのイベント登録
function setupListItemEvents(panel, selector, { onClick, onKeydown }) {
  const items = panel.querySelectorAll(selector);
  items.forEach((item, index) => {
    if (onClick) {
      item.addEventListener('click', (event) => onClick(event, item, index));
    }
    if (onKeydown) {
      item.addEventListener('keydown', (event) => onKeydown(event, item, index, items));
    }
  });
}

// 汎用：パネル内検索ボックスのイベント登録
function setupPanelSearchBox(panel, inputId, onInput) {
  const searchInput = panel.querySelector(`#${inputId}`);
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      onInput(e.target.value);
    });
  }
}

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

// データ取得・整形の共通化
// 動画パターン（履歴・おすすめ）
async function getPanelDataVideoPattern(ids, { getStatus = null } = {}) {
  // ids: contentIdの配列
  const results = await Promise.all(ids.map(async (contentId) => {
    let video = null;
    try {
      const url = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${contentId}`;
      video = await window.fetchWithCache(url, `cachedVodContent_${contentId}`) || {};
      if (!video.title) throw new Error('動画情報取得失敗');
    } catch (e) {
      return null;
    }
    let status = null;
    if (getStatus) {
      try {
        status = await getStatus(contentId);
      } catch (e) {}
    }
    return { ...video, status };
  }));
  return results.filter(Boolean);
}
// コースパターン（お気に入り）
async function getPanelDataCoursePattern(ids) {
  // ids: categoryIdの配列
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
  const items = await Promise.all(ids.map(async (id) => {
    const categoryName = idToName[id];
    const parentCategoryName = await window.getParentCategoryName(id);
    const displayName = categoryName || `不明なコース (ID: ${id})`;
    return {
      id: id,
      categoryName: displayName,
      parentCategoryName: parentCategoryName || 'その他',
      hasParent: !!parentCategoryName
    };
  }));
  return { categories, idToName, items };
}