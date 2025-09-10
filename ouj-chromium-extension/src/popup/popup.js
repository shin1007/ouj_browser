document.addEventListener('DOMContentLoaded', function() {
    // 大きな放送大学ページボタン
    const openOujHomeButton = document.getElementById('open-ouj-home');
    
    // 自動ログインのチェックボックス
    const autoLoginCheckbox = document.getElementById('auto-login-checkbox');
    
    // ポップアップが開いた際にボタンにフォーカスを当てる
    openOujHomeButton.focus();
    
    // 保存された自動ログイン設定を読み込む
    chrome.storage.sync.get(['autoLogin'], function(result) {
        if (result.autoLogin !== undefined) {
            autoLoginCheckbox.checked = result.autoLogin;
        }
    });
    
    // 自動ログイン設定の変更を保存
    autoLoginCheckbox.addEventListener('change', function() {
        chrome.storage.sync.set({
            autoLogin: autoLoginCheckbox.checked
        }, function() {
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

});