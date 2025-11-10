// ログインページのURLをチェック
function waitForPasswordAndLogin() {
    // 共通関数の存在をチェック
    if (typeof window.waitForElement !== 'function') {
        setTimeout(waitForPasswordAndLogin, 100);
        return;
    }
    const referTo = window.decodeURLComponentSafe(window.location.href);
    console.log('[OUJ拡張] ログインページで自動ログイン処理を開始します。', referTo);
    // ログイン要素を待つ
    window.waitForElement('#username', (usernameField) => {
        window.waitForElement('#password', (passwordField) => {
            window.waitForElement('button[name="submitBtn"][type="submit"]', (loginButton) => {
                // ユーザー名フィールドにフォーカス
                usernameField.focus();

                // 入力を監視
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

// キャッシュされたカテゴリデータを削除する関数
async function clearCachedCategoriesData() {
    try {
        await chrome.storage.local.remove(['cachedCategoriesData']);
        console.log('[OUJ拡張] ログイン成功を検知し、カテゴリキャッシュを削除しました。');
    } catch (error) {
        console.error("clearCachedCategoriesData: カテゴリデータのキャッシュ削除に失敗しました:", error);
    }
}


// グローバル関数として公開
window.waitForPasswordAndLogin = waitForPasswordAndLogin;
window.clearCachedCategoriesData = clearCachedCategoriesData;
window.decodeURLComponentSafe = decodeURLComponentSafe;