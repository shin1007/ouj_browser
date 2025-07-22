// 画面種別を判定する関数


function detectOujPageType() {
  return new Promise(async (resolve) => {
    const url = window.location.href;
    console.log('[DEBUG][content] detectOujPageType: url:', url);
    
    // ログイン画面の判定
    if (url.includes('https://sso.ouj.ac.jp/cas/login')) {
      console.log('[DEBUG][content] 判定: login');
      resolve('login');
      return;
    }
    
    // ホームページの判定
    if (url.includes('https://v.ouj.ac.jp/view/ouj/#/navi/home')) {
      console.log('[DEBUG][content] 判定: home');
      resolve('home');
      return;
    }
    
    // 動画再生画面の判定
    if (url.includes('https://v.ouj.ac.jp/view/ouj/#/navi/player?co=')) {
      const coNum = url.split('co=')[1];
      console.log('[DEBUG][content] 判定: player, coNum:', coNum);
      resolve('player');
      return;
    }
    
    // VOD画面の判定
    if (!url.includes('https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=')) {
      console.log('[DEBUG][content] 判定: vod-select (caパラメータなし)');
      resolve('');
      return;
    }
    
    // ca=の後ろの値を抽出
    const match = url.match(/vod\?ca=(\d+)/);
    if (!match) {
      console.log('[DEBUG][content] 判定: vod-select (caパラメータ抽出失敗)');
      resolve('vod-select');
      return;
    }
    
    const caNum = parseInt(match[1], 10);
    if (isNaN(caNum)) {
      console.log('[DEBUG][content] 判定: vod-select (caNumがNaN)');
      resolve('vod-select');
      return;
    }
    
    // parentCategories()を使って判定
    if (typeof window.parentCategories === 'function') {
      try {
        const parentIds = await window.parentCategories();
        console.log('[DEBUG][content] parentCategories:', parentIds, 'caNum:', caNum);
        
        if (parentIds.includes(caNum)) {
          console.log('[DEBUG][content] 判定: course-select (parentCategoriesに含まれる)');
          resolve('course-select');
          return;
        }
        
        const pageType = determinePageTypeByCategoryId(caNum);
        console.log('[DEBUG][content] 判定: determinePageTypeByCategoryId:', pageType);
        resolve(pageType);
        return;
        
      } catch (e) {
        console.log('[DEBUG][content] parentCategoriesエラー:', e);
        resolve('vod-select');
        return;
      }
    }
    
    // parentCategoriesが未定義の場合は従来通り
    const pageType = determinePageTypeByCategoryId(caNum);
    console.log('[DEBUG][content] 判定: determinePageTypeByCategoryId:', pageType);
    resolve(pageType);
  });
}

// カテゴリIDからページ種別を判定する関数
function determinePageTypeByCategoryId(caNum) {
  if (caNum < 100) {
    console.log('[DEBUG][content] determinePageTypeByCategoryId: course-select (caNum<100)', caNum);
    return 'course-select';
  }
  
  if (480 < caNum && caNum < 500) {
    console.log('[DEBUG][content] determinePageTypeByCategoryId: course-select (480<caNum<500)', caNum);
    return 'course-select';
  }
  console.log('[DEBUG][content] determinePageTypeByCategoryId: video-select', caNum);
  return 'video-select';
}

async function main() {
  
  // 画面種別を判定して処理を分岐
  const pageType = await detectOujPageType();
  
  if (pageType === 'login') {
    // ログイン画面の処理
    window.waitForPasswordAndLogin();
    return;
  }

  if (pageType === 'home') {
    // ホームページの処理
    
    // メニュー挿入処理を開始（ホームページでもメニューを表示）
    window.waitForLogoAndInsertMenu();
    
    // 自動ログイン設定を確認
    chrome.storage.sync.get(['autoLogin'], function(result) {
      if (result.autoLogin) {
      } else {
      }
    });
    return;
  }
  
  window.waitForLogoAndInsertMenu();

  // ログイン画面ではない場合
  window.getCategoriesData().then(categories => {
    
    if (pageType === 'player') {
      // 動画再生画面の処理
      // ・再生速度の調整（記憶させておいたもの）
      // ・EDスキップ
      // ・自動で次を再生
      window.initializeVideoPlayer();
      // キーボード操作機能を実装完了: スペースキー（再生/一時停止）、矢印キー（シーク・音量調整）、Mキー（ミュート）、Fキー（フルスクリーン）、0キー（最初に戻る）、Endキー（最後に進む）
      
    } else if (pageType === 'course-select') {
      // コース選択画面
      // ・お気に入りされているかの確認
      // ・お気に入りボタンを追加
      window.waitThenAddFavBtnToCategoryList();
    } else if (pageType === 'video-select') {
      // 動画選択画面
      // ・お気に入りされているかの確認
      // ・お気に入りボタンを追加
      window.addFavoriteButtonToCategoryTop();
      // ・どれくらい再生されているのかを取得
      // ・どこまで再生したかの表示
    } else {
      // その他の処理
    }
  });
}

function safeMain() {
  
  const missing = [];
  if (typeof window.waitForLogoAndInsertMenu !== 'function') missing.push('waitForLogoAndInsertMenu');
  if (typeof window.getCategoriesData !== 'function') missing.push('getCategoriesData');
  if (typeof window.waitThenAddFavBtnToCategoryList !== 'function') missing.push('waitThenAddFavToCategoryList');
  if (typeof window.addFavoriteButtonToCategoryTop !== 'function') missing.push('addFavoriteButtonToCategoryTop');
  if (typeof window.getCurrentCategoryId !== 'function') missing.push('getCurrentCategoryId');
  if (typeof window.getFavorites !== 'function') missing.push('getFavorites');
  
  if (missing.length > 0) {
    if (safeMain._warned !== missing.join(',')) {
      console.error('[OUJ拡張] グローバル関数未定義:', missing.join(', '));
      safeMain._warned = missing.join(',');
    }
    setTimeout(safeMain, 50);
    return;
  }
  
  main();
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  safeMain();
} else {
  document.addEventListener("DOMContentLoaded", safeMain);
}

// SPA対応: URL変化を監視してmain()を再実行
(function() {
  let lastUrl = location.href;
  let urlChangeDetected = false;

  // history.pushState/replaceStateのフック
  function patchHistoryMethod(type) {
    const orig = history[type];
    history[type] = function() {
      const result = orig.apply(this, arguments);
      const event = new Event('ouj-urlchange');
      window.dispatchEvent(event);
      return result;
    };
  }
  patchHistoryMethod('pushState');
  patchHistoryMethod('replaceState');

  // popstateイベント
  window.addEventListener('popstate', () => {
    window.dispatchEvent(new Event('ouj-urlchange'));
  });

  // 独自イベントでmain()再実行
  window.addEventListener('ouj-urlchange', () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      urlChangeDetected = true;
      safeMain();
    }
  });

  // フォールバック: どうしても検知できない場合のためのsetInterval
  // （一部のSPA実装ではhistory APIを直接使わずlocation.hashや独自管理の場合があるため）
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (!urlChangeDetected) {
        // history APIフックやpopstateで検知できなかった場合のみログ
      }
      urlChangeDetected = false;
      safeMain();
    }
  }, 1000); // 1秒間隔で十分

  /*
    【うまくいかない場合の主な原因】
    - サイト側がhistory.pushState/replaceStateをラップしている、または独自のルーティング管理をしている
    - location.hashのみで遷移管理している場合（hashchangeイベントも必要な場合あり）
    - そもそもURLが変わらずDOMだけ書き換えるSPAの場合（この場合は要素監視が必要）
    - 拡張機能のcontent scriptが早すぎてhistory APIパッチが間に合わない場合
    その場合はsetIntervalのフォールバックで最低限の検知を担保
  */
})();