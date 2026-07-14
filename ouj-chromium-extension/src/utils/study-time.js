// 学習時間トラッキング機能
// video要素のtimeupdateイベントから再生中の実時間を積算し、日付ごとにlocalStorageへ保存する。
// pause中はtimeupdateが発火しないため、実際に再生されている時間のみが自然に積算される。
// シークによる大きな時間の飛びは実視聴時間としてカウントしない。
//
// 保存形式（v2）: { "YYYY-MM-DD": { total: 秒, byCategory: { categoryId: 秒 } } }
// 旧形式（数値のみ）のデータは読み込み時に{ total: 数値 }として扱う（自動マイグレーション）。

const STUDY_TIME_STORAGE_KEY = 'studyTimeByDate';
const STUDY_TIME_RETENTION_DAYS = 90;
const STUDY_TIME_MAX_DELTA_SECONDS = 2;

let studyTimeVideoEl = null;
let studyTimeHandler = null;
let studyTimeLastCurrentTime = null;
// トラッキング開始時点の科目ID（科目別内訳に使う）
let studyTimeCategoryId = null;
// startStudyTimeTracking()が短時間に2回呼ばれ、1回目のwaitForElement('video', ...)が
// 解決する前に2回目が始まった場合、両方のコールバックが後でリスナーを登録してしまうと
// 片方が二重登録のまま解除されずに残る(video-settings.jsと同じ理由)。呼び出しごとに
// トークンを発行し、最後に開始した呼び出しのコールバックだけがリスナー登録するようにする
let studyTimeCallToken = 0;

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 旧形式（数値）のエントリをv2形式に変換する
function normalizeStudyTimeEntry(entry) {
  if (typeof entry === 'number') return { total: entry, byCategory: {} };
  if (entry && typeof entry === 'object') {
    return { total: entry.total || 0, byCategory: entry.byCategory || {} };
  }
  return { total: 0, byCategory: {} };
}

function addStudyTimeSeconds(seconds, categoryId) {
  if (!(seconds > 0)) return;
  const data = window.getSetting(STUDY_TIME_STORAGE_KEY, {});
  const key = getDateKey(new Date());
  const entry = normalizeStudyTimeEntry(data[key]);
  entry.total += seconds;
  if (categoryId) {
    const catKey = String(categoryId);
    entry.byCategory[catKey] = (entry.byCategory[catKey] || 0) + seconds;
  }
  data[key] = entry;

  // 保持期間(90日)を超えた古いキーを間引く
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STUDY_TIME_RETENTION_DAYS);
  Object.keys(data).forEach((dateKey) => {
    if (new Date(dateKey) < cutoff) delete data[dateKey];
  });

  window.saveSetting(STUDY_TIME_STORAGE_KEY, data);
}

function stopStudyTimeTracking() {
  if (studyTimeVideoEl && studyTimeHandler) {
    studyTimeVideoEl.removeEventListener('timeupdate', studyTimeHandler);
  }
  studyTimeVideoEl = null;
  studyTimeHandler = null;
  studyTimeLastCurrentTime = null;
  studyTimeCategoryId = null;
}

// SPA遷移で動画が切り替わるたびに呼び直される想定のため、毎回前回のリスナーを解除してから登録し直す
function startStudyTimeTracking() {
  stopStudyTimeTracking();
  // この動画の科目IDを覚えておく（科目別の学習時間内訳に使う）
  studyTimeCategoryId = window.getCurrentCategoryId ? window.getCurrentCategoryId() : null;
  const myToken = ++studyTimeCallToken;
  window.waitForElement('video', (video) => {
    // 待っている間により新しい呼び出しが発生していれば、この呼び出しの分は
    // リスナー登録せずに破棄する(新しい呼び出し側が自分のvideo要素に登録する)
    if (myToken !== studyTimeCallToken) return;
    studyTimeVideoEl = video;
    studyTimeLastCurrentTime = video.currentTime;
    studyTimeHandler = () => {
      const current = video.currentTime;
      if (studyTimeLastCurrentTime !== null) {
        const delta = current - studyTimeLastCurrentTime;
        if (delta > 0 && delta <= STUDY_TIME_MAX_DELTA_SECONDS) {
          addStudyTimeSeconds(delta, studyTimeCategoryId);
        }
      }
      studyTimeLastCurrentTime = current;
    };
    video.addEventListener('timeupdate', studyTimeHandler);
  });
}

function getStudyTimeByDate() {
  return window.getSetting(STUDY_TIME_STORAGE_KEY, {});
}

// 日付ごとの合計秒数だけを返す（旧形式・新形式の差を吸収する）
function getStudyTimeTotalsByDate() {
  const data = getStudyTimeByDate();
  const totals = {};
  Object.keys(data).forEach((key) => {
    totals[key] = normalizeStudyTimeEntry(data[key]).total;
  });
  return totals;
}

// 直近n日間の科目別合計秒数を返す: { categoryId: 秒 }
function getStudyTimeByCategory(days) {
  const data = getStudyTimeByDate();
  const result = {};
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const entry = normalizeStudyTimeEntry(data[getDateKey(d)]);
    Object.keys(entry.byCategory).forEach((catId) => {
      result[catId] = (result[catId] || 0) + entry.byCategory[catId];
    });
  }
  return result;
}

// グローバル関数として公開
window.startStudyTimeTracking = startStudyTimeTracking;
window.getStudyTimeByDate = getStudyTimeByDate;
window.getStudyTimeTotalsByDate = getStudyTimeTotalsByDate;
window.getStudyTimeByCategory = getStudyTimeByCategory;
