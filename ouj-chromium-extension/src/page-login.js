// ログインページのURLをチェック
function waitForPasswordAndLogin() {
      // 共通関数の存在をチェック
  if (typeof window.waitForElement !== 'function') {
    setTimeout(waitForPasswordAndLogin, 100);
    return;
  }
    
    // ログイン要素を待つ
    window.waitForElement('#username', (usernameField) => {
        window.waitForElement('#password', (passwordField) => {
            window.waitForElement('button[name="submitBtn"][type="submit"]', (loginButton) => {

                // 監視
                const interval = setInterval(() => {
                    if (passwordField.value.length > 0) {
                        clearInterval(interval);
                        loginButton.click();
                    }
                }, 200);

                // 30秒で監視終了
                setTimeout(() => {
                    clearInterval(interval);
                }, 30000);
            });
        });
    });
}

// ログイン成功を検知してキャッシュを削除する関数
function detectLoginSuccess() {
    // URLがログインページから変更されたかチェック
    const currentUrl = window.location.href;
    
    // ログインページ以外のページに移動した場合、ログイン成功とみなす
    if (currentUrl.includes('/login') || currentUrl.includes('login.html')) {
        return;
    } else {
        clearCachedCategoriesData();
    }
}

// キャッシュされたカテゴリデータを削除する関数
async function clearCachedCategoriesData() {
    try {
        await chrome.storage.local.remove(['cachedCategoriesData']);
    } catch (error) {
        console.error("clearCachedCategoriesData: カテゴリデータのキャッシュ削除に失敗しました:", error);
    }
}

// ページ読み込み時にログイン成功をチェック
function checkLoginStatus() {
    // 少し遅延させてからチェック（ページ遷移の完了を待つ）
    setTimeout(() => {
        detectLoginSuccess();
    }, 1000);
}

// グローバル関数として公開
window.waitForPasswordAndLogin = waitForPasswordAndLogin;
window.detectLoginSuccess = detectLoginSuccess;
window.clearCachedCategoriesData = clearCachedCategoriesData;
window.checkLoginStatus = checkLoginStatus;

// ページ読み込み時にログイン状態をチェック
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkLoginStatus);
} else {
    checkLoginStatus();
}

// URL変更を監視してログイン成功を検知
let lastUrl = window.location.href;
let wasLoginPage = lastUrl.includes('/login') || lastUrl.includes('login.html');
const urlObserver = new MutationObserver(() => {
    const currentUrl = window.location.href;
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('login.html');
    if (currentUrl !== lastUrl) {
        // 直前がログインページ、かつ現在がログインページ以外の場合のみ発火
        if (wasLoginPage && !isLoginPage) {
            detectLoginSuccess();
        }
        lastUrl = currentUrl;
        wasLoginPage = isLoginPage;
    }
});

// body要素の変更を監視（URL変更時にDOMが更新される）
urlObserver.observe(document.body, {
    childList: true,
    subtree: true
});