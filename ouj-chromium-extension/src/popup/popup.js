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

    // ログインボタンを検知してログイン画面に遷移する処理
    function detectLoginButtonAndNavigate() {
        // 現在のタブでログインボタンを検索
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];
            
            // 現在のページでログインボタンを検索
            chrome.scripting.executeScript({
                target: {tabId: currentTab.id},
                function: () => {
                    // ログインボタンを検索（複数のセレクタを試す）
                    const loginSelectors = [
                        '#theme-color',
                        'button[value="ログイン"]',
                        'button:contains("ログイン")',
                        'a[href*="login"]',
                        '.login-button'
                    ];
                    
                    for (const selector of loginSelectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            return true;
                        }
                    }
                    return false;
                }
            }, (results) => {
                if (results && results[0] && results[0].result) {
                    // ログイン画面のURLに直接遷移
                    chrome.tabs.update(currentTab.id, {
                        url: 'https://sso.ouj.ac.jp/cas/login'
                    });
                }
            });
        });
    }
    
    // 自動ログイン設定が有効な場合、ログインボタン検知処理を実行
    chrome.storage.sync.get(['autoLogin'], function(result) {
        if (result.autoLogin) {
            // 少し遅延させてから実行（ページの読み込みを待つ）
            setTimeout(detectLoginButtonAndNavigate, 2000);
        }
    });

});