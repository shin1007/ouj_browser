// 再生速度を適用する関数
function applyPlaybackSpeed(speed) {
  const video = document.querySelector('video');
  if (video) {
    try {
      video.playbackRate = speed;
      // console.log('applyPlaybackSpeed: 再生速度を設定しました:', speed);
      
      // 再生速度変更通知を表示
      showPlaybackSpeedNotification(speed);
    } catch (error) {
      console.error('applyPlaybackSpeed: 再生速度の設定に失敗しました:', error);
    }
  } else {
    // console.log('applyPlaybackSpeed: 動画要素が見つかりません');
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
    // console.log('applySavedPlaybackSpeed: 保存された再生速度を適用します:', speed);
    
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
        
        // console.log('setupPlaybackSpeedShortcuts: キーボードショートカットで再生速度を変更しました:', newSpeed);
      }
    }
    
    // スペースキーで再生/一時停止
    if (event.code === 'Space' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      if (video.paused) {
        video.play().then(() => {
          // console.log('setupPlaybackSpeedShortcuts: スペースキーで再生しました');
        }).catch(error => {
          console.error('setupPlaybackSpeedShortcuts: 再生に失敗しました:', error);
        });
      } else {
        video.pause();
        // console.log('setupPlaybackSpeedShortcuts: スペースキーで一時停止しました');
      }
    }
    
    // 左右矢印キーでシーク（10秒前後）
    if (event.code === 'ArrowLeft' && !event.ctrlKey && !event.altKey) {
      const seekTime = event.shiftKey ? 30 : 10; // Shift + 左矢印で30秒、通常で10秒
      video.currentTime = Math.max(0, video.currentTime - seekTime);
      // console.log(`setupPlaybackSpeedShortcuts: 左矢印キーで${seekTime}秒戻しました`);
    }
    
    if (event.code === 'ArrowRight' && !event.ctrlKey && !event.altKey) {
      const seekTime = event.shiftKey ? 30 : 10; // Shift + 右矢印で30秒、通常で10秒
      video.currentTime = Math.min(video.duration, video.currentTime + seekTime);
      // console.log(`setupPlaybackSpeedShortcuts: 右矢印キーで${seekTime}秒進めました`);
    }
    
    // 上下矢印キーで音量調整
    if (event.code === 'ArrowUp' && !event.ctrlKey && !event.altKey) {
      const volumeChange = event.shiftKey ? 0.1 : 0.05; // Shift + 上矢印で10%、通常で5%
      video.volume = Math.min(1, video.volume + volumeChange);
      // console.log(`setupPlaybackSpeedShortcuts: 上矢印キーで音量を上げました: ${(video.volume * 100).toFixed(0)}%`);
    }
    
    if (event.code === 'ArrowDown' && !event.ctrlKey && !event.altKey) {
      const volumeChange = event.shiftKey ? 0.1 : 0.05; // Shift + 下矢印で10%、通常で5%
      video.volume = Math.max(0, video.volume - volumeChange);
      // console.log(`setupPlaybackSpeedShortcuts: 下矢印キーで音量を下げました: ${(video.volume * 100).toFixed(0)}%`);
    }
    
    // Mキーでミュート切り替え
    if (event.key.toLowerCase() === 'm' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      video.muted = !video.muted;
      // console.log(`setupPlaybackSpeedShortcuts: Mキーでミュートを${video.muted ? 'ON' : 'OFF'}にしました`);
    }
    
    // Fキーでフルスクリーン切り替え
    if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      if (document.fullscreenElement) {
        document.exitFullscreen();
        // console.log('setupPlaybackSpeedShortcuts: Fキーでフルスクリーンを解除しました');
      } else {
        video.requestFullscreen();
        // console.log('setupPlaybackSpeedShortcuts: Fキーでフルスクリーンにしました');
      }
    }
    
    // 0キーで最初に戻る
    if (event.key === '0' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      video.currentTime = 0;
      // console.log('setupPlaybackSpeedShortcuts: 0キーで動画の最初に戻りました');
    }
    
    // Endキーで最後に進む
    if (event.code === 'End' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      video.currentTime = video.duration;
      // console.log('setupPlaybackSpeedShortcuts: Endキーで動画の最後に進みました');
    }
  });
}

// グローバル関数として公開
window.applyPlaybackSpeed = applyPlaybackSpeed;
window.showPlaybackSpeedNotification = showPlaybackSpeedNotification;
window.applySavedPlaybackSpeed = applySavedPlaybackSpeed;
window.setupPlaybackSpeedShortcuts = setupPlaybackSpeedShortcuts; 