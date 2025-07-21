// 画面種別を判定する関数


function detectOujPageType() {
  return new Promise(async (resolve) => {
    const url = window.location.href;
    
    // ログイン画面の判定
    if (url.includes('https://sso.ouj.ac.jp/cas/login')) {
      resolve('login');
      return;
    }
    
    // ホームページの判定
    if (url.includes('https://v.ouj.ac.jp/view/ouj/#/navi/home')) {
      resolve('home');
      return;
    }
    
    // 動画再生画面の判定
    if (url.includes('https://v.ouj.ac.jp/view/ouj/#/navi/player?co=')) {
      const coNum = url.split('co=')[1];
      resolve('player');
      return;
    }
    
    // VOD画面の判定
    if (!url.includes('https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=')) {
      resolve('');
      return;
    }
    
    // ca=の後ろの値を抽出
    const match = url.match(/vod\?ca=(\d+)/);
    if (!match) {
      resolve('vod-select');
      return;
    }
    
    const caNum = parseInt(match[1], 10);
    if (isNaN(caNum)) {
      resolve('vod-select');
      return;
    }
    
    // parentCategories()を使って判定
    if (typeof window.parentCategories === 'function') {
      try {
        const parentIds = await window.parentCategories();
        
        if (parentIds.includes(caNum)) {
          resolve('course-select');
          return;
        }
        
        const pageType = determinePageTypeByCategoryId(caNum);
        resolve(pageType);
        return;
        
      } catch (e) {
        resolve('vod-select');
        return;
      }
    }
    
    // parentCategoriesが未定義の場合は従来通り
    const pageType = determinePageTypeByCategoryId(caNum);
    resolve(pageType);
  });
}

// カテゴリIDからページ種別を判定する関数
function determinePageTypeByCategoryId(caNum) {
  if (caNum < 100) {
    return 'course-select';
  }
  
  if (480 < caNum && caNum < 500) {
    return 'course-select';
  }
  
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
        window.waitForThemeColorAndClick();
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

// #theme-color要素を待ってログイン画面に遷移する関数
function waitForThemeColorAndClick() {
  
  // 共通関数の存在をチェック
  if (typeof window.waitForElement !== 'function') {
    setTimeout(waitForThemeColorAndClick, 100);
    return;
  }
  
  // #theme-color要素を待つ（読み込みに時間がかかるため、十分な待機時間を設定）
  window.waitForElement('#theme-color', (themeColorElement) => {
    
    // 少し遅延させてからログイン画面に遷移
    setTimeout(() => {
      try {
        window.location.href = 'https://sso.ouj.ac.jp/cas/login';
      } catch (error) {
      }
    }, 500); // 500ms待機
    
  }, 10000); // 最大10秒待機
}

// グローバル関数として公開
window.waitForThemeColorAndClick = waitForThemeColorAndClick;

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