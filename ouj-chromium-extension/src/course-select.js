
// コース一覧の各動画にお気に入りボタンを追加
async function addFavoriteButtonsToCategoryList() {
  console.log("[お気に入り] addFavoriteButtonsToCategoryList 開始");
  // 現在のURLのcaパラメータを取得をcategoryNumとして、子のcategoryIdを取得
  // hash以降のcaを取得（https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=10ではca=10）
  // ハッシュのhashParams.get('ca')でcaを取得できないので、手動でcaを取得
  // ハッシュのcaを取得

  const hash = window.location.hash;
  // hashのcaを取得。
  const params = hash.split('?')[1];
  const ca = params.split('ca=')[1];
  console.log("[お気に入り] hash, params, ca:", hash, params, ca);

  const currentCategoryNum = parseInt(ca, 10);
  const childCategories = await window.getChildIds(currentCategoryNum);
  console.log("[お気に入り] childCategories:", childCategories);
  const favorites = window.getFavorites ? window.getFavorites() : [];
  console.log("[お気に入り] favorites:", favorites);

  // ion-list#common-list-content内のion-itemを全て取得
  const items = document.querySelectorAll('#main div.icon-text > .icon-area');
  console.log("[お気に入り] items.length:", items.length);
  
  // childCategoriesとitemsを一緒にループ（Pythonのzipのような動作）
  const minLength = Math.min(childCategories.length, items.length);
  
  for (let i = 0; i < minLength; i++) {
    const item = items[i];
    const category = childCategories[i];
    
    // すでに追加済みならスキップ
    if (item.querySelector('.favorite-btn')) {
      console.log(`[お気に入り] 既にボタン追加済み: index=${i}`);
      continue;
    }
    
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
      
      if (currentlyFavorite) {
        // お気に入りから削除
        const updatedFavorites = currentFavorites.filter(id => id !== categoryId);
        window.saveSetting('favorites', updatedFavorites);
        favBtn.innerHTML = '<ion-icon name="star-outline" class="icon icon-md ion-md-star-outline item-icon" aria-label="お気に入り" style="font-size:22px;"></ion-icon>';
      } else {
        // お気に入りに追加
        const updatedFavorites = [...currentFavorites, categoryId];
        window.saveSetting('favorites', updatedFavorites);
        favBtn.innerHTML = '<ion-icon name="star" class="icon icon-md ion-md-star item-icon" aria-label="お気に入り" style="font-size:22px;"></ion-icon>';
      }
    });
    
    // タイトルの右側に追加
    item.parentNode.appendChild(favBtn);
    console.log(`[お気に入り] ボタン追加: index=${i}, categoryId=${category.categoryId}`);
  }
  console.log("[お気に入り] addFavoriteButtonsToCategoryList 終了");
}

async function waitThenAddFavBtnToCategoryList() {
  console.log("[お気に入り] waitThenAddFavBtnToCategoryList 開始");
  // getChildIds関数が利用可能かチェック
  if (typeof window.getChildIds !== 'function') {
    console.error('[お気に入り] getChildIds関数が未定義です。categories.jsが読み込まれているか確認してください。');
    setTimeout(waitThenAddFavBtnToCategoryList, 100);
    return;
  }
  // 現在のページのカテゴリIDを取得
  const hash = window.location.hash;
  const params = hash.split('?')[1];
  const ca = params.split('ca=')[1];
  const currentCategoryNum = parseInt(ca, 10);
  console.log("[お気に入り] currentCategoryNum:", currentCategoryNum);
  // categoryIdからsummaryを取得、なければ何もしない
  const categories = await window.getCategoriesData();
  const childCategories = await window.getChildIds(currentCategoryNum);
  // 子カテゴリのsummaryが1つでも存在するかチェック
  const hasSummaryInChildren = childCategories.some(child => {
    const cat = categories.find(c => c.categoryId === child.categoryId);
    return cat && cat.summary;
  });
  console.log("[お気に入り] hasSummaryInChildren:", hasSummaryInChildren);
  if (!hasSummaryInChildren) {
    console.log("[お気に入り] 子カテゴリにsummaryがないため終了");
    return;
  }
  // getFavorites関数が利用可能かチェック
  if (typeof window.getFavorites !== 'function') {
    console.error('[お気に入り] getFavorites関数が未定義です。helpers.jsが読み込まれているか確認してください。');
    setTimeout(waitThenAddFavBtnToCategoryList, 100);
    return;
  }
  const items = document.querySelectorAll('#main div.icon-text > .icon-area');
  console.log("[お気に入り] items.length:", items.length);
  if (!items.length) {
    console.log("[お気に入り] itemsが見つからないためリトライ");
    setTimeout(waitThenAddFavBtnToCategoryList, 100);
    return;
  }
  await addFavoriteButtonsToCategoryList();
  // 現在のページ（親カテゴリ）を履歴に追加
  if (window.addHistoryEntry) {
    try {
      const category = categories.find(cat => cat.categoryId === currentCategoryNum);
      const title = category ? category.name : `コース (ID: ${currentCategoryNum})`;
      window.addHistoryEntry(currentCategoryNum.toString(), title);
      console.log("[お気に入り] 履歴追加:", currentCategoryNum, title);
    } catch (error) {
      console.error('[お気に入り] waitThenAddFavBtnToCategoryList: 履歴追加でエラーが発生しました:', error);
    }
  }
  console.log("[お気に入り] waitThenAddFavBtnToCategoryList 終了");
}
window.waitThenAddFavBtnToCategoryList = waitThenAddFavBtnToCategoryList;