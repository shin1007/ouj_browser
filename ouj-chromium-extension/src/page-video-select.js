async function addFavoriteButtonToBreadCrumbs() {
    // 挿入位置の存在確認
    const videoListSelector = '#main > main-vod-list > ion-content > div.scroll-content > vod-list-navigator > aside > div > ul > li:last-child ';
    const videoSelector =     '#main > main-player   > ion-content > div.scroll-content > player > vod-list-navigator > aside > div > ul > li:last-child';
    // #main > main-player > ion-content > div.scroll-content > player > vod-list-navigator > aside > div > ul > li:nth-child(3)
    // const selctor = document.querySelector(videoSelector) || document.querySelector(videoListSelector);
    const aside = document.querySelector(videoSelector) || document.querySelector(videoListSelector);
    if (!aside) {
        setTimeout(addFavoriteButtonToBreadCrumbs, 100);
        return;
    }
    
    // 現在のカテゴリIDを取得
    const categoryId = window.getCurrentCategoryId();
    
    // 既にお気に入りボタンがある場合は何もしない
    if (document.getElementById('favorite-button')) {
        return;
    }
    
    // お気に入りボタンを作成
    const favBtn = document.createElement('button');
    favBtn.id = 'favorite-button';
    favBtn.className = 'favorite-button';    
    favBtn.style.background = 'transparent';
    favBtn.style.transition = 'background 0.2s';
    favBtn.onmouseover = () => { favBtn.style.background = '#e0e0e0'; };
    favBtn.onmouseout = () => { favBtn.style.background = 'transparent'; };
    
    // お気に入りの状態を取得
    const favorites = window.getFavorites();
    
    // お気に入りに含まれているかチェック
    const isFavorite = favorites.includes(categoryId);
    const iconName = isFavorite ? 'star' : 'star-outline';
    favBtn.innerHTML = `<ion-icon name="${iconName}" class="icon icon-md ion-md-${iconName} item-icon" aria-label="お気に入り" style="font-size:20px;"></ion-icon>`;
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
            window.saveSetting('favorites', updatedFavorites);
            favBtn.innerHTML = '<ion-icon name="star-outline" class="icon icon-md ion-md-star-outline item-icon" aria-label="お気に入り" style="font-size:22px;"></ion-icon>';
        } else {
            // お気に入りに追加
            const updatedFavorites = [...currentFavorites, categoryId];
            window.saveSetting('favorites', updatedFavorites);
            favBtn.innerHTML = '<ion-icon name="star" class="icon icon-md ion-md-star item-icon" aria-label="お気に入り" style="font-size:22px;"></ion-icon>';
        }
    }
    );
    // asideの子要素として追加
    aside.appendChild(favBtn);
}
window.addFavoriteButtonToBreadCrumbs = addFavoriteButtonToBreadCrumbs;