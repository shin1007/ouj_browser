// グローバル変数として次の動画IDを保持
let nextVideoId = null;

// 動画再生画面の初期化関数（最初に呼ばれる）
async function initializeVideoPlayer() {
  console.log('動画再生画面の初期化を開始します');
  
  // 次の動画IDを取得
  await fetchNextVideoId();
  
  // 動画下部に設定パネルを追加
  addVideoSettingsPanel();
  
  // エンディング検出を開始
  window.startEndingDetection();
  
  // 自動再生機能を開始
  startAutoPlay();
  
  // 動画終了監視を開始
  startVideoEndMonitoring();
  
  // 保存された再生速度を適用
  applySavedPlaybackSpeed();
  
  // キーボードショートカットを設定
  setupPlaybackSpeedShortcuts();
  
  // 音量自動調整機能を開始
  startVolumeNormalization();
}

// 動画下部に設定パネルを追加する関数
function addVideoSettingsPanel() {
  // 既にパネルが存在する場合は何もしない
  if (document.getElementById('video-settings-panel')) {
    return;
  }
  
  // 対象要素を待って取得する関数
  function waitForTargetElement() {
    const targetElement = document.querySelector('#content-detail-area > div.title');
    if (targetElement) {
      console.log('addVideoSettingsPanel: 対象要素が見つかりました: #content-detail-area > div.title');
      
      // 設定パネルを作成
      const panel = document.createElement('div');
      panel.id = 'video-settings-panel';
      panel.style.cssText = `
        margin-top: 15px;
        padding: 15px;
        background: #f5f5f5;
        border-radius: 8px;
        font-size: 14px;
        border: 1px solid #ddd;
      `;
      
      // 保存された設定を取得
      const savedSetting = localStorage.getItem('nextVideoSetting') || 'same-course';
      const autoPlayEnabled = localStorage.getItem('autoPlayEnabled') !== 'false';
      const autoNextVideoEnabled = localStorage.getItem('autoNextVideoEnabled') !== 'false';
      const playbackSpeed = localStorage.getItem('playbackSpeed') || '1';
      const volumeNormalizationEnabled = localStorage.getItem('volumeNormalizationEnabled') !== 'false';
      
      panel.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold; color: #333; text-decoration: underline;">動画再生設定</div>
        <div style="margin-bottom: 8px;">
          <label for="playback-speed" style="display: block; margin-bottom: 5px; color: #333;">再生速度:</label>
          <select id="playback-speed" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="0.25" ${playbackSpeed === '0.25' ? 'selected' : ''}>0.25x (4倍遅い)</option>
            <option value="0.5" ${playbackSpeed === '0.5' ? 'selected' : ''}>0.5x (2倍遅い)</option>
            <option value="0.75" ${playbackSpeed === '0.75' ? 'selected' : ''}>0.75x (1.33倍遅い)</option>
            <option value="1" ${playbackSpeed === '1' ? 'selected' : ''}>1x (通常)</option>
            <option value="1.25" ${playbackSpeed === '1.25' ? 'selected' : ''}>1.25x (1.25倍速)</option>
            <option value="1.5" ${playbackSpeed === '1.5' ? 'selected' : ''}>1.5x (1.5倍速)</option>
            <option value="2" ${playbackSpeed === '2' ? 'selected' : ''}>2x (2倍速)</option>
            <option value="3" ${playbackSpeed === '3' ? 'selected' : ''}>3x (3倍速)</option>
          </select>
        </div>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">
                  <div style="margin-bottom: 8px;">
            <input type="checkbox" id="auto-play" ${autoPlayEnabled ? 'checked' : ''}>
            <label for="auto-play" style="margin-left: 5px; cursor: pointer; color: #333;">動画を自動再生する<span style="font-size: 11px; color: #666;">（自動で音声を再生できないことが多いので、よく失敗します。）</span></label>
          </div>
        <div style="margin-bottom: 8px;">
          <input type="checkbox" id="auto-next-video" ${autoNextVideoEnabled ? 'checked' : ''}>
          <label for="auto-next-video" style="margin-left: 5px; cursor: pointer; color: #333;">動画終了時に自動で次の動画に進む</label>
        </div>
        <div style="margin-bottom: 8px;">
          <input type="checkbox" id="volume-normalization" ${volumeNormalizationEnabled ? 'checked' : ''}>
          <label for="volume-normalization" style="margin-left: 5px; cursor: pointer; color: #333;">音量の自動調整<span style="font-size: 11px; color: #666;">（OPEDや場面転換時の音量急上昇を緩やかにする）</span></label>
        </div>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">
        <div style="margin-bottom: 8px;">
          <input type="radio" id="same-course" name="next-video" value="same-course" ${savedSetting === 'same-course' ? 'checked' : ''}>
          <label for="same-course" style="margin-left: 5px; cursor: pointer; color: #333;">同じコースの中で次を再生</label>
        </div>
        <div style="margin-bottom: 8px;">
          <input type="radio" id="favorites-random" name="next-video" value="favorites-random" ${savedSetting === 'favorites-random' ? 'checked' : ''}>
          <label for="favorites-random" style="margin-left: 5px; cursor: pointer; color: #333;">お気に入りの中からランダムで次を再生</label>
        </div>
        <div style="margin-top: 10px; font-size: 12px; color: #666;">
          設定は自動的に保存されます
        </div>
      `;
      
      // ラジオボタンのイベントリスナーを追加
      const radioButtons = panel.querySelectorAll('input[type="radio"]');
      radioButtons.forEach(radio => {
        radio.addEventListener('change', (event) => {
          const setting = event.target.value;
          localStorage.setItem('nextVideoSetting', setting);
          console.log('addVideoSettingsPanel: 次の動画設定を保存しました:', setting);
        });
      });
      
      // チェックボックスのイベントリスナーを追加
      const autoPlayCheckbox = panel.querySelector('#auto-play');
      if (autoPlayCheckbox) {
        autoPlayCheckbox.addEventListener('change', (event) => {
          const enabled = event.target.checked;
          localStorage.setItem('autoPlayEnabled', enabled.toString());
          console.log('addVideoSettingsPanel: 自動再生設定を保存しました:', enabled);
        });
      }
      
      const autoNextVideoCheckbox = panel.querySelector('#auto-next-video');
      if (autoNextVideoCheckbox) {
        autoNextVideoCheckbox.addEventListener('change', (event) => {
          const enabled = event.target.checked;
          localStorage.setItem('autoNextVideoEnabled', enabled.toString());
          console.log('addVideoSettingsPanel: 自動次の動画遷移設定を保存しました:', enabled);
        });
      }
      
      const volumeNormalizationCheckbox = panel.querySelector('#volume-normalization');
      if (volumeNormalizationCheckbox) {
        volumeNormalizationCheckbox.addEventListener('change', (event) => {
          const enabled = event.target.checked;
          localStorage.setItem('volumeNormalizationEnabled', enabled.toString());
          console.log('addVideoSettingsPanel: 音量自動調整設定を保存しました:', enabled);
        });
      }
      
      // 再生速度設定のイベントリスナーを追加
      const playbackSpeedSelect = panel.querySelector('#playback-speed');
      if (playbackSpeedSelect) {
        playbackSpeedSelect.addEventListener('change', (event) => {
          const speed = event.target.value;
          localStorage.setItem('playbackSpeed', speed);
          console.log('addVideoSettingsPanel: 再生速度設定を保存しました:', speed);
          
          // 現在再生中の動画に即座に適用
          applyPlaybackSpeed(parseFloat(speed));
        });
      }
      
      // 対象要素の最後に追加
      targetElement.appendChild(panel);
      console.log('addVideoSettingsPanel: 動画設定パネルを追加しました');
    } else {
      console.log('addVideoSettingsPanel: 対象要素が見つかりません。100ms後に再試行します: #content-detail-area > div.title');
      setTimeout(waitForTargetElement, 100);
    }
  }
  
  // 要素の待機を開始
  waitForTargetElement();
}

// 次の動画IDを取得する関数
async function fetchNextVideoId() {
  const url = window.location.href;
  const matchCa = url.match(/ca=(\d+)/);
  const matchCo = url.match(/co=(\d+)/);
  
  if (matchCa && matchCo) {
    const currentCourseId = matchCa[1];
    const currentVideoId = matchCo[1];
    console.log('fetchNextVideoId: 現在のコースID:', currentCourseId);
    console.log('fetchNextVideoId: 現在の動画ID:', currentVideoId);
    
    // 保存された設定を取得
    const setting = localStorage.getItem('nextVideoSetting') || 'same-course';
    console.log('fetchNextVideoId: 次の動画設定:', setting);
    
    if (setting === 'same-course') {
      // 同じコースの中で次を再生
      await fetchNextVideoFromSameCourse(currentCourseId, currentVideoId);
    } else if (setting === 'favorites-random') {
      // お気に入りの中からランダムで次を再生
      await fetchNextVideoFromFavorites();
    }
  } else {
    console.log('fetchNextVideoId: URLからコースIDまたは動画IDを取得できません');
    nextVideoId = null;
  }
}

// 同じコースの中で次の動画を取得
async function fetchNextVideoFromSameCourse(currentCourseId, currentVideoId) {
  try {
    const cacheKey = `cachedVodContents_${currentCourseId}`;
    const res = await fetchWithCache(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${currentCourseId}&offset=0&limit=30&sortType=1&sortOrder=asc`, cacheKey);
    console.log('fetchNextVideoFromSameCourse: APIレスポンス:', res);
    
    const currentVideoIndex = res.findIndex(item => item.contentId == currentVideoId);
    console.log('fetchNextVideoFromSameCourse: 現在の動画インデックス:', currentVideoIndex);
    
    if (currentVideoIndex !== -1) {
      const nextVideoIndex = currentVideoIndex + 1;
      
      if (nextVideoIndex < res.length) {
        nextVideoId = res[nextVideoIndex].contentId;
        window.nextVideoCategoryId = null; // 同じコースなのでカテゴリIDは変更不要
        console.log('fetchNextVideoFromSameCourse: 次の動画IDを設定しました:', nextVideoId);
        console.log('fetchNextVideoFromSameCourse: 次の動画タイトル:', res[nextVideoIndex].title);
      } else {
        console.log('fetchNextVideoFromSameCourse: 次の動画がありません（最後の動画です）');
        nextVideoId = null;
        window.nextVideoCategoryId = null;
      }
    } else {
      console.log('fetchNextVideoFromSameCourse: 現在の動画が見つかりません');
      nextVideoId = null;
    }
  } catch (error) {
    console.error('fetchNextVideoFromSameCourse: 次の動画IDの取得に失敗しました:', error);
    nextVideoId = null;
  }
}

// お気に入りの中からランダムで次の動画を取得
async function fetchNextVideoFromFavorites() {
  try {
    // お気に入りリストを取得
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    console.log('fetchNextVideoFromFavorites: お気に入りリスト:', favorites);
    
    if (favorites.length === 0) {
      console.log('fetchNextVideoFromFavorites: お気に入りがありません');
      nextVideoId = null;
      return;
    }
    
    // 各お気に入りコースの未再生動画を取得
    const availableVideos = await getAvailableVideosFromFavorites(favorites);
    console.log('fetchNextVideoFromFavorites: 利用可能な動画リスト:', availableVideos);
    
    if (availableVideos.length === 0) {
      console.log('fetchNextVideoFromFavorites: 再生可能な動画がありません（すべて再生済み）');
      nextVideoId = null;
      return;
    }
    
    // ランダムに動画を選択
    const randomVideo = availableVideos[Math.floor(Math.random() * availableVideos.length)];
    nextVideoId = randomVideo.contentId;
    window.nextVideoCategoryId = randomVideo.categoryId;
    console.log('fetchNextVideoFromFavorites: お気に入りからランダム選択された動画ID:', nextVideoId);
    console.log('fetchNextVideoFromFavorites: 動画タイトル:', randomVideo.title);
    console.log('fetchNextVideoFromFavorites: コースID:', randomVideo.categoryId);
    
  } catch (error) {
    console.error('fetchNextVideoFromFavorites: お気に入りからの動画取得に失敗しました:', error);
    nextVideoId = null;
  }
}

// 現在の動画IDを取得する関数
function getCurrentVideoId() {
  const url = window.location.href;
  const matchCo = url.match(/co=(\d+)/);
  return matchCo ? matchCo[1] : null;
}

// お気に入りコースから未再生動画を取得する関数
async function getAvailableVideosFromFavorites(favorites) {
  const availableVideos = [];
  const currentVideoId = getCurrentVideoId();
  
  console.log(`getAvailableVideosFromFavorites: 現在の動画ID: ${currentVideoId}`);
  
  for (const favoriteId of favorites) {
    try {
      console.log(`getAvailableVideosFromFavorites: お気に入りコース ${favoriteId} の動画をチェック中...`);
      
      // コースの動画リストを取得
      const cacheKey = `cachedVodContents_${favoriteId}`;
      const videos = await fetchWithCache(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${favoriteId}&offset=0&limit=30&sortType=1&sortOrder=asc`, cacheKey);
      
      if (!videos || videos.length === 0) {
        console.log(`getAvailableVideosFromFavorites: コース ${favoriteId} に動画がありません`);
        continue;
      }
      
      // 各動画の再生状況をチェック
      let firstUnfinishedVideo = null;
      let viewingLogFailed = false; // 再生状況取得の失敗フラグ
      
      for (const video of videos) {
        // 再生状況取得に失敗した場合は以降の動画をスキップ
        if (viewingLogFailed) {
          console.log(`getAvailableVideosFromFavorites: コース ${favoriteId} で再生状況取得に失敗したため、以降の動画をスキップします`);
          break;
        }
        
        // 現在の動画の場合は再生完了として扱う
        if (video.contentId == currentVideoId) {
          console.log(`getAvailableVideosFromFavorites: 現在の動画 ${video.contentId} (${video.title}) は再生完了として扱います`);
          continue;
        }
        
        try {
          // 動画の再生状況を取得（キャッシュなしでリアルタイム取得）
          const viewingReq = await fetch(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${video.contentId}/viewinglog/latest`);
          const viewingData = await viewingReq.json();
          
          const currentTimeRate = viewingData.currentTimeRate || 0;
          console.log(`getAvailableVideosFromFavorites: 動画 ${video.contentId} (${video.title}) の再生進捗: ${(currentTimeRate * 100).toFixed(1)}%`);
          
          // 再生が完了していない場合（currentTimeRate < 0.95）
          if (currentTimeRate < 0.95) {
            if (!firstUnfinishedVideo) {
              firstUnfinishedVideo = {
                contentId: video.contentId,
                title: video.title,
                categoryId: favoriteId,
                currentTimeRate: currentTimeRate
              };
            }
            // 最初に見つかった未完了動画を記録（番号が若いもの）
          }
          
        } catch (viewingError) {
          console.log(`getAvailableVideosFromFavorites: 動画 ${video.contentId} の再生状況取得に失敗:`, viewingError);
          viewingLogFailed = true; // 失敗フラグを設定
          
          // 最初の動画で失敗した場合は未再生として扱う
          if (!firstUnfinishedVideo) {
            firstUnfinishedVideo = {
              contentId: video.contentId,
              title: video.title,
              categoryId: favoriteId,
              currentTimeRate: 0
            };
          }
        }
      }
      
      // 未完了動画が見つかった場合はリストに追加
      if (firstUnfinishedVideo) {
        availableVideos.push(firstUnfinishedVideo);
        console.log(`getAvailableVideosFromFavorites: コース ${favoriteId} の未完了動画を追加:`, firstUnfinishedVideo.title);
      } else {
        console.log(`getAvailableVideosFromFavorites: コース ${favoriteId} はすべて再生済みです`);
      }
      
    } catch (error) {
      console.error(`getAvailableVideosFromFavorites: コース ${favoriteId} の処理に失敗:`, error);
    }
  }
  return availableVideos;
}

// 現在の再生時間が総再生時間の何パーセントかを計算する関数
function calculatePlaybackPercentage() {
  const currentTimeDisplay = document.querySelector('.vjs-current-time-display');
  const durationDisplay = document.querySelector('.vjs-duration-display');
  
  if (!currentTimeDisplay || !durationDisplay) {
    console.log('calculatePlaybackPercentage: 再生時間表示要素が見つかりません');
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
    console.log('calculatePlaybackPercentage: 総再生時間が0秒です');
    return null;
  }
  
  const percentage = (currentTimeSeconds / durationSeconds) * 100;
  console.log(`calculatePlaybackPercentage: 再生進捗: ${percentage.toFixed(1)}% (${currentTimeStr} / ${durationStr})`);
  
  return percentage;
}

// 定期的に再生進捗を監視する関数
function startPlaybackProgressMonitoring() {
  console.log('startPlaybackProgressMonitoring: 再生進捗監視を開始します');
  
  const interval = setInterval(() => {
    const percentage = calculatePlaybackPercentage();
    if (percentage !== null) {
      // ここで進捗率を使用した処理を追加できます
      // 例: 特定の進捗率で何かをする
      if (percentage >= 50) {
        console.log('startPlaybackProgressMonitoring: 動画の50%を視聴しました');
      }
    }
  }, 1000); // 1秒ごとにチェック
  
  // 監視を停止する関数を返す
  return () => {
    clearInterval(interval);
    console.log('startPlaybackProgressMonitoring: 再生進捗監視を停止しました');
  };
}

// エンディングかどうかを判断する関数
function isEndingMusic() {
  const video = document.querySelector('video');
  if (!video) {
    console.log('isEndingMusic: 動画要素が見つかりません');
    return false;
  }
  
  const currentTime = video.currentTime;
  const duration = video.duration;
  
  if (duration === 0 || isNaN(duration)) {
    console.log('isEndingMusic: 動画の長さが取得できません');
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
  console.log('startEndingDetection: エンディング検出監視を開始します');
  
  let endingDetected = false;
  const interval = setInterval(() => {
    if (!endingDetected && isEndingMusic()) {
      endingDetected = true;
      console.log('startEndingDetection: エンディング音楽を検出しました！');
      
      // エンディング検出時の処理をここに追加
      // 例: 自動で次の動画に進む、スキップボタンを表示するなど
      handleEndingDetected();
    }
  }, 2000); // 2秒ごとにチェック
  
  // 監視を停止する関数を返す
  return () => {
    clearInterval(interval);
    console.log('startEndingDetection: エンディング検出監視を停止しました');
  };
}

// エンディング検出時の処理
function handleEndingDetected() {
  console.log('handleEndingDetected: エンディング処理を実行します');
  
  // 次の動画IDが設定されている場合のみスキップボタンを表示
  if (nextVideoId) {
    showEndingSkipButton();
    
    // 自動で次の動画に進むオプション（設定で有効な場合）
    if (localStorage.getItem('autoSkipEnding') === 'true') {
      setTimeout(() => {
        skipToNextVideo();
      }, 3000); // 3秒後に自動スキップ
    }
  } else {
    console.log('handleEndingDetected: 次の動画がないため、スキップボタンは表示しません');
  }
}

// 動画の自動再生機能
function startAutoPlay() {
  console.log('startAutoPlay: 自動再生機能を開始します');
  
  // 自動再生設定をチェック（デフォルトは有効）
  const autoPlayEnabled = localStorage.getItem('autoPlayEnabled') !== 'false';
  console.log('startAutoPlay: 自動再生設定:', autoPlayEnabled ? '有効' : '無効');
  
  if (!autoPlayEnabled) {
    console.log('startAutoPlay: 自動再生が無効化されているため、スキップします');
    return;
  }
  
  // 動画要素を待って自動再生を実行する関数
  function waitForVideoAndAutoPlay() {
    const video = document.querySelector('video');
    const videoPlayer = document.querySelector('.video-js');
    
    if (video && videoPlayer) {
      console.log('startAutoPlay: 動画要素が見つかりました。自動再生を開始します');
      
      // 動画が読み込まれるまで少し待つ
      setTimeout(() => {
        try {
          // 動画の準備ができているかチェック
          if (video.readyState >= 2) { // HAVE_CURRENT_DATA以上
            console.log('startAutoPlay: 動画の準備が完了しました。再生を開始します');
            video.play().then(() => {
              console.log('startAutoPlay: 自動再生が成功しました');
            }).catch((error) => {
              console.log('startAutoPlay: 自動再生に失敗しました（ユーザーインタラクションが必要な可能性）:', error);
              // 自動再生が失敗した場合、ユーザーに通知
              showAutoPlayFailedNotification();
            });
          } else {
            console.log('startAutoPlay: 動画の準備がまだ完了していません。再試行します');
            // 動画の準備がまだ完了していない場合、再試行
            setTimeout(waitForVideoAndAutoPlay, 500);
          }
        } catch (error) {
          console.error('startAutoPlay: 自動再生中にエラーが発生しました:', error);
        }
      }, 1000); // 1秒待ってから再生開始
      
    } else {
      console.log('startAutoPlay: 動画要素が見つかりません。100ms後に再試行します');
      setTimeout(waitForVideoAndAutoPlay, 100);
    }
  }
  
  // 自動再生の待機を開始
  waitForVideoAndAutoPlay();
}

// 自動再生失敗時の通知を表示
function showAutoPlayFailedNotification() {
  // 既に通知が表示されている場合は何もしない
  if (document.getElementById('autoplay-failed-notification')) {
    return;
  }
  
  const notification = document.createElement('div');
  notification.id = 'autoplay-failed-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 193, 7, 0.9);
    color: #333;
    padding: 10px 15px;
    border-radius: 5px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;
  notification.textContent = '自動再生に失敗しました。手動で再生ボタンを押してください。';
  
  document.body.appendChild(notification);
  
  // 5秒後に通知を自動削除
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// 動画終了監視機能
function startVideoEndMonitoring() {
  console.log('startVideoEndMonitoring: 動画終了監視を開始します');
  
  // 自動次の動画遷移設定をチェック（デフォルトは有効）
  const autoNextVideoEnabled = localStorage.getItem('autoNextVideoEnabled') !== 'false';
  console.log('startVideoEndMonitoring: 自動次の動画遷移設定:', autoNextVideoEnabled ? '有効' : '無効');
  
  if (!autoNextVideoEnabled) {
    console.log('startVideoEndMonitoring: 自動次の動画遷移が無効化されているため、スキップします');
    return;
  }
  
  // 動画要素を待って終了監視を開始する関数
  function waitForVideoAndMonitorEnd() {
    const video = document.querySelector('video');
    
    if (video) {
      console.log('startVideoEndMonitoring: 動画要素が見つかりました。終了監視を開始します');
      
      // 動画終了イベントリスナーを追加
      const handleVideoEnded = () => {
        console.log('startVideoEndMonitoring: 動画が終了しました');
        
        // 次の動画IDが設定されている場合のみ自動遷移
        if (nextVideoId) {
          console.log('startVideoEndMonitoring: 次の動画に自動遷移します');
          
          // 動画終了通知を表示
          showVideoEndNotification();
          
          // 少し待ってから遷移（ユーザーが終了を確認できるように）
          setTimeout(() => {
            skipToNextVideo();
          }, 2000); // 2秒後に自動遷移
        } else {
          console.log('startVideoEndMonitoring: 次の動画がないため、自動遷移しません');
        }
      };
      
      // 既存のイベントリスナーを削除してから追加（重複を防ぐ）
      video.removeEventListener('ended', handleVideoEnded);
      video.addEventListener('ended', handleVideoEnded);
      
      console.log('startVideoEndMonitoring: 動画終了イベントリスナーを追加しました');
      
    } else {
      console.log('startVideoEndMonitoring: 動画要素が見つかりません。100ms後に再試行します');
      setTimeout(waitForVideoAndMonitorEnd, 100);
    }
  }
  
  // 動画終了監視の待機を開始
  waitForVideoAndMonitorEnd();
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
  console.log('skipToNextVideo: 次の動画にスキップします');
  
  if (nextVideoId) {
    const url = window.location.href;
    const matchCo = url.match(/co=(\d+)/);
    
    if (matchCo) {
      let nextVideoUrl = url.replace(matchCo[0], `co=${nextVideoId}`);
      
      // お気に入りランダム設定の場合、カテゴリIDも更新
      const setting = localStorage.getItem('nextVideoSetting') || 'same-course';
      if (setting === 'favorites-random' && window.nextVideoCategoryId) {
        const matchCa = url.match(/ca=(\d+)/);
        if (matchCa) {
          nextVideoUrl = nextVideoUrl.replace(matchCa[0], `ca=${window.nextVideoCategoryId}`);
          console.log('skipToNextVideo: カテゴリIDを更新しました:', window.nextVideoCategoryId);
        }
      }
      
      console.log('skipToNextVideo: 次の動画URL:', nextVideoUrl);
      window.location.href = nextVideoUrl;
    } else {
      console.log('skipToNextVideo: URLから動画IDを取得できません');
    }
  } else {
    console.log('skipToNextVideo: 次の動画IDが設定されていません');
  }
}

// 動画終了時の通知を表示
function showVideoEndNotification() {
  // 既に通知が表示されている場合は何もしない
  if (document.getElementById('video-end-notification')) {
    return;
  }

  const notification = document.createElement('div');
  notification.id = 'video-end-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 15px;
    border-radius: 5px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;
  notification.textContent = '動画が終了しました。次の動画に自動的に進みます。';

  document.body.appendChild(notification);

  // 5秒後に通知を自動削除
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// 再生速度を適用する関数
function applyPlaybackSpeed(speed) {
  const video = document.querySelector('video');
  if (video) {
    try {
      video.playbackRate = speed;
      console.log('applyPlaybackSpeed: 再生速度を設定しました:', speed);
      
      // 再生速度変更通知を表示
      showPlaybackSpeedNotification(speed);
    } catch (error) {
      console.error('applyPlaybackSpeed: 再生速度の設定に失敗しました:', error);
    }
  } else {
    console.log('applyPlaybackSpeed: 動画要素が見つかりません');
  }
}

// 再生速度変更通知を表示
function showPlaybackSpeedNotification(speed) {
  // 既に通知が表示されている場合は削除
  const existingNotification = document.getElementById('playback-speed-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.id = 'playback-speed-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 123, 255, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 5px;
    font-size: 12px;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;
  notification.textContent = `再生速度: ${speed}x`;

  document.body.appendChild(notification);

  // 2秒後に通知を自動削除
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 2000);
}

// 保存された再生速度を動画に適用
function applySavedPlaybackSpeed() {
  const savedSpeed = localStorage.getItem('playbackSpeed') || '1';
  const speed = parseFloat(savedSpeed);
  
  if (speed !== 1) {
    console.log('applySavedPlaybackSpeed: 保存された再生速度を適用します:', speed);
    
    // 動画要素を待って再生速度を適用
    function waitForVideoAndApplySpeed() {
      const video = document.querySelector('video');
      if (video && video.readyState >= 2) { // HAVE_CURRENT_DATA以上
        applyPlaybackSpeed(speed);
      } else {
        setTimeout(waitForVideoAndApplySpeed, 100);
      }
    }
    
    waitForVideoAndApplySpeed();
  }
}

// キーボードショートカットで再生速度を変更
function setupPlaybackSpeedShortcuts() {
  document.addEventListener('keydown', (event) => {
    // Ctrl + 数字キーで再生速度を変更
    if (event.ctrlKey && !event.altKey && !event.shiftKey) {
      let newSpeed = 1;
      let speedChanged = false;
      
      switch (event.key) {
        case '1':
          newSpeed = 0.25;
          speedChanged = true;
          break;
        case '2':
          newSpeed = 0.5;
          speedChanged = true;
          break;
        case '3':
          newSpeed = 0.75;
          speedChanged = true;
          break;
        case '4':
          newSpeed = 1;
          speedChanged = true;
          break;
        case '5':
          newSpeed = 1.25;
          speedChanged = true;
          break;
        case '6':
          newSpeed = 1.5;
          speedChanged = true;
          break;
        case '7':
          newSpeed = 2;
          speedChanged = true;
          break;
        case '8':
          newSpeed = 3;
          speedChanged = true;
          break;
      }
      
      if (speedChanged) {
        event.preventDefault();
        applyPlaybackSpeed(newSpeed);
        localStorage.setItem('playbackSpeed', newSpeed.toString());
        
        // 設定パネルの選択肢も更新
        const speedSelect = document.querySelector('#playback-speed');
        if (speedSelect) {
          speedSelect.value = newSpeed.toString();
        }
        
        console.log('setupPlaybackSpeedShortcuts: キーボードショートカットで再生速度を変更しました:', newSpeed);
      }
    }
  });
}

// 音量自動調整機能
function startVolumeNormalization() {
  console.log('startVolumeNormalization: 音量自動調整機能を開始します');
  
  // 音量自動調整設定をチェック（デフォルトは有効）
  const volumeNormalizationEnabled = localStorage.getItem('volumeNormalizationEnabled') !== 'false';
  console.log('startVolumeNormalization: 音量自動調整設定:', volumeNormalizationEnabled ? '有効' : '無効');
  
  if (!volumeNormalizationEnabled) {
    console.log('startVolumeNormalization: 音量自動調整が無効化されているため、スキップします');
    return;
  }
  
  // 動画要素を待って音量監視を開始する関数
  function waitForVideoAndMonitorVolume() {
    const video = document.querySelector('video');
    
    if (video) {
      console.log('startVolumeNormalization: 動画要素が見つかりました。音量監視を開始します');
      
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
          console.log('startVolumeNormalization: 音量の急激な変化を検出:', {
            previous: lastVolume.toFixed(2),
            current: currentVolume.toFixed(2),
            change: volumeChange.toFixed(2)
          });
          
          // 音量を徐々に調整
          normalizeVolume(video, lastVolume, currentVolume);
        }
        
        // 平均音量が基準を超えた場合（0.8以上）
        if (averageVolume > 0.8 && volumeHistory.length >= 5) {
          console.log('startVolumeNormalization: 平均音量が高すぎます:', averageVolume.toFixed(2));
          
          // 音量を下げる
          const targetVolume = Math.min(currentVolume * 0.7, 0.6);
          adjustVolumeGradually(video, currentVolume, targetVolume);
        }
        
        lastVolume = currentVolume;
      }, monitorInterval);
      
      // 監視を停止する関数を返す
      return () => {
        clearInterval(volumeMonitor);
        console.log('startVolumeNormalization: 音量監視を停止しました');
      };
      
    } else {
      console.log('startVolumeNormalization: 動画要素が見つかりません。100ms後に再試行します');
      setTimeout(waitForVideoAndMonitorVolume, 100);
    }
  }
  
  // 音量監視の待機を開始
  waitForVideoAndMonitorVolume();
}

// 音量を正規化する関数
function normalizeVolume(video, previousVolume, currentVolume) {
  const targetVolume = Math.min(currentVolume, 0.6); // 最大0.6に制限
  
  if (currentVolume > targetVolume) {
    console.log('normalizeVolume: 音量を調整します:', currentVolume.toFixed(2), '→', targetVolume.toFixed(2));
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
  
  console.log('adjustVolumeGradually: 音量を徐々に調整中:', fromVolume.toFixed(2), '→', toVolume.toFixed(2));
}

// グローバル関数として公開
window.calculatePlaybackPercentage = calculatePlaybackPercentage;
window.startPlaybackProgressMonitoring = startPlaybackProgressMonitoring;
window.isEndingMusic = isEndingMusic;
window.startEndingDetection = startEndingDetection;
window.handleEndingDetected = handleEndingDetected;
window.showEndingSkipButton = showEndingSkipButton;
window.skipToNextVideo = skipToNextVideo;
window.getNextVideoId = () => nextVideoId;
window.initializeVideoPlayer = initializeVideoPlayer;
window.fetchNextVideoId = fetchNextVideoId;
window.addVideoSettingsPanel = addVideoSettingsPanel;
window.fetchNextVideoFromSameCourse = fetchNextVideoFromSameCourse;
window.fetchNextVideoFromFavorites = fetchNextVideoFromFavorites;
window.getAvailableVideosFromFavorites = getAvailableVideosFromFavorites;
window.getCurrentVideoId = getCurrentVideoId;
window.startAutoPlay = startAutoPlay;
window.showAutoPlayFailedNotification = showAutoPlayFailedNotification;
window.startVideoEndMonitoring = startVideoEndMonitoring;
window.showVideoEndNotification = showVideoEndNotification;
window.applyPlaybackSpeed = applyPlaybackSpeed;
window.showPlaybackSpeedNotification = showPlaybackSpeedNotification;
window.applySavedPlaybackSpeed = applySavedPlaybackSpeed;
window.setupPlaybackSpeedShortcuts = setupPlaybackSpeedShortcuts;
window.startVolumeNormalization = startVolumeNormalization;
window.normalizeVolume = normalizeVolume;
window.adjustVolumeGradually = adjustVolumeGradually;
