const captionUi = "字幕が利用可能です"
const noCaptionUi = "字幕なし"


async function isRadioProgram() {
    // 現在の動画IDを取得
    const currentVideoId = window.getCurrentContentId();
    if (!currentVideoId) return False;
    
    // 動画IDから現在のカテゴリデータを取得
    const currentCategory = await window.getCategoryDataFromContentId(currentVideoId);
    if (!currentCategory) return False;
    
    // summary欄でラジオ番組かどうかを判定
    const isRadio = currentCategory.summary && (
      currentCategory.summary.startsWith('(ラジオ')
    );
    return isRadio;
}
async function isCaptionAvailable() {
    // 現在の動画IDを取得
    const currentVideoId = window.getCurrentContentId();
    if (!currentVideoId) return False;
    
    // 動画IDから現在のカテゴリデータを取得
    const currentCategory = await window.getCategoryDataFromContentId(currentVideoId);
    if (!currentCategory) return False;
    
    // summary欄でラジオ番組かどうかを判定
    const isCaptionAvailable = currentCategory.summary && (
      currentCategory.summary.startsWith('(ラジオ・字幕')
    );
    return isCaptionAvailable;
}
// ラジオ番組判定関数
async function checkIfRadioProgram() {
  try {
    // ラジオ番組はUIを表示
    if (await isRadioProgram()) {
      showRadioProgramUI();
    // テレビ番組の場合は何もしない
    } else {
    }    
  } catch (error) {
    // console.error('checkIfRadioProgram: ラジオ番組判定でエラーが発生しました:', error);
  }
}


// ラジオ番組用のUI表示関数
function showRadioProgramUI() {
  
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
    
    // ラジオ番組用のUI要素を作成
    const radioUI = document.createElement('div');
    radioUI.id = 'radio-program-ui';
    radioUI.style.cssText = `
      position: absolute;
      top: 37%;
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
    
    (async () => {
      const captionAvailable = await isCaptionAvailable();
      radioUI.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 10px; color: rgb(235,247,255);">♫</div>
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">ラジオ番組</div>
        <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">${await captionAvailable ? captionUi : noCaptionUi}</div>
      `;
    })();
    
    // 動画要素の親要素に挿入
    const videoContainer = video.parentElement;
    if (videoContainer) {
      videoContainer.style.position = 'relative';
      videoContainer.appendChild(radioUI);
      
    } else {
      console.error('showRadioProgramUI: 動画要素の親要素が見つかりませんでした');
    }
  });
}

// グローバル関数として公開
window.checkIfRadioProgram = checkIfRadioProgram;
window.showRadioProgramUI = showRadioProgramUI;
window.isRadioProgram = isRadioProgram;
