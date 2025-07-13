// course-select.jsと同様の方法でお気に入りに追加されているか調べる。
// 現在のカテゴリIDがお気に入りに含まれているかをチェック
// 現在のカテゴリIDもcourse-select.jsと同様の方法で文字列として取得。
// お気に入りボタンは#main > main-vod-list > ion-content > div.scroll-content > divの前に入れる
function addFavoriteButtonToCategoryTop() {
    console.log("addFavoriteButtonToCategoryTop: 開始");
    // 挿入位置の存在確認
    const mainVodList = document.querySelector('#main > main-vod-list > ion-content > div.scroll-content > div');
    if (!mainVodList) {
        console.error("挿入位置が見つかりませんでした。100ms後に再試行します。");
        setTimeout(addFavoriteButtonToCategoryTop, 100);
        return;
    }
    // 既にお気に入りボタンがある場合は何もしない
    if (document.getElementById('favorite-button')) {
        console.log("お気に入りボタンがすでに存在します。");
        return;
    }
    // お気に入りボタンを作成
    const favBtn = document.createElement('button');
    favBtn.id = 'favorite-button';
    favBtn.className = 'favorite-button';
    favBtn.innerHTML = '<ion-icon name="star-outline" class="icon icon-md ion-md-star-outline item-icon" aria-label="お気に入り" style="font-size:22px;"></ion-icon>';
    
    // お気に入りの状態を取得
    const favorites = window.getFavorites();
    
    // 現在のカテゴリIDを取得
    const categoryId = window.getCurrentCategoryId();
    
    // お気に入りに含まれているかチェック
    const isFavorite = favorites.includes(categoryId);
    
    if (isFavorite) {
        favBtn.innerHTML = '<ion-icon name="star" class="icon icon-md ion-md-star item-icon" aria-label="お気に入り" style="font-size:22px;"></ion-icon>';
        console.log(`お気に入りに追加済み: カテゴリID ${categoryId}`);
    } else {
        console.log(`お気に入りではありません: カテゴリID ${categoryId}`);
    }
    // クリックイベントを追加
    favBtn.addEventListener('click', (event) => {
        // ほかのイベントが発火しないようにする
        event.stopPropagation();
        event.preventDefault();

        // 現在のお気に入り状態を再取得
        const currentFavorites = window.getFavorites();
        const currentlyFavorite = currentFavorites.includes(categoryId);

        if (currentlyFavorite) {
            // お気に入りから削除
            const updatedFavorites = currentFavorites.filter(id => id !== categoryId);
            localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
            favBtn.innerHTML = '<ion-icon name="star-outline" class="icon icon-md ion-md-star-outline item-icon" aria-label="お気に入り" style="font-size:22px;"></ion-icon>';
            console.log(`お気に入りから削除: カテゴリID ${categoryId}`);
        } else {
            // お気に入りに追加
            const updatedFavorites = [...currentFavorites, categoryId];
            localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
            favBtn.innerHTML = '<ion-icon name="star" class="icon icon-md ion-md-star item-icon" aria-label="お気に入り" style="font-size:22px;"></ion-icon>';
            console.log(`お気に入りに追加: カテゴリID ${categoryId}`);
        }
    }
    );
    // mainVodListの前に挿入
    mainVodList.parentNode.insertBefore(favBtn, mainVodList);
    console.log("お気に入りボタンを正常に挿入しました");
    // 関数の終了をコンソールにログ出力
    console.log("addFavoriteButtonToCategoryTop: 完了");
}
window.addFavoriteButtonToCategoryTop = addFavoriteButtonToCategoryTop;