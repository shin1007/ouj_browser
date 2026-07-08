// スリープタイマー機能。指定した分数が経過したら動画を自動で一時停止する。
// SPA内でのページ遷移(モジュールスコープは維持される)をまたいでカウントダウンを
// 継続させたいため、状態は本ファイルのモジュール変数として持ち、動画ページの
// 初期化のたびにリセットはしない(明示的にオフにするか、時間経過で解除されるまで維持する)。
let oujSleepTimerHandle = null;
let oujSleepTimerEndsAt = null;

function clearSleepTimer() {
  if (oujSleepTimerHandle) {
    clearTimeout(oujSleepTimerHandle);
    oujSleepTimerHandle = null;
  }
  oujSleepTimerEndsAt = null;
}

function armSleepTimer(minutes) {
  clearSleepTimer();
  if (!minutes || minutes <= 0) return;
  oujSleepTimerEndsAt = Date.now() + minutes * 60 * 1000;
  oujSleepTimerHandle = setTimeout(() => {
    oujSleepTimerHandle = null;
    oujSleepTimerEndsAt = null;
    const video = document.querySelector('video');
    if (video) {
      video.pause();
    }
    if (typeof window.showSuccessNotification === 'function') {
      window.showSuccessNotification('スリープタイマーにより再生を一時停止しました。', 5000);
    }
  }, minutes * 60 * 1000);
}

// 残り時間(分単位、切り上げ)。タイマー未設定なら0。
function getSleepTimerRemainingMinutes() {
  if (!oujSleepTimerEndsAt) return 0;
  return Math.max(0, Math.ceil((oujSleepTimerEndsAt - Date.now()) / 60000));
}

window.armSleepTimer = armSleepTimer;
window.clearSleepTimer = clearSleepTimer;
window.getSleepTimerRemainingMinutes = getSleepTimerRemainingMinutes;
