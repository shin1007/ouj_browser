// メニュー設定
const MENU_CONFIG = {
  title: "拡張機能",
  items: [
    // { id: "history", text: "履歴", icon: "time" },
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
    historyItem.addEventListener('click', () => {
      console.log("addMenuEventListeners: 履歴メニューがクリックされました");
      // TODO: 履歴機能の実装
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
        background: (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? '#1a2230' : '#f9fafb',
        fontFamily: mainFont || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: mainFontSize || '14px',
        border: 'none',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '0',
        zIndex: '9999',
        maxHeight: '80vh',
        overflow: 'hidden',
        opacity: '0',
        transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      });

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
      // 検索ボックスのHTML
      const searchBoxHtml = `
        <div class="favorite-search-box">
          <input id="favorite-search-input" type="text" placeholder="コース名・親カテゴリ名で検索">
        </div>
      `;

      // お気に入りリストの描画関数
      async function renderFavoriteList(filter = '') {
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
              hasParent: !!parentCategoryName
            };
          }));

          // 検索フィルタ適用
          const filteredItems = filter.trim() ? favoriteItemsWithParent.filter(item => {
            const keyword = filter.trim().toLowerCase();
            return item.categoryName.toLowerCase().includes(keyword) || item.parentCategoryName.toLowerCase().includes(keyword);
          }) : favoriteItemsWithParent;

          // 親カテゴリごとにグループ化
          const groupedFavorites = {};
          filteredItems.forEach(item => {
            const parentKey = item.parentCategoryName;
            if (!groupedFavorites[parentKey]) {
              groupedFavorites[parentKey] = [];
            }
            groupedFavorites[parentKey].push(item);
          });

          // グループ化されたHTMLを生成（親カテゴリ名の冒頭数値でソート）
          const sortedGroups = Object.entries(groupedFavorites).sort(([aName], [bName]) => {
            const aNum = parseInt(aName.match(/^\d+/)?.[0] || '0', 10);
            const bNum = parseInt(bName.match(/^\d+/)?.[0] || '0', 10);
            return aNum - bNum;
          });

          const groupHtmls = sortedGroups.map(([parentName, items]) => {
            // 各グループ内で項目名の冒頭数値で昇順ソート
            const sortedItems = items.sort((a, b) => {
              const aNum = parseInt(a.categoryName.match(/^\d+/)?.[0] || '0', 10);
              const bNum = parseInt(b.categoryName.match(/^\d+/)?.[0] || '0', 10);
              return aNum - bNum;
            });

            const itemsHtml = sortedItems.map(item => {
              if (item.hasParent) {
                return `<li class="favorite-item" data-category-id="${item.id}" tabindex="0" role="button" aria-label="${parentName}の${item.categoryName}を開く">
                  <div class="favorite-item-content">
                    <div class="favorite-child-category">${item.categoryName}</div>
                  </div>
                  <svg class="favorite-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </li>`;
              } else {
                return `<li class="favorite-item" data-category-id="${item.id}" tabindex="0" role="button" aria-label="${item.categoryName}を開く">
                  <div class="favorite-item-content">
                    <div class="favorite-child-category">${item.categoryName}</div>
                  </div>
                  <svg class="favorite-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </li>`;
              }
            }).join('');

            return `
              <div class="favorite-group">
                <div class="favorite-group-header">${parentName}</div>
                <ul class="favorite-group-list">${itemsHtml}</ul>
              </div>
            `;
          });

          listHtml = groupHtmls.join('');
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

// グローバル関数として公開
window.waitForLogoAndInsertMenu = waitForLogoAndInsertMenu;