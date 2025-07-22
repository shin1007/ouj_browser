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
  
  // 重複挿入防止フラグ（グローバル変数として管理）
  if (window.oujMenuInsertionInProgress) {
    return;
  }
  
      // 既にメニューが存在する場合はスキップ（aria-labelで検索）
    const existingMenu = document.querySelector('ion-list[aria-label="拡張機能"]');
    if (existingMenu) {
      return;
    }
  
  // 挿入処理開始フラグを設定
  window.oujMenuInsertionInProgress = true;
  
  // 共通関数の存在をチェック
  if (typeof window.waitForElement !== 'function') {
    window.oujMenuInsertionInProgress = false; // フラグをリセット
    setTimeout(waitForLogoAndInsertMenu, 100);
    return;
  }
  
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
    
    if (!settingList) {
      return;
    }
    
    // 設定リストの前に挿入
    settingList.parentNode.insertBefore(menuList, settingList);
    
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
            
            if (reinsertionCount >= maxReinsertions) {
              observer.disconnect();
              return;
            }
            
            reinsertionCount++;
            
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
      }
      
      return observer;
    };
    
    // 監視を即座に開始
    const observer = startMonitoring();
    
    // 挿入確認のための遅延チェック
    setTimeout(() => {
      
      // 複数のセレクタでメニューの存在を確認
      const insertedMenuByAriaLabel = document.querySelector('ion-list[aria-label="拡張機能"]');
      const insertedMenuById = document.getElementById('ouj-extension-menu-title');
      const allMenuLists = document.querySelectorAll('#menu ion-list');
      
      if (insertedMenuByAriaLabel || insertedMenuById) {
        return;
      }
      
      // 挿入に失敗した場合、再挿入を試行
      if (reinsertionCount >= maxReinsertions) {
        return;
      }
      
      reinsertionCount++;
      setTimeout(() => {
        reinsertMenu();
      }, 100);
    }, 100);
    
    // イベントリスナーを追加
    addMenuEventListeners();
    
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

// 履歴メニューのイベントリスナー
function addHistoryMenuEventListener() {
  const historyItem = document.getElementById('history-menu-item');
  if (historyItem) {
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
          // 各履歴について親カテゴリ名も取得
          const historyItemsWithParent = await Promise.all(history.map(async (item) => {
            // 親カテゴリ名を取得
            const parentCategoryName = await window.getParentCategoryName(item.categoryId);
            return {
              ...item,
              parentCategoryName: parentCategoryName || 'その他',
              hasParent: !!parentCategoryName
            };
          }));

          // 検索フィルタ適用
          const filteredItems = filter.trim() ? historyItemsWithParent.filter(item => {
            const keyword = filter.trim().toLowerCase();
            const title = item.title || `コース (ID: ${item.categoryId})`;
            return title.toLowerCase().includes(keyword) || item.parentCategoryName.toLowerCase().includes(keyword);
          }) : historyItemsWithParent;

          if (sortType === 'date') {
            listHtml = renderHistoryListByDate(filteredItems);
          } else {
            listHtml = renderHistoryListByGroup(filteredItems);
          }
        } else {
          listHtml = '<li class="history-empty">履歴はありません</li>';
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
        const deleteButtons = panel.querySelectorAll('.history-delete-btn');
        deleteButtons.forEach(button => {
          button.addEventListener('click', async (event) => {
            event.stopPropagation();
            const date = button.getAttribute('data-date');
            const categoryId = button.getAttribute('data-category-id');
            // 履歴配列から該当アイテムを検索
            const index = history.findIndex(item => item.date === date && String(item.categoryId) === String(categoryId));
            const item = history[index];
            if (item) {
              const title = item.title || `コース (ID: ${item.categoryId})`;
              
              // 共通化した確認ダイアログを使用
              if (typeof window.showConfirmDialog === 'function') {
                const confirmed = await window.showConfirmDialog(
                  `「${title}」を履歴から削除しますか？`,
                  '履歴の削除'
                );
                if (confirmed) {
                  // 履歴から削除
                  history.splice(index, 1);
                  window.saveSetting('history', history);
                  // リストを再描画
                  renderHistoryList(searchValue, 'date');
                }
              } else {
                // フォールバック: 従来のconfirmを使用
                if (confirm(`「${title}」を履歴から削除しますか？`)) {
                  // 履歴から削除
                  history.splice(index, 1);
                  window.saveSetting('history', history);
                  // リストを再描画
                  renderHistoryList(searchValue, 'date');
                }
              }
            }
          });
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
  }
  
// お気に入りメニューのイベントリスナー
function addFavoritesMenuEventListener() {
  const favoritesItem = document.getElementById('favorites-menu-item');
  if (!favoritesItem) return;
    favoritesItem.addEventListener('click', async () => {
      // 既存パネルがあれば削除
      let panel = document.getElementById('favorite-list-panel');
    if (panel) panel.remove();
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
    // ローディング表示
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
        <ul class="favorite-list"><li class="favorite-empty">読み込み中...</li></ul>
      </div>
    `;
    document.body.appendChild(panel);
    // アニメーション効果を追加
    requestAnimationFrame(() => {
      panel.style.opacity = '1';
      panel.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    // イベントリスナー（閉じる等）はすぐ追加
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
    // 検索ボックスのイベントリスナー（リスト描画後にも再設定する）
    let searchValue = '';
    const searchInput = panel.querySelector('#favorite-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchValue = e.target.value;
        renderFavoriteList(searchValue);
      });
    }
    // 非同期でカテゴリデータ取得・リスト描画
    let favorites = window.getSetting('favorites', []).map(String);
    let history = window.getSetting('history', []);
    // ピン止め情報取得関数
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
    // --- ここから下は既存のrenderFavoriteListの内容を使う ---
      async function renderFavoriteList(filter = '') {
        const pinnedFavorites = getPinnedFavorites();
        let listHtml = '';
        if (favorites.length) {
        // categories.jsのAPI経由でカテゴリ名・親カテゴリ名を取得
          const favoriteItemsWithParent = await Promise.all(favorites.map(async (id) => {
          const idStr = id.toString();
          // 履歴のtitleを優先
          const historyEntry = history.find(h => String(h.categoryId) === idStr);
          let categoryName = historyEntry && historyEntry.title ? historyEntry.title : null;
          if (!categoryName) {
            categoryName = await window.getCategoryNameById(idStr);
          }
          const parentCategoryName = await window.getParentCategoryName(idStr);
          const displayName = categoryName || `不明なコース (ID: ${idStr})`;
            return {
            id: idStr,
              categoryName: displayName,
              parentCategoryName: parentCategoryName || 'その他',
              hasParent: !!parentCategoryName,
            pinned: pinnedFavorites.includes(idStr)
            };
          }));
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
      // お気に入り項目のクリックイベントリスナー
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
      // 初回リスト描画
      renderFavoriteList('');
  });
}

// おすすめメニューのイベントリスナー
function addRecommendMenuEventListener() {
  const recommendItem = document.getElementById('recommend-menu-item');
  if (!recommendItem) return;
    recommendItem.addEventListener('click', async () => {
      // 既存パネルがあれば削除
      let panel = document.getElementById('recommend-list-panel');
    if (panel) panel.remove();
    panel = createRecommendPanel();
    document.body.appendChild(panel);
    showPanelAnimation(panel);
    addRecommendPanelListeners(panel);
    await renderRecommendList(panel);
  });
}

function createRecommendPanel() {
  const panel = document.createElement('div');
      panel.id = 'recommend-list-panel';
      panel.className = 'recommend-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-labelledby', 'recommend-panel-title');
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
      // ローディング表示（ダミーカード付き）
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
  return panel;
}

function showPanelAnimation(panel) {
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
}
      
function addRecommendPanelListeners(panel) {
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
}

async function renderRecommendList(panel) {
    let favorites = (typeof window.getFavorites === 'function') ? window.getFavorites() : [];
    let history = (typeof window.getSetting === 'function') ? window.getSetting('history', []) : [];
    if (!favorites.length && !history.length) {
      panel.querySelector('.history-panel-content').innerHTML = '<li class="recommend-empty">お気に入りコースと履歴がありません</li>';
      return;
    }

    // ダークモード判定
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const cardBg = isDark ? '#232c3a' : '#fff';
    const cardText = isDark ? '#fff' : '#222';
    const cardSubText = isDark ? '#b0b8c9' : '#666';

    // 1. 履歴コースIDリストを取得
    const historyCourseIds = history.map(item => item.categoryId);
    const shownVideoIds = new Set();
    let recommendVideos = [];

    // 2. 各コースの未再生動画のうち一番若いものだけ抽出
    for (const courseId of historyCourseIds) {
      // コース内の動画リストを取得
      let videos = [];
      if (typeof window.getChildCategoriesWithSummary === 'function') {
        try {
          videos = await window.getChildCategoriesWithSummary(courseId);
        } catch (e) {
          continue;
        }
      }
      // categoryIdで昇順ソート
      videos.sort((a, b) => parseInt(a.categoryId) - parseInt(b.categoryId));
      let found = false;
      for (const video of videos) {
        if (shownVideoIds.has(video.categoryId)) continue;
        // 未再生判定
        let status = null;
        if (typeof window.getVideoViewingStatus === 'function') {
          try {
            status = await window.getVideoViewingStatus(video.categoryId);
          } catch (e) {}
        }
        if (!status || status.currentTimeRate === 0) {
          recommendVideos.push({
            ...video,
            courseId,
          });
          shownVideoIds.add(video.categoryId);
          found = true;
          break; // 各コースで1件のみ
        }
      }
    }

    // 3. コース名を非同期で取得
    for (const video of recommendVideos) {
      if (!video.courseName && typeof window.getCategoryNameById === 'function') {
        try {
          video.courseName = await window.getCategoryNameById(video.courseId);
        } catch (e) {
          video.courseName = 'コース';
        }
      }
    }

    // 4. UIに反映
    const content = panel.querySelector('.history-panel-content');
    if (!recommendVideos.length) {
      content.innerHTML = '<li class="recommend-empty">未再生のおすすめ動画はありません</li>';
      return;
    }
    content.innerHTML = recommendVideos.map(video => `
      <div class="recommend-card" style="display:block;width:100%;background:${cardBg};border-radius:14px;box-shadow:0 2px 8px rgba(30,40,60,0.10);margin-bottom:8px;padding:0;">
        <div style="display:flex;align-items:flex-start;gap:16px;padding:16px 20px;">
          <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;width:110px;">
            <div style="display:block;width:110px;height:62px;background:#444;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(30,40,60,0.10);"></div>
          </div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;justify-content:center;">
            <div style="display:flex;align-items:baseline;gap:8px;">
              <div style="font-size:15px;font-weight:600;color:${cardText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;">${video.name || '動画'}</div>
            </div>
            <div style="font-size:12px;color:${cardSubText};margin:2px 0 4px 0;text-align:left;">${video.summary || ''}</div>
            <div style="font-size:12px;color:${cardSubText};margin:2px 0 4px 0;text-align:left;">コース: ${video.courseName || video.courseId}</div>
          </div>
        </div>
      </div>
    `).join('');
}

// 履歴をlocalStorageに保存する関数
function addHistoryEntry(categoryId, title = '') {
  if (!categoryId) return;
  
  // 最近の履歴追加をチェック（5秒以内の同じカテゴリIDは無視）
  const lastHistoryKey = `lastHistory_${categoryId}`;
  const lastHistoryTime = window.getSetting(lastHistoryKey, 0);
  const now = Date.now();
  
  if (now - lastHistoryTime < 5000) {
    return;
  }
  
  const entry = {
    categoryId,
    title,
    date: new Date().toISOString(),
  };
  let history = [];
  try {
    history = window.getSetting('history', []);
  } catch (e) {
    history = [];
  }
  // 既存の同じcategoryIdは削除（重複防止）
  history = history.filter(item => item.categoryId !== categoryId);
  // 先頭に追加
  history.unshift(entry);
  // 最大20件まで
  if (history.length > 20) history = history.slice(0, 20);
  window.saveSetting('history', history);
  window.saveSetting(lastHistoryKey, now);
}

// グローバル関数として公開
window.waitForLogoAndInsertMenu = waitForLogoAndInsertMenu;
window.addHistoryEntry = addHistoryEntry;