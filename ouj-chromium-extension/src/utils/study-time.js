// 学習時間トラッキング機能
// video要素のtimeupdateイベントから再生中の実時間を積算し、日付ごとにlocalStorageへ保存する。
// pause中はtimeupdateが発火しないため、実際に再生されている時間のみが自然に積算される。
// シークによる大きな時間の飛びは実視聴時間としてカウントしない。

const STUDY_TIME_STORAGE_KEY = 'studyTimeByDate';
const STUDY_TIME_RETENTION_DAYS = 90;
const STUDY_TIME_MAX_DELTA_SECONDS = 2;

let studyTimeVideoEl = null;
let studyTimeHandler = null;
let studyTimeLastCurrentTime = null;

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addStudyTimeSeconds(seconds) {
  if (!(seconds > 0)) return;
  const data = window.getSetting(STUDY_TIME_STORAGE_KEY, {});
  const key = getDateKey(new Date());
  data[key] = (data[key] || 0) + seconds;

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
}

// SPA遷移で動画が切り替わるたびに呼び直される想定のため、毎回前回のリスナーを解除してから登録し直す
function startStudyTimeTracking() {
  stopStudyTimeTracking();
  window.waitForElement('video', (video) => {
    studyTimeVideoEl = video;
    studyTimeLastCurrentTime = video.currentTime;
    studyTimeHandler = () => {
      const current = video.currentTime;
      if (studyTimeLastCurrentTime !== null) {
        const delta = current - studyTimeLastCurrentTime;
        if (delta > 0 && delta <= STUDY_TIME_MAX_DELTA_SECONDS) {
          addStudyTimeSeconds(delta);
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

// グローバル関数として公開
window.startStudyTimeTracking = startStudyTimeTracking;
window.getStudyTimeByDate = getStudyTimeByDate;
