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
  console.log("メニュー挿入処理を開始");
  
  // ロゴの存在確認
  const logo = document.querySelector('img.logo-img[src="./assets/images/icon_logo.png"]');
  if (!logo) {
    setTimeout(waitForLogoAndInsertMenu, 100);
    console.log("ロゴが見つかりませんでした。100ms後に再試行します。");
    return;
  }
  
  console.log("ロゴが見つかりました。メニューを挿入します。");
  // 既に挿入されている場合は何もしない
  if (document.getElementById('menu-title')) {
    console.log("メニューがすでに存在します。");
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
    console.log("メニューを正常に挿入しました");
    
    // イベントリスナーを追加
    addMenuEventListeners();
  } else {
    console.error("挿入位置が見つかりませんでした");
  }
}

// メニューのイベントリスナーを追加
function addMenuEventListeners() {
  const historyItem = document.getElementById('history-menu-item');
  const favoritesItem = document.getElementById('favorites-menu-item');
  
  if (historyItem) {
    historyItem.addEventListener('click', () => {
      console.log("履歴メニューがクリックされました");
      // TODO: 履歴機能の実装
    });
  }
  
  if (favoritesItem) {
    favoritesItem.addEventListener('click', async () => {
      console.log("お気に入りメニューがクリックされました");
      // 既存パネルがあればトグルで消す
      let panel = document.getElementById('favorite-list-panel');
      if (panel) {
        panel.remove();
        return;
      }
      // パネル生成
      panel = document.createElement('div');
      panel.id = 'favorite-list-panel';
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
      panel.style.position = 'absolute';
      panel.style.top = main ? main.offsetTop + 'px' : '60px';
      panel.style.left = main ? main.offsetLeft + 'px' : '0';
      panel.style.width = mainWidth;
      panel.style.background = mainBg;
      panel.style.fontFamily = mainFont;
      panel.style.fontSize = mainFontSize;
      panel.style.border = '1px solid #888';
      panel.style.borderRadius = '8px';
      panel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      panel.style.padding = '24px 16px 16px 16px';
      panel.style.zIndex = 9999;
      panel.style.maxHeight = '80vh';
      panel.style.overflowY = 'auto';

      // お気に入りIDリスト取得
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      // カテゴリデータ取得
      let categories = await window.getCategoriesData();
      if (!Array.isArray(categories)) categories = [];
      // ID→カテゴリ名辞書
      const idToName = {};
      categories.forEach(cat => { idToName[cat.categoryId] = cat.name; });
      // 一覧HTML生成
      let listHtml = '';
      if (favorites.length) {
        listHtml = favorites.map(id => `<li>${idToName[id] || id}</li>`).join('');
      } else {
        listHtml = '<li>お気に入りはありません</li>';
      }
      panel.innerHTML = `
        <div style="position:relative;">
          <button id="close-favorite-list-panel" style="position:absolute;top:8px;left:8px;font-size:20px;background:none;border:none;cursor:pointer;">×</button>
          <h3 style="margin:0 0 16px 0;">お気に入りコース一覧</h3>
          <ul style="margin:12px 0 0 0; padding-left:20px;">${listHtml}</ul>
        </div>
      `;
      panel.style.background = '#fff';
      document.body.appendChild(panel);
      document.getElementById('close-favorite-list-panel').onclick = () => panel.remove();
    });
  }
}

// グローバル関数として公開
window.waitForLogoAndInsertMenu = waitForLogoAndInsertMenu;