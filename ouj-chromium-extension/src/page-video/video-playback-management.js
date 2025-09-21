let managedVideo = null;
let initialPosition = 0;

// 再生速度を設定するグローバル関数
function setPlaybackSpeed() {
  speed = window.getSetting('playbackSpeed', 1.0)
  if (managedVideo) {
    const speedControlEnabled = window.getBooleanSetting('playbackSpeedControlEnabled', true);
    managedVideo.playbackRate = speedControlEnabled ? speed : 1.0;
  }
}

// 動画の再生管理機能
function StartPlaybackManagement() {  
  window.waitForElement('video', (v) => {
    managedVideo = v;


    initialPosition = managedVideo.currentTime;
  });
  // TODO: オープニングスキップがうまくいかない
  // skipOpening(managedVideo);

  i = 0;  
  const interval = setInterval(() => {
    // 再生ボタンを押したときに再生速度がx1.0になるっぽいので、その対策。
    // 本来は毎秒やる必要はないが、再生速度を適用する。
    setPlaybackSpeed();
    // 定期的に動画を一時停止してから再生することで、再生ログを残せるようにする
    const playlogIntervalMinutes = window.getSetting('playlogIntervalMinutes', 3);
    const playlogIntervalSeconds = playlogIntervalMinutes * 60;
    if (i % playlogIntervalSeconds === 0) {
      sendPlayLog(managedVideo);
      i = 0; // カウンタをリセット
    }

    if (!managedVideo) {
      return;
    }

    let skipEnd = window.getSetting ? window.getSetting('skipEndSeconds', 0) : 0;
    // エンディングのスキップ
    if (managedVideo.currentTime > managedVideo.duration - skipEnd) {
      // 再生ボタンが押されてから5秒以上が経過している場合のみ
      if (managedVideo.currentTime - initialPosition < 5) {
        return;
      }
      // 動画が再生中の場合のみ
      if (!managedVideo.paused) {
        skipToNextVideo();
      }
    }
    
    i++;
  }, 1000); // 1秒ごとにチェック
  
  // 監視を停止する関数を返す
  return () => {
    clearInterval(interval);
  };
}

function sendPlayLog(video){
  // 既に停止している場合は何もしない
  if (video.paused) return;
  video.pause();
  setTimeout(() => {
    try {
      console.log('動画の再生ログを残すために一時停止後に再生します');
      video.play().catch(e => {
        console.log('動画の自動再生がブロックされました:', e);
      });
    } catch(e){
      console.log('動画の自動再生がブロックされました:', e);
    }
  }, 1);
}

function skipOpening(video) {
  const skipStart = window.getSetting ? window.getSetting('skipStartSeconds', 0) : 0;
    if (video.currentTime >= skipStart) return; 
  function waitUntilReady() {
    // video.readyState >= 2（HAVE_CURRENT_DATA以上）になってからシークする。
    if (video.readyState >= 2 && !isNaN(video.duration)) {
      return;
    } else if (video.readyState < 2) {
      setTimeout(waitUntilReady, 200);
      return;
    }
  }
  console.log('オープニングスキップ: ', skipStart);
  waitUntilReady();
  video.seeking = true;
  video.currentTime = parseFloat(skipStart);
  video.seeking = false;
  waitUntilReady();
  console.log('オープニングスキップ後の自動再生を試みます');
  video.play().catch(e => {
    console.log('動画の自動再生がブロックされました:', e);
  });
}

async function skipToNextVideo() {
  if (window.nextVideoId) {
    const url = window.location.href;
    const matchCo = url.match(/co=(\d+)/);
    if (matchCo) {
      let nextVideoUrl = url.replace(matchCo[0], `co=${window.nextVideoId}`);
      window.location.href = nextVideoUrl;
    }
  }
}
// グローバル関数として公開
window.StartPlaybackManagement = StartPlaybackManagement;
window.setPlaybackSpeed = setPlaybackSpeed;
window.skipToNextVideo = skipToNextVideo;