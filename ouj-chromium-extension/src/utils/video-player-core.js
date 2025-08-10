// グローバル変数として次の動画IDを保持
let nextVideoId = null;

// --- 追加: グローバル変数 ---
window.videoListInCourse = null;
window.currentVideoIndexInCourse = null;
window.nextVideoId = nextVideoId; // グローバルアクセス用

// 動画再生画面の初期化関数（最初に呼ばれる）
async function initializeVideoPlayer() {
  // console.log('[動画] initializeVideoPlayer: 初期化開始');
  
  
  // videoタグの出現を監視し、出現した瞬間に設定パネルを挿入
  waitForVideoElementAndInsertPanel();

  
  // 動画ページのcontentIdを取得し、履歴に追加
  const url = window.location.href;
  const matchCo = url.match(/co=(\d+)/);
  if (window.addHistoryEntry && matchCo) {
    window.addHistoryEntry(matchCo[1]);
  }
    
  // ラジオ番組判定を実行
  await checkIfRadioProgram();
    
  // 音量自動調整機能を開始


  
  // 次の動画IDを取得
  await fetchNextVideoId();
  // console.log('[動画] initializeVideoPlayer: fetchNextVideoId完了, nextVideoId=', nextVideoId);
  startVideoEndMonitoring();
  // console.log('[動画] initializeVideoPlayer: startVideoEndMonitoring呼び出し');
  
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

// 次の動画IDを取得する関数
async function fetchNextVideoId() {
  const url = window.location.href;
  const matchCa = url.match(/ca=(\d+)/);
  const matchCo = url.match(/co=(\d+)/);
  if (matchCa && matchCo) {
    const currentCourseId = matchCa[1];
    const currentVideoId = matchCo[1];
    const setting = window.getSetting('nextVideoSetting', 'same-course');
    if (setting === 'same-course') {
      // console.log('[動画] fetchNextVideoId: fetchNextVideoFromSameCourse呼び出し', {currentCourseId, currentVideoId});
      await fetchNextVideoFromSameCourse(currentCourseId, currentVideoId);
    } else if (setting === 'favorites-random') {
      await fetchNextVideoFromFavorites();
    }
    // console.log('[動画] fetchNextVideoId: nextVideoId=', nextVideoId);
  } else {
    console.warn('[動画] fetchNextVideoId: URLからコースIDまたは動画IDを取得できません', url);
    nextVideoId = null;
    window.nextVideoId = nextVideoId;
  }
}

// 同じコースの中で次の動画を取得
async function fetchNextVideoFromSameCourse(currentCourseId, currentVideoId) {
  try {
    const cacheKey = `cachedVodContents_${currentCourseId}`;
    const url = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${currentCourseId}&offset=0&limit=30&sortType=1&sortOrder=asc`;
    // console.log('[動画] fetchNextVideoFromSameCourse: fetchWithCache呼び出し', {url, cacheKey});
    const res = await fetchWithCache(url, cacheKey);
    // --- 追加: グローバルに動画リストとインデックスを保持 ---
    window.videoListInCourse = Array.isArray(res) ? res : null;
    window.currentVideoIndexInCourse = null;
    if (!Array.isArray(res)) {
      console.error('[動画] fetchNextVideoFromSameCourse: fetchWithCacheの返り値が配列でない', res);
    }
    // console.log('[動画] fetchNextVideoFromSameCourse: APIレスポンス.length:', Array.isArray(res) ? res.length : 'N/A', '内容:', res);
    if (Array.isArray(res) && res.length > 0) {
      const currentVideoIndex = res.findIndex(item => String(item.contentId) === String(currentVideoId));
      window.currentVideoIndexInCourse = currentVideoIndex;
      // console.log('[動画] fetchNextVideoFromSameCourse: currentVideoId=', currentVideoId, 'currentVideoIndex=', currentVideoIndex, 'res.length=', res.length);
      if (currentVideoIndex !== -1) {
        const nextVideoIndex = currentVideoIndex + 1;
        if (nextVideoIndex < res.length) {
          nextVideoId = res[nextVideoIndex].contentId;
          window.nextVideoId = nextVideoId;
          window.nextVideoCategoryId = null;
          // console.log('[動画] fetchNextVideoFromSameCourse: 次の動画IDを設定:', nextVideoId, 'タイトル:', res[nextVideoIndex].title);
        } else {
          // console.log('[動画] fetchNextVideoFromSameCourse: 最後の動画です');
          nextVideoId = null;
          window.nextVideoId = nextVideoId;
          window.nextVideoCategoryId = null;
        }
      } else {
        // console.log('[動画] fetchNextVideoFromSameCourse: 現在の動画が見つかりません', {currentVideoId, res});
        nextVideoId = null;
        window.nextVideoId = nextVideoId;
      }
    } else {
      console.warn('[動画] fetchNextVideoFromSameCourse: APIレスポンスが空配列', {url, cacheKey, res});
      nextVideoId = null;
      window.nextVideoId = nextVideoId;
    }
  } catch (error) {
    console.error('[動画] fetchNextVideoFromSameCourse: 例外発生', error);
    nextVideoId = null;
    window.nextVideoId = nextVideoId;
  }
}

// お気に入りの中からランダムで次の動画を取得
async function fetchNextVideoFromFavorites() {
  try {
    // お気に入りリストを取得
    const favorites = window.getSetting('favorites', []);
    // console.log('fetchNextVideoFromFavorites: お気に入りリスト:', favorites);
    
    if (favorites.length === 0) {
      // console.log('fetchNextVideoFromFavorites: お気に入りがありません');
      nextVideoId = null;
      window.nextVideoId = nextVideoId;
      return;
    }
    
    // 各お気に入りコースの未再生動画を取得
    const availableVideos = await getAvailableVideosFromFavorites(favorites);
    
    
    if (availableVideos.length === 0) {
      // console.log('fetchNextVideoFromFavorites: 再生可能な動画がありません（すべて再生済み）');
      nextVideoId = null;
      window.nextVideoId = nextVideoId;
      return;
    }
    
    // ランダムに動画を選択
    const randomVideo = availableVideos[Math.floor(Math.random() * availableVideos.length)];
    nextVideoId = randomVideo.contentId;
    window.nextVideoId = nextVideoId;
    window.nextVideoCategoryId = randomVideo.categoryId;
    
    
  } catch (error) {
    console.error('fetchNextVideoFromFavorites: お気に入りからの動画取得に失敗しました:', error);
    nextVideoId = null;
    window.nextVideoId = nextVideoId;
  }
}

// 現在の動画IDを取得する関数
function getCurrentVideoId() {
  const url = window.location.href;
  const matchCo = url.match(/co=(\d+)/);
  return matchCo ? matchCo[1] : null;
}

// 動画の再生状況をチェックする関数
async function checkVideoViewingStatus(video, favoriteId) {
  try {
    // 動画の再生状況を取得（共通関数を使用）
    const viewingStatus = await window.getVideoViewingStatus(video.contentId);
    const currentTimeRate = viewingStatus.currentTimeRate;
    
    // 再生が完了していない場合（currentTimeRate < 0.95）
    if (currentTimeRate < 0.95) {
      return {
        contentId: video.contentId,
        title: video.title,
        categoryId: favoriteId,
        currentTimeRate: currentTimeRate
      };
    }
    
    return null;
    
  } catch (viewingError) {
    // 最初の動画で失敗した場合は未再生として扱う
    return {
      contentId: video.contentId,
      title: video.title,
      categoryId: favoriteId,
      currentTimeRate: 0
    };
  }
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
      
      for (const video of videos) {
        // 現在の動画の場合は再生完了として扱う
        if (video.contentId == currentVideoId) {
          continue;
        }
        
        const unfinishedVideo = await checkVideoViewingStatus(video, favoriteId);
        if (unfinishedVideo) {
          if (!firstUnfinishedVideo) {
            firstUnfinishedVideo = unfinishedVideo;
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

// グローバル関数として公開
window.getNextVideoId = () => window.nextVideoId;
window.initializeVideoPlayer = initializeVideoPlayer;
window.fetchNextVideoId = fetchNextVideoId;
window.fetchNextVideoFromSameCourse = fetchNextVideoFromSameCourse;
window.fetchNextVideoFromFavorites = fetchNextVideoFromFavorites;
window.getAvailableVideosFromFavorites = getAvailableVideosFromFavorites;
window.getCurrentVideoId = getCurrentVideoId; 