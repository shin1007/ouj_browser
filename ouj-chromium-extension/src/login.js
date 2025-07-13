// ログインページのURLをチェック
function waitForPasswordAndLogin() {
    const usernameField = document.getElementById("username");
    const passwordField = document.getElementById("password");
    const loginButton = document.querySelector('button[name="submitBtn"][type="submit"]');

    if (!(usernameField && passwordField && loginButton)) {
        console.log("waitForPasswordAndLogin: ログイン要素が見つかりませんでした。");
        return;
    }

    // alert("OUJ自動ログイン拡張機能が実行中です！\n\nパスワード欄が自動入力されたら自動でログインします。");

    // 監視
    const interval = setInterval(() => {
        if (passwordField.value.length > 0) {
            clearInterval(interval);
            console.log("waitForPasswordAndLogin: パスワード欄が埋まりました。自動でログインします。");
            loginButton.click();
        }
    }, 200);

    // 30秒で監視終了
    setTimeout(() => {
        clearInterval(interval);
        console.log("waitForPasswordAndLogin: 自動ログイン監視を終了しました。");
    }, 30000);
}

// ログイン成功を検知してキャッシュを削除する関数
function detectLoginSuccess() {
    // URLがログインページから変更されたかチェック
    const currentUrl = window.location.href;
    
    // ログインページ以外のページに移動した場合、ログイン成功とみなす
    if (!currentUrl.includes('/login') && !currentUrl.includes('login.html')) {
        console.log("detectLoginSuccess: ログイン成功を検知しました。キャッシュされたカテゴリデータを削除します。");
        clearCachedCategoriesData();
    }
}

// キャッシュされたカテゴリデータを削除する関数
async function clearCachedCategoriesData() {
    try {
        await chrome.storage.local.remove(['cachedCategoriesData']);
        console.log("clearCachedCategoriesData: キャッシュされたカテゴリデータを削除しました。");
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
const urlObserver = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log("urlObserver: URL変更を検知しました:", currentUrl);
        detectLoginSuccess();
    }
});

// body要素の変更を監視（URL変更時にDOMが更新される）
urlObserver.observe(document.body, {
    childList: true,
    subtree: true
});