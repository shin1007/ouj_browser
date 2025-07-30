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
    
    const categoryId = window.getCurrentCategoryId();
    if (!categoryId) {
      resolve('vod-select');
      return;
    }
    
    if (isNaN(categoryId)) {
      resolve('vod-select');
      return;
    }
    
    // parentCategories()を使って判定
    if (typeof window.parentCategories === 'function') {
      try {
        const parentIds = await window.parentCategories();
        
        if (parentIds.includes(categoryId)) {
          resolve('course-select');
          return;
        }
        
        const pageType = determinePageTypeByCategoryId(categoryId);
        resolve(pageType);
        return;
        
      } catch (e) {
        resolve('vod-select');
        return;
      }
    }
    
    // parentCategoriesが未定義の場合は従来通り
    const pageType = determinePageTypeByCategoryId(categoryId);
    resolve(pageType);
  });
}

// カテゴリIDからページ種別を判定する関数
function determinePageTypeByCategoryId(categoryId) {
  if (categoryId < 100) {
    return 'course-select';
  }
  
  if (480 < categoryId && categoryId < 500) {
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
      } else {
      }
    });
    return;
  }
  
  window.waitForLogoAndInsertMenu();

  // ログイン画面ではない場合
  window.getCategoriesData().then(categories => {
    
    if (pageType === 'player') {
      window.initializeVideoPlayer();      
    } else if (pageType === 'course-select') {
      window.waitThenAddFavBtnToCategoryList();
    } else if (pageType === 'video-select') {
      window.addFavoriteButtonToCategoryTop();
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

// 同じ関数を同じURLで二度呼ばない共通ラッパー
window.__alreadyCalledOnUrl = window.__alreadyCalledOnUrl || {};
function callOncePerUrl(fn, fnName) {
  const url = location.href;
  const key = fnName + '::' + url;
  if (window.__alreadyCalledOnUrl[key]) {
    console.log(`[callOncePerUrl] ${fnName} はこのURLで既に呼ばれています`);
    return;
  }
  window.__alreadyCalledOnUrl[key] = true;
  fn();
}

// 既存の呼び出しをラップ
callOncePerUrl(window.waitThenAddFavBtnToCategoryList, 'waitThenAddFavBtnToCategoryList');