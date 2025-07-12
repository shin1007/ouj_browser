// ログインページのURLをチェック
function autoFillAndSubmit() {

    const usernameField = document.getElementById("username");
    const passwordField = document.getElementById("password");
    const loginButton = document.querySelector('button[name="submitBtn"][type="submit"]');

    if (usernameField && passwordField && loginButton) {
        alert("OUJ自動ログイン拡張機能が実行中です！");

        // ブラウザのオートフィルをトリガーする
        usernameField.focus(); // ユーザー名フィールドにフォーカスを当てる
        usernameField.select(); // ユーザー名フィールドを選択状態にする

        
        // オートフィルが完了するまで少し待つ
        // 環境によってこの遅延は調整が必要かもしれません
        setTimeout(() => {
            // パスワードフィールドがオートフィルで埋められているか確認
            if (passwordField.value.length > 0) {
                loginButton.click(); // ログインボタンをクリックしてフォームを送信
            } else {
                console.log("OUJ Auto Login: パスワードがオートフィルされませんでした。手動で入力してください。");
                // オートフィルされなかった場合の処理（例えば、ユーザーに通知するなど）
            }
        }, 500); // 500ミリ秒（0.5秒）待機
    } else {
        console.log("OUJ Auto Login: ログイン要素が見つかりませんでした。");
    }
}

window.autoFillAndSubmit = autoFillAndSubmit;