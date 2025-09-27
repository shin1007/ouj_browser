// グローバル変数として次の動画IDを保持
let nextVideoId = null;

// --- 追加: グローバル変数 ---
window.videoListInCourse = null;
window.currentVideoIndexInCourse = null;
window.nextVideoId = nextVideoId; // グローバルアクセス用

// 動画再生画面の初期化関数（最初に呼ばれる）
async function initializeVideoPlayer() {
  // 再入防止
  if (window.isInitializingVideo === true) {
    return;
  }
  window.isInitializingVideo = true;

  // ページ遷移がちゃんと終了しているかを確認する。
  // URLの変化だけではなく、動画タイトルがHTML内にあるかどうかを確認するのが有用そう。
  const contentId = window.getCurrentVideoId();

  const categoryData = await window.getCategoryDataFromContentId(contentId);
  if (categoryData === null) {
    console.log("initializeVideoPlayer: categoryData is null")
    await window.handleHomePageAutoLogin();
    return;
  }
  const videos = await window.getVideoListInCategory(categoryData.categoryId);
  let videoTitle = ''
  for (const video of videos) {
    if (String(video.contentId) === String(contentId)) {
      // 見つかった
      videoTitle = video.title;
      break;
    }
  }
  if (videoTitle){
    const titleElement = document.querySelector('#content-detail-area > div.title');
    if (!titleElement || !titleElement.textContent.includes(videoTitle)) {
      // タイトルがまだ反映されていない
      window.isInitializingVideo = false;
      // 未ログインの場合はログインページに行く
      pageChange = window.tryPushLoginButton();
      if (!pageChange){
        setTimeout(initializeVideoPlayer, 500);
      }
      return;
    }
  }
  
  // videoタグの出現を監視し、出現した瞬間に設定パネルを挿入
  waitForVideoElementAndInsertPanel();
  
  // 動画ページのcontentIdを取得し、履歴に追加
  const url = window.location.href;
  const matchCo = url.match(/co=(\d+)/);
  if (matchCo) {
    addHistoryEntry(matchCo[1]);
  }
    
  // ラジオ番組判定を実行
  await checkIfRadioProgram();
    
  // 次の動画IDを取得
  await fetchNextVideoId();
  window.startVideoEndMonitoring();
  
  // エンディング検出、動画の最初と最後のスキップ機能を開始
  window.StartPlaybackManagement(); 

  // 動画自動再生設定の取得
  const autoPlayEnabled = window.getBooleanSetting ? window.getBooleanSetting('autoPlayEnabled', false) : false;

  // videoタグが存在する場合は自動再生
  // 存在するまで待つ
  window.waitForElement('video', (video) => {
    if (video){
      // 自動再生設定が有効な場合は再生
      if (autoPlayEnabled) {
        video.autoplay = true;
      }
    }  }, { timeout: 3000 });
  window.isInitializingVideo = false; 
}

// videoタグの出現を監視し、出現したら設定パネルを挿入する
function waitForVideoElementAndInsertPanel() {
  window.waitForElement('video', (video) => {
    window.addVideoSettingsPanel();
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
    const setting = window.getSetting('nextVideoSetting', 'same-course');
    if (setting === 'same-course') {
      await fetchNextVideoFromSameCourse(currentCourseId, currentVideoId);
    } else if (setting === 'favorites-random') {
      await fetchNextVideoFromFavorites();
    }
  } else {
    console.warn('[動画] fetchNextVideoId: URLから科目IDまたは動画IDを取得できません', url);
    nextVideoId = null;
    window.nextVideoId = nextVideoId;
  }
}

// 同じ科目の中で次の動画を取得
async function fetchNextVideoFromSameCourse(currentCourseId, currentVideoId) {
  try {
    const res = await window.getVideoListInCategory(currentCourseId);
    window.videoListInCourse = Array.isArray(res) ? res : null;
    window.currentVideoIndexInCourse = null;
    if (!Array.isArray(res)) {
      console.error('[動画] fetchNextVideoFromSameCourse: fetchWithCacheの返り値が配列でない', res);
    }
    if (Array.isArray(res) && res.length > 0) {
      const currentVideoIndex = res.findIndex(item => String(item.contentId) === String(currentVideoId));
      window.currentVideoIndexInCourse = currentVideoIndex;
      if (currentVideoIndex !== -1) {
        const nextVideoIndex = currentVideoIndex + 1;
        if (nextVideoIndex < res.length) {
          nextVideoId = res[nextVideoIndex].contentId;
          window.nextVideoId = nextVideoId;
          window.nextVideoCategoryId = null;
        } else {
          nextVideoId = null;
          window.nextVideoId = nextVideoId;
          window.nextVideoCategoryId = null;
        }
      } else {
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
    
    if (favorites.length === 0) {
      nextVideoId = null;
      window.nextVideoId = nextVideoId;
      return;
    }
    
    // 各お気に入り科目の未再生動画を取得
    const availableVideos = await getAvailableVideosFromFavorites(favorites);
    
    
    if (availableVideos.length === 0) {
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

// お気に入り科目から未再生動画を取得する関数
async function getAvailableVideosFromFavorites(favorites) {
  const availableVideos = [];
  const currentVideoId = getCurrentVideoId();
  
  for (const favoriteId of favorites) {
    try {
      
      // 科目の動画リストを取得
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
// 履歴をlocalStorageに保存する関数
async function addHistoryEntry(contentId) {
  if (!contentId) return;
  // 最近の履歴追加をチェック（5秒以内の同じcontentIdは無視）
  const lastHistoryKey = `lastHistory_${contentId}`;
  const lastHistoryTime = window.getSetting(lastHistoryKey, 0);
  const now = Date.now();
  if (now - lastHistoryTime < 5000) {
    return;
  }
  const entry = {
    contentId,
    date: new Date().toISOString(),
  };
  let history = [];
  try {
    history = window.getSetting('history', []);
  } catch (e) {
    history = [];
  }
  // 既存の同じcontentIdは削除（重複防止）
  history = history.filter(item => item.contentId !== contentId);
  // 先頭に追加
  history.unshift(entry);
  // 最大30件まで
  if (history.length > 30) history = history.slice(0, 30);
  let saveResult = window.saveSetting('history', history);
  window.saveSetting(lastHistoryKey, now);
  // ★履歴追加時におすすめリストをプリフェッチ
  // TODO: 反映タイミングをより早くする改善の余地あり
  if (saveResult && typeof saveResult.then === 'function') {
    saveResult.then(() => {
      window.prefetchRecommendListData();
    });
  } else {
    window.prefetchRecommendListData();
  }
}


// グローバル関数として公開
window.getNextVideoId = () => window.nextVideoId;
window.initializeVideoPlayer = initializeVideoPlayer;
window.fetchNextVideoId = fetchNextVideoId;
window.fetchNextVideoFromSameCourse = fetchNextVideoFromSameCourse;
window.fetchNextVideoFromFavorites = fetchNextVideoFromFavorites;
window.getAvailableVideosFromFavorites = getAvailableVideosFromFavorites;
window.getCurrentVideoId = getCurrentVideoId; 