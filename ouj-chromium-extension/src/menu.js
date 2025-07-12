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
    <ion-item aria-hidden="true" class="item-header item item-block item-md">
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
    return;
  }
  
  console.log("ロゴが見つかりました。メニューを挿入します。");
  
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
    favoritesItem.addEventListener('click', () => {
      console.log("お気に入りメニューがクリックされました");
      // TODO: お気に入り機能の実装
    });
  }
}

// グローバル関数として公開
window.waitForLogoAndInsertMenu = waitForLogoAndInsertMenu;