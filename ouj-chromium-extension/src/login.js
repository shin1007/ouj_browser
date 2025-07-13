// ログインページのURLをチェック
function waitForPasswordAndLogin() {
    const usernameField = document.getElementById("username");
    const passwordField = document.getElementById("password");
    const loginButton = document.querySelector('button[name="submitBtn"][type="submit"]');

    if (!(usernameField && passwordField && loginButton)) {
        console.log("OUJ Auto Login: ログイン要素が見つかりませんでした。");
        return;
    }

    // alert("OUJ自動ログイン拡張機能が実行中です！\n\nパスワード欄が自動入力されたら自動でログインします。");

    // 監視
    const interval = setInterval(() => {
        if (passwordField.value.length > 0) {
            clearInterval(interval);
            console.log("パスワード欄が埋まりました。自動でログインします。");
            loginButton.click();
        }
    }, 200);

    // 30秒で監視終了
    setTimeout(() => {
        clearInterval(interval);
        console.log("自動ログイン監視を終了しました。");
    }, 30000);
}

window.waitForPasswordAndLogin = waitForPasswordAndLogin;