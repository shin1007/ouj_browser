// 動画の再生状況を取得し、キャッシュも行うユーティリティ
// contentId: 動画ID
// options: { cacheSeconds: キャッシュ有効秒数（デフォルト60秒） }


/**
 * 指定した動画IDの再生状況を取得（キャッシュ付き）
 * @param {string|number} contentId
 * @param {Object} options
 * @returns {Promise<{ currentTimeRate: number, isFinished: boolean, raw: any }>} 
 */
async function getVideoViewingStatus(contentId) {
    const currentTimeRate = await window.getVideoProgress(contentId);
    const isFinished = currentTimeRate >= 0.95;
    const resultData = { currentTimeRate, isFinished};
    return resultData;
}

// windowオブジェクトに公開
window.getVideoViewingStatus = getVideoViewingStatus;