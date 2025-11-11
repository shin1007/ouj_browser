

async function main() {
  
  // 画面種別を判定して処理を分岐
  const pageType = await window.detectOujPageType(window.location.href);
  
  if (pageType.subDomain === 'sso') {
    // ログイン画面の処理
    await window.waitForPasswordAndLogin();
    // ログイン成功している場合はホームページに遷移
    // HTML内に「ログインしました」があれば成功しているとして扱う
    if (document.body.innerHTML.includes('ログインしました')) {
      window.location.href = 'https://v.ouj.ac.jp/view/ouj/#/navi/home';
    }
    return;
  }
  if (pageType.subDomain !== 'v') {
    // v.ouj.ac.jp以外のサブドメインの場合は何もしない
    return;
  }
  window.insertLeftMenu();
  window.startMenuOpeningMutationObserver();
  if (pageType.page === 'home') {
    // ホームページの処理を呼び出す
    await window.handleHomePageAutoLogin();
  } else if (pageType.page === 'search-result') {
    // TODO: 動画進捗の挿入 
  } else if (pageType.page === 'player') {
    window.addFavoriteButtonToBreadCrumbs();
    window.initializeVideoPlayer();      
  } else if (pageType.page === 'series-select') {
    window.waitThenAddFavBtnToCategoryList();
  } else if (pageType.page === 'video-select') {
    window.addFavoriteButtonToBreadCrumbs();
  } else {
    // その他の処理
  };
}

function safeMain() {
  
  const missing = [];
  if (typeof window.insertLeftMenu !== 'function') missing.push('waitForLogoAndInsertMenu');
  if (typeof window.getCategoriesData !== 'function') missing.push('getCategoriesData');
  if (typeof window.waitThenAddFavBtnToCategoryList !== 'function') missing.push('waitThenAddFavToCategoryList');
  if (typeof window.addFavoriteButtonToBreadCrumbs !== 'function') missing.push('addFavoriteButtonToBreadCrumbs');
  if (typeof window.getCurrentCategoryId !== 'function') missing.push('getCurrentCategoryId');
  if (typeof window.getFavorites !== 'function') missing.push('getFavorites');
  if (typeof window.categoriesUsedAsParent !== 'function') missing.push('parentCategories');
  
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
  const now = Date.now();
  if (now - window.oujLastMainTime > 500) {
    window.oujLastMainTime = now;
    safeMain();
  }
}
if (!window.location.href.includes('ouj.ac.jp')) {
// 'ouj.ac.jp'をURLに含まない場合は動作をしない
// ほかのサイトで動作をしてしまう不具合があったので念のために入れている
} else if (document.readyState === "complete" || document.readyState === "interactive") {
  console.log("[OUJ拡張 DEBUG] DOM is already loaded");
  callSafeMainOnce();
} else {
  console.log("[OUJ拡張 DEBUG] Waiting for DOM to be loaded");
  document.addEventListener("DOMContentLoaded", callSafeMainOnce);
}

// SPA対応: URL変化を監視してsafeMain()を再実行
if (!window.location.href.includes('ouj.ac.jp')) {
// 'ouj.ac.jp'をURLに含まない場合は動作をしない
// ほかのサイトで動作をしてしまう不具合があったので念のために入れている
} else if (!window.__ouj_url_listener_added) {
  console.log("[OUJ拡張 DEBUG] URL listener added");
  window.__ouj_url_listener_added = true;
  (function() {
    let lastUrl = location.href;
    let pollingInterval = null; // ポーリング用のインターバルID

    // URLの変更を検知してメイン処理を呼び出す共通関数
    const handleUrlChange = (source) => {
      // requestAnimationFrameを使い、DOMの更新を待ってから処理を実行
      requestAnimationFrame(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
          // console.log(`[OUJ拡張 DEBUG] URL change detected by ${source}. last: ${lastUrl}, current: ${currentUrl}`);
          // ログインページからの遷移を検知してキャッシュをクリア
          const wasLoginPage = lastUrl.includes('https://sso.ouj.ac.jp/cas/login');
          const isNowLoginPage = currentUrl.includes('https://sso.ouj.ac.jp/cas/login');
          if (wasLoginPage && !isNowLoginPage) {
            // clearCachedCategoriesDataはpage-login.jsで定義されている
            if (typeof window.clearCachedCategoriesData === 'function') {
              window.clearCachedCategoriesData();
            }
          }

          lastUrl = currentUrl;
          window.oujLastMainTime = 0;
          callSafeMainOnce();
        }
      });
    };

    // history.pushState/replaceStateをフック
    ["pushState", "replaceState"].forEach(type => {
      const original = history[type];
      history[type] = function() {
        const result = original.apply(this, arguments);
        handleUrlChange(`history.${type}`);
        return result;
      };
    });

    // popstate (戻る/進む) と hashchange (ハッシュ変更) を監視
    window.addEventListener("popstate", () => handleUrlChange("popstate"));
    window.addEventListener("hashchange", () => handleUrlChange("hashchange"));

    // ★★★ フォールバックとしてURLのポーリングを追加 ★★★
    const startPolling = () => {
      if (pollingInterval) return; // 既に開始している場合は何もしない
      pollingInterval = setInterval(() => {
        if (location.href !== lastUrl) {
          handleUrlChange('polling');
        }
      }, 250); // 250ミリ秒ごとにチェック
    };

    startPolling();
  })();
}
