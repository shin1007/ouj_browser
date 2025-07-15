// メニュー設定
const MENU_CONFIG = {
  title: "拡張機能",
  items: [
    { id: "history", text: "履歴", icon: "time" },
    { id: "favorites", text: "お気に入り", icon: "star" }
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
  
  // ロゴの存在確認
  const logo = document.querySelector('img.logo-img[src="./assets/images/icon_logo.png"]');
  if (!logo) {
    setTimeout(waitForLogoAndInsertMenu, 100);
    console.log("waitForLogoAndInsertMenu: ロゴが見つかりませんでした。100ms後に再試行します。");
    return;
  }
  
  console.log("waitForLogoAndInsertMenu: ロゴが見つかりました。メニューを挿入します。");
  // 既に挿入されている場合は何もしない
  if (document.getElementById('menu-title')) {
    console.log("waitForLogoAndInsertMenu: メニューがすでに存在します。");
    return;
  } 

  
  
  // メニュー要素を作成
  const menuContainer = document.createElement('div');
  menuContainer.innerHTML = createMenuHTML();
  const menuList = menuContainer.firstElementChild;
  
  // 挿入位置を特定
  const settingList = document.querySelector('#menu > menu-navi > ion-content > div.scroll-content > ion-content > div.scroll-content > ion-list:nth-child(3)');
  
  if (settingList) {
    // 設定リストの前に挿入
    settingList.parentNode.insertBefore(menuList, settingList);
    console.log("waitForLogoAndInsertMenu: メニューを正常に挿入しました");
    
    // イベントリスナーを追加
    addMenuEventListeners();
  } else {
    console.log("waitForLogoAndInsertMenu: 挿入位置が見つかりませんでした");
  }
}

// メニューのイベントリスナーを追加
function addMenuEventListeners() {
  const historyItem = document.getElementById('history-menu-item');
  const favoritesItem = document.getElementById('favorites-menu-item');
  
  if (historyItem) {
    historyItem.addEventListener('click', async () => {
      console.log("addMenuEventListeners: 履歴メニューがクリックされました");
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
        borderRadius: '12px',
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
        history = JSON.parse(localStorage.getItem('history') || '[]');
      } catch (e) {
        history = [];
      }
      
      console.log("addMenuEventListeners: 履歴データ:", history);

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
            // 日時順（新しい順）でフラットに表示
            const sortedItems = filteredItems.sort((a, b) => new Date(b.date) - new Date(a.date));
            listHtml = sortedItems.map((item, index) => {
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
            if (!sortedItems.length) {
              listHtml = '<li class="history-empty">該当する履歴はありません</li>';
            }
          } else {
            // グループ順（日付ごと）
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

            listHtml = groupHtmls.join('');
            if (!filteredItems.length) {
              listHtml = '<li class="history-empty">該当する履歴はありません</li>';
            }
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
              console.log(`addMenuEventListeners: 履歴項目がクリックされました。カテゴリID: ${categoryId}`);
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
          button.addEventListener('click', (event) => {
            event.stopPropagation();
            const date = button.getAttribute('data-date');
            const categoryId = button.getAttribute('data-category-id');
            // 履歴配列から該当アイテムを検索
            const index = history.findIndex(item => item.date === date && String(item.categoryId) === String(categoryId));
            const item = history[index];
            if (item) {
              const title = item.title || `コース (ID: ${item.categoryId})`;
              if (confirm(`「${title}」を履歴から削除しますか？`)) {
                // 履歴から削除
                history.splice(index, 1);
                localStorage.setItem('history', JSON.stringify(history));
                console.log(`addMenuEventListeners: 履歴を削除しました。インデックス: ${index}`);
                // リストを再描画
                renderHistoryList(searchValue, 'date');
              }
            }
          });
        });
      }

      // 履歴を全削除する関数
      function clearAllHistory() {
        if (history.length === 0) return;
        
        if (confirm(`履歴を全て削除しますか？（${history.length}件）`)) {
          history = [];
          localStorage.setItem('history', JSON.stringify(history));
          console.log('addMenuEventListeners: 履歴を全削除しました');
          renderHistoryList();
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
  
  if (favoritesItem) {
    favoritesItem.addEventListener('click', async () => {
      console.log("addMenuEventListeners: お気に入りメニューがクリックされました");
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
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '0',
        zIndex: '9999',
        overflow: 'hidden',
        opacity: '0',
        transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      });
      // リスト部分の高さも5件分に合わせて調整
      setTimeout(() => {
        const content = panel.querySelector('.favorite-panel-content');
        if (content) {
          content.style.height = '320px'; // 1件約64px×5件分
          content.style.overflowY = 'auto';
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
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      // キャッシュされたカテゴリデータを取得
      const result = await chrome.storage.local.get(['cachedCategoriesData']);
      const cachedData = result.cachedCategoriesData;
      let categories = [];
      
      if (cachedData && cachedData.data) {
        categories = cachedData.data;
        console.log("addMenuEventListeners: お気に入り表示: キャッシュされたカテゴリデータを使用しました");
      } else {
        // キャッシュがない場合のみAPIから取得
        categories = await window.getCategoriesData();
        console.log("addMenuEventListeners: お気に入り表示: APIからカテゴリデータを取得しました");
      }
      
      if (!Array.isArray(categories)) categories = [];
      // ID→カテゴリ名辞書（文字列と数値の両方に対応）
      const idToName = {};
      categories.forEach(cat => { 
        // 文字列と数値の両方のキーで保存
        idToName[cat.categoryId] = cat.name;
        idToName[cat.categoryId.toString()] = cat.name;
      });
      
      console.log("addMenuEventListeners: カテゴリデータ:", categories);
      console.log("addMenuEventListeners: お気に入りID:", favorites);
      console.log("addMenuEventListeners: ID→名前辞書:", idToName);

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
          return JSON.parse(localStorage.getItem('pinnedFavorites') || '[]');
        } catch (e) {
          return [];
        }
      }
      function setPinnedFavorites(pinned) {
        localStorage.setItem('pinnedFavorites', JSON.stringify(pinned));
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
              console.log(`addMenuEventListeners: お気に入り項目がクリックされました。カテゴリID: ${categoryId}`);
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
}

// 履歴をlocalStorageに保存する関数
function addHistoryEntry(categoryId, title = '') {
  if (!categoryId) return;
  const now = new Date();
  const entry = {
    categoryId,
    title,
    date: now.toISOString(),
  };
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('history') || '[]');
  } catch (e) {
    history = [];
  }
  // 既存の同じcategoryIdは削除（重複防止）
  history = history.filter(item => item.categoryId !== categoryId);
  // 先頭に追加
  history.unshift(entry);
  // 最大20件まで
  if (history.length > 20) history = history.slice(0, 20);
  localStorage.setItem('history', JSON.stringify(history));
  console.log('addHistoryEntry: 履歴を追加しました', entry, history);
}

// グローバル関数として公開
window.waitForLogoAndInsertMenu = waitForLogoAndInsertMenu;
window.addHistoryEntry = addHistoryEntry;