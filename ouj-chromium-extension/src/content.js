// 画面種別を判定する関数
async function detectOujPageType() {
  const url = window.location.href;

  // ログイン画面
  if (url.includes('https://sso.ouj.ac.jp/cas/login')) {
    return 'login';
  }
  // ホームページ
  if (url.includes('https://v.ouj.ac.jp/view/ouj/#/navi/home')) {
    return 'home';
  }
  // 動画再生画面
  if (url.includes('https://v.ouj.ac.jp/view/ouj/#/navi/player?co=')) {
    return 'player';
  }
  // VOD画面以外はここで終了
  if (!url.includes('https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=')) {
    return '';
  }

  const categoryId = window.getCurrentCategoryId();
  try {
    const parentIds = await window.parentCategories();
    if (parentIds.includes(categoryId)) {
      return 'course-select'; // コース一覧（科目群選択後）
    }
  } catch (e) {
    console.error('[OUJ拡張] parentCategoriesの取得に失敗:', e);
  }

  // フォールバック判定: カテゴリIDの範囲で判定
  if (categoryId < 100 || (categoryId > 480 && categoryId < 500)) {
    return 'course-select';
  }

  return 'video-select'; // 動画一覧
}

// ホームページの自動ログイン処理
async function handleHomePageAutoLogin() {
  const result = await new Promise(resolve => chrome.storage.sync.get(['autoLogin'], resolve));
  if (!result.autoLogin) {
    return;
  }

  // ログインボタンが表示されるまで最大10秒待機し、表示されたらクリックする
  let retryCount = 0;
  const maxRetries = 10;
  const interval = setInterval(() => {
    retryCount++;
    const themeColorButton = document.querySelector('button#theme-color');

    // ログインボタンが見つかった場合
    if (themeColorButton && themeColorButton.textContent.includes('ログイン')) {
      clearInterval(interval);
      window.location.href = 'https://sso.ouj.ac.jp/cas/login?service=https%3A%2F%2Fv.ouj.ac.jp%2Fv1%2Ftenants%2F1%2Flogin%2Fcas%3FredirectUrl%3Dhttps%253A%252F%252Fv.ouj.ac.jp%252Fview%252Fouj%252F%2523%252Fnavi%252Fhome';
      return;
    }

    // リトライ回数上限に達した場合
    if (retryCount >= maxRetries) {
      clearInterval(interval);
      console.log('[OUJ拡張] 自動ログインチェックを停止しました（最大試行回数超過）。');
    }
  }, 1000);
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
    // ホームページの処理を呼び出す
    await handleHomePageAutoLogin();
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
  
  const missing = [];
  if (typeof window.waitForLogoAndInsertMenu !== 'function') missing.push('waitForLogoAndInsertMenu');
  if (typeof window.getCategoriesData !== 'function') missing.push('getCategoriesData');
  if (typeof window.waitThenAddFavBtnToCategoryList !== 'function') missing.push('waitThenAddFavToCategoryList');
  if (typeof window.addFavoriteButtonToBreadCrumbs !== 'function') missing.push('addFavoriteButtonToBreadCrumbs');
  if (typeof window.getCurrentCategoryId !== 'function') missing.push('getCurrentCategoryId');
  if (typeof window.getFavorites !== 'function') missing.push('getFavorites');
  if (typeof window.parentCategories !== 'function') missing.push('parentCategories');
  
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
