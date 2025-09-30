// 動画下部に設定パネルを追加する関数
function addVideoSettingsPanel() {
  // 既にパネルが存在する場合は何もしない
  if (document.getElementById('video-settings-panel')) {
    const oldPanel = document.getElementById('video-settings-panel');
    oldPanel.remove(); // 古いパネルを削除してから再作成
  }

  // 対象要素を待って取得する関数
  if (typeof window.waitForElement !== 'function'
    || typeof window.getSetting !== 'function'
    || typeof window.getBooleanSetting !== 'function') {
    setTimeout(addVideoSettingsPanel, 100);
    return;
  }
  window.waitForElement('#content-detail-area > div.title', (targetElement) => {
    window.insertPrevNextLinks(targetElement);
    insertSettingsPanel(targetElement);
  });
}
function insertSettingsPanel(targetElement) {
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
    text-align: left;
  `;

  // 保存された設定を取得
  const autoCaptionEnabledTV = window.getSetting('autoCaptionEnabledTV', true);
  const autoCaptionEnabledRadio = window.getSetting('autoCaptionEnabledRadio', true);
  const nextVideoMode = window.getSetting('nextVideoSetting', 'same-course');
  const autoNextVideoEnabled = window.getBooleanSetting('autoNextVideoEnabled', true);
  // 動画自動再生設定の取得
  const autoPlayEnabled = window.getBooleanSetting('autoPlayEnabled', false);

  // 新規追加設定の取得
  const skipStart = window.getSetting('skipStartSeconds', 0);
  const skipEnd = Number(window.getSetting('skipEndSeconds', 0));
  const playlogIntervalMinutes = Number(window.getSetting('playlogIntervalMinutes', 3));
  // 再生速度設定の取得
  const playbackSpeedControlEnabled = window.getBooleanSetting('playbackSpeedControlEnabled', true);
  const playbackSpeed = Number(window.getSetting('playbackSpeed', 1.0));

  // 再生速度の選択肢を生成
  let speedOptions = '';
  for (let i = 0.5; i <= 1.6; i += 0.1) {
    const speedValue = i.toFixed(1);
    // 浮動小数点数の比較誤差を考慮
    const selected = Math.abs(playbackSpeed - i) < 0.01 ? 'selected' : '';
    speedOptions += `<option value="${speedValue}" ${selected}>${speedValue}x</option>`;
  }

  panel.innerHTML = `
    <div style="display: flex; flex-direction: row; gap: 24px; align-items: flex-start;">
      <!-- 左カラム: 設定項目 -->
      <div style="flex: 1 1 0; min-width: 260px;">
        <div style='margin-bottom: 8px;'>
          <input type="checkbox" id="playback-speed-control-enabled" ${playbackSpeedControlEnabled ? 'checked' : ''}>
          <label for="playback-speed-control-enabled" style="margin-left: 5px; cursor: pointer; color: #333;">再生速度を調整する</label>
        </div>
        <div id="playback-speed-container" style="margin-bottom: 8px; display: flex; align-items: center; ${playbackSpeedControlEnabled ? '' : 'display: none;'}">
          <label for="playback-speed" style="width: 250px; color: #333;">再生速度</label>
          <select id="playback-speed" style="flex: 1;">
            ${speedOptions}
          </select>
        </div>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">

        <div style='margin-bottom: 8px;'>
          <input type="checkbox" id="auto-caption-tv" ${autoCaptionEnabledTV ? 'checked' : ''}>
          <label for="auto-caption-tv" style="margin-left: 5px; cursor: pointer; color: #333;">字幕を表示する（テレビ番組）</label>
        </div>
        <div style='margin-bottom: 8px;'>
          <input type="checkbox" id="auto-caption-radio" ${autoCaptionEnabledRadio ? 'checked' : ''}>
          <label for="auto-caption-radio" style="margin-left: 5px; cursor: pointer; color: #333;">字幕を表示する（ラジオ番組）</label>
        </div>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">

        <div style='margin-bottom: 8px;'>
          <input type="checkbox" id="auto-play-video" ${autoPlayEnabled ? 'checked' : ''}>
          <label for="auto-play-video" style="margin-left: 5px; cursor: pointer; color: #333;">可能なら動画を自動再生する</label>
        </div>
        <div style='margin-bottom: 8px;'>
          <input type="checkbox" id="auto-next-video" ${autoNextVideoEnabled ? 'checked' : ''}>
          <label for="auto-next-video" style="margin-left: 5px; cursor: pointer; color: #333;">動画終了時に自動で次の動画に進む</label>
        </div>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">

        <div style="margin-bottom: 8px;">
          <input type="radio" id="same-course" name="next-video" value="same-course" ${nextVideoMode === 'same-course' ? 'checked' : ''}>
          <label for="same-course" style="margin-left: 5px; cursor: pointer; color: #333;">同じ科目の中で次を再生</label>
        </div>
        <div style="margin-bottom: 8px;">
          <input type="radio" id="favorites-random" name="next-video" value="favorites-random" ${nextVideoMode === 'favorites-random' ? 'checked' : ''}>
          <label for="favorites-random" style="margin-left: 5px; cursor: pointer; color: #333;">お気に入りの中からランダムで次を再生</label>
        </div>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">

        <div style="margin-bottom: 8px; display: flex; align-items: center;">
          <label for="skip-end" style="width: 250px; color: #333;">動画の最後をスキップ</label>
          <select id="skip-end">
            <option value="0" ${skipEnd == 0 ? 'selected' : ''}>なし</option>
            <option value="15" ${skipEnd == 15 ? 'selected' : ''}>15秒</option>
            <option value="30" ${skipEnd == 30 ? 'selected' : ''}>30秒</option>
            <option value="45" ${skipEnd == 45 ? 'selected' : ''}>45秒</option>
            <option value="60" ${skipEnd == 60 ? 'selected' : ''}>60秒</option>
            <option value="75" ${skipEnd == 75 ? 'selected' : ''}>75秒</option>
            <option value="90" ${skipEnd == 90 ? 'selected' : ''}>90秒</option>
            <option value="105" ${skipEnd == 105 ? 'selected' : ''}>105秒</option>  
            <option value="120" ${skipEnd == 120 ? 'selected' : ''}>120秒</option>
          </select>
        </div>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">

        <div style="margin-bottom: 8px; display: flex; align-items: center;">
          <label for="playlog-interval" style="width: 250px; color: #333;">再生ログ保存頻度(一瞬止まるかも)</label>
          <select id="playlog-interval">
            <option value="3" ${playlogIntervalMinutes == 3 ? 'selected' : ''}>3分</option>
            <option value="5" ${playlogIntervalMinutes == 5 ? 'selected' : ''}>5分</option>
            <option value="10" ${playlogIntervalMinutes == 10 ? 'selected' : ''}>10分</option>
            <option value="15" ${playlogIntervalMinutes == 15 ? 'selected' : ''}>15分</option>
          </select>
        </div>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">

        
        <div style="margin-top: 10px; font-size: 12px; color: #666;">
          設定は自動的に保存されます
        </div>
      </div>
    </div>
  `;
      //   <!-- 分割バー -->
      // <div style="width: 1px; background: #ccc; height: 100%; min-height: 320px; margin: 0 8px; align-self: stretch;"></div>

  // 追加設定項目のイベントリスナー
  const skipStartSelect = panel.querySelector('#skip-start');
  if (skipStartSelect) {
    skipStartSelect.addEventListener('change', (event) => {
      window.saveSetting('skipStartSeconds', Number(event.target.value));
    });
  }
  const fadeInStartSelect = panel.querySelector('#fadein-start');
  if (fadeInStartSelect) {
    fadeInStartSelect.addEventListener('change', (event) => {
      window.saveSetting('fadeInStartSeconds', Number(event.target.value));
    });
  }
  const skipEndSelect = panel.querySelector('#skip-end');
  if (skipEndSelect) {
    skipEndSelect.addEventListener('change', (event) => {
      window.saveSetting('skipEndSeconds', Number(event.target.value));
    });
  }
  const fadeOutEndSelect = panel.querySelector('#fadeout-end');
  if (fadeOutEndSelect) {
    fadeOutEndSelect.addEventListener('change', (event) => {
      window.saveSetting('fadeOutEndSeconds', Number(event.target.value));
    });
  }
  const playlogIntervalSelect = panel.querySelector('#playlog-interval');
  if (playlogIntervalSelect) {
    playlogIntervalSelect.addEventListener('change', (event) => {
      window.saveSetting('playlogIntervalMinutes', Number(event.target.value));
    });
  }

  // 再生速度調整のイベントリスナー
  const speedControlCheckbox = panel.querySelector('#playback-speed-control-enabled');
  const speedContainer = panel.querySelector('#playback-speed-container');
  const speedSelect = panel.querySelector('#playback-speed');

  if (speedControlCheckbox) {    
    speedControlCheckbox.addEventListener('change', (event) => {
      const enabled = event.target.checked;
      window.saveSetting('playbackSpeedControlEnabled', enabled);
      if (speedContainer) {
        speedContainer.style.display = enabled ? 'flex' : 'none';
      }
      // 有効/無効に応じて再生速度を更新
      window.setPlaybackSpeed();
    });
  }

  if (speedSelect) {
    speedSelect.addEventListener('change', (event) => {
      const speed = Number(event.target.value);
      window.setPlaybackSpeed();
      window.saveSetting('playbackSpeed', speed);
    });
  }

  // 字幕自動表示チェックボックスのイベントリスナー（テレビ番組）
  const autoCaptionCheckboxTV = panel.querySelector('#auto-caption-tv');
  if (autoCaptionCheckboxTV) {
    autoCaptionCheckboxTV.addEventListener('change', (event) => {
      const enabled = event.target.checked;
      window.saveSetting('autoCaptionEnabledTV', enabled);
    });
  }
  // 字幕自動表示チェックボックスのイベントリスナー（ラジオ番組）
  const autoCaptionCheckboxRadio = panel.querySelector('#auto-caption-radio');
  if (autoCaptionCheckboxRadio) {
    autoCaptionCheckboxRadio.addEventListener('change', (event) => {
      const enabled = event.target.checked;
      window.saveSetting('autoCaptionEnabledRadio', enabled);
    });
  }

  // ラジオボタンのイベントリスナーを追加
  const radioButtons = panel.querySelectorAll('input[type="radio"]');
  radioButtons.forEach(radio => {
    radio.addEventListener('change', (event) => {
      const setting = event.target.value;
      window.saveSetting('nextVideoSetting', setting);
    });
  });

  // 自動再生チェックボックスのイベントリスナー
  const autoPlayVideoCheckbox = panel.querySelector('#auto-play-video');
  if (autoPlayVideoCheckbox) {
    autoPlayVideoCheckbox.addEventListener('change', (event) => {
      const enabled = event.target.checked;
      window.saveSetting('autoPlayEnabled', enabled);
    });
  }
  // チェックボックスのイベントリスナーを追加（auto-next-video, volume-normalizationのみ）
  const autoNextVideoCheckbox = panel.querySelector('#auto-next-video');
  if (autoNextVideoCheckbox) {
    autoNextVideoCheckbox.addEventListener('change', (event) => {
      const enabled = event.target.checked;
      window.saveSetting('autoNextVideoEnabled', enabled);
    });
  }

  const tvCaptionCheckbox = panel.querySelector('#auto-caption-tv');
  if (tvCaptionCheckbox) {
    tvCaptionCheckbox.addEventListener('change', (event) => {
      const enabled = event.target.checked;
      window.saveSetting('autoCaptionEnabledTV', enabled);
      window.toggleCaptionTv(enabled);
    });
  }

  const radioCaptionCheckbox = panel.querySelector('#auto-caption-radio');
  if (radioCaptionCheckbox) {
    radioCaptionCheckbox.addEventListener('change', (event) => {
      const enabled = event.target.checked;
      window.saveSetting('autoCaptionEnabledRadio', enabled);
      window.toggleCaptionRadio(enabled);
    });
  }
  window.showCaptionAccordingToSetting();

  // 設定パネルは前後リンクの後に来るように挿入
  if (targetElement.nextSibling && targetElement.nextSibling.id === 'prev-next-links') {
    // 既に前後リンクがある場合、その後ろにパネルを挿入
    targetElement.parentNode.insertBefore(panel, targetElement.nextSibling.nextSibling);
  } else {
    // 通常はタイトルの直後にパネルを挿入
    if (targetElement.nextSibling) {
      targetElement.parentNode.insertBefore(panel, targetElement.nextSibling);
    } else {
      targetElement.parentNode.appendChild(panel);
    }
  }
}

// グローバル関数として公開
window.addVideoSettingsPanel = addVideoSettingsPanel; 