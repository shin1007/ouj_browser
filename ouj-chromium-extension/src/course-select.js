
// コース一覧の各動画にお気に入りボタンを追加
async function addFavoriteButtonsToCategoryList() {
  // 関数の開始をコンソールにログ出力
  console.log("addFavoriteButtonsToCategoryList: 開始");
  
  // 現在のURLのcaパラメータを取得をcategoryNumとして、子のcategoryIdを取得
  // hash以降のcaを取得（https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=10ではca=10）
  // ハッシュのhashParams.get('ca')でcaを取得できないので、手動でcaを取得
  // ハッシュのcaを取得

  const hash = window.location.hash;
  console.log("hash:", hash);
  // hashのcaを取得。
  const params = hash.split('?')[1];
  const ca = params.split('ca=')[1];

  const currentCategoryNum = parseInt(ca, 10);
  console.log("currentCategoryNum:", currentCategoryNum);
  const childCategories = await window.getChildIds(currentCategoryNum);
  console.log("childCategories:", childCategories);
  
  // お気に入りデータを取得
  const favorites = window.getFavorites ? window.getFavorites() : [];
  console.log("favorites:", favorites);

  // ion-list#common-list-content内のion-itemを全て取得
  const items = document.querySelectorAll('#main div.icon-text > .icon-area');
  
  // childCategoriesとitemsを一緒にループ（Pythonのzipのような動作）
  const minLength = Math.min(childCategories.length, items.length);
  
  for (let i = 0; i < minLength; i++) {
    const item = items[i];
    const category = childCategories[i];
    
    // すでに追加済みならスキップ
    if (item.querySelector('.favorite-btn')) continue;
    
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
        localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
        favBtn.innerHTML = '<ion-icon name="star-outline" class="icon icon-md ion-md-star-outline item-icon" aria-label="お気に入り" style="font-size:22px;"></ion-icon>';
        console.log(`お気に入りから削除: ${category.name}`);
      } else {
        // お気に入りに追加
        const updatedFavorites = [...currentFavorites, categoryId];
        localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
        favBtn.innerHTML = '<ion-icon name="star" class="icon icon-md ion-md-star item-icon" aria-label="お気に入り" style="font-size:22px;"></ion-icon>';
        console.log(`お気に入りに追加: ${category.name}`);
      }
    });
    
    // タイトルの右側に追加
    item.parentNode.appendChild(favBtn);
    // コンソールにログ出力
  }
  
  // 関数の終了をコンソールにログ出力
  console.log("addFavoriteButtonsToCategoryList: 完了");
}

async function waitThenAddFavBtnToCategoryList() {
  console.log("waitThenAddFavToCategoryList: 開始");
  
  // getChildIds関数が利用可能かチェック
  if (typeof window.getChildIds !== 'function') {
    console.error('getChildIds関数が未定義です。categories.jsが読み込まれているか確認してください。');
    setTimeout(waitThenAddFavBtnToCategoryList, 100);
    return;
  }
  
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
  console.log("お気に入りボタンを追加しました");
}
window.waitThenAddFavBtnToCategoryList = waitThenAddFavBtnToCategoryList;