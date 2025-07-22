
// コース一覧の各動画にお気に入りボタンを追加
// グローバル変数で直近の呼び出し情報を管理
window.lastFavBtnCall = window.lastFavBtnCall || { url: '', ts: 0 };

async function addFavoriteButtonsToCategoryList() {
  const now = Date.now();
  const url = window.location.href;
  // 直近の呼び出しが同じURLで1秒以内ならスキップ
  if (window.lastFavBtnCall.url === url && now - window.lastFavBtnCall.ts < 1000) {
    console.log('[DEBUG][fav-btn] 重複呼び出しスキップ:', url, now);
    return;
  }
  window.lastFavBtnCall = { url, ts: now };
  console.log('[DEBUG][fav-btn] addFavoriteButtonsToCategoryList呼び出し location.href:', window.location.href, 'hash:', window.location.hash);
  // 現在のURLのcaパラメータを取得
  const hash = window.location.hash;
  const params = hash.split('?')[1];
  const ca = params.split('ca=')[1];
  const currentCategoryNum = ca;
  // summaryが空でない子カテゴリのみ取得
  const childCategories = await window.getChildCategoriesWithSummary(currentCategoryNum);
  console.log('[DEBUG][fav-btn] summaryあり子カテゴリ:', childCategories);
  const favorites = window.getFavorites ? window.getFavorites() : [];
  // ion-list#common-list-content内のion-itemを全て取得
  const items = document.querySelectorAll('#main div.icon-text > .icon-area');
  console.log('[DEBUG][fav-btn] items.length:', items.length, 'childCategories.length:', childCategories.length);
  // childCategoriesとitemsを一緒にループ
  const minLength = Math.min(childCategories.length, items.length);
  
  for (let i = 0; i < minLength; i++) {
    const item = items[i];
    const category = childCategories[i];
    
    // すでに追加済みならスキップ
    if (item.querySelector('.favorite-btn')) {
      console.log('[DEBUG][fav-btn] 既にボタンあり category:', category);
      continue;
    }
    console.log('[DEBUG][fav-btn] 追加対象 category:', category, 'item:', item);
    
    // お気に入りボタン作成
    const favBtn = document.createElement('button');
    favBtn.className = 'favorite-btn';
    favBtn.title = 'お気に入り';
    favBtn.style.background = 'none';
    favBtn.style.border = 'none';
    favBtn.style.cursor = 'pointer';
    favBtn.style.marginLeft = '8px';
    favBtn.style.display = 'inline-flex';
    favBtn.style.alignItems = 'center';
    favBtn.style.verticalAlign = 'top';
    favBtn.style.height = item.offsetHeight*0.9 + 'px';
    
    // お気に入り状態に応じてアイコンを決定
    const isFavorite = favorites.includes(category.categoryId.toString());
    const iconName = isFavorite ? 'star' : 'star-outline';
    const iconClass = isFavorite ? 'ion-md-star' : 'ion-md-star-outline';
    
    favBtn.innerHTML = `<ion-icon name="${iconName}" class="icon icon-md ${iconClass} item-icon" aria-label="お気に入り" style="font-size:22px;"></ion-icon>`;
    
    // クリックイベントを追加
    favBtn.addEventListener('click', (event) => {
      // ほかのイベントが発火しないようにする
      event.stopPropagation();
      event.preventDefault();

      const categoryId = category.categoryId.toString();
      
      // 現在のお気に入り状態を再取得
      const currentFavorites = window.getFavorites();
      const currentlyFavorite = currentFavorites.includes(categoryId);
      console.log('[DEBUG][fav-btn] クリック categoryId:', categoryId, '現在の状態:', currentlyFavorite);
      
      if (currentlyFavorite) {
        // お気に入りから削除
        const updatedFavorites = currentFavorites.filter(id => id !== categoryId);
        window.saveSetting('favorites', updatedFavorites);
        favBtn.innerHTML = '<ion-icon name="star-outline" class="icon icon-md ion-md-star-outline item-icon" aria-label="お気に入り" style="font-size:22px;"></ion-icon>';
        console.log('[DEBUG][fav-btn] お気に入りから削除:', categoryId);
      } else {
        // お気に入りに追加
        const updatedFavorites = [...currentFavorites, categoryId];
        window.saveSetting('favorites', updatedFavorites);
        favBtn.innerHTML = '<ion-icon name="star" class="icon icon-md ion-md-star item-icon" aria-label="お気に入り" style="font-size:22px;"></ion-icon>';
        console.log('[DEBUG][fav-btn] お気に入りに追加:', categoryId);
      }
    });
    
    // タイトルの右側に追加
    item.parentNode.appendChild(favBtn);
    
  }
  
}

async function waitThenAddFavBtnToCategoryList() {
  console.log('[DEBUG][fav-btn] waitThenAddFavBtnToCategoryList呼び出し location.href:', window.location.href, 'hash:', window.location.hash);
  if (typeof window.getChildIds !== 'function') {
    console.error('[DEBUG][fav-btn] getChildIds未定義でreturn');
    setTimeout(waitThenAddFavBtnToCategoryList, 100);
    return;
  }
  const hash = window.location.hash;
  const params = hash.split('?')[1];
  const ca = params && params.split('ca=')[1];
  console.log('[DEBUG][fav-btn] hash:', hash, 'params:', params, 'ca:', ca);
  const currentCategoryNum = parseInt(ca, 10);
  // categoryIdからsummaryを取得、なければ何もしない
  const categories = await window.getCategoriesData();
  const category = categories.find(cat => cat.categoryId === currentCategoryNum);
  if (typeof window.getFavorites !== 'function') {
    console.error('[DEBUG][fav-btn] getFavorites未定義でreturn');
    setTimeout(waitThenAddFavBtnToCategoryList, 100);
    return;
  }
  const items = document.querySelectorAll('#main div.icon-text > .icon-area');
  if (!items.length) {
    console.warn('[DEBUG][fav-btn] items.length==0でreturn');
    setTimeout(waitThenAddFavBtnToCategoryList, 100);
    return;
  }
  console.log('[DEBUG][fav-btn] addFavoriteButtonsToCategoryListを呼び出します');
  await addFavoriteButtonsToCategoryList();
  
  // 現在のページ（親カテゴリ）を履歴に追加
  if (window.addHistoryEntry) {
    try {
      
      const title = category ? category.name : `コース (ID: ${currentCategoryNum})`;
      
      window.addHistoryEntry(currentCategoryNum.toString(), title);
    } catch (error) {
      console.error('waitThenAddFavBtnToCategoryList: 履歴追加でエラーが発生しました:', error);
    }
  }
  
}
window.waitThenAddFavBtnToCategoryList = waitThenAddFavBtnToCategoryList;