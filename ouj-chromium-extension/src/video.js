// グローバル変数として次の動画IDを保持
let nextVideoId = null;

// 動画再生画面の初期化関数（最初に呼ばれる）
async function initializeVideoPlayer() {
  console.log('動画再生画面の初期化を開始します');
  
  
  // videoタグの出現を監視し、出現した瞬間に設定パネルを挿入
  waitForVideoElementAndInsertPanel();

  
  // 履歴に追加
  if (window.addHistoryEntry) {
    try {
      const url = window.location.href;
      const matchCa = url.match(/ca=(\d+)/);
      
      // コース名を取得
      let courseName = 'コース';
      if (matchCa) {
        try {
          const categories = await window.getCategoriesData();
          const category = categories.find(cat => cat.categoryId.toString() === matchCa[1]);
          if (category) {
            courseName = category.name;
          }
        } catch (error) {
          console.error('initializeVideoPlayer: コース名取得でエラーが発生しました:', error);
        }
      }
      
      // コース全体を履歴に保存
      const historyId = matchCa ? matchCa[1] : 'unknown';
      
      window.addHistoryEntry(historyId, courseName);
      console.log(`initializeVideoPlayer: 履歴に追加しました。コースID: ${historyId}, コース名: ${courseName}`);
    } catch (error) {
      console.error('initializeVideoPlayer: 履歴追加でエラーが発生しました:', error);
    }
  }
    
  // ラジオ番組判定を実行
  await checkIfRadioProgram();
    
  // 音量自動調整機能を開始
  startVolumeNormalization();

  // 保存された再生速度を適用
  applySavedPlaybackSpeed();
  
  // キーボードショートカットを設定
  setupPlaybackSpeedShortcuts();
  
  // 自動再生機能を開始
  startAutoPlay();
  
  // 次の動画IDを取得
  await fetchNextVideoId();

  // 動画終了監視を開始
  startVideoEndMonitoring();
  
  // エンディング検出を開始
  window.startEndingDetection();
  
}

// videoタグの出現を監視し、出現したら設定パネルを挿入する
function waitForVideoElementAndInsertPanel() {
  if (document.querySelector('video')) {
    addVideoSettingsPanel();
    return;
  }
  // MutationObserverでvideoタグの出現を監視
  const observer = new MutationObserver((mutations, obs) => {
    if (document.querySelector('video')) {
      addVideoSettingsPanel();
      obs.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// 動画下部に設定パネルを追加する関数
function addVideoSettingsPanel() {
  // 既にパネルが存在する場合は何もしない
  if (document.getElementById('video-settings-panel')) {
    return;
  }
  
  // 対象要素を待って取得する関数
  if (typeof window.waitForElement !== 'function') {
    setTimeout(addVideoSettingsPanel, 100);
    return;
  }
  
  window.waitForElement('#content-detail-area > div.title', (targetElement) => {
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
    
    // 共通関数の存在をチェック
    if (typeof window.getSetting !== 'function' || typeof window.getBooleanSetting !== 'function') {
      setTimeout(addVideoSettingsPanel, 100);
      return;
    }
    
    // 保存された設定を取得
    const savedSetting = window.getSetting('nextVideoSetting', 'same-course');
    const autoPlayEnabled = window.getBooleanSetting('autoPlayEnabled', true);
    const autoNextVideoEnabled = window.getBooleanSetting('autoNextVideoEnabled', true);
    const playbackSpeed = window.getSetting('playbackSpeed', '1');
    const volumeNormalizationEnabled = window.getBooleanSetting('volumeNormalizationEnabled', true);
      
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
            <label for="auto-play" style="margin-left: 5px; cursor: pointer; color: #333;">動画を自動再生する<span style="font-size: 11px; color: #666;">（ブラウザ側でユーザー操作を検知できないと失敗する）</span></label>
          </div>
        <div style="margin-bottom: 8px;">
          <input type="checkbox" id="auto-next-video" ${autoNextVideoEnabled ? 'checked' : ''}>
          <label for="auto-next-video" style="margin-left: 5px; cursor: pointer; color: #333;">動画終了時に自動で次の動画に進む</label>
        </div>
        <div style="margin-bottom: 8px;">
          <input type="checkbox" id="volume-normalization" ${volumeNormalizationEnabled ? 'checked' : ''}>
          <label for="volume-normalization" style="margin-left: 5px; cursor: pointer; color: #333;">音量の自動調整<span style="font-size: 11px; color: #666;">（実際の音声レベルを測定してOPEDや場面転換時の音量急上昇を緩やかにする）</span></label>
        </div>
        ${window.isRadioProgram ? `
        <div style="margin-bottom: 8px; padding: 8px; background: #e8f4fd; border-radius: 4px; border-left: 4px solid #2196f3;">
          <div style="font-weight: bold; color: #1976d2; margin-bottom: 4px;">🎵 ラジオ番組</div>
          <div style="font-size: 12px; color: #555;">
            ${window.isRadioWithSubtitles ? '字幕付きラジオ番組です（字幕が表示されます）' : '音声のみのラジオ番組です'}
          </div>
        </div>
        ` : ''}
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">
        <div style="margin-bottom: 8px;">
          <input type="radio" id="same-course" name="next-video" value="same-course" ${savedSetting === 'same-course' ? 'checked' : ''}>
          <label for="same-course" style="margin-left: 5px; cursor: pointer; color: #333;">同じコースの中で次を再生</label>
        </div>
        <div style="margin-bottom: 8px;">
          <input type="radio" id="favorites-random" name="next-video" value="favorites-random" ${savedSetting === 'favorites-random' ? 'checked' : ''}>
          <label for="favorites-random" style="margin-left: 5px; cursor: pointer; color: #333;">お気に入りの中からランダムで次を再生</label>
        </div>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">
        <div style="margin-bottom: 10px; font-weight: bold; color: #333; text-decoration: underline;">キーボードショートカット</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; font-size: 12px; color: #555;">
          <div style="background: #fff; padding: 8px; border-radius: 4px; border: 1px solid #e0e0e0;">
            <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">基本操作</div>
            <div style="line-height: 1.3;">
              <div style="margin-bottom: 2px;"><span style="background: #f0f0f0; padding: 1px 4px; border-radius: 2px; font-family: monospace; font-size: 10px;">Space</span> 再生/一時停止</div>
              <div style="margin-bottom: 2px;"><span style="background: #f0f0f0; padding: 1px 4px; border-radius: 2px; font-family: monospace; font-size: 10px;">M</span> ミュート切り替え</div>
              <div style="margin-bottom: 2px;"><span style="background: #f0f0f0; padding: 1px 4px; border-radius: 2px; font-family: monospace; font-size: 10px;">F</span> フルスクリーン</div>
            </div>
          </div>
          <div style="background: #fff; padding: 8px; border-radius: 4px; border: 1px solid #e0e0e0;">
            <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">シーク操作</div>
            <div style="line-height: 1.3;">
              <div style="margin-bottom: 2px;"><span style="background: #f0f0f0; padding: 1px 4px; border-radius: 2px; font-family: monospace; font-size: 10px;">←→</span> 10秒前後</div>
              <div style="margin-bottom: 2px;"><span style="background: #f0f0f0; padding: 1px 4px; border-radius: 2px; font-family: monospace; font-size: 10px;">Shift+←→</span> 30秒前後</div>
              <div style="margin-bottom: 2px;"><span style="background: #f0f0f0; padding: 1px 4px; border-radius: 2px; font-family: monospace; font-size: 10px;">0</span> 最初に戻る</div>
              <div style="margin-bottom: 2px;"><span style="background: #f0f0f0; padding: 1px 4px; border-radius: 2px; font-family: monospace; font-size: 10px;">End</span> 最後に進む</div>
            </div>
          </div>
          <div style="background: #fff; padding: 8px; border-radius: 4px; border: 1px solid #e0e0e0;">
            <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">音量調整</div>
            <div style="line-height: 1.3;">
              <div style="margin-bottom: 2px;"><span style="background: #f0f0f0; padding: 1px 4px; border-radius: 2px; font-family: monospace; font-size: 10px;">↑↓</span> 音量±5%</div>
              <div style="margin-bottom: 2px;"><span style="background: #f0f0f0; padding: 1px 4px; border-radius: 2px; font-family: monospace; font-size: 10px;">Shift+↑↓</span> 音量±10%</div>
            </div>
          </div>
          <div style="background: #fff; padding: 8px; border-radius: 4px; border: 1px solid #e0e0e0;">
            <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">再生速度</div>
            <div style="line-height: 1.3;">
              <div style="margin-bottom: 2px;"><span style="background: #f0f0f0; padding: 1px 4px; border-radius: 2px; font-family: monospace; font-size: 10px;">Ctrl+1-8</span> 0.25x〜3x</div>
            </div>
          </div>
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
          window.saveSetting('nextVideoSetting', setting);
          console.log('addVideoSettingsPanel: 次の動画設定を保存しました:', setting);
        });
      });
      
      // チェックボックスのイベントリスナーを追加
      const autoPlayCheckbox = panel.querySelector('#auto-play');
      if (autoPlayCheckbox) {
        autoPlayCheckbox.addEventListener('change', (event) => {
          const enabled = event.target.checked;
          window.saveSetting('autoPlayEnabled', enabled);
          console.log('addVideoSettingsPanel: 自動再生設定を保存しました:', enabled);
        });
      }
      
      const autoNextVideoCheckbox = panel.querySelector('#auto-next-video');
      if (autoNextVideoCheckbox) {
        autoNextVideoCheckbox.addEventListener('change', (event) => {
          const enabled = event.target.checked;
          window.saveSetting('autoNextVideoEnabled', enabled);
          console.log('addVideoSettingsPanel: 自動次の動画遷移設定を保存しました:', enabled);
        });
      }
      
      const volumeNormalizationCheckbox = panel.querySelector('#volume-normalization');
      if (volumeNormalizationCheckbox) {
        volumeNormalizationCheckbox.addEventListener('change', (event) => {
          const enabled = event.target.checked;
          window.saveSetting('volumeNormalizationEnabled', enabled);
          console.log('addVideoSettingsPanel: 音量自動調整設定を保存しました:', enabled);
        });
      }
      
      // 再生速度設定のイベントリスナーを追加
      const playbackSpeedSelect = panel.querySelector('#playback-speed');
      if (playbackSpeedSelect) {
        playbackSpeedSelect.addEventListener('change', (event) => {
          const speed = event.target.value;
          window.saveSetting('playbackSpeed', speed);
          console.log('addVideoSettingsPanel: 再生速度設定を保存しました:', speed);
          
          // 現在再生中の動画に即座に適用
          applyPlaybackSpeed(parseFloat(speed));
        });
      }
      
      // 対象要素の最後に追加
      targetElement.appendChild(panel);
      console.log('addVideoSettingsPanel: 動画設定パネルを追加しました');
    });
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
    const setting = window.getSetting('nextVideoSetting', 'same-course');
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
    const favorites = window.getSetting('favorites', []);
    console.log('fetchNextVideoFromFavorites: お気に入りリスト:', favorites);
    
    if (favorites.length === 0) {
      console.log('fetchNextVideoFromFavorites: お気に入りがありません');
      nextVideoId = null;
      return;
    }
    
    // 各お気に入りコースの未再生動画を取得
    const availableVideos = await getAvailableVideosFromFavorites(favorites);
    
    
    if (availableVideos.length === 0) {
      console.log('fetchNextVideoFromFavorites: 再生可能な動画がありません（すべて再生済み）');
      nextVideoId = null;
      return;
    }
    
    // ランダムに動画を選択
    const randomVideo = availableVideos[Math.floor(Math.random() * availableVideos.length)];
    nextVideoId = randomVideo.contentId;
    window.nextVideoCategoryId = randomVideo.categoryId;
    
    
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
  
  for (const favoriteId of favorites) {
    try {
      
      // コースの動画リストを取得
      const cacheKey = `cachedVodContents_${favoriteId}`;
      const videos = await fetchWithCache(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${favoriteId}&offset=0&limit=30&sortType=1&sortOrder=asc`, cacheKey);
      
      if (!videos || videos.length === 0) {
        continue;
      }
      
      // 各動画の再生状況をチェック
      let firstUnfinishedVideo = null;
      let viewingLogFailed = false; // 再生状況取得の失敗フラグ
      
      for (const video of videos) {
        // 再生状況取得に失敗した場合は以降の動画をスキップ
        if (viewingLogFailed) {
          break;
        }
        
        // 現在の動画の場合は再生完了として扱う
        if (video.contentId == currentVideoId) {
          continue;
        }
        
        try {
          // 動画の再生状況を取得（共通関数を使用）
          const viewingStatus = await window.getVideoViewingStatus(video.contentId);
          const currentTimeRate = viewingStatus.currentTimeRate;
          
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

      }
      
    } catch (error) {
      // エラーは静かに処理
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
    console.log('startEndingDetection: エンディング検出監視を停止しました');
  };
}

// エンディング検出時の処理
function handleEndingDetected() {
  
  
  // 次の動画IDが設定されている場合のみスキップボタンを表示
  if (nextVideoId) {
    showEndingSkipButton();
    
    // 自動で次の動画に進むオプション（設定で有効な場合）
    if (window.getBooleanSetting('autoSkipEnding', false)) {
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
  const autoPlayEnabled = window.getBooleanSetting('autoPlayEnabled', true);
  console.log('startAutoPlay: 自動再生設定:', autoPlayEnabled ? '有効' : '無効');
  
  if (!autoPlayEnabled) {
    console.log('startAutoPlay: 自動再生が無効化されているため、スキップします');
    return;
  }
  
  // 動画要素を待って自動再生を実行する関数
  if (typeof window.waitForElement !== 'function') {
    setTimeout(startAutoPlay, 100);
    return;
  }
  
  window.waitForElement('video', (video) => {
    const videoPlayer = document.querySelector('.video-js');
    
    if (videoPlayer) {
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
            window.waitForCondition(() => video.readyState >= 2, () => {
              video.play().then(() => {
                console.log('startAutoPlay: 自動再生が成功しました');
              }).catch((error) => {
                console.log('startAutoPlay: 自動再生に失敗しました（ユーザーインタラクションが必要な可能性）:', error);
                showAutoPlayFailedNotification();
              });
            }, 500);
          }
        } catch (error) {
          console.error('startAutoPlay: 自動再生中にエラーが発生しました:', error);
        }
      }, 1000); // 1秒待ってから再生開始
    }
  });
}

// 自動再生失敗時の通知を表示
function showAutoPlayFailedNotification() {
  if (typeof window.showWarningNotification !== 'function') {
    console.warn('showAutoPlayFailedNotification: 通知関数が見つかりません。');
    return;
  }
  window.showWarningNotification('自動再生に失敗しました。手動で再生ボタンを押してください。', 5000);
}

// 動画終了監視機能
function startVideoEndMonitoring() {

  
  // 自動次の動画遷移設定をチェック（デフォルトは有効）
  const autoNextVideoEnabled = window.getBooleanSetting('autoNextVideoEnabled', true);
  
  
  if (!autoNextVideoEnabled) {
    console.log('startVideoEndMonitoring: 自動次の動画遷移が無効化されているため、スキップします');
    return;
  }
  
  // 動画要素を待って終了監視を開始する関数
  if (typeof window.waitForElement !== 'function') {
    setTimeout(startVideoEndMonitoring, 100);
    return;
  }
  
  window.waitForElement('video', (video) => {
    
    
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
    
    
  });
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
      const setting = window.getSetting('nextVideoSetting', 'same-course');
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
  if (typeof window.showSuccessNotification !== 'function') {
    console.warn('showVideoEndNotification: 通知関数が見つかりません。');
    return;
  }
  window.showSuccessNotification('動画が終了しました。次の動画に自動的に進みます。', 5000);
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
  if (typeof window.showInfoNotification !== 'function') {
    console.warn('showPlaybackSpeedNotification: 通知関数が見つかりません。');
    return;
  }
  window.showInfoNotification(`再生速度: ${speed}x`, 2000, { position: 'top-right' });
}

// 保存された再生速度を動画に適用
function applySavedPlaybackSpeed() {
  const savedSpeed = window.getSetting('playbackSpeed', '1');
  const speed = parseFloat(savedSpeed);
  
  if (speed !== 1) {
    console.log('applySavedPlaybackSpeed: 保存された再生速度を適用します:', speed);
    
    // 動画要素を待って再生速度を適用
    if (typeof window.waitForElement !== 'function') {
      setTimeout(applySavedPlaybackSpeed, 100);
      return;
    }
    
    window.waitForElement('video', (video) => {
      window.waitForCondition(() => video.readyState >= 2, () => {
        applyPlaybackSpeed(speed);
      }, 100);
    });
  }
}

// キーボードショートカットで再生速度を変更
function setupPlaybackSpeedShortcuts() {
  document.addEventListener('keydown', (event) => {
    // 動画要素を取得
    const video = document.querySelector('video');
    if (!video) {
      return; // 動画が存在しない場合は何もしない
    }
    
    // フォーム入力中はショートカットを無効化
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) {
      return;
    }
    
    // スクロールを防ぐキーのリスト
    const scrollPreventingKeys = [
      'Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 
      'Home', 'End', 'PageUp', 'PageDown'
    ];
    
    // スクロールを防ぐキーの場合は常にpreventDefault
    if (scrollPreventingKeys.includes(event.code)) {
      event.preventDefault();
    }
    
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
        window.saveSetting('playbackSpeed', newSpeed.toString());
        
        // 設定パネルの選択肢も更新
        const speedSelect = document.querySelector('#playback-speed');
        if (speedSelect) {
          speedSelect.value = newSpeed.toString();
        }
        
        console.log('setupPlaybackSpeedShortcuts: キーボードショートカットで再生速度を変更しました:', newSpeed);
      }
    }
    
    // スペースキーで再生/一時停止
    if (event.code === 'Space' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      if (video.paused) {
        video.play().then(() => {
          console.log('setupPlaybackSpeedShortcuts: スペースキーで再生しました');
        }).catch(error => {
          console.error('setupPlaybackSpeedShortcuts: 再生に失敗しました:', error);
        });
      } else {
        video.pause();
        console.log('setupPlaybackSpeedShortcuts: スペースキーで一時停止しました');
      }
    }
    
    // 左右矢印キーでシーク（10秒前後）
    if (event.code === 'ArrowLeft' && !event.ctrlKey && !event.altKey) {
      const seekTime = event.shiftKey ? 30 : 10; // Shift + 左矢印で30秒、通常で10秒
      video.currentTime = Math.max(0, video.currentTime - seekTime);
      console.log(`setupPlaybackSpeedShortcuts: 左矢印キーで${seekTime}秒戻しました`);
    }
    
    if (event.code === 'ArrowRight' && !event.ctrlKey && !event.altKey) {
      const seekTime = event.shiftKey ? 30 : 10; // Shift + 右矢印で30秒、通常で10秒
      video.currentTime = Math.min(video.duration, video.currentTime + seekTime);
      console.log(`setupPlaybackSpeedShortcuts: 右矢印キーで${seekTime}秒進めました`);
    }
    
    // 上下矢印キーで音量調整
    if (event.code === 'ArrowUp' && !event.ctrlKey && !event.altKey) {
      const volumeChange = event.shiftKey ? 0.1 : 0.05; // Shift + 上矢印で10%、通常で5%
      video.volume = Math.min(1, video.volume + volumeChange);
      console.log(`setupPlaybackSpeedShortcuts: 上矢印キーで音量を上げました: ${(video.volume * 100).toFixed(0)}%`);
    }
    
    if (event.code === 'ArrowDown' && !event.ctrlKey && !event.altKey) {
      const volumeChange = event.shiftKey ? 0.1 : 0.05; // Shift + 下矢印で10%、通常で5%
      video.volume = Math.max(0, video.volume - volumeChange);
      console.log(`setupPlaybackSpeedShortcuts: 下矢印キーで音量を下げました: ${(video.volume * 100).toFixed(0)}%`);
    }
    
    // Mキーでミュート切り替え
    if (event.key.toLowerCase() === 'm' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      video.muted = !video.muted;
      console.log(`setupPlaybackSpeedShortcuts: Mキーでミュートを${video.muted ? 'ON' : 'OFF'}にしました`);
    }
    
    // Fキーでフルスクリーン切り替え
    if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      if (document.fullscreenElement) {
        document.exitFullscreen();
        console.log('setupPlaybackSpeedShortcuts: Fキーでフルスクリーンを解除しました');
      } else {
        video.requestFullscreen();
        console.log('setupPlaybackSpeedShortcuts: Fキーでフルスクリーンにしました');
      }
    }
    
    // 0キーで最初に戻る
    if (event.key === '0' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      video.currentTime = 0;
      console.log('setupPlaybackSpeedShortcuts: 0キーで動画の最初に戻りました');
    }
    
    // Endキーで最後に進む
    if (event.code === 'End' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      video.currentTime = video.duration;
      console.log('setupPlaybackSpeedShortcuts: Endキーで動画の最後に進みました');
    }
  });
}

// 音量自動調整機能（実際の音声レベルを測定）
function startVolumeNormalization() {
  console.log('startVolumeNormalization: 音量自動調整機能を開始します');
  
  // 音量自動調整設定をチェック（デフォルトは有効）
  const volumeNormalizationEnabled = window.getBooleanSetting('volumeNormalizationEnabled', true);
  console.log('startVolumeNormalization: 音量自動調整設定:', volumeNormalizationEnabled ? '有効' : '無効');
  
  if (!volumeNormalizationEnabled) {
    console.log('startVolumeNormalization: 音量自動調整が無効化されているため、スキップします');
    return;
  }
  
  // Web Audio APIのサポートチェック
  if (!window.AudioContext && !window.webkitAudioContext) {
    console.warn('startVolumeNormalization: Web Audio APIがサポートされていません。従来の音量監視にフォールバックします');
    startLegacyVolumeNormalization();
    return;
  }
  
  // 動画要素を待って音声レベル監視を開始する関数
  if (typeof window.waitForElement !== 'function') {
    setTimeout(startVolumeNormalization, 100);
    return;
  }
  
  window.waitForElement('video', (video) => {
    console.log('startVolumeNormalization: 動画要素が見つかりました。実際の音声レベル監視を開始します');
    
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
        console.log('startVolumeNormalization: 動画に音声トラックがありません。従来の音量監視にフォールバックします');
        startLegacyVolumeNormalization();
        return;
      }
      microphone = audioContext.createMediaStreamSource(stream);
    } catch (error) {
      console.error('startVolumeNormalization: 音声ストリームの取得に失敗しました:', error);
      console.log('startVolumeNormalization: 従来の音量監視にフォールバックします');
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
        console.log('startVolumeNormalization: 実際の音声レベルの急激な変化を検出:', {
          previous: lastAudioLevel.toFixed(3),
          current: currentAudioLevel.toFixed(3),
          change: audioLevelChange.toFixed(3),
          previousDb: toDecibels(lastAudioLevel).toFixed(1),
          currentDb: currentDecibels.toFixed(1)
        });
        
        // 音声レベルが高すぎる場合は動画の音量を下げる
        if (currentAudioLevel > 0.7) {
          const targetVolume = Math.max(0.1, video.volume * 0.8);
          adjustVolumeGradually(video, video.volume, targetVolume);
          console.log('startVolumeNormalization: 音声レベルが高すぎるため音量を調整:', video.volume.toFixed(2), '→', targetVolume.toFixed(2));
        }
      }
      
      // 平均音声レベルが基準を超えた場合（0.6以上）
      if (averageAudioLevel > 0.6 && audioLevelHistory.length >= 10) {
        console.log('startVolumeNormalization: 平均音声レベルが高すぎます:', {
          level: averageAudioLevel.toFixed(3),
          decibels: averageDecibels.toFixed(1)
        });
        
        // 動画の音量を下げる
        const targetVolume = Math.max(0.1, video.volume * 0.7);
        adjustVolumeGradually(video, video.volume, targetVolume);
      }
      
      // 音声レベルが低すぎる場合（0.1以下）で動画の音量が低い場合は上げる
      if (currentAudioLevel < 0.1 && video.volume < 0.5) {
        const targetVolume = Math.min(1, video.volume * 1.2);
        adjustVolumeGradually(video, video.volume, targetVolume);
        console.log('startVolumeNormalization: 音声レベルが低すぎるため音量を調整:', video.volume.toFixed(2), '→', targetVolume.toFixed(2));
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
      console.log('startVolumeNormalization: 実際の音声レベル監視を停止しました');
    };
  });
}

// ラジオ番組判定関数
async function checkIfRadioProgram() {
  console.log('checkIfRadioProgram: ラジオ番組判定を開始します');
  
  try {
    // 現在の動画IDを取得
    const currentVideoId = getCurrentVideoId();
    if (!currentVideoId) {
      console.log('checkIfRadioProgram: 動画IDを取得できませんでした');
      return;
    }
    
    console.log('checkIfRadioProgram: 現在の動画ID:', currentVideoId);
    
    // 動画の詳細情報を取得
    const videoData = await getVideoData(currentVideoId);
    if (!videoData) {
      console.log('checkIfRadioProgram: 動画データを取得できませんでした');
      return;
    }
    
    console.log('checkIfRadioProgram: 取得した動画データ:', {
      contentId: videoData.contentId,
      categoryId: videoData.categoryId,
      title: videoData.title,
      summary: videoData.summary
    });
    
    // 動画データからカテゴリIDを取得
    const categoryId = videoData.categoryId;
    if (!categoryId) {
      console.log('checkIfRadioProgram: 動画データからカテゴリIDを取得できませんでした');
      return;
    }
    
    console.log('checkIfRadioProgram: 動画のカテゴリID:', categoryId);
    
    // カテゴリデータを取得
    const categories = await window.getCategoriesData();
    if (!categories || !Array.isArray(categories)) {
      console.log('checkIfRadioProgram: カテゴリデータを取得できませんでした');
      return;
    }
    
    // カテゴリIDに対応するカテゴリを検索
    const currentCategory = categories.find(cat => cat.categoryId === categoryId);
    
    if (!currentCategory) {
      console.log('checkIfRadioProgram: カテゴリIDに対応するカテゴリが見つかりませんでした');
      return;
    }
    
    console.log('checkIfRadioProgram: 見つかったカテゴリ:', {
      categoryId: currentCategory.categoryId,
      name: currentCategory.name,
      summary: currentCategory.summary
    });
    
    // summary欄でラジオ番組かどうかを判定
    const isRadio = currentCategory.summary && (
      currentCategory.summary.startsWith('(ラジオ')
    );
    
    if (isRadio) {
      // 字幕付きラジオ番組かどうかを判定
      const hasSubtitles = currentCategory.summary.includes('・字幕');
      
      console.log('🎵 checkIfRadioProgram: 【ラジオ番組】を検出しました！');
      console.log('checkIfRadioProgram: カテゴリ名:', currentCategory.name);
      console.log('checkIfRadioProgram: サマリー:', currentCategory.summary);
      console.log('checkIfRadioProgram: 字幕付き:', hasSubtitles ? 'はい' : 'いいえ');
      
      // ラジオ番組であることをグローバル変数に保存
      window.isRadioProgram = true;
      window.isRadioWithSubtitles = hasSubtitles;
      
      // 字幕付きでない場合のみUI表示
      if (!hasSubtitles) {
        console.log('checkIfRadioProgram: 字幕なしラジオ番組のため、専用UIを表示します');
        showRadioProgramUI();
      } else {
        console.log('checkIfRadioProgram: 字幕付きラジオ番組のため、専用UIは表示しません（字幕が表示されるため）');
      }
    } else {
      console.log('📺 checkIfRadioProgram: 【通常の動画】です');
      window.isRadioProgram = false;
      window.isRadioWithSubtitles = false;
    }
    
  } catch (error) {
    console.error('checkIfRadioProgram: ラジオ番組判定でエラーが発生しました:', error);
  }
}

// 動画データを取得する関数
async function getVideoData(contentId) {
  console.log('getVideoData: 動画データを取得します。contentId:', contentId);
  
  try {
    // 動画の詳細情報を取得するAPI
    const response = await fetch(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${contentId}`);
    
    if (!response.ok) {
      console.error('getVideoData: APIレスポンスエラー:', response.status, response.statusText);
      return null;
    }
    
    const videoData = await response.json();
    console.log('getVideoData: 動画データ取得成功:', videoData);
    
    return videoData;
    
  } catch (error) {
    console.error('getVideoData: 動画データ取得でエラーが発生しました:', error);
    return null;
  }
}

// ラジオ番組用のUI表示関数
function showRadioProgramUI() {
  console.log('showRadioProgramUI: ラジオ番組用UIを表示します');
  
  // 既にラジオ番組UIが表示されている場合は何もしない
  if (document.getElementById('radio-program-ui')) {
    return;
  }
  
  // 動画要素を待ってUIを挿入
  if (typeof window.waitForElement !== 'function') {
    setTimeout(showRadioProgramUI, 100);
    return;
  }
  
  window.waitForElement('video', (video) => {
    console.log('showRadioProgramUI: 動画要素が見つかりました。ラジオ番組用UIを挿入します');
    
    // ラジオ番組用のUI要素を作成
    const radioUI = document.createElement('div');
    radioUI.id = 'radio-program-ui';
    radioUI.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      z-index: 1000;
      font-family: 'Arial', sans-serif;
      min-width: 300px;
    `;
    
    radioUI.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 10px;">🎵</div>
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">ラジオ番組</div>
      <div style="font-size: 14px; opacity: 0.8;">音声のみの番組です</div>
    `;
    
    // 動画要素の親要素に挿入
    const videoContainer = video.parentElement;
    if (videoContainer) {
      videoContainer.style.position = 'relative';
      videoContainer.appendChild(radioUI);
      
      console.log('showRadioProgramUI: ラジオ番組用UIを挿入しました');
    } else {
      console.error('showRadioProgramUI: 動画要素の親要素が見つかりませんでした');
    }
  });
}

// 従来の音量監視（フォールバック用）
function startLegacyVolumeNormalization() {
  console.log('startLegacyVolumeNormalization: 従来の音量監視を開始します');
  
  if (typeof window.waitForElement !== 'function') {
    setTimeout(startLegacyVolumeNormalization, 100);
    return;
  }
  
  window.waitForElement('video', (video) => {
    console.log('startLegacyVolumeNormalization: 動画要素が見つかりました。従来の音量監視を開始します');
    
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
        console.log('startLegacyVolumeNormalization: 音量の急激な変化を検出:', {
          previous: lastVolume.toFixed(2),
          current: currentVolume.toFixed(2),
          change: volumeChange.toFixed(2)
        });
        
        // 音量を徐々に調整
        normalizeVolume(video, lastVolume, currentVolume);
      }
      
      // 平均音量が基準を超えた場合（0.8以上）
      if (averageVolume > 0.8 && volumeHistory.length >= 5) {
        console.log('startLegacyVolumeNormalization: 平均音量が高すぎます:', averageVolume.toFixed(2));
        
        // 音量を下げる
        const targetVolume = Math.min(currentVolume * 0.7, 0.6);
        adjustVolumeGradually(video, currentVolume, targetVolume);
      }
      
      lastVolume = currentVolume;
    }, monitorInterval);
    
    // 監視を停止する関数を返す
    return () => {
      clearInterval(volumeMonitor);
      console.log('startLegacyVolumeNormalization: 従来の音量監視を停止しました');
    };
  });
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
window.startLegacyVolumeNormalization = startLegacyVolumeNormalization;
window.normalizeVolume = normalizeVolume;
window.adjustVolumeGradually = adjustVolumeGradually;
window.checkIfRadioProgram = checkIfRadioProgram;
window.showRadioProgramUI = showRadioProgramUI;
window.getVideoData = getVideoData;

// TODO: ラジオ番組のAI自動字幕生成機能を実装すること。
//   - AI字幕生成時は、プロンプトに「動画の概要」「放送大学の講義であること」「コース名」などの背景情報を付加する必要があるかもしれない点に注意。
