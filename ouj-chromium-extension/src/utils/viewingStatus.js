// 動画の再生状況を取得し、キャッシュも行うユーティリティ
// contentId: 動画ID
// options: { cacheSeconds: キャッシュ有効秒数（デフォルト60秒） }

// 視聴済み/未視聴の手動マーク（override）。
// サーバーの再生率だけだと「内容は知っているので視聴済みにしたい」
// 「復習のため未視聴に戻したい」に対応できないため、ユーザーの手動指定を
// localStorageに保持し、getVideoViewingStatusで再生率より優先する。
// 形式: { [contentId]: true(視聴済み扱い) | false(未視聴扱い) }
const WATCHED_OVERRIDE_STORAGE_KEY = 'watchedOverride';

function getWatchedOverride(contentId) {
    const overrides = window.getSetting(WATCHED_OVERRIDE_STORAGE_KEY, {});
    const value = overrides[String(contentId)];
    return typeof value === 'boolean' ? value : null;
}

/**
 * 視聴済み/未視聴の手動マークを設定する
 * @param {string|number} contentId
 * @param {boolean|null} value - true:視聴済み扱い / false:未視聴扱い / null:マーク解除
 */
function setWatchedOverride(contentId, value) {
    const overrides = window.getSetting(WATCHED_OVERRIDE_STORAGE_KEY, {});
    if (value === null || value === undefined) {
        delete overrides[String(contentId)];
    } else {
        overrides[String(contentId)] = !!value;
    }
    window.saveSetting(WATCHED_OVERRIDE_STORAGE_KEY, overrides);
}

/**
 * 指定した動画IDの再生状況を取得（キャッシュ付き）
 * @param {string|number} contentId
 * @param {Object} options
 * @returns {Promise<{ currentTimeRate: number, isFinished: boolean, override: boolean|null }>}
 */
async function getVideoViewingStatus(contentId) {
    const currentTimeRate = await window.getVideoProgress(contentId);
    const override = getWatchedOverride(contentId);
    const isFinished = override !== null ? override : currentTimeRate >= 0.95;
    const resultData = { currentTimeRate, isFinished, override };
    return resultData;
}

/**
 * 指定した科目内で最初の「視聴が完了していない」動画を探す。
 * お気に入りパネル・科目一覧の「続きを見る」ボタン、ホームの「続きから見る」で共用する。
 * @param {string|number} categoryId
 * @param {{ run: Function }|null} gate - 同時実行数ゲート（省略時は直列実行）
 * @returns {Promise<{contentId, categoryId, title, currentTimeRate}|null>} 全話視聴済みならnull
 */
async function findFirstUnfinishedVideo(categoryId, gate = null) {
    const videos = await window.getVideoListInCategory(categoryId);
    if (!Array.isArray(videos) || videos.length === 0) return null;
    const runner = gate ? (fn) => gate.run(fn) : (fn) => fn();
    for (const video of videos) {
        try {
            const status = await runner(() => getVideoViewingStatus(video.contentId));
            if (!status.isFinished) {
                return {
                    contentId: video.contentId,
                    categoryId,
                    title: video.title,
                    currentTimeRate: status.currentTimeRate,
                };
            }
        } catch (e) {
            // 状態が取れない動画は未視聴として扱う（安全側）
            return { contentId: video.contentId, categoryId, title: video.title, currentTimeRate: 0 };
        }
    }
    return null;
}

// windowオブジェクトに公開
window.getVideoViewingStatus = getVideoViewingStatus;
window.getWatchedOverride = getWatchedOverride;
window.setWatchedOverride = setWatchedOverride;
window.findFirstUnfinishedVideo = findFirstUnfinishedVideo;
