// ログインページのURLをチェック
function waitForPasswordAndLogin() {
    // 共通関数の存在をチェック
    if (typeof window.waitForElement !== 'function') {
        setTimeout(waitForPasswordAndLogin, 100);
        return;
    }
    console.log('[OUJ拡張] ログインページで自動ログイン処理を開始します。', decodeURLComponentSafe(window.location.href));
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

function decodeURLComponentSafe(url) {
    const encodedStr = url.split('=')[1] || '';
    try {
        const decodedStr = decodeURIComponent(encodedStr);
        if (decodedStr.includes('=')) {
            return decodeURLComponentSafe(decodedStr);
        }
        return decodedStr;
    } catch (error) {
        console.error("decodeURLComponentSafe: URLデコードに失敗しました:", error);
        return encodedStr; // デコードに失敗した場合は元の文字列を返す
    }
}

/*
システムWAKABA
https://www.wakaba.ouj.ac.jp/portal/home/home/display?&taglib.html.TOKEN=e6e2f37a40d81eebffa7d2ba4dd08fdc
印刷教材試し読み
https://info.ouj.ac.jp/ouj/modules/kyozaipdf/kyozaipdf.html
WEB通信指導
https://tsushin.ouj.ac.jp/
WEB単位認定試験
https://shiken.ouj.ac.jp/
過去問
https://info.ouj.ac.jp/ouj/modules/html/mondai.html
オンライン授業
https://online.ouj.ac.jp/
ライブWEB授業
https://live.ouj.ac.jp/login/index.php?loginredirect=1
自己学習サイト
https://sls.ouj.ac.jp/webclass/?acs_=90f7e8c8
看護師国家試験対策
https://nurse.ouj.ac.jp/webclass/login.php
修士論文
https://info.ouj.ac.jp/ouj/modules/inronbun/inronbun.html
**/

// グローバル関数として公開
window.waitForPasswordAndLogin = waitForPasswordAndLogin;
window.clearCachedCategoriesData = clearCachedCategoriesData;
window.decodeURLComponentSafe = decodeURLComponentSafe;