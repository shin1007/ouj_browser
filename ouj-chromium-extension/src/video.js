// 現在の再生時間が総再生時間の何パーセントかを計算する関数
function calculatePlaybackPercentage() {
  const currentTimeDisplay = document.querySelector('.vjs-current-time-display');
  const durationDisplay = document.querySelector('.vjs-duration-display');
  
  if (!currentTimeDisplay || !durationDisplay) {
    console.log('再生時間表示要素が見つかりません');
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
    console.log('総再生時間が0秒です');
    return null;
  }
  
  const percentage = (currentTimeSeconds / durationSeconds) * 100;
  console.log(`再生進捗: ${percentage.toFixed(1)}% (${currentTimeStr} / ${durationStr})`);
  
  return percentage;
}

// 定期的に再生進捗を監視する関数
function startPlaybackProgressMonitoring() {
  console.log('再生進捗監視を開始します');
  
  const interval = setInterval(() => {
    const percentage = calculatePlaybackPercentage();
    if (percentage !== null) {
      // ここで進捗率を使用した処理を追加できます
      // 例: 特定の進捗率で何かをする
      if (percentage >= 50) {
        console.log('動画の50%を視聴しました');
      }
    }
  }, 1000); // 1秒ごとにチェック
  
  // 監視を停止する関数を返す
  return () => {
    clearInterval(interval);
    console.log('再生進捗監視を停止しました');
  };
}

// エンディングかどうかを判断する関数
function isEndingMusic() {
  const video = document.querySelector('video');
  if (!video) {
    console.log('動画要素が見つかりません');
    return false;
  }
  
  const currentTime = video.currentTime;
  const duration = video.duration;
  
  if (duration === 0 || isNaN(duration)) {
    console.log('動画の長さが取得できません');
    return false;
  }
  
  // エンディングの特徴をチェック
  const endingFeatures = {
    // 動画の最後の10%の範囲
    timeBased: (currentTime / duration) >= 0.95,
    
    // 音量レベルの変化をチェック（エンディング音楽は通常音量が下がる）
    volumeBased: false,
    
    // 音声の特徴（エンディング音楽は通常BGMのみ）
    audioBased: false
  };
  
  // 音量レベルの変化をチェック
  if (video.volume !== undefined) {
    // 現在の音量が低い場合（エンディング音楽の特徴）
    endingFeatures.volumeBased = video.volume < 0.5;
  }
  
  // 音声トラックの情報をチェック
  if (video.audioTracks && video.audioTracks.length > 0) {
    const audioTrack = video.audioTracks[0];
    // エンディング音楽は通常BGMトラックとして認識されることが多い
    endingFeatures.audioBased = audioTrack.kind === 'music' || 
                                audioTrack.label?.toLowerCase().includes('bgm') ||
                                audioTrack.label?.toLowerCase().includes('ending');
  }
  
  // 複数の条件を組み合わせて判断
  const isEnding = endingFeatures.timeBased || 
                   (endingFeatures.volumeBased && endingFeatures.audioBased);
  
  console.log('エンディング判定:', {
    currentTime: currentTime.toFixed(1),
    duration: duration.toFixed(1),
    percentage: ((currentTime / duration) * 100).toFixed(1) + '%',
    features: endingFeatures,
    isEnding: isEnding
  });
  
  return isEnding;
}

// エンディング検出の監視を開始する関数
function startEndingDetection() {
  console.log('エンディング検出監視を開始します');
  
  let endingDetected = false;
  const interval = setInterval(() => {
    if (!endingDetected && isEndingMusic()) {
      endingDetected = true;
      console.log('エンディング音楽を検出しました！');
      
      // エンディング検出時の処理をここに追加
      // 例: 自動で次の動画に進む、スキップボタンを表示するなど
      handleEndingDetected();
    }
  }, 2000); // 2秒ごとにチェック
  
  // 監視を停止する関数を返す
  return () => {
    clearInterval(interval);
    console.log('エンディング検出監視を停止しました');
  };
}

// エンディング検出時の処理
function handleEndingDetected() {
  console.log('エンディング処理を実行します');
  
  // スキップボタンを表示
  showEndingSkipButton();
  
  // 自動で次の動画に進むオプション（設定で有効な場合）
  if (localStorage.getItem('autoSkipEnding') === 'true') {
    setTimeout(() => {
      skipToNextVideo();
    }, 3000); // 3秒後に自動スキップ
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

// 次の動画にスキップ
async function skipToNextVideo() {
  console.log('次の動画にスキップします');
  
  // 現在のURLから動画IDを取得
  const url = window.location.href;
  const matchCa = url.match(/ca=(\d+)/);
  const matchCo = url.match(/co=(\d+)/);
  
  if (matchCa && matchCo) {
    const currentCourseId = matchCa[1];
    console.log('現在のコースID:', currentCourseId);
    const req = await fetch(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${currentCourseId}&offset=0&limit=30&sortType=1&sortOrder=asc`);
    const res = await req.json();
    console.log('res:', res);
    const currentVideoIndex = res.findIndex(item => item.contentId == matchCo[1]);
    const nextVideoIndex = (currentVideoIndex + 1);
    const nextVideoId = res[nextVideoIndex].contentId;
    console.log('nextVideoId:', nextVideoId);
    const nextVideoUrl = url.replace(matchCo[0], `co=${nextVideoId}`);
    window.location.href = nextVideoUrl;
    window.location.reload();
    // TODO: 次の動画IDを取得するロジックを実装
    // 例: カテゴリ内の次の動画、またはお気に入りの次の動画
    
    // 一時的にページをリロード（実際の実装では次の動画URLに遷移）
    // window.location.reload();
  }
}

// グローバル関数として公開
window.calculatePlaybackPercentage = calculatePlaybackPercentage;
window.startPlaybackProgressMonitoring = startPlaybackProgressMonitoring;
window.isEndingMusic = isEndingMusic;
window.startEndingDetection = startEndingDetection;
window.handleEndingDetected = handleEndingDetected;
window.showEndingSkipButton = showEndingSkipButton;
window.skipToNextVideo = skipToNextVideo;
