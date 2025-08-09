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
    const savedSetting = window.getSetting('nextVideoSetting', 'same-course');
    const autoNextVideoEnabled = window.getBooleanSetting('autoNextVideoEnabled', true);
    const playbackSpeed = window.getSetting('playbackSpeed', '1');
    const volumeNormalizationEnabled = window.getBooleanSetting('volumeNormalizationEnabled', true);
      
      panel.innerHTML = `
        <div style="display: flex; flex-direction: row; gap: 24px; align-items: flex-start;">
          <!-- 左カラム: 設定項目 -->
          <div style="flex: 1 1 0; min-width: 260px;">
            <div style='margin-bottom: 8px;'>
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
          <!-- 右カラム: キーボードショートカット説明 -->
          <div style="flex: 1 1 0; min-width: 260px; max-width: 400px;">
            <div style="margin-bottom: 10px; font-weight: bold; color: #1976d2; font-size: 17px; background: #e3f2fd; border-radius: 6px; padding: 8px 0; text-align: center;">
              ▶️ <b>Enter</b> または <b>Space</b> キーで再生できます
            </div>
            <div id="shortcut-help-panel" style="display:block; margin-bottom: 10px;">
              <div style="font-weight: bold; color: #333; text-decoration: underline; margin-bottom:10px;">キーボードショートカット</div>
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
            </div>
          </div>
        </div>
      `;
            // <div style='margin-bottom: 8px;'>
            //   <input type="checkbox" id="volume-normalization" ${volumeNormalizationEnabled ? 'checked' : ''}>
            //   <label for="volume-normalization" style="margin-left: 5px; cursor: pointer; color: #333;">音量の自動調整<span style="font-size: 11px; color: #666;">（実際の音声レベルを測定してOPEDや場面転換時の音量急上昇を緩やかにする）</span></label>
            // </div>
      
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
      
      // const volumeNormalizationCheckbox = panel.querySelector('#volume-normalization');
      // if (volumeNormalizationCheckbox) {
      //   volumeNormalizationCheckbox.addEventListener('change', (event) => {
      //     const enabled = event.target.checked;
      //     window.saveSetting('volumeNormalizationEnabled', enabled);
      //     // console.log('addVideoSettingsPanel: 音量自動調整設定を保存しました:', enabled);
      //   });
      // }
      
      // 再生速度設定のイベントリスナーを追加
      const playbackSpeedSelect = panel.querySelector('#playback-speed');
      if (playbackSpeedSelect) {
        playbackSpeedSelect.addEventListener('change', (event) => {
          const speed = event.target.value;
          window.saveSetting('playbackSpeed', speed);
          // console.log('addVideoSettingsPanel: 再生速度設定を保存しました:', speed);
          
          // 現在再生中の動画に即座に適用
          // applyPlaybackSpeed(parseFloat(speed));
        });
      }
      
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