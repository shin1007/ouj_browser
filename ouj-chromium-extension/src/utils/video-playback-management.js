let initialPosition = 0;

// 動画の再生管理機能
function StartPlaybackManagement() {  
  window.waitForElement('video', (v) => {
    const video = v;
  });
  // TODO: オープニングスキップがうまくいかない
  // skipOpening(video);
  initialPosition = video.currentTime;
  const skipEnd = window.getSetting ? window.getSetting('skipEndSeconds', 0) : 0;

  i = 0;  
  const interval = setInterval(() => {

    // 15秒に1回、動画を一時停止してから再生することで、再生ログを残せるようにする
    if (i % 15 === 0) {
      sendPlayLog(video);
      i = 0; // カウンタをリセット
    }


    // エンディングのスキップ
    if (video.currentTime > video.duration - skipEnd) {
      // 再生ボタンが押されてから5秒以上が経過している場合のみ
      if (video.currentTime - initialPosition < 5) {
        return;
      }
      // 動画が再生中の場合のみ
      if (!video.paused) {
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
window.skipToNextVideo = skipToNextVideo;