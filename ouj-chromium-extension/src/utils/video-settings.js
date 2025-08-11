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
    // --- 追加: 前後動画リンク挿入（パネルより先に） ---
    insertPrevNextLinks(targetElement);
    // console.log('addVideoSettingsPanel: 対象要素が見つかりました: #content-detail-area > div.title');
    
    // 共通関数の存在をチェック
    if (typeof window.getSetting !== 'function' || typeof window.getBooleanSetting !== 'function') {
      setTimeout(addVideoSettingsPanel, 100);
      return;
    }
    
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
    // TODO 字幕の自動表示（テレビ番組）
    // TODO 字幕の自動表示（ラジオ番組）
  const savedSetting = window.getSetting('nextVideoSetting', 'same-course');
  const autoNextVideoEnabled = window.getBooleanSetting('autoNextVideoEnabled', true);
  const volumeNormalizationEnabled = window.getBooleanSetting('volumeNormalizationEnabled', true);
      
      panel.innerHTML = `
        <div style="display: flex; flex-direction: row; gap: 24px; align-items: flex-start;">
          <!-- 左カラム: 設定項目 -->
          <div style="flex: 1 1 0; min-width: 260px;">
            <div style='margin-bottom: 8px;'>
              <input type="checkbox" id="auto-caption-tv" ${window.getSetting('autoCaptionEnabledTV', 'true') === 'true' ? 'checked' : ''}>
              <label for="auto-caption-tv" style="margin-left: 5px; cursor: pointer; color: #333;">字幕を表示する（テレビ番組）</label>
            </div>
            <div style='margin-bottom: 8px;'>
              <input type="checkbox" id="auto-caption-radio" ${window.getSetting('autoCaptionEnabledRadio', 'true') === 'true' ? 'checked' : ''}>
              <label for="auto-caption-radio" style="margin-left: 5px; cursor: pointer; color: #333;">字幕を表示する（ラジオ番組）</label>
            </div>
            <hr style="margin: 15px 0; border: none; border-top: 2px solid #bbb;"> <!-- ここで区切る -->
            <div style='margin-bottom: 8px;'>
              <input type="checkbox" id="auto-next-video" ${autoNextVideoEnabled ? 'checked' : ''}>
              <label for="auto-next-video" style="margin-left: 5px; cursor: pointer; color: #333;">動画終了時に自動で次の動画に進む</label>
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
            <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">
            <div style="margin-top: 10px; font-size: 12px; color: #666;">
              設定は自動的に保存されます
            </div>
          </div>
          <!-- 分割バー -->
          <div style="width: 1px; background: #ccc; height: 100%; min-height: 320px; margin: 0 8px; align-self: stretch;"></div>
          <!-- 右カラム: キーボードショートカット説明（削除済み） -->
        </div>
      `;
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
          // console.log('addVideoSettingsPanel: 次の動画設定を保存しました:', setting);
        });
      });
      
      // チェックボックスのイベントリスナーを追加（auto-next-video, volume-normalizationのみ）
      const autoNextVideoCheckbox = panel.querySelector('#auto-next-video');
      if (autoNextVideoCheckbox) {
        autoNextVideoCheckbox.addEventListener('change', (event) => {
          const enabled = event.target.checked;
          window.saveSetting('autoNextVideoEnabled', enabled);
          // console.log('addVideoSettingsPanel: 自動次の動画遷移設定を保存しました:', enabled);
        });
      }
      
      const radioCaptionCheckbox = panel.querySelector('#auto-caption-radio');
      if (radioCaptionCheckbox) {
        radioCaptionCheckbox.addEventListener('change', (event) => {
          const enabled = event.target.checked;
          window.saveSetting('autoCaptionEnabledRadio', enabled);
          window.toggleSubtitle();
          console.log('addVideoSettingsPanel: ラジオ番組の字幕自動表示設定を保存しました:', enabled);
        });
      }
  // ...再生速度関連のイベントリスナー削除...
      
      // 設定パネルは必ず前後リンクの後に来るように挿入
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
      // console.log('addVideoSettingsPanel: 動画設定パネルを追加しました');
    });
}

// グローバル関数として公開
window.addVideoSettingsPanel = addVideoSettingsPanel; 