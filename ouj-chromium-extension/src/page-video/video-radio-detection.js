const captionUi = "字幕が利用可能です"
const noCaptionUi = "字幕なし"

async function isTvSize(){
  const title = await new Promise(resolve => window.waitForElement('#content-detail-area > div.title', resolve, { timeout: 3000 }));
  // TODO: ラジオ番組にもかかわらず動画として読み込まれるものに対処したいが、まだうまくできていない
  // const vjsVideo3 = await new Promise(resolve => window.waitForElement('#vjs_video_3', resolve, { timeout: 3000 }));
  // // vjsVideo3のクラスにvjs-user-inactiveが出るまで最大3秒待機
  // await new Promise(resolve => {
  //   const start = Date.now();
  //   const check = () => {
  //     if (vjsVideo3.classList.contains('vjs-user-inactive')) {
  //       console.log('vjs-user-inactive発見')
  //       resolve();
  //     } else if (Date.now() - start > 3000) {
  //       console.log('vjs-user-inactiveが見つからなかった')
  //       resolve();
  //     } else {
  //       setTimeout(check, 100);
  //     }
  //   };
  //   check();
  // });
  

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
async function isRadioProgram() {
  // 動画用のサイズであればFalseを返す
  if (await isTvSize()) return false;

  // 現在の動画IDを取得
  const currentVideoId = window.getCurrentContentId();
  if (!currentVideoId) return false;
  
  // 動画IDから現在のカテゴリデータを取得
  const currentCategory = await window.getCategoryDataFromContentId(currentVideoId);
  if (!currentCategory) return false;
  // console.log('isRadioProgram: 現在のカテゴリ', currentCategory);
  // ラジオ番組の字幕付加実験のカテゴリはテレビ番組扱いとする
  // const parentCategory = await window.getCategoryData(currentCategory.parentId);
  // console.log('isRadioProgram: 親カテゴリ', parentCategory ? parentCategory.name : '不明');
  // if (parentCategory && "ラジオ番組の字幕付加実験" in parentCategory.name) {
  //   return false;
  // }
  if (currentCategory.categoryId === 30636
    || currentCategory.categoryId === 30637
    || currentCategory.categoryId === 30638
    || currentCategory.categoryId === 30725){
    return false
  }

  // summary欄でラジオ番組かどうかを判定
  const isRadio = currentCategory.summary && (
    currentCategory.summary.startsWith('(ラジオ')
  );
  return isRadio;
}
async function isCaptionAvailable() {
    // 現在の動画IDを取得
    const currentVideoId = window.getCurrentContentId();
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
          0px ${outerPixel} 1px ${outer},   /* 下 */
          0px -${outerPixel} 1px ${outer};  /* 上 */;
        ">♬</div>
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
