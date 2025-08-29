// 動画終了監視機能
function startVideoEndMonitoring() {
  if (typeof window.waitForElement !== 'function') {
    setTimeout(startVideoEndMonitoring, 100);
    return;
  }
  window.waitForElement('video', (v) => {
    video = v;
  });

  // 動画終了時に次の動画へスキップ
  // 2秒間通知を出した後に次の動画に移る
  const autoNextVideoEnabled = window.getBooleanSetting('autoNextVideoEnabled', true);
  if (!autoNextVideoEnabled) {
    return;
  }
  const handleVideoEnded = () => {
    if (window.nextVideoId) {
      showVideoEndNotification();
      setTimeout(() => {
        window.skipToNextVideo();
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

window.startVideoEndMonitoring = startVideoEndMonitoring;