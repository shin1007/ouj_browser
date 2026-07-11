// 「あとで見る」リストの共通関数
// お気に入り（科目単位）と違い、動画（回）単位で保存するキュー。
// 形式: [{ contentId: string, categoryId: string, addedAt: ISO文字列 }, ...]
// 追加順に並び、連続再生モード（nextVideoSetting='watch-later'）では先頭から順に再生する。

const WATCH_LATER_STORAGE_KEY = 'watchLater';
const WATCH_LATER_MAX_ITEMS = 100;

function getWatchLaterList() {
  const list = window.getSetting(WATCH_LATER_STORAGE_KEY, []);
  return Array.isArray(list) ? list : [];
}

function isInWatchLater(contentId) {
  return getWatchLaterList().some((item) => String(item.contentId) === String(contentId));
}

function addToWatchLater(contentId, categoryId) {
  if (!contentId) return;
  let list = getWatchLaterList();
  if (list.some((item) => String(item.contentId) === String(contentId))) return;
  list.push({
    contentId: String(contentId),
    categoryId: categoryId ? String(categoryId) : '',
    addedAt: new Date().toISOString(),
  });
  if (list.length > WATCH_LATER_MAX_ITEMS) list = list.slice(-WATCH_LATER_MAX_ITEMS);
  window.saveSetting(WATCH_LATER_STORAGE_KEY, list);
}

function removeFromWatchLater(contentId) {
  const list = getWatchLaterList().filter((item) => String(item.contentId) !== String(contentId));
  window.saveSetting(WATCH_LATER_STORAGE_KEY, list);
}

/**
 * あとで見るリストへの追加/削除をトグルする
 * @returns {boolean} トグル後の状態（true: リストに入っている）
 */
function toggleWatchLater(contentId, categoryId) {
  if (isInWatchLater(contentId)) {
    removeFromWatchLater(contentId);
    return false;
  }
  addToWatchLater(contentId, categoryId);
  return true;
}

/**
 * 連続再生用: リスト先頭の（現在の動画以外の）動画を返す
 * @param {string|number} excludeContentId - 除外する動画ID（現在再生中のもの）
 * @returns {{contentId, categoryId}|null}
 */
function getNextWatchLaterVideo(excludeContentId) {
  const list = getWatchLaterList();
  const next = list.find((item) => String(item.contentId) !== String(excludeContentId));
  return next || null;
}

// windowオブジェクトに公開
window.getWatchLaterList = getWatchLaterList;
window.isInWatchLater = isInWatchLater;
window.addToWatchLater = addToWatchLater;
window.removeFromWatchLater = removeFromWatchLater;
window.toggleWatchLater = toggleWatchLater;
window.getNextWatchLaterVideo = getNextWatchLaterVideo;
