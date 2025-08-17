// 動画の再生状況を取得し、キャッシュも行うユーティリティ
// contentId: 動画ID
// options: { cacheSeconds: キャッシュ有効秒数（デフォルト60秒） }

const VIEWING_STATUS_CACHE_KEY = 'viewingStatusCache';

/**
 * 指定した動画IDの再生状況を取得（キャッシュ付き）
 * @param {string|number} contentId
 * @param {Object} options
 * @returns {Promise<{ currentTimeRate: number, isFinished: boolean, raw: any }>} 
 */
async function getVideoViewingStatus(contentId) {
  const cacheKey = VIEWING_STATUS_CACHE_KEY;
    url = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${contentId}/viewinglog/latest`;
    const data = await fetchWithCache(url, cacheKey, 45);
    const currentTimeRate = data.currentTimeRate || 0;
    const isFinished = currentTimeRate >= 0.95;
    const resultData = { currentTimeRate, isFinished, raw: data };

    // // 4. キャッシュ保存
    // cache[contentId] = { data: resultData, timestamp: now };
    await chrome.storage.local.set({ [cacheKey]: { data: resultData, timestamp: Date.now() } });
    return resultData;
}


/**
 * 複数の動画IDの再生状況を並列で取得（キャッシュ付き）
 * @param {Array<string|number>} contentIds
 * @param {Object} options
 * @returns {Promise<Array<{ contentId: string|number, currentTimeRate: number, isFinished: boolean, raw: any }>>}
 */
async function getMultipleVideoViewingStatus(contentIds, options = {}) {
  const promises = contentIds.map(async (contentId) => {
    try {
      const status = await getVideoViewingStatus(contentId);
      return { contentId, ...status };
    } catch (e) {
      console.error(`getMultipleVideoViewingStatus: 動画 ${contentId} の取得に失敗:`, e);
      return { contentId, currentTimeRate: 0, isFinished: false, raw: null };
    }
  });
  
  return await Promise.all(promises);
}

// windowオブジェクトに公開
window.getVideoViewingStatus = getVideoViewingStatus;
window.getMultipleVideoViewingStatus = getMultipleVideoViewingStatus; 