// ラジオ番組判定関数
async function checkIfRadioProgram() {
  // console.log('checkIfRadioProgram: ラジオ番組判定を開始します');
  
  try {
    // 現在の動画IDを取得
    const currentVideoId = getCurrentVideoId();
    if (!currentVideoId) {
      // console.log('checkIfRadioProgram: 動画IDを取得できませんでした');
      return;
    }
    
    // console.log('checkIfRadioProgram: 現在の動画ID:', currentVideoId);
    
    // 動画の詳細情報を取得
    const videoData = await getVideoData(currentVideoId);
    if (!videoData) {
      // console.log('checkIfRadioProgram: 動画データを取得できませんでした');
      return;
    }
    
    // console.log('checkIfRadioProgram: 取得した動画データ:', {
      // contentId: videoData.contentId,
      // categoryId: videoData.categoryId,
      // title: videoData.title,
      // summary: videoData.summary
    // });
    
    // 動画データからカテゴリIDを取得
    const categoryId = videoData.categoryId;
    if (!categoryId) {
      // console.log('checkIfRadioProgram: 動画データからカテゴリIDを取得できませんでした');
      return;
    }
    
    // console.log('checkIfRadioProgram: 動画のカテゴリID:', categoryId);
    
    // カテゴリデータを取得
    const categories = await window.getCategoriesData();
    if (!categories || !Array.isArray(categories)) {
      // console.log('checkIfRadioProgram: カテゴリデータを取得できませんでした');
      return;
    }
    
    // カテゴリIDに対応するカテゴリを検索
    const currentCategory = categories.find(cat => cat.categoryId === categoryId);
    
    if (!currentCategory) {
      // console.log('checkIfRadioProgram: カテゴリIDに対応するカテゴリが見つかりませんでした');
      return;
    }
    
    // console.log('checkIfRadioProgram: 見つかったカテゴリ:', {
      // categoryId: currentCategory.categoryId,
      // name: currentCategory.name,
      // summary: currentCategory.summary
    // });
    
    // summary欄でラジオ番組かどうかを判定
    const isRadio = currentCategory.summary && (
      currentCategory.summary.startsWith('(ラジオ')
    );
    
    if (isRadio) {
      // 字幕付きラジオ番組かどうかを判定
      const hasSubtitles = currentCategory.summary.includes('・字幕');
      
      // console.log('🎵 checkIfRadioProgram: 【ラジオ番組】を検出しました！');
      // console.log('checkIfRadioProgram: カテゴリ名:', currentCategory.name);
      // console.log('checkIfRadioProgram: サマリー:', currentCategory.summary);
      // console.log('checkIfRadioProgram: 字幕付き:', hasSubtitles ? 'はい' : 'いいえ');
      
      // ラジオ番組であることをグローバル変数に保存
      window.isRadioProgram = true;
      window.isRadioWithSubtitles = hasSubtitles;
      
      // 字幕付きでない場合のみUI表示
      if (!hasSubtitles) {
        // console.log('checkIfRadioProgram: 字幕なしラジオ番組のため、専用UIを表示します');
        showRadioProgramUI();
      } else {
        // console.log('checkIfRadioProgram: 字幕付きラジオ番組のため、専用UIは表示しません（字幕が表示されるため）');
      }
    } else {
      // console.log('📺 checkIfRadioProgram: 【通常の動画】です');
      window.isRadioProgram = false;
      window.isRadioWithSubtitles = false;
    }
    
  } catch (error) {
    console.error('checkIfRadioProgram: ラジオ番組判定でエラーが発生しました:', error);
  }
}

// 動画データを取得する関数
async function getVideoData(contentId) {
  // console.log('getVideoData: 動画データを取得します。contentId:', contentId);
  
  try {
    // 動画の詳細情報を取得するAPI
    const response = await fetch(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${contentId}`);
    
    if (!response.ok) {
      console.error('getVideoData: APIレスポンスエラー:', response.status, response.statusText);
      return null;
    }
    
    const videoData = await response.json();
    // console.log('getVideoData: 動画データ取得成功:', videoData);
    
    return videoData;
    
  } catch (error) {
    console.error('getVideoData: 動画データ取得でエラーが発生しました:', error);
    return null;
  }
}

// ラジオ番組用のUI表示関数
function showRadioProgramUI() {
  // console.log('showRadioProgramUI: ラジオ番組用UIを表示します');
  
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
    // console.log('showRadioProgramUI: 動画要素が見つかりました。ラジオ番組用UIを挿入します');
    
    // ラジオ番組用のUI要素を作成
    const radioUI = document.createElement('div');
    radioUI.id = 'radio-program-ui';
    radioUI.style.cssText = `
      position: absolute;
      top: 50%;
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
    
    radioUI.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 10px;">🎵</div>
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">ラジオ番組</div>
      <div style="font-size: 14px; opacity: 0.8;">音声のみの番組です</div>
    `;
    
    // 動画要素の親要素に挿入
    const videoContainer = video.parentElement;
    if (videoContainer) {
      videoContainer.style.position = 'relative';
      videoContainer.appendChild(radioUI);
      
      // console.log('showRadioProgramUI: ラジオ番組用UIを挿入しました');
    } else {
      console.error('showRadioProgramUI: 動画要素の親要素が見つかりませんでした');
    }
  });
}

// グローバル関数として公開
window.checkIfRadioProgram = checkIfRadioProgram;
window.showRadioProgramUI = showRadioProgramUI;
window.getVideoData = getVideoData; 