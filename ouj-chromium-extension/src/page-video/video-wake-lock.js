// 動画再生中に画面が自動でロックされるのを防ぐ機能(Screen Wake Lock API)。
// タブが非表示になるとブラウザ側で自動的にWake Lockが解除される仕様のため、
// 再表示時に再生中であれば取得し直す。
let oujWakeLockSentinel = null;

async function requestVideoWakeLock() {
  if (!('wakeLock' in navigator)) return;
  const enabled = window.getBooleanSetting ? window.getBooleanSetting('screenWakeLockEnabled', true) : true;
  if (!enabled) return;
  if (oujWakeLockSentinel) return;
  try {
    oujWakeLockSentinel = await navigator.wakeLock.request('screen');
    oujWakeLockSentinel.addEventListener('release', () => {
      oujWakeLockSentinel = null;
    });
  } catch (e) {
    // 非表示タブなど、取得できない状況では静かに諦める
    oujWakeLockSentinel = null;
  }
}

function releaseVideoWakeLock() {
  if (oujWakeLockSentinel) {
    oujWakeLockSentinel.release().catch(() => {});
    oujWakeLockSentinel = null;
  }
}

// 動画のplay/pause/endedに連動してWake Lockを取得・解放する
// TODO: addFunctionPanel経由で動画切り替えのたびに呼ばれるが、videoタグがSPA内で
// 使い回される場合、既存リスナーを外さずに追加するため呼び出し回数分リスナーが
// 積み重なる。ハンドラ自体はrequestVideoWakeLock/releaseVideoWakeLockとも
// 多重実行しても実害がないため据え置くが、直すなら要素に処理済みフラグを
// 立てて二重登録を防ぐ(addPlayerActionButtons等、他の再挿入系関数と同じ対策)。
function startWakeLockManagement() {
  if (typeof window.waitForElement !== 'function') {
    setTimeout(startWakeLockManagement, 100);
    return;
  }
  window.waitForElement('video', (video) => {
    if (!video.paused) {
      requestVideoWakeLock();
    }
    video.addEventListener('play', requestVideoWakeLock);
    video.addEventListener('pause', releaseVideoWakeLock);
    video.addEventListener('ended', releaseVideoWakeLock);
  });
}

if (!window.oujWakeLockVisibilityListenerAdded) {
  window.oujWakeLockVisibilityListenerAdded = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const video = document.querySelector('video');
    if (video && !video.paused) {
      requestVideoWakeLock();
    }
  });
}

window.startWakeLockManagement = startWakeLockManagement;
window.releaseVideoWakeLock = releaseVideoWakeLock;
