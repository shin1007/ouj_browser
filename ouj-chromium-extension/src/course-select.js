
// コース一覧の各動画にお気に入りボタンを追加
async function addFavoriteButtonsToCategoryList() {
  
  // 現在のURLのcaパラメータを取得
  const hash = window.location.hash;
  const params = hash.split('?')[1];
  const ca = params.split('ca=')[1];
  const currentCategoryNum = ca;
  // categories.jsのAPIで子カテゴリIDリストを取得
  const childCategoryIds = await window.getChildIdsByParentId(currentCategoryNum);
  // 各子カテゴリの情報をまとめて取得
  const childCategories = await Promise.all(childCategoryIds.map(async (id) => {
    const name = await window.getCategoryNameById(id);
    return { categoryId: id, name };
  }));
  const favorites = window.getFavorites ? window.getFavorites() : [];
  // ion-list#common-list-content内のion-itemを全て取得
  const items = document.querySelectorAll('#main div.icon-text > .icon-area');
  // childCategoriesとitemsを一緒にループ
  const minLength = Math.min(childCategories.length, items.length);
  
  for (let i = 0; i < minLength; i++) {
    const item = items[i];
    const category = childCategories[i];
    
    // すでに追加済みならスキップ
    if (item.querySelector('.favorite-btn')) continue;
    console.log('[DEBUG][fav-btn] 追加対象 category:', category);
    
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
  
  // getChildIds関数が利用可能かチェック
  if (typeof window.getChildIds !== 'function') {
    console.error('getChildIds関数が未定義です。categories.jsが読み込まれているか確認してください。');
    setTimeout(waitThenAddFavBtnToCategoryList, 100);
    return;
  }
  // 現在のページのカテゴリIDを取得
  const hash = window.location.hash;
  const params = hash.split('?')[1];
  const ca = params.split('ca=')[1];
  const currentCategoryNum = parseInt(ca, 10);
  
  // categoryIdからsummaryを取得、なければ何もしない
  const categories = await window.getCategoriesData();
  const category = categories.find(cat => cat.categoryId === currentCategoryNum);

  const summary = category ? category.summary : '';
  if (!summary) return;

  // getFavorites関数が利用可能かチェック
  if (typeof window.getFavorites !== 'function') {
    console.error('getFavorites関数が未定義です。helpers.jsが読み込まれているか確認してください。');
    setTimeout(waitThenAddFavBtnToCategoryList, 100);
    return;
  }
  
  const items = document.querySelectorAll('#main div.icon-text > .icon-area');
  if (!items.length) {
    setTimeout(waitThenAddFavBtnToCategoryList, 100);
    return;
  }
  
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