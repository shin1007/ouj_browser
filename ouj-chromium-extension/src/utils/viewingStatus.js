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


// TODO: ネットワーク監視
// webRequestを利用する
// https://v.ouj.ac.jp/v1/tenants/1/vod-contents/34473/viewinglog?currentTimeRate=0.0003886836
// 
// {viewId: 53897785}
// viewId
// : 
// 53897785
async function postCurrentTimeRate(contentId, currentTimeRate) {
  const url = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${contentId}/viewinglog${viewId}end-date`;
  const body = { "currentTimeRate": currentTimeRate };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: JSON.stringify(body),
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to post viewing status for contentId ${contentId}: ${response.statusText}`);
  }
  return await response.json();
}

// windowオブジェクトに公開
window.getVideoViewingStatus = getVideoViewingStatus;