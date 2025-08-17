
// コース一覧の各動画にお気に入りボタンを追加
async function addFavoriteButtonsToCategoryList() {
  // 追加前に既存の.favorite-btnを全て削除
  document.querySelectorAll('.favorite-btn').forEach(btn => btn.remove());

  const ca = window.getCurrentCategoryId();
  if (!ca) {
    return;
  }
  const childCategories = await window.getChildIds(ca);
  const favorites = typeof window.getFavorites === 'function' ? window.getFavorites() : [];

  // ion-list#common-list-content内のion-itemを全て取得
  const items = document.querySelectorAll('#main div.icon-text > .icon-area');
  
  // childCategoriesとitemsを一緒にループ（Pythonのzipのような動作）
  const minLength = Math.min(childCategories.length, items.length);
  
  for (let i = 0; i < minLength; i++) {
    const item = items[i];
    const category = childCategories[i];
    
    // すでに追加済みならスキップ（item.parentNode全体で確認）
    if (item.parentNode.querySelector('.favorite-btn')) {
      continue;
    }
    
    // お気に入りボタン作成
    const favBtn = document.createElement('button');
  favBtn.className = 'favorite-btn';
  favBtn.title = 'お気に入り';
  favBtn.style.display = 'inline-flex';
  favBtn.style.alignItems = 'center';
  favBtn.style.justifyContent = 'center';
  favBtn.style.padding = '2px 16px'; // クリック領域拡大
  favBtn.style.border = 'none';
  favBtn.style.background = 'transparent';
  favBtn.style.cursor = 'pointer';
  favBtn.style.borderRadius = '8px';
  favBtn.style.transition = 'background 0.2s';
  favBtn.style.marginLeft = '8px';
  favBtn.onmouseover = () => favBtn.style.background = 'rgba(0,0,0,0.07)';
  favBtn.onmouseout = () => favBtn.style.background = 'transparent';
    
    // お気に入り状態に応じてアイコンを決定
    const isFavorite = window.isFavorite(category.categoryId);
    const iconName = isFavorite ? 'star' : 'star-outline';
    const iconClass = isFavorite ? 'ion-md-star' : 'ion-md-star-outline';
    
  favBtn.innerHTML = `<ion-icon name="${iconName}" class="icon icon-md ${iconClass} item-icon" aria-label="お気に入り" style="font-size:24px;"></ion-icon>`;
    
    // クリックイベントを追加
    favBtn.addEventListener('click', async (event) => {
      // ほかのイベントが発火しないようにする
      event.stopPropagation();
      event.preventDefault();

      const categoryId = category.categoryId.toString();
      favBtn.disabled = true;
      const newIsFavorite = await window.toggleFavorite(categoryId);
      const newIconName = newIsFavorite ? 'star' : 'star-outline';
      const newIconClass = newIsFavorite ? 'ion-md-star' : 'ion-md-star-outline';
      favBtn.innerHTML = `<ion-icon name="${newIconName}" class="icon icon-md ${newIconClass} item-icon" aria-label="お気に入り" style="font-size:24px;"></ion-icon>`;
      favBtn.disabled = false;
    });
    
    // タイトルの右側に追加
    item.parentNode.appendChild(favBtn);
  }
}

async function waitThenAddFavBtnToCategoryList() {
  // getChildIds関数が利用可能かチェック
  if (typeof window.getChildIds !== 'function') {
    setTimeout(waitThenAddFavBtnToCategoryList, 100);
    return;
  }
  const ca = window.getCurrentCategoryId();
  if (!ca) {
    return;
  }
  // categoryIdからsummaryを取得、なければ何もしない
  const categories = await window.getCategoriesData();
  const childCategories = await window.getChildIds(ca);
  // 子カテゴリのsummaryが1つでも存在するかチェック
  const hasSummaryInChildren = childCategories.some(child => {
    const cat = categories.find(c => c.categoryId === child.categoryId);
    return cat && cat.summary;
  });
  if (!hasSummaryInChildren) {
    return;
  }
  // getFavorites関数が利用可能かチェック
  if (typeof window.getFavorites !== 'function') {
    setTimeout(waitThenAddFavBtnToCategoryList, 100);
    return;
  }
  const items = document.querySelectorAll('#main div.icon-text > .icon-area');
  if (!items.length) {
    setTimeout(waitThenAddFavBtnToCategoryList, 100);
    return;
  }
  await addFavoriteButtonsToCategoryList();

}
window.waitThenAddFavBtnToCategoryList = waitThenAddFavBtnToCategoryList;