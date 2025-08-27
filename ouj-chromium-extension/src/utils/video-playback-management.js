// 動画終了監視機能
function startVideoEndMonitoring() {
  // console.log('[動画] startVideoEndMonitoring: 開始');
  const autoNextVideoEnabled = window.getBooleanSetting('autoNextVideoEnabled', true);
  // console.log('[動画] startVideoEndMonitoring: autoNextVideoEnabled=', autoNextVideoEnabled);
  if (!autoNextVideoEnabled) {
    // console.log('[動画] startVideoEndMonitoring: 自動次の動画遷移が無効化されているため、スキップします');
    return;
  }
  if (typeof window.waitForElement !== 'function') {
    setTimeout(startVideoEndMonitoring, 100);
    return;
  }
  window.waitForElement('video', (video) => {
    // console.log('[動画] startVideoEndMonitoring: video要素取得', video);
    const handleVideoEnded = () => {
      // console.log('[動画] startVideoEndMonitoring: 動画が終了しました, nextVideoId=', window.nextVideoId);
      if (window.nextVideoId) {
        // console.log('[動画] startVideoEndMonitoring: 次の動画に自動遷移します');
        showVideoEndNotification();
        setTimeout(() => {
          window.skipToNextVideo();
        }, 2000);
      } else {
        // console.log('[動画] startVideoEndMonitoring: 次の動画がないため、自動遷移しません');
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
    // console.log('calculatePlaybackPercentage: 再生時間表示要素が見つかりません');
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
    // console.log('calculatePlaybackPercentage: 総再生時間が0秒です');
    return null;
  }
  
  const percentage = (currentTimeSeconds / durationSeconds) * 100;
  // console.log(`calculatePlaybackPercentage: 再生進捗: ${percentage.toFixed(1)}% (${currentTimeStr} / ${durationStr})`);
  
  return percentage;
}

// 定期的に再生進捗を監視する関数
function startPlaybackProgressMonitoring() {
  // console.log('startPlaybackProgressMonitoring: 再生進捗監視を開始します');
  
  const interval = setInterval(() => {
    const percentage = calculatePlaybackPercentage();
    if (percentage !== null) {
      // ここで進捗率を使用した処理を追加できます
      // 例: 特定の進捗率で何かをする
      if (percentage >= 50) {
        // console.log('startPlaybackProgressMonitoring: 動画の50%を視聴しました');
      }
    }
  }, 1000); // 1秒ごとにチェック
  
  // 監視を停止する関数を返す
  return () => {
    clearInterval(interval);
    // console.log('startPlaybackProgressMonitoring: 再生進捗監視を停止しました');
  };
}

// エンディングかどうかを判断する関数
function isEnding() {
  const video = document.querySelector('video');
  if (!video) {
    // console.log('isEndingMusic: 動画要素が見つかりません');
    return false;
  }
  
  const currentTime = video.currentTime;
  const duration = video.duration;
  
  if (duration === 0 || isNaN(duration)) {
    // console.log('isEndingMusic: 動画の長さが取得できません');
    return false;
  }
  
  // 複数の条件を組み合わせて判断
  const isEnding = (currentTime / duration) >= 0.95;
  
  return isEnding;
}

// エンディング検出の監視を開始する関数
function StartPlaybackManagement() {  
  let endingDetected = false;
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
    // console.log('startEndingDetection: エンディング検出監視を停止しました');
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
        window.skipToNextVideo();
      }, 3000); // 3秒後に自動スキップ
    }
  } else {
    // console.log('handleEndingDetected: 次の動画がないため、スキップボタンは表示しません');
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
    window.skipToNextVideo();
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

      if (currentTime < skipStart) {
        console.log(`applyVideoSkip: 現在の再生時間 ${currentTime} 秒はスキップ開始時間 ${skipStart} 秒より前です。スキップを適用します。`);
        video.currentTime = skipStart;
      }
      if (currentTime > duration - skipEnd) {
        window.skipToNextVideo();
      }
    });
  }
}

// グローバル関数として公開
window.StartPlaybackManagement = StartPlaybackManagement;
window.startVideoEndMonitoring = startVideoEndMonitoring;