document.addEventListener('DOMContentLoaded', function() {
    // 大きな放送大学ページボタン
    const openOujHomeButton = document.getElementById('open-ouj-home');
    
    // 放送大学ホームページを開く
    openOujHomeButton.addEventListener('click', function() {
        console.log('放送大学ホームページボタンがクリックされました');
        const targetUrl = "https://v.ouj.ac.jp/view/ouj/#/navi/home";
        
        // 新しいタブで放送大学のホームページを開く
        chrome.tabs.create({ 
            url: targetUrl,
            active: true
        }, (newTab) => {
            if (chrome.runtime.lastError) {
                console.error('タブ作成エラー:', chrome.runtime.lastError);
            } else {
                console.log('放送大学ホームページが新しいタブで開かれました:', newTab.id);
                // ポップアップを閉じる
                window.close();
            }
        });
    });


});