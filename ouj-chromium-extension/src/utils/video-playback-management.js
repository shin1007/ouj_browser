let initialPosition = 0;
let firstplay = true;
// 動画終了監視機能
function startVideoEndMonitoring() {
  const autoNextVideoEnabled = window.getBooleanSetting('autoNextVideoEnabled', true);
  if (!autoNextVideoEnabled) {
    return;
  }
  if (typeof window.waitForElement !== 'function') {
    setTimeout(startVideoEndMonitoring, 100);
    return;
  }
  window.waitForElement('video', (video) => {
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
  });
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
  const video = document.querySelector('video');
  if (!video) {
    return false;
  }
  
  const currentTime = video.currentTime;
  const duration = video.duration;
  
  if (duration === 0 || isNaN(duration)) {
    return false;
  }
  
  // 複数の条件を組み合わせて判断
  const isEnding = (currentTime / duration) >= 0.95;
  
  return isEnding;
}

// エンディング検出の監視を開始する関数
function StartPlaybackManagement() {  
  let endingDetected = false;
  window.waitForElement('video', (video) => {
    initialPosition = video.currentTime;
  });
  const interval = setInterval(() => {
    applyVideoSkip();
    if (!endingDetected && isEnding()) {
      endingDetected = true;
      
      
      // エンディング検出時の処理をここに追加
      // 例: 自動で次の動画に進む、スキップボタンを表示するなど
      handleEndingDetected();
    }
  }, 2000); // 2秒ごとにチェック
  
  // 監視を停止する関数を返す
  return () => {
    clearInterval(interval);
  };
}

// エンディング検出時の処理
function handleEndingDetected() {
  // 次の動画IDが設定されている場合のみスキップボタンを表示
  if (window.nextVideoId) {
    showEndingSkipButton();
    
    // 自動で次の動画に進むオプション（設定で有効な場合）
    if (window.getBooleanSetting('autoSkipEnding', false)) {
      setTimeout(() => {
        skipToNextVideo();
      }, 3000); // 3秒後に自動スキップ
    }
  } else {
  }
}

// エンディングスキップボタンを表示
function showEndingSkipButton() {
  // 既にボタンが存在する場合は何もしない
  if (document.getElementById('ending-skip-button')) {
    return;
  }
  
  const button = document.createElement('button');
  button.id = 'ending-skip-button';
  button.textContent = 'エンディングをスキップ';
  button.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
  `;
  
  button.addEventListener('click', () => {
    skipToNextVideo();
    button.remove();
  });
  
  // 動画プレイヤーの近くに配置
  const videoContainer = document.querySelector('.video-js') || 
                        document.querySelector('video')?.parentElement ||
                        document.body;
  
  if (videoContainer) {
    videoContainer.appendChild(button);
  }
}
function applyVideoSkip() {
  if (typeof window.waitForElement === 'function') {
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
}
function skipOpening(video, skipStart) {
  function waitUntilReady() {
    if (video.readyState > 0) {
      return;
    } else {
      setTimeout(waitUntilReady, 100);
      return;
    }
  }
  if (!firstplay) return;

  waitUntilReady();
  video.pause();
  waitUntilReady();
  video.currentTime = parseFloat(skipStart);
  waitUntilReady();
  video.pause();
  waitUntilReady();
  video.play();
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