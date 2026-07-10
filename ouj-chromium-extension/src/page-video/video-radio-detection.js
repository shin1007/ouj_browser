const captionUi = "字幕が利用可能です"
const noCaptionUi = "字幕なし"

async function isTvSize(){
  const title = await new Promise(resolve => window.waitForElement('#content-detail-area > div.title', resolve, { timeout: 3000 }));

  const styleElement = await new Promise(resolve => window.waitForElement('style.vjs-styles-dimensions', resolve, { timeout: 3000 }));
    
  // textContent の中身が出るまで最大3秒間待機
  const styleContent = await new Promise(resolve => {
    const start = Date.now();
    const check = () => {
      if (styleElement.textContent && styleElement.textContent.trim() !== '') {
        resolve(styleElement.textContent);
      } else if (Date.now() - start > 3000) {
        resolve('');
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });

  if (!styleContent) {
    return false;
  }

  // widthが300px以下の場合にラジオと判定
  const widthMatch = styleContent.match(/width:\s*(\d+)px;/);
  if (widthMatch && parseInt(widthMatch[1], 10) <= 300) {
    return false;
  } 
  return true;
}
// contentIdを省略した場合は現在再生中の動画を対象にする（従来通りの挙動）。
// 検索結果一覧など、プレイヤー以外のページから任意の動画を判定したい場合はcontentIdを明示的に渡す。
async function isRadioProgram(contentId) {
  const isExplicitContentId = contentId !== undefined && contentId !== null;
  const currentVideoId = isExplicitContentId ? contentId : window.getCurrentContentId();
  if (!currentVideoId) return false;

  // 動画IDから現在のカテゴリデータを取得
  const currentCategory = await window.getCategoryDataFromContentId(currentVideoId);
  if (!currentCategory) return false;
  // ラジオ番組の字幕付加実験のカテゴリはテレビ番組扱いとする。
  // grandParentCategoryNameから判断（parentだと教養学部か大学院になる。）
  const parentId = currentCategory.parentId;
  const grandParentCategoryName = await window.getParentCategoryName(parentId);
  if (grandParentCategoryName && grandParentCategoryName.includes('ラジオ番組の字幕付加実験')) {
    return false;
  }

  // summary欄の情報はカテゴリメタデータであり、動画プレイヤーのサイズより信頼できるため優先する
  // （まれにラジオ番組でも通常の動画サイズで読み込まれることがあり、サイズだけで判定すると誤判定になるため）
  if (currentCategory.summary && currentCategory.summary.startsWith('(ラジオ')) {
    return true;
  }

  // isTvSize()は動画プレイヤーページ専用のDOM(#content-detail-area, vjs-styles-dimensions)を
  // 最大3秒待つ処理のため、他の動画のcontentIdを明示的に指定した呼び出し（検索結果一覧など）
  // では使わず、summaryに記載がなければテレビ番組として扱う。
  if (isExplicitContentId) {
    return false;
  }

  // summaryにラジオの記載がない場合は、動画用サイズでなければラジオとみなす
  return !(await isTvSize());
}
async function isCaptionAvailable(contentId) {
    // 現在の動画IDを取得（contentId省略時は現在再生中の動画）
    const currentVideoId = (contentId !== undefined && contentId !== null) ? contentId : window.getCurrentContentId();
    if (!currentVideoId) return false;

    // 動画IDから現在のカテゴリデータを取得
    const currentCategory = await window.getCategoryDataFromContentId(currentVideoId);
    if (!currentCategory) return false;

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
      top: 35%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 1px;
      border-radius: 5px;
      text-align: center;
      z-index: 1000;
      font-family: 'Arial', sans-serif;
      min-width: 150px;
    `;
    
    (async () => {
      const captionAvailable = await isCaptionAvailable();
      const inner = "rgb(1,116,193)";
      // const outer = "rgb(234,246,255)";
      const outer = "rgb(1,116,193, 0.7)";
      const outerPixel = "0.5px";
      radioUI.innerHTML = `
        <div style="font-size: 28px; 
        margin-bottom: 5px; 
        color: ${inner}; 
        text-shadow:
          ${outerPixel} ${outerPixel} 1px ${outer},   /* 右下 */
          -${outerPixel} ${outerPixel} 1px ${outer},  /* 左下 */
          ${outerPixel} -${outerPixel} 1px ${outer},  /* 右上 */
          -${outerPixel} -${outerPixel} 1px ${outer}, /* 左上 */
          ${outerPixel} 0px 1px ${outer},   /* 右 */
          -${outerPixel} 0px 1px ${outer},  /* 左 */
          0px -${outerPixel} 1px ${outer};  /* 上 */;
        ">♬</div>
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">ラジオ番組</div>
        <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">${await captionAvailable ? captionUi : noCaptionUi}</div>
      `;
    })();
          // 0px ${outerPixel} 1px ${outer},   /* 下 */
    
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
window.isCaptionAvailable = isCaptionAvailable;
