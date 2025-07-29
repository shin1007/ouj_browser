// 動画の自動再生機能
function startAutoPlay() {
  // console.log('startAutoPlay: 自動再生機能を開始します');
  
  // 自動再生設定をチェック
  const autoPlayEnabled = window.getBooleanSetting('autoPlayEnabled', true);
  // console.log('startAutoPlay: 自動再生設定:', autoPlayEnabled ? '有効' : '無効');
  if (!autoPlayEnabled) {
    return;
  }
  
  // 動画要素を待って再生を試みる
  if (typeof window.waitForElement !== 'function') {
    setTimeout(startAutoPlay, 100);
    return;
  }
  
  window.waitForElement('video', (video) => {
      // console.log('startAutoPlay: 動画要素が見つかりました。自動再生を開始します');
    let retryCount = 0;
    const maxRetries = 10;
    const retryInterval = 1000; // 1秒ごと

    async function tryPlay() {
      try {
        await video.play();
        // console.log('startAutoPlay: 自動再生成功');
        removeAutoPlayFailedNotification();
      } catch (e) {
        retryCount++;
        console.warn(`startAutoPlay: 自動再生に失敗しました（${retryCount}回目）:`, e);
        if (retryCount < maxRetries) {
          setTimeout(tryPlay, retryInterval);
          } else {
                showAutoPlayFailedNotification();
          }
        }
    }

    tryPlay();
  });
}

// 自動再生失敗時の通知UIを表示
function showAutoPlayFailedNotification() {
  if (document.getElementById('autoplay-failed-notification')) return;
  const notification = document.createElement('div');
  notification.id = 'autoplay-failed-notification';
  notification.style.cssText = `
    position: fixed;
    top: 30%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.85);
    color: #fff;
    padding: 24px 32px;
    border-radius: 12px;
    font-size: 18px;
    z-index: 9999;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    text-align: center;
  `;
  notification.innerHTML = `
    <div style="font-size: 32px; margin-bottom: 12px;">▶️</div>
    <div style="margin-bottom: 8px;">自動再生がブロックされました</div>
    <button id="autoplay-manual-play-btn" style="margin-top: 8px; padding: 8px 24px; font-size: 16px; border-radius: 6px; border: none; background: #2196f3; color: #fff; cursor: pointer;">再生</button>
    <div style="margin-top: 8px; font-size: 12px; color: #ccc;">ブラウザの仕様により自動再生が制限されています。再生ボタンを押してください。</div>
  `;
  document.body.appendChild(notification);
  const playBtn = document.getElementById('autoplay-manual-play-btn');
  playBtn?.focus();
  playBtn?.addEventListener('click', () => {
    const video = document.querySelector('video');
    if (video) {
      video.play().then(() => {
        removeAutoPlayFailedNotification();
      });
    }
  });
}

// 自動再生失敗通知UIを削除
function removeAutoPlayFailedNotification() {
  const notification = document.getElementById('autoplay-failed-notification');
  if (notification) notification.remove();
}

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
          skipToNextVideo();
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
function isEndingMusic() {
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
  
  // console.log('エンディング判定:', {
  //   currentTime: currentTime.toFixed(1),
  //   duration: duration.toFixed(1),
  //   percentage: ((currentTime / duration) * 100).toFixed(1) + '%',
  //   features: endingFeatures,
  //   isEnding: isEnding
  // });
  
  return isEnding;
}

// エンディング検出の監視を開始する関数
function startEndingDetection() {

  
  let endingDetected = false;
  const interval = setInterval(() => {
    if (!endingDetected && isEndingMusic()) {
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
        skipToNextVideo();
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

// 音量自動調整機能（実際の音声レベルを測定）
function startVolumeNormalization() {
  // console.log('startVolumeNormalization: 音量自動調整機能を開始します');
  
  // 音量自動調整設定をチェック（デフォルトは有効）
  const volumeNormalizationEnabled = window.getBooleanSetting('volumeNormalizationEnabled', true);
  // console.log('startVolumeNormalization: 音量自動調整設定:', volumeNormalizationEnabled ? '有効' : '無効');
  
  if (!volumeNormalizationEnabled) {
    // console.log('startVolumeNormalization: 音量自動調整が無効化されているため、スキップします');
    return;
  }
  
  // Web Audio APIのサポートチェック
  if (!window.AudioContext && !window.webkitAudioContext) {
    // console.warn('startVolumeNormalization: Web Audio APIがサポートされていません。従来の音量監視にフォールバックします');
    startLegacyVolumeNormalization();
    return;
  }
  
  // 動画要素を待って音声レベル監視を開始する関数
  if (typeof window.waitForElement !== 'function') {
    setTimeout(startVolumeNormalization, 100);
    return;
  }
  
  window.waitForElement('video', (video) => {
    // console.log('startVolumeNormalization: 動画要素が見つかりました。実際の音声レベル監視を開始します');
    
    // Web Audio APIの初期化
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    
    // 動画のストリームを取得
    let microphone;
    try {
      const stream = video.captureStream();
      // 音声トラックが存在するかチェック
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        // console.log('startVolumeNormalization: 動画に音声トラックがありません。従来の音量監視にフォールバックします');
        startLegacyVolumeNormalization();
        return;
      }
      microphone = audioContext.createMediaStreamSource(stream);
    } catch (error) {
      // console.error('startVolumeNormalization: 音声ストリームの取得に失敗しました:', error);
      // console.log('startVolumeNormalization: 従来の音量監視にフォールバックします');
      startLegacyVolumeNormalization();
      return;
    }
    
    // 音声分析の設定
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // 音声レベル履歴
    let audioLevelHistory = [];
    const maxHistorySize = 20; // より多くの履歴を保持
    let lastAudioLevel = 0;
    
    // 音声レベル監視の間隔（ミリ秒）
    const monitorInterval = 100; // より頻繁に監視
    
    // 音声レベルを取得する関数
    function getAudioLevel() {
      analyser.getByteFrequencyData(dataArray);
      
      // 全周波数帯域の平均値を計算
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // 0-255の値を0-1の範囲に正規化
      return average / 255;
    }
    
    // 音声レベルをデシベルに変換する関数
    function toDecibels(level) {
      return 20 * Math.log10(Math.max(level, 0.0001));
    }
    
    const audioLevelMonitor = setInterval(() => {
      if (!video || video.paused) {
        return;
      }
      
      const currentAudioLevel = getAudioLevel();
      const currentDecibels = toDecibels(currentAudioLevel);
      
      audioLevelHistory.push(currentAudioLevel);
      
      // 履歴サイズを制限
      if (audioLevelHistory.length > maxHistorySize) {
        audioLevelHistory.shift();
      }
      
      // 平均音声レベルを計算
      const averageAudioLevel = audioLevelHistory.reduce((sum, level) => sum + level, 0) / audioLevelHistory.length;
      const averageDecibels = toDecibels(averageAudioLevel);
      
      // 音声レベルの急激な変化を検出（0.2以上の変化）
      const audioLevelChange = Math.abs(currentAudioLevel - lastAudioLevel);
      
      if (audioLevelChange > 0.2) {
        // console.log('startVolumeNormalization: 実際の音声レベルの急激な変化を検出:', {
          // previous: lastAudioLevel.toFixed(3),
          // current: currentAudioLevel.toFixed(3),
          // change: audioLevelChange.toFixed(3),
          // previousDb: toDecibels(lastAudioLevel).toFixed(1),
          // currentDb: currentDecibels.toFixed(1)
        // });
        
        // 音声レベルが高すぎる場合は動画の音量を下げる
        if (currentAudioLevel > 0.7) {
          const targetVolume = Math.max(0.1, video.volume * 0.8);
          adjustVolumeGradually(video, video.volume, targetVolume);
          // console.log('startVolumeNormalization: 音声レベルが高すぎるため音量を調整:', video.volume.toFixed(2), '→', targetVolume.toFixed(2));
        }
      }
      
      // 平均音声レベルが基準を超えた場合（0.6以上）
      if (averageAudioLevel > 0.6 && audioLevelHistory.length >= 10) {
        // console.log('startVolumeNormalization: 平均音声レベルが高すぎます:', {
          // level: averageAudioLevel.toFixed(3),
          // decibels: averageDecibels.toFixed(1)
        // });
        
        // 動画の音量を下げる
        const targetVolume = Math.max(0.1, video.volume * 0.7);
        adjustVolumeGradually(video, video.volume, targetVolume);
      }
      
      // 音声レベルが低すぎる場合（0.1以下）で動画の音量が低い場合は上げる
      if (currentAudioLevel < 0.1 && video.volume < 0.5) {
        const targetVolume = Math.min(1, video.volume * 1.2);
        adjustVolumeGradually(video, video.volume, targetVolume);
        // console.log('startVolumeNormalization: 音声レベルが低すぎるため音量を調整:', video.volume.toFixed(2), '→', targetVolume.toFixed(2));
      }
      
      lastAudioLevel = currentAudioLevel;
    }, monitorInterval);
    
    // 音声ストリームを接続
    microphone.connect(analyser);
    
    // 監視を停止する関数を返す
    return () => {
      clearInterval(audioLevelMonitor);
      microphone.disconnect();
      audioContext.close();
      // console.log('startVolumeNormalization: 実際の音声レベル監視を停止しました');
    };
  });
}

// 従来の音量監視（フォールバック用）
function startLegacyVolumeNormalization() {
  // console.log('startLegacyVolumeNormalization: 従来の音量監視を開始します');
  
  if (typeof window.waitForElement !== 'function') {
    setTimeout(startLegacyVolumeNormalization, 100);
    return;
  }
  
  window.waitForElement('video', (video) => {
    // console.log('startLegacyVolumeNormalization: 動画要素が見つかりました。従来の音量監視を開始します');
    
    let lastVolume = video.volume;
    let volumeHistory = [];
    const maxHistorySize = 10;
    
    // 音量監視の間隔（ミリ秒）
    const monitorInterval = 500;
    
    const volumeMonitor = setInterval(() => {
      if (!video || video.paused) {
        return;
      }
      
      const currentVolume = video.volume;
      volumeHistory.push(currentVolume);
      
      // 履歴サイズを制限
      if (volumeHistory.length > maxHistorySize) {
        volumeHistory.shift();
      }
      
      // 音量の急激な変化を検出
      const volumeChange = Math.abs(currentVolume - lastVolume);
      const averageVolume = volumeHistory.reduce((sum, vol) => sum + vol, 0) / volumeHistory.length;
      
      // 音量が急激に変化した場合（0.1以上の変化）
      if (volumeChange > 0.1) {
        // console.log('startLegacyVolumeNormalization: 音量の急激な変化を検出:', {
          // previous: lastVolume.toFixed(2),
          // current: currentVolume.toFixed(2),
          // change: volumeChange.toFixed(2)
        // });
        
        // 音量を徐々に調整
        normalizeVolume(video, lastVolume, currentVolume);
      }
      
      // 平均音量が基準を超えた場合（0.8以上）
      if (averageVolume > 0.8 && volumeHistory.length >= 5) {
        // console.log('startLegacyVolumeNormalization: 平均音量が高すぎます:', averageVolume.toFixed(2));
        
        // 音量を下げる
        const targetVolume = Math.min(currentVolume * 0.7, 0.6);
        adjustVolumeGradually(video, currentVolume, targetVolume);
      }
      
      lastVolume = currentVolume;
    }, monitorInterval);
    
    // 監視を停止する関数を返す
    return () => {
      clearInterval(volumeMonitor);
      // console.log('startLegacyVolumeNormalization: 従来の音量監視を停止しました');
    };
  });
}

// 音量を正規化する関数
function normalizeVolume(video, previousVolume, currentVolume) {
  const targetVolume = Math.min(currentVolume, 0.6); // 最大0.6に制限
  
  if (currentVolume > targetVolume) {
    // console.log('normalizeVolume: 音量を調整します:', currentVolume.toFixed(2), '→', targetVolume.toFixed(2));
    adjustVolumeGradually(video, currentVolume, targetVolume);
  }
}

// 音量を徐々に調整する関数
function adjustVolumeGradually(video, fromVolume, toVolume) {
  const duration = 2000; // 2秒かけて調整
  const steps = 20;
  const stepDuration = duration / steps;
  const volumeStep = (toVolume - fromVolume) / steps;
  
  let currentStep = 0;
  
  const adjustInterval = setInterval(() => {
    if (currentStep >= steps || !video || video.paused) {
      clearInterval(adjustInterval);
      return;
    }
    
    const newVolume = fromVolume + (volumeStep * currentStep);
    video.volume = Math.max(0, Math.min(1, newVolume));
    
    currentStep++;
  }, stepDuration);
  
  // console.log('adjustVolumeGradually: 音量を徐々に調整中:', fromVolume.toFixed(2), '→', toVolume.toFixed(2));
}

// グローバル関数として公開
window.calculatePlaybackPercentage = calculatePlaybackPercentage;
window.startPlaybackProgressMonitoring = startPlaybackProgressMonitoring;
window.isEndingMusic = isEndingMusic;
window.startEndingDetection = startEndingDetection;
window.handleEndingDetected = handleEndingDetected;
window.showEndingSkipButton = showEndingSkipButton;
window.startAutoPlay = startAutoPlay;
window.showAutoPlayFailedNotification = showAutoPlayFailedNotification;
window.startVideoEndMonitoring = startVideoEndMonitoring;
window.showVideoEndNotification = showVideoEndNotification;
window.startVolumeNormalization = startVolumeNormalization;
window.startLegacyVolumeNormalization = startLegacyVolumeNormalization;
window.normalizeVolume = normalizeVolume;
window.adjustVolumeGradually = adjustVolumeGradually; 