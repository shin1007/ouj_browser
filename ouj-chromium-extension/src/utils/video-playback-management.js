let initialPosition = 0;
let firstplay = true;
let video = null;
// 動画終了監視機能
function startVideoEndMonitoring() {
  firstplay = true;
  const autoNextVideoEnabled = window.getBooleanSetting('autoNextVideoEnabled', true);
  if (!autoNextVideoEnabled) {
    return;
  }
  if (typeof window.waitForElement !== 'function') {
    setTimeout(startVideoEndMonitoring, 100);
    return;
  }
  window.waitForElement('video', (v) => {
    video = v;
  });
  const handleVideoEnded = () => {
    if (window.nextVideoId) {
      showVideoEndNotification();
      setTimeout(() => {
        skipToNextVideo();
      }, 2000);
    } else {
    }
  };
  video.removeEventListener('ended', handleVideoEnded);
  video.addEventListener('ended', handleVideoEnded);
}

// 動画終了時の通知を表示
function showVideoEndNotification() {
  if (typeof window.showSuccessNotification !== 'function') {
    console.warn('showVideoEndNotification: 通知関数が見つかりません。');
    return;
  }
  window.showSuccessNotification('動画が終了しました。次の動画に自動的に進みます。', 5000);
}

// 現在の再生時間が総再生時間の何パーセントかを計算する関数
function calculatePlaybackPercentage() {
  const currentTimeDisplay = document.querySelector('.vjs-current-time-display');
  const durationDisplay = document.querySelector('.vjs-duration-display');
  
  if (!currentTimeDisplay || !durationDisplay) {
    return null;
  }
  
  // 時間文字列を秒数に変換する関数
  function timeStringToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      // MM:SS形式
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS形式
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }
  
  const currentTimeStr = currentTimeDisplay.textContent.trim();
  const durationStr = durationDisplay.textContent.trim();
  
  const currentTimeSeconds = timeStringToSeconds(currentTimeStr);
  const durationSeconds = timeStringToSeconds(durationStr);
  
  if (durationSeconds === 0) {
    return null;
  }
  
  const percentage = (currentTimeSeconds / durationSeconds) * 100;
  
  return percentage;
}


// エンディングかどうかを判断する関数
function isEnding() {
  if (!video) return false;
  
  if (video.duration === 0 || isNaN(video.duration)) {
    return false;
  }
  
  // 複数の条件を組み合わせて判断
  const isEnding = (video.currentTime / video.duration) >= 0.95;
  
  return isEnding;
}

function StartPlaybackManagement() {  
  let endingDetected = false;
  window.waitForElement('video', (video) => {
    initialPosition = video.currentTime;
  });

  i = 1;  
  const interval = setInterval(() => {

    // 15秒に1回、動画を一時停止してから再生することで、再生ログを残せるようにする
    if (i % 15 === 0) {
      sendPlayLog();
    }
    i++;
  }, 1000); // 1秒ごとにチェック
  
  // 監視を停止する関数を返す
  return () => {
    clearInterval(interval);
  };
}

function sendPlayLog(){
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
function applyVideoSkip() {
  if (!typeof window.waitForElement === 'function')return; 
  window.waitForElement('video', (video) => {
    if (!video) return;
    // 設定値取得
    const skipStart = window.getSetting ? window.getSetting('skipStartSeconds', 0) : 0;
    const skipEnd = window.getSetting ? window.getSetting('skipEndSeconds', 0) : 0;

    const currentTime = video.currentTime;
    const duration = video.duration;

    // オープニングのスキップ
    if (currentTime < skipStart) {
      skipOpening(video, skipStart);
      return;
    }
    // エンディングのスキップ
    if (currentTime > duration - skipEnd) {
      // 再生ボタンが押されてから5秒以上が経過している場合のみ
      if (currentTime - initialPosition < 5) {
        return;
      }
      // 動画が再生中の場合のみ
      if (!video.paused) {
        skipToNextVideo();
      }
    }
  });
  
}

function skipOpening(video, skipStart) {
  function waitUntilReady() {
    // video.readyState >= 2（HAVE_CURRENT_DATA以上）になってからシークする。
    if (video.readyState >= 2 && !isNaN(video.duration)) {
      return;
    } else if (video.readyState < 2) {
      setTimeout(waitUntilReady, 200);
      return;
    }
  }
  if (!firstplay) return;
  console.log('オープニングスキップ: ', skipStart);
  waitUntilReady();
  // TODO: うまくいかない時がある。
  video.seeking = true;
  video.currentTime = parseFloat(skipStart);
  video.seeking = false;
  waitUntilReady();
  console.log('オープニングスキップ後の自動再生を試みます');
  video.play().catch(e => {
    console.log('動画の自動再生がブロックされました:', e);
  });
  firstplay = false;
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
window.startVideoEndMonitoring = startVideoEndMonitoring;