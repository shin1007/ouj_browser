// ログインページのURLをチェック
async function waitForPasswordAndLogin() {
    // 共通関数の存在をチェック
    if (typeof window.waitForElement !== 'function') {
        setTimeout(waitForPasswordAndLogin, 100);
        return;
    }
    // ログイン要素を待つ
    window.waitForElement('#username', (usernameField) => {
        window.waitForElement('#password', (passwordField) => {
            insertReferTo();
            window.waitForElement('button[name="submitBtn"][type="submit"]', (loginButton) => {
                // ユーザー名フィールドにフォーカス
                usernameField.focus();

                // 入力を監視
                let autoLoginEnabled = true;
                const interval = setInterval(() => {
                    const len = passwordField.value.length;
                    // 1文字以上入力された場合は自動ログインをオフ
                    if (len > 0 && len <= 7) {
                        autoLoginEnabled = false;
                        clearInterval(interval);
                        return;
                    }
                    // 8文字以上で自動ログイン有効時のみ自動クリック
                    if (len > 0 && autoLoginEnabled && len > 7) {
                        clearInterval(interval);
                        loginButton.click();
                    }
                }, 100);

                // 3分で監視終了
                setTimeout(() => {
                    clearInterval(interval);
                }, 3*60*1000);
            });
        });
    });
}

async function insertReferTo() {
    // 既に情報が挿入されている場合はスキップ
    if (document.querySelector('#ouj-login-redirect-info')) {
        return;
    }
    const nextElement = document.querySelector('#usernameSection > label');
    if (nextElement) {
        const infoDiv = document.createElement('div');
        infoDiv.style.marginTop = '8px';
        infoDiv.style.marginBottom = '8px';
        infoDiv.style.fontSize = '12px';
        infoDiv.style.color = '#555';
        // id
        infoDiv.id = 'ouj-login-redirect-info';
        infoDiv.textContent = `遷移先：${await getReferToMessage()}`;
        nextElement.parentNode.insertBefore(infoDiv, nextElement);
    }
}

async function getReferToMessage() {
    const referTo = await window.detectOujPageType(window.location.href);
    if (!referTo) {
        return null;
    }
    const subDomainDic = {
        'wakaba': 'システムWAKABA',
        'tsushin': '通信指導',
        'shiken': 'Web単位認定試験',
        'online': 'オンライン授業',
        'live': 'ライブWEB授業',
        'sls': '自己学習サイト',
        'nurse': '看護師国家試験対策',
        'info': 'インフォ',
        'v': 'インターネット配信'
    };
    const infoDic = {
        'kyozaipdf': '印刷教材試し読み',
        'mondai': '過去問',
        'gakubu': '過去問（学部）',
        'daigakuin': '過去問（大学院）',
        'shisho': '過去問（司書）',
        'inronbun': '修士論文'
    };
    const vodDic = {
        'home': 'インターネット配信ホーム',
        'player': '動画再生ページ',
        'search-result': '検索結果',
        'series-select': '科目一覧ページ',
        'video-select': '動画一覧ページ',
        'other': 'その他'
    };
    let message = subDomainDic[referTo.referTo.subDomain] || '不明なサービス';
    if (message === 'インフォ') {
        message = infoDic[referTo.referTo.page] || message;
    }
    if (message === 'インターネット配信') {
        message = vodDic[referTo.referTo.page] || message;
        const category = await window.getCategoryData(String(referTo.referTo.categoryId));
        if (category){
            message += `（${category.name}）`;
        }
    }

    return message;
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