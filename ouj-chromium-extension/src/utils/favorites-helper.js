// お気に入り関連の共通関数

/**
 * お気に入りリストを取得する
 * @returns {string[]} お気に入りのカテゴリIDの配列
 */
function getFavorites() {
  return window.getSetting('favorites', []);
}

/**
 * お気に入りリストを保存し、関連機能を更新する
 * @param {string[]} favorites - 保存するお気に入りリスト
 */
async function saveFavorites(favorites) {
  await window.saveSetting('favorites', favorites);
  // おすすめリストのキャッシュを更新
  if (typeof window.prefetchRecommendListData === 'function') {
    window.prefetchRecommendListData();
  }
}

/**
 * 指定したIDがお気に入りか判定する
 * @param {string|number} categoryId - カテゴリID
 * @returns {boolean} お気に入りの場合true
 */
function isFavorite(categoryId) {
  if (!categoryId) return false;
  const favorites = getFavorites();
  return favorites.includes(categoryId.toString());
}

/**
 * お気に入りに追加する
 * @param {string|number} categoryId - カテゴリID
 */
async function addFavorite(categoryId) {
  if (!categoryId) return;
  const idStr = categoryId.toString();
  let favorites = getFavorites();
  if (!favorites.includes(idStr)) {
    favorites.push(idStr);
    await saveFavorites(favorites);
  }
}

/**
 * お気に入りから削除する
 * @param {string|number} categoryId - カテゴリID
 */
async function removeFavorite(categoryId) {
  if (!categoryId) return;
  const idStr = categoryId.toString();
  let favorites = getFavorites();
  const updatedFavorites = favorites.filter(id => id !== idStr);
  if (favorites.length !== updatedFavorites.length) {
    await saveFavorites(updatedFavorites);
  }
}

/**
 * お気に入り状態をトグル（追加/削除を自動で切り替え）する
 * @param {string|number} categoryId - カテゴリID
 * @returns {Promise<boolean>} トグル後の新しいお気に入り状態 (true: お気に入り, false: 解除)
 */
async function toggleFavorite(categoryId) {
  const idStr = categoryId.toString();
  const newIsFavorite = !isFavorite(idStr);
  await window.saveSetting('favorites', newIsFavorite ? [...getFavorites(), idStr] : getFavorites().filter(id => id !== idStr));
  if (typeof window.prefetchRecommendListData === 'function') {
    window.prefetchRecommendListData();
  }
  return newIsFavorite;
}

// windowオブジェクトに公開
window.getFavorites = getFavorites;
window.isFavorite = isFavorite;
window.addFavorite = addFavorite;
window.removeFavorite = removeFavorite;
window.toggleFavorite = toggleFavorite;