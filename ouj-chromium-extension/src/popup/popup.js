document.addEventListener('DOMContentLoaded', function() {
    // 大きな放送大学ページボタン
    const openOujHomeButton = document.getElementById('open-ouj-home');

    // 自動ログインのチェックボックス
    const autoLoginCheckbox = document.getElementById('auto-login-checkbox');

    // 表示テーマの選択欄
    const themeSelect = document.getElementById('theme-select');

    // ポップアップが開いた際にボタンにフォーカスを当てる
    openOujHomeButton.focus();

    // 保存された自動ログイン設定を読み込む
    // 未設定時、実際の自動ログイン処理(utils/goToLoginPage.js)はfalseが明示されない限り
    // 動作する(デフォルトON)。表示をこの実挙動に合わせるため、未設定時はチェック状態にする。
    chrome.storage.sync.get(['autoLogin'], function(result) {
        autoLoginCheckbox.checked = result.autoLogin !== false;
    });

    // 自動ログイン設定の変更を保存
    autoLoginCheckbox.addEventListener('change', function() {
        chrome.storage.sync.set({
            autoLogin: autoLoginCheckbox.checked
        }, function() {
        });
    });

    // 保存された表示テーマ設定を読み込む（未設定時は自動＝OS追従）
    chrome.storage.sync.get(['darkMode'], function(result) {
        themeSelect.value = result.darkMode || 'auto';
    });

    // 表示テーマ設定の変更を保存
    themeSelect.addEventListener('change', function() {
        chrome.storage.sync.set({
            darkMode: themeSelect.value
        });
    });

    // 放送大学ホームページを開く
    openOujHomeButton.addEventListener('click', function() {
        const targetUrl = "https://v.ouj.ac.jp/view/ouj/#/navi/home";

        // 新しいタブで放送大学のホームページを開く
        chrome.tabs.create({
            url: targetUrl,
            active: true
        }, (newTab) => {
            if (chrome.runtime.lastError) {
                console.error('タブ作成エラー:', chrome.runtime.lastError);
            } else {
                // ポップアップを閉じる
                window.close();
            }
        });
    });

    // ライセンスセクションのアコーディオン
    const licensesHeader = document.getElementById('licenses-header');
    const licensesContent = document.getElementById('licenses-content');
    if (licensesHeader && licensesContent) {
        const accordionIcon = licensesHeader.querySelector('.accordion-icon');
        licensesHeader.addEventListener('click', () => {
            const isOpen = licensesContent.style.display === 'block';
            licensesContent.style.display = isOpen ? 'none' : 'block';
            if (accordionIcon) accordionIcon.textContent = isOpen ? '▼' : '▲';
        });
    }
});
