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
        
        const pageType = determinePageTypeFallback(categoryId);
        resolve(pageType);
        return;
        
      } catch (e) {
        resolve('vod-select');
        return;
      }
    }
    
    // parentCategoriesが未定義の場合は従来通り
    const pageType = determinePageTypeFallback(categoryId);
    resolve(pageType);
  });
}

// カテゴリIDからページ種別を判定する関数
function determinePageTypeFallback(categoryId) {
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
    // ログイン成功している場合はホームページに遷移
    // HTML内に「ログインしました」があれば成功しているとして扱う
    if (document.body.innerHTML.includes('ログインしました')) {
      window.location.href = 'https://v.ouj.ac.jp/view/ouj/#/navi/home';
    }
    return;
  }
  window.waitForLogoAndInsertMenu();

  if (pageType === 'home') {
    // ホームページの処理
    // 自動ログイン設定を確認
    chrome.storage.sync.get(['autoLogin'], function(result) {
      if (!result.autoLogin) return;
      // `#theme-color > span`を取得できるまで中の文字列が「ログイン」ならば自動でログインページに遷移
      // pythonのwaitfor_elementのような処理
      const interval = setInterval(() => {
        const themeColorButton = document.querySelector('button#theme-color');
        if (themeColorButton && themeColorButton.textContent.includes('ログイン')) {
          window.location.href = 'https://sso.ouj.ac.jp/cas/login?service=https%3A%2F%2Fv.ouj.ac.jp%2Fv1%2Ftenants%2F1%2Flogin%2Fcas%3FredirectUrl%3Dhttps%253A%252F%252Fv.ouj.ac.jp%252Fview%252Fouj%252F%2523%252Fnavi%252Fhome';
          clearInterval(interval);
        }
      }, 1000);
    });
    return;
  } else if (pageType === 'player') {
    window.addFavoriteButtonToBreadCrumbs();
    window.initializeVideoPlayer();      
  } else if (pageType === 'course-select') {
    window.waitThenAddFavBtnToCategoryList();
  } else if (pageType === 'video-select') {
    window.addFavoriteButtonToBreadCrumbs();
  } else {
    // その他の処理
  };
}

function safeMain() {
  console.log('[OUJ拡張] safeMain()が呼び出されました。');
  
  const missing = [];
  if (typeof window.waitForLogoAndInsertMenu !== 'function') missing.push('waitForLogoAndInsertMenu');
  if (typeof window.getCategoriesData !== 'function') missing.push('getCategoriesData');
  if (typeof window.waitThenAddFavBtnToCategoryList !== 'function') missing.push('waitThenAddFavToCategoryList');
  if (typeof window.addFavoriteButtonToBreadCrumbs !== 'function') missing.push('addFavoriteButtonToBreadCrumbs');
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


// safeMain()を一度だけ呼ぶ仕組み

window.oujLastMainTime = 0;
function callSafeMainOnce() {
  console.log('[OUJ拡張] callSafeMainOnce()が呼び出されました。');
  const now = Date.now();
  if (now - window.oujLastMainTime > 500) {
    window.oujLastMainTime = now;
    safeMain();
  }
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  callSafeMainOnce();
} else {
  document.addEventListener("DOMContentLoaded", callSafeMainOnce);
}

// SPA対応: URL変化を監視してsafeMain()を再実行

if (!window.__ouj_url_listener_added) {
  window.__ouj_url_listener_added = true;
  (function() {
    let lastUrl = location.href;
    // history.pushState/replaceStateのフック
    ["pushState", "replaceState"].forEach(type => {
      const orig = history[type];
      history[type] = function() {
        const result = orig.apply(this, arguments);
        window.dispatchEvent(new Event("ouj-urlchange"));
        return result;
      };
    });
    window.addEventListener("popstate", () => {
      window.dispatchEvent(new Event("ouj-urlchange"));
    });
    window.addEventListener("ouj-urlchange", () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
  window.oujLastMainTime = 0;
        console.log('[OUJ拡張] URLが変化しました:', lastUrl);
        callSafeMainOnce();
      }
    });
  })();
}
